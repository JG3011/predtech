# AGENTS.md

This document provides an overview of the project structure for developers and AI agents working on this codebase.

## Project Overview: Predtech

This codebase was scaffolded from a generic TanStack Start "dashboard" template and has been
built out into **Predtech**, a pt-BR industrial predictive-maintenance supervisory dashboard.
The sections below describe what's actually implemented; treat the rest of this file (inherited
from the template) as background on the base stack only — do not look for the resume/portfolio
app or "Application Name" placeholders described further down, they no longer apply.

### What the app does

- Simulates four sensor variables (corrente, temperatura, vibração, rotação) with configurable
  min/max/attention-band ranges, generating a new reading roughly every 2 seconds.
- Login screen with two shared role passwords (Operador / Suporte demo credentials, see
  `src/server/auth.server.ts`).
- Dashboard with alert banners, per-variable metric cards + mini charts, and a recent-readings
  table (`src/routes/_app.index.tsx`).
- Histórico de Falhas, Histórico de Leituras (+ CSV export), and Suporte-only Range config and
  Histórico de Entradas (login audit log) screens.

### Key architecture decisions

- **Session cookie, not Netlify Identity.** This is an internal ops tool with two shared
  role-based passwords, not per-user accounts. `src/server/auth.server.ts` checks the submitted
  password against hardcoded server-side constants and sets a plain HttpOnly cookie storing only
  the role (`operador` | `suporte`). `src/server/auth.functions.ts` exposes `login`, `logout`,
  and `getSession` as TanStack Start server functions. Every route that needs role gating
  (`/range`, `/acessos`) calls `getSession()` in its `beforeLoad` and redirects server-side if the
  role doesn't match — this is enforced on the server, not just hidden in the sidebar UI.
- **Server-driven simulation, not a client timer.** A client-only `setInterval` writing directly
  to the database would race across multiple open tabs/users and produce duplicate/conflicting
  rows. Instead, `getLatestState` in `src/server/readings.functions.ts` is polled by the dashboard
  every 2s; it only inserts a new simulated reading if the latest stored one is stale (>= 2s old),
  making the server the single source of truth for the simulation regardless of how many clients
  are polling it.
- **Failures store their own range snapshot.** The `failures` table (`db/schema.ts`) captures the
  min/max/attention values that were active at the moment of the event, not a live reference to
  `ranges`. This keeps "Histórico de Falhas" historically accurate even after ranges are edited.
- **Netlify Database + Drizzle** (`db/schema.ts`, `db/index.ts`, `drizzle.config.ts`) for all
  persistence — `readings`, `failures`, `access_logs`, `ranges` — instead of localStorage, since
  data needs to survive across sessions/deploys. Migrations live in
  `netlify/database/migrations/`.

### Key files

| File | Purpose |
|------|---------|
| `db/schema.ts` | Drizzle table definitions: `readings`, `failures`, `accessLogs`, `ranges` |
| `db/index.ts` | Drizzle client using the Netlify Database adapter |
| `src/lib/sensors.ts` | Shared sensor metadata, default ranges, status computation |
| `src/server/auth.server.ts` | Password check + session cookie helpers (server-only) |
| `src/server/auth.functions.ts` | `login` / `logout` / `getSession` server functions |
| `src/server/simulate.server.ts` | Random-walk + spike simulation logic (server-only) |
| `src/server/db.server.ts` | Ranges lookup/seeding helper (server-only) |
| `src/server/readings.functions.ts` | All readings/failures/ranges/access-log server functions |
| `src/routes/login.tsx` | Login screen |
| `src/routes/_app.tsx` | Protected layout: session check + sidebar shell |
| `src/routes/_app.index.tsx` | Dashboard |
| `src/routes/_app.falhas.tsx` | Histórico de Falhas |
| `src/routes/_app.leituras.tsx` | Histórico de Leituras + CSV export |
| `src/routes/_app.range.tsx` | Range config (Suporte only, server-gated) |
| `src/routes/_app.acessos.tsx` | Histórico de Entradas (Suporte only, server-gated) |
| `src/components/AppShell.tsx` | Sidebar / mobile drawer / logout |
| `src/components/MiniChart.tsx` | react-chartjs-2 line chart with dashed min/max reference lines |
| `src/components/Toast.tsx` | Toast notification provider |

