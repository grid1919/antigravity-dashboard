# CLAUDE.md

This file provides guidance for Claude when working with this codebase.

## Project Overview

Antigravity Dashboard is a monitoring solution for the opencode-antigravity-auth plugin. It displays real-time quota and usage data for multiple Google Cloud accounts authenticated via the antigravity OAuth flow. The dashboard supports multi-account management with subscription tier detection, burn rate calculations, timeline visualization, and integration with the Antigravity Language Server.

## Tech Stack

**Backend:**
- Node.js with Express
- TypeScript
- SQLite (better-sqlite3) for usage logging and quota snapshots
- WebSocket for live updates
- File-based JSON logging (7-day retention)

**Frontend:**
- React 18 with TypeScript
- Vite build tool
- Tailwind CSS with dark/light theme support
- Zustand for state management
- Recharts for data visualization
- Page-based navigation (Dashboard, Accounts, Logs, Settings)

## Project Structure

This is a monorepo using npm workspaces.

```
├── apps/
│   ├── backend/                 # @antigravity/backend
│   │   ├── src/
│   │   │   ├── index.ts         # Entry point exports
│   │   │   ├── server.ts        # Express server, API endpoints, WebSocket
│   │   │   ├── monitor.ts       # SQLite operations, burn rate, quota snapshots
│   │   │   ├── interceptor.ts   # Request interception
│   │   │   ├── types/
│   │   │   │   └── index.ts     # TypeScript interfaces
│   │   │   ├── config/
│   │   │   │   └── quotaStrategy.json  # Model grouping configuration
│   │   │   ├── utils/
│   │   │   │   ├── index.ts
│   │   │   │   ├── errorHelpers.ts
│   │   │   │   └── authMiddleware.ts  # Authentication for network access
│   │   │   └── services/
│   │   │       ├── quotaService.ts     # Google Cloud Code API integration
│   │   │       ├── accountsFile.ts     # Accounts file watcher + CRUD
│   │   │       ├── websocket.ts        # WebSocket manager
│   │   │       ├── tierDetection.ts    # Subscription tier detection (FREE/PRO/ULTRA)
│   │   │       ├── quotaStrategy.ts    # Model grouping strategy
│   │   │       ├── fileLogger.ts       # File-based logging service
│   │   │       ├── apiProxy/           # Claude/OpenAI API proxy service
│   │   │       │   ├── index.ts        # Main ApiProxyService class
│   │   │       │   ├── client.ts       # AntigravityClient with retry logic
│   │   │       │   ├── converter.ts    # Claude/OpenAI to Antigravity format
│   │   │       │   ├── streaming.ts    # SSE streaming utilities
│   │   │       │   └── types.ts        # Request/response types
│   │   │       └── languageServer/     # Antigravity Language Server integration
│   │   │           ├── index.ts
│   │   │           ├── languageServerService.ts
│   │   │           ├── detect.ts
│   │   │           ├── httpClient.ts
│   │   │           ├── types.ts
│   │   │           └── platforms/
│   │   │               ├── index.ts
│   │   │               └── linux.ts
│   │   └── dist/               # Compiled backend
│   │
│   └── web/                    # @antigravity/web
│       ├── src/
│       │   ├── main.tsx        # React entry point
│       │   ├── App.tsx         # Main app with page routing
│       │   ├── index.css       # Tailwind styles + theme variables
│       │   ├── components/
│       │   │   ├── Navigation.tsx          # Page navigation
│       │   │   ├── DashboardPage.tsx       # Main dashboard
│       │   │   ├── AccountsPage.tsx        # Account management
│       │   │   ├── LogsPage.tsx            # Filterable logs dashboard
│       │   │   ├── SettingsPage.tsx        # Settings page
│       │   │   ├── OverviewTab.tsx         # Overview statistics
│       │   │   ├── QuotaPill.tsx           # Quota percentage display
│       │   │   ├── SubscriptionBadge.tsx   # Tier badge (FREE/PRO/ULTRA)
│       │   │   ├── CreditsCard.tsx         # Prompt/Flow credits display
│       │   │   ├── UserInfoCard.tsx        # User info from LS
│       │   │   ├── TimeWindowCard.tsx      # Quota time window countdown
│       │   │   ├── QuotaWindowCard.tsx     # Model-specific quota windows
│       │   │   ├── TimelineVisualization.tsx
│       │   │   ├── LastRefreshIndicator.tsx
│       │   │   └── LogsDashboard.tsx
│       │   ├── hooks/
│       │   │   ├── useQuota.ts         # Quota data hook
│       │   │   ├── useWebSocket.ts     # WebSocket connection hook
│       │   │   ├── useLanguageServer.ts # LS data hook
│       │   │   ├── useQuotaWindow.ts   # Quota window hook
│       │   │   ├── useBurnRate.ts      # Burn rate calculations
│       │   │   ├── useLogs.ts          # Logs fetching
│       │   │   └── useTimeline.ts      # Timeline data
│       │   ├── stores/
│       │   │   └── useDashboardStore.ts  # Zustand state store
│       │   └── types/
│       │       └── index.ts   # TypeScript interfaces
│       ├── vite.config.ts     # Vite configuration
│       └── dist/              # Built frontend (served by Express)
│
├── .env.example               # Environment variable template
├── package.json               # Root workspace config
└── usage.db                   # SQLite database (created at runtime)
```

