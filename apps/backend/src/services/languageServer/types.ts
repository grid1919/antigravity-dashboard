/**
 * Language Server Type Definitions
 * 
 * Types for communicating with the Antigravity Language Server
 */

// ==================== Connection Related ====================

/**
 * Language Server connection information
 */
export interface LanguageServerInfo {
  /** API port (HTTPS/HTTP) */
  port: number;
  /** CSRF authentication token */
  csrfToken: string;
  /** Process ID of the language server */
  pid?: number;
  /** Protocol being used */
  protocol?: 'https' | 'http';
}

/**
 * Process detection options
 */
export interface DetectOptions {
  /** Maximum number of attempts (default 3) */
  attempts?: number;
  /** Base delay time in ms (default 1500) */
  baseDelay?: number;
  /** Whether to enable verbose logging */
  verbose?: boolean;
  /** Whether to suppress console output (for repeated polls) */
  silent?: boolean;
}

/**
 * Process information parsed from command line
 */
export interface ProcessInfo {
  /** Process ID */
  pid: number;
  /** Parent Process ID */
  ppid?: number;
  /** HTTP extension port */
  extensionPort: number;
  /** CSRF authentication token */
  csrfToken: string;
  /** Full command line for debugging */
  cmdline?: string;
}

/**
 * Platform strategy interface
 */
export interface PlatformStrategy {
  /** Get process list command */
  getProcessListCommand(): string;
  /** Parse process information from stdout */
  parseProcessInfo(stdout: string): ProcessInfo[];
}

// ==================== Quota Related ====================

/**
 * Prompt Credits information
 */
export interface PromptCreditsInfo {
  /** Available credits */
  available: number;
  /** Monthly total credits */
  monthly: number;
  /** Used percentage (0-100) */
  usedPercentage: number;
  /** Remaining percentage (0-100) */
  remainingPercentage: number;
}

/**
 * Flow Credits information (for complex operations)
 */
export interface FlowCreditsInfo {
  /** Available flow credits */
  available: number;
  /** Monthly total flow credits */
  monthly: number;
  /** Used percentage (0-100) */
  usedPercentage: number;
  /** Remaining percentage (0-100) */
  remainingPercentage: number;
}

/**
 * Combined Token Usage information for display
 */
export interface TokenUsageInfo {
  /** Prompt credits usage */
  promptCredits?: PromptCreditsInfo;
  /** Flow credits usage */
  flowCredits?: FlowCreditsInfo;
  /** Total available credits */
  totalAvailable: number;
  /** Total monthly credits */
  totalMonthly: number;
  /** Overall remaining percentage */
  overallRemainingPercentage: number;
}

/**
 * User subscription information
 */
export interface UserInfo {
  /** User display name */
  name?: string;
  /** User email */
  email?: string;
  /** Subscription tier name (e.g., "Pro", "Individual", "Enterprise") */
  tier?: string;
  /** Tier ID */
  tierId?: string;
  /** Tier description */
  tierDescription?: string;
  /** Plan name */
  planName?: string;
  /** Teams tier */
  teamsTier?: string;
  /** Upgrade subscription URI */
  upgradeUri?: string;
  /** Upgrade subscription text */
  upgradeText?: string;
  /** Whether browser feature is enabled */
  browserEnabled?: boolean;
  /** Whether knowledge base is enabled */
  knowledgeBaseEnabled?: boolean;
  /** Whether user can buy more credits */
  canBuyMoreCredits?: boolean;
  /** Monthly prompt credits limit */
  monthlyPromptCredits?: number;
  /** Available prompt credits */
  availablePromptCredits?: number;
}

/**
 * Model quota information from Language Server
 */
export interface LSModelQuotaInfo {
  /** Model display name */
  label: string;
  /** Model ID */
  modelId: string;
  /** Remaining quota percentage (0-100) */
  remainingPercentage: number;
  /** Whether quota is exhausted */
  isExhausted: boolean;
  /** Reset time */
  resetTime: Date;
  /** Time until reset description */
  timeUntilReset: string;
}

/**
 * Quota snapshot (quota state at a specific moment)
 */
export interface QuotaSnapshot {
  /** Snapshot timestamp */
  timestamp: Date;
  /** Prompt Credits information */
  promptCredits?: PromptCreditsInfo;
  /** Flow Credits information */
  flowCredits?: FlowCreditsInfo;
  /** Combined token usage info */
  tokenUsage?: TokenUsageInfo;
  /** User subscription information */
  userInfo?: UserInfo;
  /** Quota information for each model */
  models: LSModelQuotaInfo[];
}

// ==================== HTTP Related ====================

export type Protocol = 'https' | 'http';

export interface HttpRequestOptions {
  hostname: string;
  port: number;
  path: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  /** Whether to allow fallback to HTTP (default true) */
  allowFallback?: boolean;
}

export interface HttpResponse<T = unknown> {
  statusCode: number;
  data: T;
  /** Actually used protocol */
  protocol: Protocol;
}

// ==================== Server Response Types ====================

export interface RawModelConfig {
  label: string;
  modelOrAlias?: { model: string };
  quotaInfo?: {
    remainingFraction?: number;
    resetTime: string;
  };
}

export interface ServerUserStatusResponse {
  userStatus: {
    name?: string;
    email?: string;
    userTier?: {
      id?: string;
      name?: string;
      description?: string;
      upgradeSubscriptionUri?: string;
      upgradeSubscriptionText?: string;
    };
    planStatus?: {
      planInfo: {
        monthlyPromptCredits: number;
        monthlyFlowCredits?: number;
        planName?: string;
        teamsTier?: string;
        browserEnabled?: boolean;
        knowledgeBaseEnabled?: boolean;
        canBuyMoreCredits?: boolean;
      };
      availablePromptCredits: number;
      availableFlowCredits?: number;
    };
    cascadeModelConfigData?: {
      clientModelConfigs: RawModelConfig[];
    };
  };
}

// ==================== Service Status ====================

export interface LanguageServerStatus {
  /** Whether connected to LS */
  connected: boolean;
  /** Connection error if any */
  error?: string;
  /** Last successful connection time */
  lastConnected?: number;
  /** Server info if connected */
  serverInfo?: LanguageServerInfo;
  /** Last snapshot data */
  lastSnapshot?: QuotaSnapshot;
}
