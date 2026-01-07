import { Response } from 'express';
import { OpenAIToolCall, StreamCallbackData } from './types.js';
import { generateToolCallId, getOriginalToolName } from './converter.js';

const DATA_PREFIX = 'data: ';
const DATA_PREFIX_LEN = DATA_PREFIX.length;

// Heartbeat to prevent CDN/proxy timeouts (Cloudflare, nginx, etc.)
const HEARTBEAT_INTERVAL = 15000; // 15 seconds
const SSE_HEARTBEAT = ': heartbeat\n\n';

export interface HeartbeatHandle {
  timer: NodeJS.Timeout;
  stop: () => void;
}

/**
 * Creates a heartbeat timer that sends SSE comments to keep the connection alive.
 * This prevents CDN timeouts during long-running streams.
 */
export function createHeartbeat(res: Response): HeartbeatHandle {
  const timer = setInterval(() => {
    if (!res.writableEnded) {
      try {
        res.write(SSE_HEARTBEAT);
      } catch {
        // Connection may have been closed
      }
    }
  }, HEARTBEAT_INTERVAL);

  const stop = () => {
    clearInterval(timer);
  };

  // Auto-cleanup when response ends
  res.on('close', stop);
  res.on('finish', stop);

  return { timer, stop };
}

/**
 * Sets up SSE headers for streaming responses, including headers to prevent
 * buffering by reverse proxies (nginx, etc.)
 */
export function setupSSEHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.setHeader('Transfer-Encoding', 'chunked');
}

class LineBuffer {
  private buffer = '';
  private lines: string[] = [];

  append(chunk: string): string[] {
    this.buffer += chunk;
    this.lines.length = 0;

    let start = 0;
    let end: number;
    while ((end = this.buffer.indexOf('\n', start)) !== -1) {
      this.lines.push(this.buffer.slice(start, end));
      start = end + 1;
    }

    this.buffer = start < this.buffer.length ? this.buffer.slice(start) : '';
    return this.lines;
  }

  clear(): void {
    this.buffer = '';
    this.lines.length = 0;
  }
}

const lineBufferPool: LineBuffer[] = [];
const MAX_POOL_SIZE = 10;

export function getLineBuffer(): LineBuffer {
  const buffer = lineBufferPool.pop();
  if (buffer) {
    buffer.clear();
    return buffer;
  }
  return new LineBuffer();
}

export function releaseLineBuffer(buffer: LineBuffer): void {
  if (lineBufferPool.length < MAX_POOL_SIZE) {
    buffer.clear();
    lineBufferPool.push(buffer);
  }
}

interface StreamState {
  toolCalls: OpenAIToolCall[];
  reasoningSignature: string | null;
  sessionId: string;
  model: string;
}

interface AntigravityStreamPart {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: {
    id: string;
    name: string;
    args: Record<string, unknown>;
  };
}

interface AntigravityStreamResponse {
  response?: {
    candidates?: Array<{
      content?: {
        parts?: AntigravityStreamPart[];
      };
      finishReason?: string;
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };
}

function convertToToolCall(
  functionCall: { id: string; name: string; args: Record<string, unknown> },
  model: string
): OpenAIToolCall {
  const id = functionCall.id || generateToolCallId();
  let name = functionCall.name;
  
  const original = getOriginalToolName(model, functionCall.name);
  if (original) name = original;

  return {
    id,
    type: 'function',
    function: {
      name,
      arguments: JSON.stringify(functionCall.args),
    },
  };
}

export function parseAndEmitStreamChunk(
  line: string,
  state: StreamState,
  callback: (data: StreamCallbackData) => void
): void {
  if (!line.startsWith(DATA_PREFIX)) return;

  try {
    const data = JSON.parse(line.slice(DATA_PREFIX_LEN)) as AntigravityStreamResponse;
    const parts = data.response?.candidates?.[0]?.content?.parts;

    if (parts) {
      for (const part of parts) {
        if (part.thoughtSignature) {
          if (part.thoughtSignature !== state.reasoningSignature) {
            state.reasoningSignature = part.thoughtSignature;
          }
        }

        if (part.thought === true) {
          if (part.thoughtSignature) {
            state.reasoningSignature = part.thoughtSignature;
          }
          callback({
            type: 'reasoning',
            reasoning_content: part.text || '',
            thoughtSignature: part.thoughtSignature || state.reasoningSignature || undefined,
          });
        } else if (part.text !== undefined) {
          callback({ type: 'content', content: part.text });
        } else if (part.functionCall) {
          const toolCall = convertToToolCall(part.functionCall, state.model);
          const sig = part.thoughtSignature || state.reasoningSignature || null;
          if (sig) {
            (toolCall as OpenAIToolCall & { thoughtSignature?: string }).thoughtSignature = sig;
          }
          state.toolCalls.push(toolCall);
        }
      }
    }

    if (data.response?.candidates?.[0]?.finishReason) {
      if (state.toolCalls.length > 0) {
        callback({ type: 'tool_calls', tool_calls: state.toolCalls });
        state.toolCalls = [];
      }
      const usage = data.response?.usageMetadata;
      if (usage) {
        callback({
          type: 'usage',
          usage: {
            prompt_tokens: usage.promptTokenCount || 0,
            completion_tokens: usage.candidatesTokenCount || 0,
          },
        });
      }
    }
  } catch {
  }
}

export function createStreamState(sessionId: string, model: string): StreamState {
  return {
    toolCalls: [],
    reasoningSignature: null,
    sessionId,
    model,
  };
}

export interface ClaudeStreamEvent {
  type: string;
  message?: {
    id: string;
    type: string;
    role: string;
    content: unknown[];
    model: string;
    stop_reason: string | null;
    stop_sequence: string | null;
    usage: { input_tokens: number; output_tokens: number };
  };
  index?: number;
  content_block?: {
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  };
  delta?: {
    type: string;
    text?: string;
    partial_json?: string;
    thinking?: string;
    signature?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      reasoning_content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export function formatClaudeSSE(event: ClaudeStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function formatOpenAISSE(chunk: OpenAIStreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

export function formatOpenAIDone(): string {
  return 'data: [DONE]\n\n';
}
