# BACKEND SOURCE

Express server + services for quota monitoring and API proxying.

## STRUCTURE

```
src/
├── server.ts           # All API routes (2000+ lines) - main entry
├── monitor.ts          # SQLite operations, burn rate, snapshots
├── index.ts            # Package exports + optional direct run
├── services/           # Core business logic (see services/AGENTS.md)
├── utils/              # Helpers, auth middleware
├── types/              # Shared TypeScript interfaces
└── config/             # quotaStrategy.json for model grouping
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add/modify endpoint | `server.ts` | Monolithic route file |
| Database queries | `monitor.ts` | SQLite via better-sqlite3 |
| Add service | `services/` + export in `index.ts` | Singleton pattern |
| Rate limiting logic | `utils/authMiddleware.ts` | express-rate-limit |

## CONVENTIONS

- **Singleton services**: Use `getXxxService()` factory pattern
- **EventEmitter**: Services extend EventEmitter for state changes
- **.env path**: Loaded from `../../../.env` (3 levels up from dist)

## ANTI-PATTERNS

- Adding routes outside `server.ts`
- Direct SQLite access outside `monitor.ts`
- Importing `.env` in service files (server.ts handles it)