## Key Commands

```bash
npm install                    # Install all dependencies (workspaces)
npm run build                  # Build both backend and frontend
npm start                      # Start the server (port 3456)
npm run dev                    # Dev mode for all packages
```

## API Endpoints

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check (includes LS status) |
| `/api/accounts/local` | GET | List all accounts with burn rate |
| `/api/accounts/active` | GET | Get active account per model family |
| `/api/accounts/rate-limits` | GET | Get rate-limited accounts |
| `/api/accounts/stats` | GET | Account service statistics |
| `/api/accounts/quota` | GET | Get cached quota data |
| `/api/accounts/quota/refresh` | POST | Force refresh quotas |
| `/api/accounts/quota/clear-cache` | POST | Clear token and quota caches |
| `/api/accounts` | GET | Account stats from monitor |
| `/api/accounts` | POST | Add a new account |
| `/api/accounts/:email` | DELETE | Delete a single account |
| `/api/accounts` | DELETE | Bulk delete accounts (body: {emails}) |
| `/api/accounts/switch/:email` | POST | Switch active account |
| `/api/accounts/best` | GET | Get best accounts for each family |
| `/api/accounts/summary` | GET | Dashboard summary stats |
| `/api/accounts/enriched` | GET | Accounts with tier + model quotas |
| `/api/accounts/export` | GET | Export accounts (without tokens for security) |
| `/api/accounts/limits` | GET | Quota limits per model (query: format=table\|json) |
| `/api/accounts/quota-windows` | GET | Aggregated quota windows by model |
| `/api/accounts/quota-window-status` | GET | 5-hour quota window status |
| `/api/accounts/:email/refresh` | POST | Refresh single account quota |
| `/api/accounts/burn-rate` | GET | Token-based burn rates |
| `/api/accounts/burn-rate-accurate` | GET | Snapshot-based accurate burn rates |
| `/api/accounts/timeline` | GET | Hourly usage timeline |
| `/api/models` | GET | Model usage stats |
| `/api/stats` | GET | Usage statistics |

### Analytics Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/overview` | GET | Combined local + manager stats |
| `/api/analytics/performance` | GET | Performance metrics |
| `/api/analytics/errors` | GET | Error breakdown |
| `/api/analytics/trends` | GET | Daily usage trends |
| `/api/analytics/prediction` | GET | Runway predictions |
| `/api/hourly-stats` | GET | Hourly breakdown |
| `/api/recent-calls` | GET | Recent API calls log |
| `/api/session-events` | GET | Session event log |
| `/api/export` | GET | Export all data as JSON |
| `/api/export/csv` | GET | Export usage data as CSV |
| `/api/cleanup` | DELETE | Clear old data |

