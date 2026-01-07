# API PROXY

Converts Claude/OpenAI API requests to Antigravity (Google Cloud Code) format.

## STRUCTURE

```
apiProxy/
├── index.ts        # ApiProxyService - account selection, request handling
├── client.ts       # AntigravityClient - retry logic, rate limit detection
├── converter.ts    # Request/response format conversion
├── streaming.ts    # SSE streaming utilities
└── types.ts        # Request/response interfaces
```

## HOW IT WORKS

1. Receives `/v1/messages` (Claude) or `/v1/chat/completions` (OpenAI)
2. Selects account by quota (Claude models → claude quota, Gemini → gemini quota)
3. Converts to Antigravity format with protocol signatures
4. Streams response back, converting to original format

## UNIQUE PATTERNS

- **Protocol signatures**: `CLAUDE_THOUGHT_SIGNATURE`, `CLAUDE_TOOL_SIGNATURE` - base64 markers injected into requests
- **Account selection modes**: `best` (highest quota) or `passthrough` (use plugin's active)
- **Rate limit retry**: Exponential backoff, switches account on 429

## ANTI-PATTERNS

- Modifying signatures without understanding protocol
- Bypassing account selection logic
- Ignoring rate limit responses
