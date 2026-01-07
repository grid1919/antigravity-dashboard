/**
 * Message Format Converter
 * Converts Claude/OpenAI API formats to Antigravity format
 */

import { randomUUID } from 'crypto';
import {
  AntigravityMessage,
  AntigravityMessagePart,
  AntigravityRequest,
  AntigravityGenerationConfig,
  AntigravityTool,
  ClaudeRequest,
  ClaudeMessage,
  ClaudeMessageContent,
  ClaudeToolDefinition,
  OpenAIRequest,
  OpenAIMessage,
  OpenAIToolDefinition,
  MODEL_MAPPING,
  THINKING_MODELS,
  REASONING_EFFORT_MAP,
  DEFAULT_STOP_SEQUENCES,
} from './types.js';

// ==================== Constants ====================

const CLAUDE_THOUGHT_SIGNATURE = 'RXNZRENrZ0lDaEFDR0FJcVFMZzVPTmZsd1ZHNmZKK3labDJ0TkNlRzc5QUpzUHV2OW9UZG1yc0JUUGNsUjFBQWhKNWlYcXhlU0dTaEtxeWJ1NUdaM2YvMXByaHJCSnk3OEhsWkxOd1NEREI5Mi8zQXFlYkUvY3RISEJvTXlGVHNzdzRJZXkxUTFkUURJakE3R3AwSXJQeW0xdWxLMVBXcFhuRElPdmJFRFd4LzV2cUZaQTg2NWU1SkM3QnY2dkxwZE43M2dLYkljaThobGR3cXF3S1VMbHE5b3NMdjc3QnNhZm5mbDhlbUd5NmJ6WVRpUnRWcXA0MDJabmZ2Tnl3T2hJd1BBV0l1SUNTdjFTemswZlNmemR0Z2R5eGgxaUJOZHhHNXVhZWhKdWhlUUwza3RDZWVxa2dMNFE0ZjRKWkFnR3pKOHNvaStjZ1pqRXJHT1lyNjJkdkxnUUVoT1E5MjN6bEUwRFd4aXdPU1JOK3VSRWdHZ0FKVkhZcjBKVzhrVTZvaEVaYk1IVkE4aG14ZElGMm9YK1ZxRnFUSGFDZWZEYWNQNTJVOW94VmJ0cFhrNnJUanQ2ZHpadEFMWThXQWs5RFI3bTJTbGova2VraXFzVVBRbFdIaFNUN3diZGpuVkYvdUVoODRWbXQ5WjdtaThtR2JEcTdaTHVOalF0T3hHMVpXbXJmeUpCMExwa0R1SnZDV01qZ3BqTHdsU0R4SUpmeEFoT2JzQlVpRzdLTDYwcUluanZaK1VTcXdjZGhmN0U3ZjgrN0l2ZXczRC9DZUYvdlptQ0JqU2JTcUdYYmFIQmdC';
const GEMINI_THOUGHT_SIGNATURE = 'EqAHCp0HAXLI2nygRbdzD4Vgzxxi7tbM87zIRkNgPLqTj+Jxv9mY8Q0G87DzbTtvsIFhWB0RZMoEK6ntm5GmUe6ADtxHk4zgHUs/FKqTu8tzUdPRDrKn3KCAtFW4LJqijZoFxNKMyQRmlgPUX4tGYE7pllD77UK6SjCwKhKZoSVZLMiPXP9YFktbida1Q5upXMrzG1t8abPmpFo983T/rgWlNqJp+Fb+bsoH0zuSpmU4cPKO3LIGsxBhvRhM/xydahZD+VpEX7TEJAN58z1RomFyx9u0IR7ukwZr2UyoNA+uj8OChUDFupQsVwbm3XE1UAt22BGvfYIyyZ42fxgOgsFFY+AZ72AOufcmZb/8vIw3uEUgxHczdl+NGLuS4Hsy/AAntdcH9sojSMF3qTf+ZK1FMav23SPxUBtU5T9HCEkKqQWRnMsVGYV1pupFisWo85hRLDTUipxVy9ug1hN8JBYBNmGLf8KtWLhVp7Z11PIAZj3C6HzoVyiVeuiorwNrn0ZaaXNe+y5LHuDF0DNZhrIfnXByq6grLLSAv4fTLeCJvfGzTWWyZDMbVXNx1HgumKq8calP9wv33t0hfEaOlcmfGIyh1J/N+rOGR0WXcuZZP5/VsFR44S2ncpwTPT+MmR0PsjocDenRY5m/X4EXbGGkZ+cfPnWoA64bn3eLeJTwxl9W1ZbmYS6kjpRGUMxExgRNOzWoGISddHCLcQvN7o50K8SF5k97rxiS5q4rqDmqgRPXzQTQnZyoL3dCxScX9cvLSjNCZDcotonDBAWHfkXZ0/EmFiONQcLJdANtAjwoA44Mbn50gubrTsNd7d0Rm/hbNEh/ZceUalV5MMcl6tJtahCJoybQMsnjWuBXl7cXiKmqAvxTDxIaBgQBYAo4FrbV4zQv35zlol+O3YiyjJn/U0oBeO5pEcH1d0vnLgYP71jZVY2FjWRKnDR9aw4JhiuqAa+i0tupkBy+H4/SVwHADFQq6wcsL8qvXlwktJL9MIAoaXDkIssw6gKE9EuGd7bSO9f+sA8CZ0I8LfJ3jcHUsE/3qd4pFrn5RaET56+1p8ZHZDDUQ0p1okApUCCYsC2WuL6O9P4fcg3yitAA/AfUUNjHKANE+ANneQ0efMG7fx9bvI+iLbXgPupApoov24JRkmhHsrJiu9bp+G/pImd2PNv7ArunJ6upl0VAUWtRyLWyGfdl6etGuY8vVJ7JdWEQ8aWzRK3g6e+8YmDtP5DAfw==';
const CLAUDE_TOOL_SIGNATURE = 'RXVNQkNrZ0lDaEFDR0FJcVFLZGsvMnlyR0VTbmNKMXEyTFIrcWwyY2ozeHhoZHRPb0VOYWJ2VjZMSnE2MlBhcEQrUWdIM3ZWeHBBUG9rbGN1aXhEbXprZTcvcGlkbWRDQWs5MWcrTVNERnRhbWJFOU1vZWZGc1pWSGhvTUxsMXVLUzRoT3BIaWwyeXBJakNYa05EVElMWS9talprdUxvRjFtMmw5dnkrbENhSDNNM3BYNTM0K1lRZ0NaWTQvSUNmOXo4SkhZVzU2Sm1WcTZBcVNRUURBRGVMV1BQRXk1Q0JsS0dCZXlNdHp2NGRJQVlGbDFSMDBXNGhqNHNiSWNKeGY0UGZVQTBIeE1mZjJEYU5BRXdrWUJ4MmNzRFMrZGM1N1hnUlVNblpkZ0hTVHVNaGdod1lBUT09';
const GEMINI_TOOL_SIGNATURE = 'EqoNCqcNAXLI2nwkidsFconk7xHt7x0zIOX7n/JR7DTKiPa/03uqJ9OmZaujaw0xNQxZ0wNCx8NguJ+sAfaIpek62+aBnciUTQd5UEmwM/V5o6EA2wPvv4IpkXyl6Eyvr8G+jD/U4c2Tu4M4WzVhcImt9Lf/ZH6zydhxgU9ZgBtMwck292wuThVNqCZh9akqy12+BPHs9zW8IrPGv3h3u64Q2Ye9Mzx+EtpV2Tiz8mcq4whdUu72N6LQVQ+xLLdzZ+CQ7WgEjkqOWQs2C09DlAsdu5vjLeF5ZgpL9seZIag9Dmhuk589l/I20jGgg7EnCgojzarBPHNOCHrxTbcp325tTLPa6Y7U4PgofJEkv0MX4O22mu/On6TxAlqYkVa6twdEHYb+zMFWQl7SVFwQTY9ub7zeSaW+p/yJ+5H43LzC95aEcrfTaX0P2cDWGrQ1IVtoaEWPi7JVOtDSqchVC1YLRbIUHaWGyAysx7BRoSBIr46aVbGNy2Xvt35Vqt0tDJRyBdRuKXTmf1px6mbDpsjldxE/YLzCkCtAp1Ji1X9XPFhZbj7HTNIjCRfIeHA/6IyOB0WgBiCw5e2p50frlixd+iWD3raPeS/VvCBvn/DPCsnH8lzgpDQqaYeN/y0K5UWeMwFUg+00YFoN9D34q6q3PV9yuj1OGT2l/DzCw8eR5D460S6nQtYOaEsostvCgJGipamf/dnUzHomoiqZegJzfW7uzIQl1HJXQJTnpTmk07LarQwxIPtId9JP+dXKLZMw5OAYWITfSXF5snb7F1jdN0NydJOVkeanMsxnbIyU7/iKLDWJAmcRru/GavbJGgB0vJgY52SkPi9+uhfF8u60gLqFpbhsal3oxSPJSzeg+TN/qktBGST2YvLHxilPKmLBhggTUZhDSzSjxPfseE41FHYniyn6O+b3tujCdvexnrIjmmX+KTQC3ovjfk/ArwImI/cGihFYOc+wDnri5iHofdLbFymE/xb1Q4Sn06gVq1sgmeeS/li0F6C0v9GqOQ4olqQrTT2PPDVMbDrXgjZMfHk9ciqQ5OB6r19uyIqb6lFplKsE/ZSacAGtw1K0HENMq9q576m0beUTtNRJMktXem/OJIDbpRE0cXfBt1J9VxYHBe6aEiIZmRzJnXtJmUCjqfLPg9n0FKUIjnnln7as+aiRpItb5ZfJjrMEu154ePgUa1JYv2MA8oj5rvzpxRSxycD2p8HTxshitnLFI8Q6Kl2gUqBI27uzYSPyBtrvWZaVtrXYMiyjOFBdjUFunBIW2UvoPSKYEaNrUO3tTSYO4GjgLsfCRQ2CMfclq/TbCALjvzjMaYLrn6OKQnSDI/Tt1J6V6pDXfSyLdCIDg77NTvdqTH2Cv3yT3fE3nOOW5mUPZtXAIxPkFGo9eL+YksEgLIeZor0pdb+BHs1kQ4z7EplCYVhpTbo6fMcarW35Qew9HPMTFQ03rQaDhlNnUUI3tacnDMQvKsfo4OPTQYG2zP4lHXSsf4IpGRJyTBuMGK6siiKBiL/u73HwKTDEu2RU/4ZmM6dQJkoh+6sXCCmoZuweYOeF2cAx2AJAHD72qmEPzLihm6bWeSRXDxJGm2RO85NgK5khNfV2Mm1etmQdDdbTLJV5FTvJQJ5zVDnYQkk7SKDio9rQMBucw5M6MyvFFDFdzJQlVKZm/GZ5T21GsmNHMJNd9G2qYAKwUV3Mb64Ipk681x8TFG+1AwkfzSWCHnbXMG2bOX+JUt/4rldyRypArvxhyNimEDc7HoqSHwTVfpd6XA0u8emcQR1t+xAR2BiT/elQHecAvhRtJt+ts44elcDIzTCBiJG4DEoV8X0pHb1oTLJFcD8aF29BWczl4kYDPtR9Dtlyuvmaljt0OEeLz9zS0MGvpflvMtUmFdGq7ZP+GztIdWup4kZZ59pzTuSR9itskMAnqYj+V9YBCSUUmsxW6Zj4Uvzw0nLYsjIgT';

