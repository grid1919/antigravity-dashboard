/**
 * Language Server Service
 * 
 * Main service for communicating with the Antigravity Language Server.
 * Handles connection, quota fetching, and data parsing.
 */

import { EventEmitter } from 'events';
import { httpRequest } from './httpClient';
import { detectLanguageServer, isLanguageServerRunning } from './detect';
import type {
  LanguageServerInfo,
  LanguageServerStatus,
  QuotaSnapshot,
  PromptCreditsInfo,
  FlowCreditsInfo,
  TokenUsageInfo,
  UserInfo,
  LSModelQuotaInfo,
  ServerUserStatusResponse,
  RawModelConfig,
} from './types';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_API_PATH = '/exa.language_server_pb.LanguageServerService/GetUserStatus';
const DEFAULT_POLLING_MS = 90000; // 90 seconds
const RECONNECT_BACKOFF_MS = 60000; // 60 seconds backoff after failed detection

export class LanguageServerService extends EventEmitter {
  private serverInfo: LanguageServerInfo | null = null;
  private lastSnapshot: QuotaSnapshot | null = null;
  private lastError: string | null = null;
  private lastConnected: number | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingMs: number;
  private isConnecting: boolean = false;
  private lastFailedAt: number | null = null;
  private wasDisconnectedLogged: boolean = false;

  constructor(pollingMs: number = DEFAULT_POLLING_MS) {
    super();
    this.pollingMs = pollingMs;
  }

  /**
   * Get current connection status
   */
  getStatus(): LanguageServerStatus {
    return {
      connected: this.serverInfo !== null,
      error: this.lastError || undefined,
      lastConnected: this.lastConnected || undefined,
      serverInfo: this.serverInfo || undefined,
      lastSnapshot: this.lastSnapshot || undefined,
    };
  }

