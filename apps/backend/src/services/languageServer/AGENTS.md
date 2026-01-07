# LANGUAGE SERVER INTEGRATION

Bridges with Antigravity VS Code extension for user credits and quota data.

## STRUCTURE

```
languageServer/
├── index.ts                    # Exports
├── languageServerService.ts    # Main service, polling, state management
├── detect.ts                   # Port discovery via /proc scanning
├── httpClient.ts               # gRPC-Web API client with CSRF
├── types.ts                    # LS data interfaces
└── platforms/
    ├── index.ts                # Platform detection
    └── linux.ts                # LinuxProcStrategy - /proc scanning
```

## HOW IT WORKS

1. Scans `/proc` for VS Code extension process args
2. Extracts gRPC-Web port and CSRF token from cmdline
3. Polls extension API every 90s for credits/quota
4. Emits events for dashboard updates

## UNIQUE PATTERNS

- **Silent mode**: `detect.ts` accepts `silent: true` to suppress "not found" logs
- **Backoff**: 60s delay after disconnect before retrying detection
- **Platform-specific**: Currently Linux-only (`/proc` required)

## ANTI-PATTERNS

- Assuming LS is always available
- Hardcoding ports (they're dynamic per VS Code instance)
- Polling too frequently (CSRF tokens may rotate)