### Logs Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/logs/combined` | GET | Combined API + session logs (filterable) |
| `/api/logs/files` | GET | List log files |
| `/api/logs/file/:filename` | GET | Read specific log file |

### Language Server Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/language-server/status` | GET | LS connection status |
| `/api/language-server/detect` | GET | Detect and connect to LS |
| `/api/language-server/credits` | GET | Prompt + Flow credits |
| `/api/language-server/user` | GET | User info (email, tier) |
| `/api/language-server/snapshot` | GET | Full LS data snapshot |
| `/api/language-server/refresh` | POST | Force refresh LS data |

### Manager Proxy Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/manager/status` | GET | Check manager availability |
| `/api/manager/accounts` | GET | Get accounts from manager |
| `/api/manager/accounts/refresh` | POST | Refresh manager accounts |
| `/api/manager/models` | GET | Get available models |
| `/api/manager/config` | GET | Get manager configuration |
| `/api/manager/proxy/*` | GET/POST | Proxy server control |

### API Proxy Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/messages` | POST | Claude Messages API (streaming supported) |
| `/v1/chat/completions` | POST | OpenAI Chat Completions API (streaming supported) |
| `/v1/models` | GET | List available models |
| `/api/proxy/api-key` | GET | Get the proxy API key |
| `/api/proxy/config` | GET | Get proxy configuration |
| `/api/proxy/stats` | GET | Get in-memory proxy stats |
| `/api/proxy/logs` | GET | Get proxy request logs from database |
| `/api/proxy/db-stats` | GET | Get aggregated proxy statistics |

### WebSocket

Connect to `/ws` for live updates with message types:
- `initial` - Full state on connect
- `accounts_update` - Account changes (add/remove/bulk_remove/active_changed)
- `config_update` - Quota updates
- `stats_update` - Statistics changes
- `rate_limit_change` - Rate limit events
- `ls_status_change` - Language Server status changes
- `heartbeat` - Connection keepalive

## Services

### Quota Service
Fetches data from Google's undocumented Cloud Code API:
- Endpoint: `https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels`
- Requires OAuth access token (refreshed from stored refresh tokens)
- Returns `remainingFraction` (0.0-1.0) and `resetTime` per model
- Polls every 2 minutes by default
- Supports parallel fetching for multiple accounts

### Language Server Service
Integrates with local Antigravity Language Server (from VS Code extension):
- Auto-detects LS port on Linux via `/proc` scanning
- Fetches user credits (Prompt + Flow), subscription tier, model quotas
- gRPC-Web API with CSRF authentication
- Polls every 90 seconds

### Tier Detection Service
Automatically detects subscription tier based on quota patterns:
- `FREE`: Basic quota limits
- `PRO`: Enhanced quotas
- `ULTRA`: Maximum quotas

### File Logger Service
JSON-based file logging:
- 7-day retention by default
- Categories: quota, api, auth, system, websocket, accounts
- Levels: DEBUG, INFO, WARN, ERROR

### API Proxy Service
Claude/OpenAI compatible API proxy for using Antigravity accounts:
- Converts Claude Messages API and OpenAI Chat Completions API to Antigravity format
- Automatic account rotation based on quota availability
- Model-specific account selection (Claude quota for Claude models, Gemini for Gemini)
- Streaming support with SSE
- Rate limit detection with exponential backoff retry
- Request logging to SQLite database
- WebSocket notifications for rate limit events

Usage with Claude Code CLI:
```bash
export ANTHROPIC_BASE_URL=http://localhost:3456
export ANTHROPIC_API_KEY=$(curl -s http://localhost:3456/api/proxy/api-key | jq -r '.apiKey')
claude "your prompt"
```