  /**
   * Attempt to connect to the Language Server
   */
  async connect(verbose: boolean = false, silent: boolean = false): Promise<boolean> {
    if (this.isConnecting) {
      if (!silent) {
        console.log('[LS Service] Connection already in progress');
      }
      return false;
    }

    this.isConnecting = true;
    this.lastError = null;

    try {
      if (!silent) {
        console.log('[LS Service] Detecting Language Server...');
      }
      const info = await detectLanguageServer({ verbose, attempts: 2, silent });

      if (info) {
        this.serverInfo = info;
        this.lastConnected = Date.now();
        this.lastFailedAt = null;
        this.wasDisconnectedLogged = false;
        console.log(`[LS Service] Connected to Language Server on port ${info.port}`);
        this.emit('connected', info);
        
        await this.fetchQuota();
        
        return true;
      } else {
        this.lastError = 'Language Server not found';
        this.lastFailedAt = Date.now();
        
        if (!this.wasDisconnectedLogged) {
          console.log('[LS Service] Language Server not detected');
          this.wasDisconnectedLogged = true;
          this.emit('disconnected', this.lastError);
        }
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.lastError = message;
      this.lastFailedAt = Date.now();
      if (!silent) {
        console.error('[LS Service] Connection error:', message);
      }
      this.emit('error', err);
      return false;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect from the Language Server
   */
  disconnect(): void {
    this.serverInfo = null;
    this.stopPolling();
    this.emit('disconnected', 'Manual disconnect');
    console.log('[LS Service] Disconnected');
  }

  /**
   * Fetch quota data from the Language Server
   */
  async fetchQuota(): Promise<QuotaSnapshot | null> {
    if (!this.serverInfo) {
      if (this.lastFailedAt && Date.now() - this.lastFailedAt < RECONNECT_BACKOFF_MS) {
        return null;
      }
      const connected = await this.connect(false, true);
      if (!connected || !this.serverInfo) {
        return null;
      }
    }

    try {
      const response = await httpRequest<ServerUserStatusResponse>({
        hostname: DEFAULT_HOST,
        port: this.serverInfo.port,
        path: DEFAULT_API_PATH,
        method: 'POST',
        headers: {
          'Connect-Protocol-Version': '1',
          'X-Codeium-Csrf-Token': this.serverInfo.csrfToken,
        },
        body: JSON.stringify({
          metadata: {
            ideName: 'antigravity',
            extensionName: 'antigravity',
            locale: 'en',
          },
        }),
        timeout: 5000,
        allowFallback: true,
      });

      if (response.statusCode === 401 || response.statusCode === 403) {
        this.lastError = `Authentication failed (${response.statusCode})`;
        this.serverInfo = null; // Force reconnect
        return null;
      }

      const data = response.data;
      if (!data || !data.userStatus) {
        this.lastError = `Invalid response: ${response.statusCode}`;
        return null;
      }

      const snapshot = this.parseResponse(data);
      this.lastSnapshot = snapshot;
      this.lastError = null;
      this.lastConnected = Date.now();
      
      this.emit('quota_update', snapshot);
      return snapshot;

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.lastError = message;
      console.error('[LS Service] Fetch error:', message);
      
      // Clear server info to force reconnect on next attempt
      this.serverInfo = null;
      this.emit('error', err);
      return null;
    }
  }

  /**
   * Parse server response into QuotaSnapshot
   */
  private parseResponse(data: ServerUserStatusResponse): QuotaSnapshot {
    const userStatus = data.userStatus;
    const planInfo = userStatus.planStatus?.planInfo;
    const availableCredits = userStatus.planStatus?.availablePromptCredits;
    const availableFlowCredits = userStatus.planStatus?.availableFlowCredits;

    // Parse Prompt Credits
    let promptCredits: PromptCreditsInfo | undefined;
    if (planInfo && availableCredits !== undefined) {
      const monthly = Number(planInfo.monthlyPromptCredits);
      const available = Number(availableCredits);
      if (monthly > 0) {
        promptCredits = {
          available,
          monthly,
          usedPercentage: ((monthly - available) / monthly) * 100,
          remainingPercentage: (available / monthly) * 100,
        };
      }
    }

    // Parse Flow Credits
    let flowCredits: FlowCreditsInfo | undefined;
    if (planInfo?.monthlyFlowCredits && availableFlowCredits !== undefined) {
      const monthly = Number(planInfo.monthlyFlowCredits);
      const available = Number(availableFlowCredits);
      if (monthly > 0) {
        flowCredits = {
          available,
          monthly,
          usedPercentage: ((monthly - available) / monthly) * 100,
          remainingPercentage: (available / monthly) * 100,
        };
      }
    }

    // Build combined token usage info
    let tokenUsage: TokenUsageInfo | undefined;
    if (promptCredits || flowCredits) {
      const totalAvailable = (promptCredits?.available || 0) + (flowCredits?.available || 0);
      const totalMonthly = (promptCredits?.monthly || 0) + (flowCredits?.monthly || 0);
      tokenUsage = {
        promptCredits,
        flowCredits,
        totalAvailable,
        totalMonthly,
        overallRemainingPercentage: totalMonthly > 0 ? (totalAvailable / totalMonthly) * 100 : 0,
      };
    }

    // Extract user subscription info
    const userTier = userStatus.userTier;
    const userInfo: UserInfo | undefined = userStatus.name || userTier || userStatus.email ? {
      name: userStatus.name,
      email: userStatus.email,
      tier: userTier?.name || planInfo?.teamsTier,
      tierId: userTier?.id,
      tierDescription: userTier?.description,
      planName: planInfo?.planName,
      teamsTier: planInfo?.teamsTier,
      upgradeUri: userTier?.upgradeSubscriptionUri,
      upgradeText: userTier?.upgradeSubscriptionText,
      browserEnabled: planInfo?.browserEnabled,
      knowledgeBaseEnabled: planInfo?.knowledgeBaseEnabled,
      canBuyMoreCredits: planInfo?.canBuyMoreCredits,
      monthlyPromptCredits: planInfo?.monthlyPromptCredits,
      availablePromptCredits: availableCredits,
    } : undefined;

    // Parse model quotas
    const rawModels = userStatus.cascadeModelConfigData?.clientModelConfigs || [];
    const models: LSModelQuotaInfo[] = rawModels
      .filter((m: RawModelConfig) => m.quotaInfo)
      .map((m: RawModelConfig) => {
        const resetTime = new Date(m.quotaInfo!.resetTime);
        const now = new Date();
        const diff = resetTime.getTime() - now.getTime();
        const remainingFraction = m.quotaInfo!.remainingFraction ?? 0;

        return {
          label: m.label,
          modelId: m.modelOrAlias?.model || 'unknown',
          remainingPercentage: remainingFraction * 100,
          isExhausted: remainingFraction === 0,
          resetTime,
          timeUntilReset: this.formatTime(diff),
        };
      });

    return {
      timestamp: new Date(),
      promptCredits,
      flowCredits,
      tokenUsage,
      userInfo,
      models,
    };
  }

  /**
   * Format milliseconds to human-readable time
   */
  private formatTime(ms: number): string {
    if (ms <= 0) {
      return 'Ready';
    }
    const mins = Math.ceil(ms / 60000);
    if (mins < 60) {
      return `${mins}m`;
    }
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  }

  /**
   * Start periodic polling
   */
  startPolling(): void {
    if (this.pollingInterval) {
      return;
    }

    // Initial fetch
    this.fetchQuota();

    this.pollingInterval = setInterval(async () => {
      await this.fetchQuota();
    }, this.pollingMs);

    console.log(`[LS Service] Started polling every ${this.pollingMs / 1000}s`);
  }

  /**
   * Stop periodic polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[LS Service] Stopped polling');
    }
  }

  /**
   * Force refresh quota data
   */
  async forceRefresh(): Promise<QuotaSnapshot | null> {
    // Clear cached server info to force reconnect
    if (!this.serverInfo) {
      await this.connect();
    }
    return this.fetchQuota();
  }

  /**
   * Get cached snapshot
   */
  getCachedSnapshot(): QuotaSnapshot | null {
    return this.lastSnapshot;
  }

  /**
   * Get user info from cached snapshot
   */
  getUserInfo(): UserInfo | null {
    return this.lastSnapshot?.userInfo || null;
  }

  /**
   * Get token usage from cached snapshot
   */
  getTokenUsage(): TokenUsageInfo | null {
    return this.lastSnapshot?.tokenUsage || null;
  }

  /**
   * Check if Language Server is available (quick check)
   */
  async isAvailable(): Promise<boolean> {
    if (this.serverInfo) {
      return true;
    }
    return isLanguageServerRunning();
  }
}

// Singleton instance
let languageServerServiceInstance: LanguageServerService | null = null;

export function getLanguageServerService(pollingMs?: number): LanguageServerService {
  if (!languageServerServiceInstance) {
    languageServerServiceInstance = new LanguageServerService(pollingMs);
  }
  return languageServerServiceInstance;
}
