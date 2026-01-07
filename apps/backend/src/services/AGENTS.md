# SERVICES

Core business logic organized by domain.

## STRUCTURE

```
services/
├── quotaService.ts         # Google Cloud Code API polling
├── accountsFile.ts         # ~/.config/opencode/antigravity-accounts.json watcher
├── tierDetection.ts        # FREE/PRO/ULTRA from reset patterns
├── websocket.ts            # WebSocketManager for live updates
├── fileLogger.ts           # JSON file logging (7-day retention)
├── quotaStrategy.ts        # Model grouping configuration
├── apiProxy/               # Claude/OpenAI → Antigravity (see apiProxy/AGENTS.md)
└── languageServer/         # VS Code extension bridge (see languageServer/AGENTS.md)
```

## WHERE TO LOOK

| Task | File |
|------|------|
| Modify quota fetching | `quotaService.ts` |
| Account CRUD | `accountsFile.ts` |
| Tier detection rules | `tierDetection.ts` |
| WebSocket messages | `websocket.ts` |
| Model grouping | `quotaStrategy.ts` + `config/quotaStrategy.json` |

## CONVENTIONS

- **Singleton pattern**: All services use `getXxxService()` factory
- **EventEmitter**: Services emit events for state changes
- **Polling intervals**: quotaService=120s, languageServer=90s