## Configuration

Accounts are stored in: `~/.config/opencode/antigravity-accounts.json`

Each account has:
- `email`: Account identifier
- `refreshToken`: OAuth refresh token
- `projectId`: Google Cloud project ID
- `addedAt`: Timestamp when added
- `lastUsed`: Last usage timestamp
- `rateLimitResetTimes`: Per-family rate limit reset times

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Configure your Google OAuth credentials in `.env`:
   ```env
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   ```
   
   You need to create OAuth credentials in the Google Cloud Console. See the README for detailed setup instructions.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHBOARD_PORT` | 3456 | Server port |
| `MANAGER_URL` | http://localhost:8080 | antigravity-manager URL |
| `DB_PATH` | (auto) | Custom SQLite database path |
| `DATA_RETENTION_DAYS` | 30 | Days to keep usage data |
| `AUTO_CLEANUP_ON_START` | false | Clean old data on startup |
| `LOG_LEVEL` | info | Logging verbosity |
| `WS_HEARTBEAT_INTERVAL` | 30000 | WebSocket heartbeat (ms) |
| `WS_MAX_CONNECTIONS` | 100 | Max WebSocket connections |
| `API_RATE_LIMIT` | 100 | API rate limit |
| `CORS_ORIGINS` | localhost | Allowed CORS origins (comma-separated) |
| `DEV_MODE` | false | Development mode |
| `GOOGLE_CLIENT_ID` | (required) | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | (required) | Google OAuth client secret |
| `DASHBOARD_SECRET` | (optional) | Secret for API authentication. If set, enables network access |

**Note:** The `.env` file must be in the project root directory, not in `apps/backend/`.

## Development

Frontend dev server (with hot reload):
```bash
cd apps/web && npm run dev
```

Backend watch mode:
```bash
cd apps/backend && npm run dev
```

The Vite dev server proxies `/api` and `/ws` to the backend on port 3456.

## Database Schema

The SQLite database includes:
- `api_calls` - Request logs with tokens, duration, status
- `session_events` - Session event log
- `quota_snapshots` - Periodic quota percentage snapshots for accurate burn rate

## Code Style

- TypeScript strict mode enabled
- Functional React components with hooks
- Tailwind for styling (no CSS modules)
- Dark/light theme with CSS variables
- Zustand for global state management

## Recent Updates (2026-01-06)

### Major Features Added
- **Page-based Navigation**: Dashboard, Accounts, Logs, Settings pages with proper routing
- **Language Server Integration**: Auto-detection and data fetching from Antigravity LS
- **Subscription Tier Detection**: Automatic FREE/PRO/ULTRA tier detection from quota patterns
- **Quota Time Windows**: 5-hour quota window visualization with countdown timers
- **Burn Rate Calculations**: Token-based and snapshot-based burn rate analysis
- **Filterable Logs Dashboard**: Combined API + session logs with search/filter
- **Account Management CRUD**: Add, delete, switch accounts via API
- **Account Limits Endpoint**: View all model quotas across accounts (JSON or ASCII table)
- **Quota Snapshots**: SQLite table for accurate burn rate calculations

### New Components
- `LogsPage.tsx` - Filterable logs dashboard
- `QuotaWindowCard.tsx` - Model-specific quota windows
- `TimeWindowCard.tsx` - Time window countdown
- `CreditsCard.tsx` - Prompt/Flow credits display
- `UserInfoCard.tsx` - User info from Language Server

### API Additions
- Account CRUD operations (POST, DELETE, bulk delete)
- `/api/accounts/limits` - Comprehensive quota limits view
- `/api/accounts/quota-window-status` - 5-hour window status
- `/api/accounts/burn-rate-accurate` - Snapshot-based burn rates
- `/api/logs/combined` - Filterable combined logs
- Language Server endpoints (`/api/language-server/*`)
- File-based logs endpoints (`/api/logs/files`, `/api/logs/file/:filename`)
