/**
 * Language Server Module
 * 
 * Export barrel for the Language Server service
 */

export { LanguageServerService, getLanguageServerService } from './languageServerService';
export { detectLanguageServer, isLanguageServerRunning } from './detect';
export { httpRequest, testPort, clearProtocolCache } from './httpClient';
export { getPlatformStrategy, isPlatformSupported } from './platforms';

// Re-export types
export type {
  LanguageServerInfo,
  LanguageServerStatus,
  QuotaSnapshot,
  PromptCreditsInfo,
  FlowCreditsInfo,
  TokenUsageInfo,
  UserInfo,
  LSModelQuotaInfo,
  ProcessInfo,
  DetectOptions,
  Protocol,
  HttpRequestOptions,
  HttpResponse,
} from './types';
