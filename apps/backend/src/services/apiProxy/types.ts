/**
 * API Proxy Types
 * Types for Claude Code and OpenAI-compatible API proxy
 */

// ==================== Antigravity Request Types ====================

export interface AntigravityMessagePart {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: {
    id: string;
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    id: string;
    name: string;
    response: { output: string };
  };
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface AntigravityMessage {
  role: 'user' | 'model';
  parts: AntigravityMessagePart[];
}

export interface AntigravityGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  thinkingConfig?: {
    includeThoughts: boolean;
    thinkingBudget: number;
  };
  stopSequences?: string[];
}

export interface AntigravityRequest {
  project: string;
  requestId: string;
  request: {
    contents: AntigravityMessage[];
    tools?: AntigravityTool[];
    toolConfig?: {
      functionCallingConfig: {
        mode: 'VALIDATED' | 'AUTO' | 'NONE';
      };
    };
    generationConfig: AntigravityGenerationConfig;
    sessionId: string;
    systemInstruction?: {
      role: 'user';
      parts: Array<{ text: string }>;
    };
  };
  model: string;
  userAgent: string;
}

export interface AntigravityTool {
  functionDeclarations?: Array<{
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }>;
}

// ==================== Claude API Types ====================

export interface ClaudeMessageContent {
  type: 'text' | 'image' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  thinking?: string;
  signature?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | ClaudeMessageContent[];
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeMessageContent[];
}

export interface ClaudeToolDefinition {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
}

export interface ClaudeRequest {
  model: string;
  messages: ClaudeMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  system?: string;
  tools?: ClaudeToolDefinition[];
  thinking?: {
    type: 'enabled' | 'disabled';
    budget_tokens?: number;
  };
}

export interface ClaudeResponseContentBlock {
  type: 'text' | 'tool_use' | 'thinking';
  text?: string;
  thinking?: string;
  signature?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ClaudeResponseContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ==================== OpenAI API Types ====================

export interface OpenAIMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | OpenAIMessageContent[] | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: OpenAIToolDefinition[];
  reasoning_effort?: 'low' | 'medium' | 'high';
  thinking_budget?: number;
}

export interface OpenAIChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string | null;
    reasoning_content?: string;
    tool_calls?: OpenAIToolCall[];
  };
  finish_reason: 'stop' | 'tool_calls' | 'length';
}

export interface OpenAIResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ==================== Proxy Configuration ====================

export interface ProxyConfig {
  apiKey: string;
  enabled: boolean;
  port: number;
  systemInstruction?: string;
  defaultModel?: string;
  rotationStrategy: 'round_robin' | 'quota_based' | 'request_count';
  requestCountPerToken: number;
  timeout: number;
  maxRetries: number;
  heartbeatInterval: number;
}

export interface ProxyStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  activeConnections: number;
  lastRequestTime: number | null;
  requestsByModel: Record<string, number>;
  requestsByAccount: Record<string, number>;
}

// ==================== Token/Session Context ====================

export interface TokenContext {
  accessToken: string;
  refreshToken: string;
  projectId: string;
  email: string;
  sessionId: string;
  expiresAt: number;
}

export interface StreamCallbackData {
  type: 'content' | 'reasoning' | 'tool_calls' | 'usage' | 'error';
  content?: string;
  reasoning_content?: string;
  tool_calls?: OpenAIToolCall[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  thoughtSignature?: string;
  error?: string;
}

// ==================== Model Mapping ====================

export const MODEL_MAPPING: Record<string, string> = {
  // Claude official models -> Antigravity models
  'claude-3-5-sonnet-latest': 'claude-sonnet-4-5',
  'claude-3-5-sonnet-20241022': 'claude-sonnet-4-5',
  'claude-3-opus-20240229': 'claude-opus-4-5-thinking',
  'claude-3-opus-latest': 'claude-opus-4-5-thinking',
  'claude-sonnet-4-5-20250929': 'claude-sonnet-4-5',
  'claude-opus-4-5-20250514': 'claude-opus-4-5-thinking',
  'claude-sonnet-4-5-thinking': 'claude-sonnet-4-5',
  'claude-opus-4-5': 'claude-opus-4-5-thinking',
  
  // Gemini models
  'gemini-2.5-flash-thinking': 'gemini-2.5-flash',
};

export const THINKING_MODELS = new Set([
  'gemini-2.5-pro',
  'gemini-3-flash',
  'gemini-3-pro-high',
  'gemini-3-pro-low',
  'claude-opus-4-5-thinking',
  'claude-sonnet-4-5-thinking',
  'rev19-uic3-1p',
  'gpt-oss-120b-medium',
]);

export const REASONING_EFFORT_MAP: Record<string, number> = {
  low: 1024,
  medium: 16000,
  high: 32000,
};

export const DEFAULT_STOP_SEQUENCES = [
  '<|user|>',
  '<|bot|>',
  '<|context_request|>',
  '<|endoftext|>',
  '<|end_of_turn|>',
];

// ==================== Antigravity Endpoints ====================

export const ANTIGRAVITY_ENDPOINTS = {
  // IMPORTANT: ?alt=sse is required for Server-Sent Events streaming to work properly
  stream: 'https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:streamGenerateContent?alt=sse',
  noStream: 'https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:generateContent',
  models: 'https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:fetchAvailableModels',
};

export const ANTIGRAVITY_HEADERS = {
  'User-Agent': 'antigravity/1.11.5 windows/amd64',
  'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
  'Client-Metadata': '{"ideType":"IDE_UNSPECIFIED","platform":"PLATFORM_UNSPECIFIED","pluginType":"GEMINI"}',
};
