# FRONTEND SOURCE

React 18 dashboard with Tailwind CSS and Zustand state management.

## STRUCTURE

```
src/
├── main.tsx            # React entry point
├── App.tsx             # Page routing (Dashboard, Accounts, Logs, Settings)
├── index.css           # Tailwind + CSS variables for theming
├── components/         # Page components + UI elements (16 files)
├── hooks/              # Data fetching hooks (8 files)
├── stores/             # Zustand store
└── types/              # TypeScript interfaces (sync with backend)
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add page | `App.tsx` + new component in `components/` |
| Add data hook | `hooks/` - follow existing patterns |
| Modify theme | `index.css` (CSS vars) + `tailwind.config.js` |
| Global state | `stores/useDashboardStore.ts` |

## CONVENTIONS

- **Functional components only**: No class components
- **Custom hooks**: All API fetching via `hooks/useXxx.ts`
- **Tailwind only**: No CSS modules, no inline styles
- **Premium theme**: Use `shadow-premium`, custom animations from config

## ANTI-PATTERNS

- Direct fetch in components (use hooks)
- CSS modules or styled-components
- Modifying types without syncing to backend
