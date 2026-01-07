export type AccountStatus =
  | 'available'
  | 'rate_limited_claude'
  | 'rate_limited_gemini'
  | 'rate_limited_all';

export interface RateLimitInfo {
  resetTime: number;
  timeUntilReset: number;
  isExpired: boolean;
}

// Subscription tier based on quota patterns
export type SubscriptionTier = 'FREE' | 'PRO' | 'ULTRA';

// Per-model quota display for account cards/rows
export interface ModelQuotaDisplay {
  id: string;           // 'gemini-3-pro', 'gemini-3-flash', 'gemini-3-image', 'claude'
  displayName: string;  // 'G3 Pro', 'G3 Flash', 'G3 Image', 'Claude'
  percentage: number;
  resetTime: number | null;
  resetTimeFormatted?: string;
}

// Best account recommendation per model family
export interface BestAccountRecommendation {
  forGemini: { email: string; percentage: number } | null;
  forClaude: { email: string; percentage: number } | null;
}

// Account filter options for accounts page
export type AccountFilterType = 'all' | 'available' | 'low_quota' | 'PRO' | 'ULTRA' | 'FREE';

// Navigation pages
export type PageType = 'dashboard' | 'accounts' | 'logs' | 'settings';

export interface LocalAccount {
  email: string;
  projectId?: string;
  managedProjectId?: string;
  addedAt: number;
  lastUsed: number;
  isActive: boolean;
  activeForClaude: boolean;
  activeForGemini: boolean;
  status: AccountStatus;
  rateLimits: {
    claude?: RateLimitInfo;
    gemini?: RateLimitInfo;
  };
  burnRate1h?: number;
  subscriptionTier?: SubscriptionTier;
  modelQuotas?: ModelQuotaDisplay[];
}

export interface ModelQuotaInfo {
  modelName: string;
  displayName?: string;
  remainingFraction: number;
  remainingPercent: number;
  resetTime: string | null;
  resetTimeMs: number | null;
}

export interface AccountQuota {
  email: string;
  projectId?: string;
  lastFetched: number;
  fetchError?: string;
  models: ModelQuotaInfo[];
  claudeModels: ModelQuotaInfo[];
  geminiModels: ModelQuotaInfo[];
  claudeQuotaPercent: number | null;
  geminiQuotaPercent: number | null;
  claudeResetTime: number | null;
  geminiResetTime: number | null;
}

export interface DashboardStats {
  totalAccounts: number;
  availableAccounts: number;
  rateLimitedAccounts: number;
  activeAccount: string | null;
  lastUpdate: number;
}

export interface AccountDiff {
  op: 'add' | 'update' | 'remove';
  email: string;
  changes?: Partial<LocalAccount>;
  account?: LocalAccount;
}

export type WSMessageType =
  | 'initial'
  | 'accounts_update'
  | 'rate_limit_change'
  | 'stats_update'
  | 'new_call'
  | 'heartbeat'
  | 'config_update';

export interface WSMessage {
  type: WSMessageType;
  data: any;
  timestamp: number;
  seq?: number;
}

export interface UserPreferences {
  activeTab: string;
  accountsSortBy: string;
  accountsSortOrder: 'asc' | 'desc';
  accountsFilter: string;
  notificationsEnabled: boolean;
  notifyOnRateLimit: boolean;
  notifyOnRateLimitClear: boolean;
  theme: 'dark' | 'light' | 'system';
  refreshInterval: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  activeTab: 'overview',
  accountsSortBy: 'lastUsed',
  accountsSortOrder: 'desc',
  accountsFilter: 'all',
  notificationsEnabled: true,
  notifyOnRateLimit: true,
  notifyOnRateLimitClear: true,
  theme: 'dark',
  refreshInterval: 15000,
};

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface ApiCall {
  id?: number;
  timestamp: number;
  account_email: string;
  model: string;
  endpoint: string;
  request_tokens?: number;
  response_tokens?: number;
  total_tokens?: number;
  duration_ms: number;
  status: 'success' | 'error' | 'rate_limited';
  error_message?: string;
  http_status?: number;
}

// Session event log
export interface SessionEvent {
  id?: number;
  timestamp: number;
  event_type: string;
  account_email?: string;
  details?: string;
}

// Combined log entry
export interface CombinedLogEntry {
  id: number;
  timestamp: number;
  type: 'api_call' | 'session_event';
  account_email?: string;
  model?: string;
  event_type?: string;
  status?: string;
  total_tokens?: number;
  duration_ms?: number;
  details?: string;
  error_message?: string;
}

