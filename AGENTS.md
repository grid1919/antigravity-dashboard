# ANTIGRAVITY DASHBOARD

**Generated:** 2026-01-07 | **Commit:** 0011eb2 | **Branch:** master

## GOAL TRACKING

1. First todo must be `[GOAL] <objective>`, always `pending`
2. Before every `todowrite`, run `todoread` first (read → merge → write)
3. Only mark GOAL as `completed` when task is fully delivered
4. If requirements change, update the GOAL text (don't delete it)

## OVERVIEW

Multi-account Google Cloud quota monitor with Claude/OpenAI API proxy. npm workspaces monorepo: Express backend + React frontend.

## STRUCTURE

```
./
├── apps/backend/       # @antigravity/backend - Express server, API proxy, services
├── apps/web/           # @antigravity/web - React dashboard UI
├── .env.example        # OAuth credentials (DO NOT change - tokens are bound to these)
└── usage.db            # SQLite (runtime)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add API endpoint | `apps/backend/src/server.ts` | 2000+ lines, all routes here |
| Add UI component | `apps/web/src/components/` | Functional components + Tailwind |
| Modify quota fetching | `apps/backend/src/services/quotaService.ts` | Google Cloud Code API |
| Account management | `apps/backend/src/services/accountsFile.ts` | File watcher + CRUD |
| API proxy logic | `apps/backend/src/services/apiProxy/` | Claude/OpenAI conversion |
| LS integration | `apps/backend/src/services/languageServer/` | VS Code extension bridge |
| State management | `apps/web/src/stores/useDashboardStore.ts` | Zustand |
| Hooks | `apps/web/src/hooks/` | Data fetching hooks |

## CONVENTIONS

- **Types duplicated**: `apps/backend/src/types/` and `apps/web/src/types/` - manually sync
- **Root .env only**: Backend loads from `../../../.env` relative to dist
- **No ESLint**: Relies on TypeScript strict mode
- **Tailwind theming**: CSS variables in `apps/web/src/index.css`, config in `tailwind.config.js`

## ANTI-PATTERNS (THIS PROJECT)

| Pattern | Why Forbidden |
|---------|---------------|
| Change OAuth credentials | Tokens cryptographically bound to plugin's client ID |
| Export refresh tokens | Security - `/api/accounts/export` strips them |
| `as any` / `@ts-ignore` | Strict mode enforced |
| CSS modules | Tailwind only |

## UNIQUE PATTERNS

- **Effective quota**: Rate-limited accounts count as 0% in averages
- **Tier detection**: Inferred from reset times (hourly=PRO, daily=FREE)
- **Protocol signatures**: Base64 "thought" signatures injected for Antigravity API
- **LS port discovery**: Scans `/proc` for VS Code extension process args

## COMMANDS

```bash
npm install              # Install all workspaces
npm run build            # Build backend + frontend
npm start                # Start server (port 3456)
npm run dev              # Dev mode with hot reload

# Claude Code CLI integration
export ANTHROPIC_BASE_URL=http://localhost:3456
export ANTHROPIC_API_KEY=$(curl -s http://localhost:3456/api/proxy/api-key | jq -r '.apiKey')
```

## NOTES

- Server serves React SPA from `apps/web/dist/` via Express
- WebSocket at `/ws` for live updates
- SQLite tables: `api_calls`, `session_events`, `quota_snapshots`
- Accounts file: `~/.config/opencode/antigravity-accounts.json`