// Tool name cache for mapping sanitized names back to originals
const toolNameCache = new Map<string, Map<string, string>>();

// ==================== Utility Functions ====================

export function generateRequestId(): string {
  return randomUUID();
}

export function generateSessionId(): string {
  return `session-${randomUUID()}`;
}

export function generateToolCallId(): string {
  return `call_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

/**
 * Map model names from Claude/OpenAI format to Antigravity format
 */
export function mapModel(modelName: string): string {
  // Check direct mapping first
  if (MODEL_MAPPING[modelName]) {
    return MODEL_MAPPING[modelName];
  }

  // Dynamic pattern matching for Anthropic model naming formats
  
  // Pattern 1: claude-{type}-{version}-{date} (Claude 4+ format)
  // e.g., claude-sonnet-4-5-20250929, claude-opus-4-20250514
  const pattern1 = modelName.match(/^claude-(sonnet|opus|haiku)-\d+(-\d+)?-\d{8}$/);
  if (pattern1) {
    const type = pattern1[1];
    if (type === 'opus') return 'claude-opus-4-5-thinking';
    return 'claude-sonnet-4-5';
  }

  // Pattern 2: claude-{major}-{minor}-{type}-{date} (Claude 3.x format)
  // e.g., claude-3-5-sonnet-20241022
  const pattern2 = modelName.match(/^claude-\d+-\d+-(sonnet|opus|haiku)-\d{8}$/);
  if (pattern2) {
    const type = pattern2[1];
    if (type === 'opus') return 'claude-opus-4-5-thinking';
    return 'claude-sonnet-4-5';
  }

  // Pattern 3: claude-{major}-{type}-{date} (Claude 3 format)
  // e.g., claude-3-opus-20240229
  const pattern3 = modelName.match(/^claude-\d+-(sonnet|opus|haiku)-\d{8}$/);
  if (pattern3) {
    const type = pattern3[1];
    if (type === 'opus') return 'claude-opus-4-5-thinking';
    return 'claude-sonnet-4-5';
  }

  // Pattern 4: claude-{version}-{type}-latest
  // e.g., claude-3-5-sonnet-latest
  const pattern4 = modelName.match(/^claude-(\d+-)?(.+)-latest$/);
  if (pattern4) {
    const remainder = pattern4[2];
    if (remainder.includes('opus')) return 'claude-opus-4-5-thinking';
    return 'claude-sonnet-4-5';
  }

  // Return original if no mapping found
  return modelName;
}

/**
 * Check if thinking/reasoning mode should be enabled for this model
 */
export function isThinkingEnabled(modelName: string): boolean {
  if (THINKING_MODELS.has(modelName)) {
    return true;
  }
  
  return modelName.includes('-thinking') ||
    modelName === 'gemini-2.5-pro' ||
    modelName === 'gemini-3-flash' ||
    modelName.startsWith('gemini-3-pro-') ||
    modelName === 'rev19-uic3-1p' ||
    modelName === 'gpt-oss-120b-medium';
}

/**
 * Get thought signature for model type
 */
export function getThoughtSignature(modelName: string): string {
  const lower = modelName.toLowerCase();
  if (lower.includes('gemini')) return GEMINI_THOUGHT_SIGNATURE;
  return CLAUDE_THOUGHT_SIGNATURE;
}

/**
 * Get tool signature for model type
 */
export function getToolSignature(modelName: string): string {
  const lower = modelName.toLowerCase();
  if (lower.includes('gemini')) return GEMINI_TOOL_SIGNATURE;
  return CLAUDE_TOOL_SIGNATURE;
}

/**
 * Sanitize tool name to be API compatible
 */
export function sanitizeToolName(name: string): string {
  if (!name || typeof name !== 'string') return 'tool';
  let cleaned = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  cleaned = cleaned.replace(/^_+|_+$/g, '');
  if (!cleaned) cleaned = 'tool';
  if (cleaned.length > 128) cleaned = cleaned.slice(0, 128);
  return cleaned;
}

/**
 * Set mapping between sanitized and original tool name
 */
export function setToolNameMapping(model: string, safeName: string, originalName: string): void {
  if (!toolNameCache.has(model)) {
    toolNameCache.set(model, new Map());
  }
  toolNameCache.get(model)!.set(safeName, originalName);
}

/**
 * Get original tool name from sanitized name
 */
export function getOriginalToolName(model: string, safeName: string): string | undefined {
  return toolNameCache.get(model)?.get(safeName);
}

/**
 * Clean parameters schema to remove unsupported fields
 */
function cleanParameters(obj: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj ?? {};
  
  const EXCLUDED_KEYS = new Set([
    '$schema', 'additionalProperties', 'minLength', 'maxLength',
    'minItems', 'maxItems', 'uniqueItems', 'exclusiveMaximum',
    'exclusiveMinimum', 'const', 'anyOf', 'oneOf', 'allOf',
    'any_of', 'one_of', 'all_of', 'multipleOf'
  ]);
  
  if (Array.isArray(obj)) {
    return obj.map(item => 
      item && typeof item === 'object' ? cleanParameters(item as Record<string, unknown>) : item
    ) as unknown as Record<string, unknown>;
  }
  
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (EXCLUDED_KEYS.has(key)) continue;
    cleaned[key] = (value && typeof value === 'object') 
      ? cleanParameters(value as Record<string, unknown>) 
      : value;
  }
  return cleaned;
}

// ==================== Generation Config ====================

export function generateGenerationConfig(
  parameters: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
    thinking_budget?: number;
    reasoning_effort?: 'low' | 'medium' | 'high';
  },
  enableThinking: boolean,
  modelName: string
): AntigravityGenerationConfig {
  const DEFAULT_THINKING_BUDGET = 8192;
  const DEFAULT_MAX_TOKENS = 16384;
  
  const config: AntigravityGenerationConfig = {
    temperature: parameters.temperature ?? 0.7,
    topP: parameters.top_p ?? 0.9,
    topK: parameters.top_k ?? 40,
    maxOutputTokens: parameters.max_tokens ?? DEFAULT_MAX_TOKENS,
    stopSequences: DEFAULT_STOP_SEQUENCES,
  };

  if (enableThinking) {
    let thinkingBudget = parameters.thinking_budget;
    
    if (thinkingBudget === undefined && parameters.reasoning_effort) {
      thinkingBudget = REASONING_EFFORT_MAP[parameters.reasoning_effort] ?? DEFAULT_THINKING_BUDGET;
    }
    
    thinkingBudget = thinkingBudget ?? DEFAULT_THINKING_BUDGET;
    
    if (config.maxOutputTokens! <= thinkingBudget) {
      config.maxOutputTokens = thinkingBudget + 8192;
    }
    
    config.thinkingConfig = {
      includeThoughts: true,
      thinkingBudget: thinkingBudget,
    };
    
    if (modelName && modelName.includes('claude')) {
      delete config.topP;
    }
  }

  return config;
}

// ==================== Tool Conversion ====================

/**
 * Convert Claude tools to Antigravity format
 */
export function convertClaudeTools(
  tools: ClaudeToolDefinition[] | undefined,
  sessionId: string,
  modelName: string
): AntigravityTool[] {
  if (!tools || tools.length === 0) return [];

  return tools.map(tool => {
    const originalName = tool.name;
    const safeName = sanitizeToolName(originalName);
    
    if (safeName !== originalName) {
      setToolNameMapping(modelName, safeName, originalName);
    }

    const rawParams = tool.input_schema || {};
    const cleanedParams = cleanParameters(rawParams);
    if (cleanedParams.type === undefined) cleanedParams.type = 'object';
    if (cleanedParams.type === 'object' && cleanedParams.properties === undefined) {
      cleanedParams.properties = {};
    }

    return {
      functionDeclarations: [{
        name: safeName,
        description: tool.description || '',
        parameters: cleanedParams,
      }],
    };
  });
}

/**
 * Convert OpenAI tools to Antigravity format
 */
export function convertOpenAITools(
  tools: OpenAIToolDefinition[] | undefined,
  sessionId: string,
  modelName: string
): AntigravityTool[] {
  if (!tools || tools.length === 0) return [];

  return tools.map(tool => {
    const func = tool.function;
    const originalName = func.name;
    const safeName = sanitizeToolName(originalName);
    
    if (safeName !== originalName) {
      setToolNameMapping(modelName, safeName, originalName);
    }

    const rawParams = func.parameters || {};
    const cleanedParams = cleanParameters(rawParams);
    if (cleanedParams.type === undefined) cleanedParams.type = 'object';
    if (cleanedParams.type === 'object' && cleanedParams.properties === undefined) {
      cleanedParams.properties = {};
    }

    return {
      functionDeclarations: [{
        name: safeName,
        description: func.description || '',
        parameters: cleanedParams,
      }],
    };
  });
}

// ==================== Message Conversion ====================

interface ExtractedContent {
  text: string;
  images: AntigravityMessagePart[];
}

/**
 * Extract text and images from Claude content
 */
function extractClaudeContent(content: string | ClaudeMessageContent[]): ExtractedContent {
  const result: ExtractedContent = { text: '', images: [] };
  
  if (typeof content === 'string') {
    result.text = content;
    return result;
  }
  
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item.type === 'text' && item.text) {
        result.text += item.text;
      } else if (item.type === 'image' && item.source) {
        if (item.source.type === 'base64' && item.source.data) {
          result.images.push({
            inlineData: {
              mimeType: item.source.media_type || 'image/png',
              data: item.source.data,
            },
          });
        }
      }
    }
  }
  
  return result;
}

/**
 * Find function name by tool call ID in message history
 */
function findFunctionNameById(toolCallId: string, messages: AntigravityMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'model') {
      for (const part of messages[i].parts) {
        if (part.functionCall && part.functionCall.id === toolCallId) {
          return part.functionCall.name;
        }
      }
    }
  }
  return '';
}

/**
 * Create a thought part with signature
 */
function createThoughtPart(text: string, signature?: string): AntigravityMessagePart {
  const part: AntigravityMessagePart = { text: text || ' ', thought: true };
  if (signature) part.thoughtSignature = signature;
  return part;
}

/**
 * Create a function call part
 */
function createFunctionCallPart(
  id: string,
  name: string,
  args: Record<string, unknown> | string,
  signature?: string
): AntigravityMessagePart {
  const part: AntigravityMessagePart = {
    functionCall: {
      id,
      name,
      args: typeof args === 'string' ? JSON.parse(args) : args,
    },
  };
  if (signature) {
    part.thoughtSignature = signature;
  }
  return part;
}

/**
 * Convert Claude messages to Antigravity format
 */
export function convertClaudeMessages(
  messages: ClaudeMessage[],
  enableThinking: boolean,
  modelName: string,
  sessionId: string,
  hasTools: boolean
): AntigravityMessage[] {
  const antigravityMessages: AntigravityMessage[] = [];
  const thoughtSignature = getThoughtSignature(modelName);
  const toolSignature = getToolSignature(modelName);

  for (const message of messages) {
    if (message.role === 'user') {
      const content = message.content;
      
      // Check if this is a tool result message
      if (Array.isArray(content) && content.some(item => item.type === 'tool_result')) {
        // Process tool results
        for (const item of content) {
          if (item.type !== 'tool_result') continue;
          
          const toolUseId = item.tool_use_id!;
          const functionName = findFunctionNameById(toolUseId, antigravityMessages);
          
          let resultContent = '';
          if (typeof item.content === 'string') {
            resultContent = item.content;
          } else if (Array.isArray(item.content)) {
            resultContent = (item.content as ClaudeMessageContent[])
              .filter(c => c.type === 'text')
              .map(c => c.text)
              .join('');
          }
          
          const functionResponse: AntigravityMessagePart = {
            functionResponse: {
              id: toolUseId,
              name: functionName,
              response: { output: resultContent },
            },
          };
          
          // Add to existing user message or create new one
          const lastMessage = antigravityMessages[antigravityMessages.length - 1];
          if (lastMessage?.role === 'user' && lastMessage.parts.some(p => p.functionResponse)) {
            lastMessage.parts.push(functionResponse);
          } else {
            antigravityMessages.push({ role: 'user', parts: [functionResponse] });
          }
        }
      } else {
        // Regular user message
        const extracted = extractClaudeContent(content);
        antigravityMessages.push({
          role: 'user',
          parts: [{ text: extracted.text || ' ' }, ...extracted.images],
        });
      }
    } else if (message.role === 'assistant') {
      // Handle assistant message
      const content = message.content;
      let textContent = '';
      const toolCalls: AntigravityMessagePart[] = [];
      let messageSignature: string | null = null;

      if (typeof content === 'string') {
        textContent = content;
      } else if (Array.isArray(content)) {
        for (const item of content) {
          if (item.type === 'text' && item.text) {
            textContent += item.text;
          } else if (item.type === 'thinking') {
            // Capture signature from thinking blocks
            if (!messageSignature && item.signature) {
              messageSignature = item.signature;
            }
          } else if (item.type === 'tool_use') {
            const safeName = sanitizeToolName(item.name!);
            if (safeName !== item.name) {
              setToolNameMapping(modelName, safeName, item.name!);
            }
            const signature = enableThinking 
              ? (item.signature || messageSignature || toolSignature || thoughtSignature) 
              : undefined;
            toolCalls.push(createFunctionCallPart(
              item.id!,
              safeName,
              item.input || {},
              signature
            ));
          }
        }
      }

      const parts: AntigravityMessagePart[] = [];
      
      if (enableThinking) {
        const signature = messageSignature || thoughtSignature;
        if (signature) {
          parts.push(createThoughtPart(' ', signature));
        }
      }
      
      if (textContent.trim()) {
        parts.push({ text: textContent.trimEnd() });
      }
      
      parts.push(...toolCalls);
      
      if (parts.length > 0) {
        // Check if we should merge with previous model message
        const lastMessage = antigravityMessages[antigravityMessages.length - 1];
        if (lastMessage?.role === 'model' && toolCalls.length > 0 && !textContent.trim()) {
          lastMessage.parts.push(...toolCalls);
        } else {
          antigravityMessages.push({ role: 'model', parts });
        }
      }
    }
  }

  return antigravityMessages;
}

/**
 * Extract system instruction from OpenAI messages
 */
function extractSystemInstruction(messages: OpenAIMessage[]): string {
  const systemTexts: string[] = [];
  
  for (const message of messages) {
    if (message.role === 'system') {
      const content = typeof message.content === 'string'
        ? message.content
        : (Array.isArray(message.content)
            ? message.content.filter(item => item.type === 'text').map(item => item.text).join('')
            : '');
      if (content.trim()) systemTexts.push(content.trim());
    } else {
      break; // Stop at first non-system message
    }
  }

  return systemTexts.join('\n\n');
}

/**
 * Convert OpenAI messages to Antigravity format
 */
export function convertOpenAIMessages(
  messages: OpenAIMessage[],
  enableThinking: boolean,
  modelName: string,
  sessionId: string,
  hasTools: boolean
): { contents: AntigravityMessage[]; systemInstruction: string } {
  const antigravityMessages: AntigravityMessage[] = [];
  const systemInstruction = extractSystemInstruction(messages);
  const thoughtSignature = getThoughtSignature(modelName);
  const toolSignature = getToolSignature(modelName);

  // Skip system messages (already extracted)
  const nonSystemMessages = messages.filter(m => m.role !== 'system');

  for (const message of nonSystemMessages) {
    if (message.role === 'user') {
      let text = '';
      const images: AntigravityMessagePart[] = [];
      
      if (typeof message.content === 'string') {
        text = message.content;
      } else if (Array.isArray(message.content)) {
        for (const item of message.content) {
          if (item.type === 'text' && item.text) {
            text += item.text;
          } else if (item.type === 'image_url' && item.image_url) {
            // Handle image URL (data URL or external)
            const url = item.image_url.url;
            if (url.startsWith('data:')) {
              const match = url.match(/^data:([^;]+);base64,(.+)$/);
              if (match) {
                images.push({
                  inlineData: {
                    mimeType: match[1],
                    data: match[2],
                  },
                });
              }
            }
          }
        }
      }
      
      antigravityMessages.push({
        role: 'user',
        parts: [{ text: text || ' ' }, ...images],
      });
    } else if (message.role === 'assistant') {
      const parts: AntigravityMessagePart[] = [];
      
      if (enableThinking) {
        parts.push(createThoughtPart(' ', thoughtSignature));
      }
      
      if (message.content) {
        parts.push({ text: typeof message.content === 'string' ? message.content : '' });
      }
      
      // Handle tool calls
      if (message.tool_calls) {
        for (const tc of message.tool_calls) {
          const safeName = sanitizeToolName(tc.function.name);
          if (safeName !== tc.function.name) {
            setToolNameMapping(modelName, safeName, tc.function.name);
          }
          const args = JSON.parse(tc.function.arguments || '{}');
          const signature = enableThinking ? toolSignature : undefined;
          parts.push(createFunctionCallPart(tc.id, safeName, args, signature));
        }
      }
      
      if (parts.length > 0) {
        antigravityMessages.push({ role: 'model', parts });
      }
    } else if (message.role === 'tool') {
      // Tool response
      const toolCallId = message.tool_call_id!;
      const functionName = findFunctionNameById(toolCallId, antigravityMessages);
      
      const functionResponse: AntigravityMessagePart = {
        functionResponse: {
          id: toolCallId,
          name: functionName,
          response: { output: message.content as string || '' },
        },
      };
      
      const lastMessage = antigravityMessages[antigravityMessages.length - 1];
      if (lastMessage?.role === 'user' && lastMessage.parts.some(p => p.functionResponse)) {
        lastMessage.parts.push(functionResponse);
      } else {
        antigravityMessages.push({ role: 'user', parts: [functionResponse] });
      }
    }
  }

  return { contents: antigravityMessages, systemInstruction };
}

// ==================== Request Body Generation ====================

export interface TokenContext {
  accessToken: string;
  projectId: string;
  email: string;
  sessionId: string;
}

/**
 * Generate Antigravity request body from Claude request
 */
export function generateClaudeRequestBody(
  request: ClaudeRequest,
  token: TokenContext,
  systemInstruction?: string
): AntigravityRequest {
  const actualModelName = mapModel(request.model);
  const enableThinking = request.thinking?.type === 'enabled' || isThinkingEnabled(actualModelName);
  
  const tools = convertClaudeTools(request.tools, token.sessionId, actualModelName);
  const hasTools = tools.length > 0;
  
  const contents = convertClaudeMessages(
    request.messages,
    enableThinking,
    actualModelName,
    token.sessionId,
    hasTools
  );

  const generationConfig = generateGenerationConfig(
    {
      temperature: request.temperature,
      top_p: request.top_p,
      top_k: request.top_k,
      max_tokens: request.max_tokens,
      thinking_budget: request.thinking?.budget_tokens,
    },
    enableThinking,
    actualModelName
  );

  // Merge system instructions
  const mergedSystem = [systemInstruction, request.system].filter(Boolean).join('\n\n');

  const body: AntigravityRequest = {
    project: token.projectId,
    requestId: generateRequestId(),
    request: {
      contents,
      tools,
      toolConfig: { functionCallingConfig: { mode: 'VALIDATED' } },
      generationConfig,
      sessionId: token.sessionId,
    },
    model: actualModelName,
    userAgent: 'antigravity',
  };

  if (mergedSystem) {
    body.request.systemInstruction = {
      role: 'user',
      parts: [{ text: mergedSystem }],
    };
  }

  return body;
}

/**
 * Generate Antigravity request body from OpenAI request
 */
export function generateOpenAIRequestBody(
  request: OpenAIRequest,
  token: TokenContext,
  systemInstruction?: string
): AntigravityRequest {
  const actualModelName = mapModel(request.model);
  const enableThinking = isThinkingEnabled(actualModelName);
  
  const tools = convertOpenAITools(request.tools, token.sessionId, actualModelName);
  const hasTools = tools.length > 0;
  
  const { contents, systemInstruction: extractedSystem } = convertOpenAIMessages(
    request.messages,
    enableThinking,
    actualModelName,
    token.sessionId,
    hasTools
  );

  const generationConfig = generateGenerationConfig(
    {
      temperature: request.temperature,
      top_p: request.top_p,
      max_tokens: request.max_tokens,
      thinking_budget: request.thinking_budget,
      reasoning_effort: request.reasoning_effort,
    },
    enableThinking,
    actualModelName
  );

  // Merge system instructions
  const mergedSystem = [systemInstruction, extractedSystem].filter(Boolean).join('\n\n');

  const body: AntigravityRequest = {
    project: token.projectId,
    requestId: generateRequestId(),
    request: {
      contents,
      tools,
      toolConfig: { functionCallingConfig: { mode: 'VALIDATED' } },
      generationConfig,
      sessionId: token.sessionId,
    },
    model: actualModelName,
    userAgent: 'antigravity',
  };

  if (mergedSystem) {
    body.request.systemInstruction = {
      role: 'user',
      parts: [{ text: mergedSystem }],
    };
  }

  return body;
}