// Log filtering options
export interface LogFilters {
  accountEmail?: string;
  model?: string;
  status?: string;
  type?: 'api_call' | 'session_event' | 'all';
  startDate?: number;
  endDate?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

// Burn rate and projection types
export interface FamilyBurnRate {
  tokensUsed: number;
  percentPerHour: number;
  estimatedTotalQuota: number;
  timeToExhaustion: number | null;
  resetTime: number | null;
}

export interface AccountBurnRate {
  email: string;
  claudeTokens1h: number;
  geminiTokens1h: number;
  claudeQuotaPercent?: number;
  geminiQuotaPercent?: number;
  claudeResetTime?: number;
  geminiResetTime?: number;
}

// Timeline visualization types
export interface TimelineSlice {
  startTime: number;
  endTime: number;
  claudeTokens: number;
  geminiTokens: number;
  claudePercentUsed: number;
  geminiPercentUsed: number;
  currentSlice: boolean;
}

// ==================== Language Server Types ====================

/**
 * Prompt Credits information
 */
export interface PromptCreditsInfo {
  available: number;
  monthly: number;
  usedPercentage: number;
  remainingPercentage: number;
}

/**
 * Flow Credits information
 */
export interface FlowCreditsInfo {
  available: number;
  monthly: number;
  usedPercentage: number;
  remainingPercentage: number;
}

/**
 * Combined Token Usage information
 */
export interface TokenUsageInfo {
  promptCredits?: PromptCreditsInfo;
  flowCredits?: FlowCreditsInfo;
  totalAvailable: number;
  totalMonthly: number;
  overallRemainingPercentage: number;
}

/**
 * User subscription information
 */
export interface UserInfo {
  name?: string;
  email?: string;
  tier?: string;
  tierId?: string;
  tierDescription?: string;
  planName?: string;
  teamsTier?: string;
  upgradeUri?: string;
  upgradeText?: string;
  browserEnabled?: boolean;
  knowledgeBaseEnabled?: boolean;
  canBuyMoreCredits?: boolean;
  monthlyPromptCredits?: number;
  availablePromptCredits?: number;
}

/**
 * Language Server connection status
 */
export interface LanguageServerStatus {
  connected: boolean;
  error?: string;
  lastConnected?: number;
  serverInfo?: {
    port: number;
    csrfToken: string;
    pid?: number;
    protocol?: 'https' | 'http';
  };
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
  /** Reset time (ISO string) */
  resetTime: string;
  /** Time until reset description */
  timeUntilReset: string;
}

/**
 * Runway prediction data
 */
export interface RunwayPrediction {
  usageRate: number;     // % per hour
  runway: string;        // "~2h", "~3d", ">7d", "Stable"
  groupId: string;       // Which model group this applies to
}

// ==================== Account Management Types ====================

/**
 * Payload for adding a new account
 */
export interface AddAccountPayload {
  email: string;
  refreshToken: string;
  projectId?: string;
}

/**
 * Dashboard stats summary for stats cards
 */
export interface DashboardSummary {
  totalAccounts: number;
  avgGeminiQuota: number | null;
  avgGeminiImageQuota: number | null;
  avgClaudeQuota: number | null;
  minGeminiQuota: number | null;
  minGeminiImageQuota: number | null;
  minClaudeQuota: number | null;
  lowQuotaCount: number;
  rateLimitedCount: number;
  exhaustedCount: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================== Quota Window Types ====================

/**
 * Information about a 5-hour quota window for a model family
 */
export interface QuotaWindowInfo {
  family: 'claude' | 'gemini';
  windowStart: number;      // resetTime - 5h (ms timestamp)
  windowEnd: number;        // resetTime (ms timestamp)
  currentTime: number;      // now (ms timestamp)
  progressPercent: number;  // % through window (0-100)
  remainingMs: number;      // ms until reset
  quotaPercent: number;     // remaining quota % (average across accounts)
  accountCount: number;     // number of accounts with this quota
  burnRate: number | null;  // %/hour consumption rate (null if insufficient data)
  estimatedExhaustion: string | null; // "~2h 15m" or null if stable
}

/**
 * Combined quota window status for both families
 */
export interface QuotaWindowStatus {
  claude: QuotaWindowInfo | null;
  gemini: QuotaWindowInfo | null;
  timestamp: number;
}

// ==================== File Logger Types ====================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export type LogCategory = 'quota' | 'api' | 'auth' | 'system' | 'websocket' | 'accounts';

/**
 * A single log entry in the file log
 */
export interface FileLogEntry {
  ts: number;
  level: LogLevel;
  cat: LogCategory;
  msg: string;
  data?: Record<string, any>;
}

/**
 * Log file metadata
 */
export interface LogFileInfo {
  filename: string;
  date: string;
  size: number;
  entries: number;
}

/**
 * Accurate burn rate calculated from quota snapshots
 */
export interface AccurateBurnRate {
  family: 'claude' | 'gemini';
  burnRatePerHour: number;    // % per hour
  hoursRemaining: number | null;
  runway: string;             // "~2h", "~3d", ">7d", "Stable"
  dataPoints: number;         // number of snapshots used
  confidence: 'high' | 'medium' | 'low';
}