## Base Template Background (inherited, kept for stack reference only)

An interactive resume/portfolio application with an AI-powered assistant. Built with TanStack Start and deployed on Netlify.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start |
| Frontend | React 19, TanStack Router v1 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| UI Components | Radix UI + custom components |
| Content | Content Collections (type-safe markdown) |
| AI | TanStack AI with multi-provider support |
| Language | TypeScript 5.7 (strict mode) |
| Deployment | Netlify |

## Directory Structure

```
├── public
│   ├── favicon.ico
│   ├── tanstack-circle-logo.png
│   └── tanstack-word-logo-white.svg  # TanStack wordmark logo (white) used in header/nav.
├── src
│   ├── components
│   │   ├── Header.tsx  # Header component.
│   │   └── HeaderNav.tsx  # Navigation sidebar template: mobile menu, Home link, add-on routes; EJS-driven for dynamic route generation.
│   ├── routes
│   │   ├── __root.tsx  # Root layout: Header, styles.
│   │   └── index.tsx  # Dashboard home: Bar, Line, Doughnut charts (revenue, users, sales).
│   ├── router.tsx  # TanStack Router setup: creates router from generated routeTree with scroll restoration.
│   └── styles.css  # Global styles: Tailwind import plus base body/code font styling.
├── .gitignore  # Template for .gitignore: node_modules, dist, .env, .netlify, .tanstack, etc.
├── AGENTS.md  # This document provides an overview of the project structure for developers and AI agents working on this codebase.
├── netlify.toml  # Netlify deployment config: build command (vite build), publish directory (dist/client), and dev server settings (port 8888, target 3000).
├── package.json  # Project manifest with TanStack Start, React 19, Vite 7, Tailwind CSS 4, and Netlify plugin dependencies; defines dev and build scripts.
├── pnpm-lock.yaml
├── tsconfig.json  # TypeScript config: ES2022 target, strict mode, @/* path alias for src/*, bundler module resolution.
└── vite.config.ts  # Vite config template: TanStack Start, React, Tailwind, Netlify plugin, and optional add-on integrations; processed by EJS.
```

## Key Concepts

### File-Based Routing (TanStack Router)

Routes are defined by files in `src/routes/`:

- `__root.tsx` - Root layout wrapping all pages
- `index.tsx` - Route for `/`
- `api.*.ts` - Server API endpoints (e.g., `api.resume-chat.ts` → `/api/resume-chat`)

### Component Architecture

**UI Primitives** (`src/components/ui/`):
- Radix UI-based, Tailwind-styled
- Card, Badge, Checkbox, Separator, HoverCard

**Feature Components** (`src/components/`):
- Header, HeaderNav, ResumeAssistant

## Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite plugins: TanStack Start, Netlify, Tailwind, Content Collections |
| `tsconfig.json` | TypeScript config with `@/*` path alias for `src/*` |
| `netlify.toml` | Build command, output directory, dev server settings |
| `content-collections.ts` | Zod schemas for jobs and education frontmatter |
| `styles.css` | Tailwind imports + CSS custom properties (oklch colors) |

## Development Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Conventions

### Naming
- Components: PascalCase
- Utilities/hooks: camelCase
- Routes: kebab-case files

### Styling
- Tailwind CSS utility classes
- `cn()` helper for conditional class merging
- CSS variables for theme tokens in `styles.css`

### TypeScript
- Strict mode enabled
- Import paths use `@/` alias
- Zod for runtime validation
- Type-only imports with `type` keyword

### State Management
- React hooks for local state
- Zustand if you need it for global state
### Chart.js Dashboard

Analytics dashboard with Chart.js and react-chartjs-2.

**Dependencies:** chart.js, react-chartjs-2

**Chart types:**
- Bar - Revenue by month
- Line - User growth
- Doughnut - Sales by category

**Setup:** Register Chart.js components before use (CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler).

## Application Name

This starter uses "Application Name" as a placeholder throughout the UI and metadata. Replace it with the user's desired application name in the following locations:

### UI Components
- `src/components/Header.tsx` — app name displayed in the header
- `src/components/HeaderNav.tsx` — app name in the mobile navigation header

### SEO Metadata
- `src/routes/__root.tsx` — the `title` field in the `head()` configuration

Search for all occurrences of "Application Name" in the `src/` directory and replace with the user's application name.
