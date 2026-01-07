/**
 * Configuration Manager with Hot Reload Support
 * Ported from antigravity2api-nodejs
 * 
 * Features:
 * - JSON config file management
 * - Hot reload without restart
 * - Deep merge for partial updates
 * - Type-safe configuration
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, watch } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { EventEmitter } from 'events';
import { deepMerge } from './deepMerge';

// Configuration file paths
const CONFIG_DIR = join(homedir(), '.config', 'opencode');
const DASHBOARD_CONFIG_PATH = join(CONFIG_DIR, 'antigravity-dashboard.json');

/**
 * Rotation strategy options
 */
export type RotationStrategy = 'round_robin' | 'quota_exhausted' | 'request_count';

/**
 * Dashboard configuration schema
 */
export interface DashboardConfig {
  server: {
    port: number;
    host: string;
    corsOrigins: string[];
  };
  rotation: {
    strategy: RotationStrategy;
    requestCount: number;
  };
  quotaPolling: {
    intervalMs: number;
    retryCount: number;
    retryDelayMs: number;
  };
  websocket: {
    heartbeatIntervalMs: number;
    clientTimeoutMs: number;
    maxConnections: number;
  };
  memory: {
    cleanupIntervalMs: number;
    poolSizes: {
      chunk: number;
      lineBuffer: number;
    };
  };
  security: {
    loginRateLimit: {
      maxAttempts: number;
      blockDurationMs: number;
      attemptWindowMs: number;
    };
  };
  features: {
    enableLanguageServer: boolean;
    enableFileLogging: boolean;
    logRetentionDays: number;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: DashboardConfig = {
  server: {
    port: 3456,
    host: '0.0.0.0',
    corsOrigins: ['*'],
  },
  rotation: {
    strategy: 'round_robin',
    requestCount: 50,
  },
  quotaPolling: {
    intervalMs: 120000,
    retryCount: 3,
    retryDelayMs: 1000,
  },
  websocket: {
    heartbeatIntervalMs: 30000,
    clientTimeoutMs: 60000,
    maxConnections: 100,
  },
  memory: {
    cleanupIntervalMs: 30 * 60 * 1000,
    poolSizes: {
      chunk: 30,
      lineBuffer: 5,
    },
  },
  security: {
    loginRateLimit: {
      maxAttempts: 5,
      blockDurationMs: 5 * 60 * 1000,
      attemptWindowMs: 15 * 60 * 1000,
    },
  },
  features: {
    enableLanguageServer: true,
    enableFileLogging: true,
    logRetentionDays: 7,
  },
};

class ConfigManager extends EventEmitter {
  private config: DashboardConfig;
  private configPath: string;
  private watcher: ReturnType<typeof watch> | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(configPath: string = DASHBOARD_CONFIG_PATH) {
    super();
    this.configPath = configPath;
    this.config = { ...DEFAULT_CONFIG };
    this.ensureConfigExists();
    this.loadConfig();
  }

  /**
   * Ensure config directory and file exist
   */
  private ensureConfigExists(): void {
    const dir = dirname(this.configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (!existsSync(this.configPath)) {
      this.saveConfig();
      console.log(`[ConfigManager] Created default config at ${this.configPath}`);
    }
  }

  /**
   * Load configuration from file
   */
  loadConfig(): void {
    try {
      const content = readFileSync(this.configPath, 'utf-8');
      const fileConfig = JSON.parse(content);
      this.config = deepMerge(
        DEFAULT_CONFIG as unknown as Record<string, unknown>,
        fileConfig
      ) as unknown as DashboardConfig;
      console.log('[ConfigManager] Configuration loaded');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ConfigManager] Error loading config:', message);
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Save configuration to file
   */
  saveConfig(): void {
    try {
      const dir = dirname(this.configPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
      console.log('[ConfigManager] Configuration saved');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ConfigManager] Error saving config:', message);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<DashboardConfig> {
    return this.config;
  }

  /**
   * Get a specific config section
   */
  get<K extends keyof DashboardConfig>(section: K): DashboardConfig[K] {
    return this.config[section];
  }

  /**
   * Update configuration with partial values
   * @param updates - Partial configuration updates
   * @param save - Whether to save to file (default: true)
   */
  updateConfig(updates: Partial<DashboardConfig>, save: boolean = true): void {
    const oldConfig = { ...this.config };
    this.config = deepMerge(
      this.config as unknown as Record<string, unknown>,
      updates as unknown as Record<string, unknown>
    ) as unknown as DashboardConfig;
    
    if (save) {
      this.saveConfig();
    }

    // Emit change events for affected sections
    for (const key of Object.keys(updates) as Array<keyof DashboardConfig>) {
      if (JSON.stringify(oldConfig[key]) !== JSON.stringify(this.config[key])) {
        this.emit('config_changed', { section: key, newValue: this.config[key], oldValue: oldConfig[key] });
      }
    }

    this.emit('config_updated', this.config);
  }

  /**
   * Update a specific section
   */
  updateSection<K extends keyof DashboardConfig>(
    section: K,
    updates: Partial<DashboardConfig[K]>,
    save: boolean = true
  ): void {
    const oldValue = { ...this.config[section] };
    this.config[section] = deepMerge(
      this.config[section] as Record<string, unknown>,
      updates as Record<string, unknown>
    ) as DashboardConfig[K];

    if (save) {
      this.saveConfig();
    }

    if (JSON.stringify(oldValue) !== JSON.stringify(this.config[section])) {
      this.emit('config_changed', { section, newValue: this.config[section], oldValue });
    }
  }

  /**
   * Start watching config file for changes
   */
  startWatching(): void {
    if (this.watcher) return;

    try {
      this.watcher = watch(this.configPath, (eventType) => {
        if (eventType === 'change') {
          // Debounce to avoid multiple reloads
          if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
          }
          this.debounceTimer = setTimeout(() => {
            console.log('[ConfigManager] Config file changed, reloading...');
            const oldConfig = { ...this.config };
            this.loadConfig();
            this.emit('config_reloaded', { oldConfig, newConfig: this.config });
          }, 100);
        }
      });
      console.log('[ConfigManager] Started watching config file');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ConfigManager] Error starting file watcher:', message);
    }
  }

  /**
   * Stop watching config file
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(save: boolean = true): void {
    this.config = { ...DEFAULT_CONFIG };
    if (save) {
      this.saveConfig();
    }
    this.emit('config_reset', this.config);
  }

  /**
   * Get config file path
   */
  getConfigPath(): string {
    return this.configPath;
  }
}

// Singleton instance
let configManagerInstance: ConfigManager | null = null;

export function getConfigManager(configPath?: string): ConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new ConfigManager(configPath);
  }
  return configManagerInstance;
}

export { ConfigManager, DEFAULT_CONFIG, DASHBOARD_CONFIG_PATH };
