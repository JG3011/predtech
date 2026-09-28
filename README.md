# Predtech

Predtech is a Portuguese-language (pt-BR) industrial predictive-maintenance supervisory
dashboard. It simulates four sensor variables — **corrente** (current), **temperatura**
(temperature), **vibração** (vibration) and **rotação** (rotation) — on a piece of equipment,
raises visual alerts when a variable leaves its configured safe range, and keeps a full
history of readings, failures and login attempts.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing via TanStack Router)
- Tailwind CSS v4
- Chart.js via `react-chartjs-2` for the live mini-charts
- [Netlify Database](https://docs.netlify.com/build/data-and-storage/netlify-db/) (managed
  Postgres) with [Drizzle ORM](https://orm.drizzle.team/) for persistence
- Server functions (`createServerFn`) for auth, the sensor simulation loop, and all data access

## Roles & demo credentials

Two shared role-based passwords gate the app (no per-user accounts):

| Role       | Password |
|------------|----------|
| Operador   | `op123`  |
| Suporte    | `sup123` |

**Suporte** additionally sees **Range** (sensor limit configuration) and **Histórico de
Entradas** (login audit log). Both screens are also gated server-side (not just hidden in the
UI) — see `src/routes/_app.range.tsx` and `src/routes/_app.acessos.tsx`.

## Running locally

```bash
pnpm install
pnpm dev
```

This project depends on **Netlify Database**. When developing locally with the Netlify CLI
(`netlify dev`) or deploying, Netlify provisions/connects the Postgres database and applies any
pending migrations in `netlify/database/migrations/` automatically — no manual database setup or
connection string is required. If you change `db/schema.ts`, generate a new migration with:

```bash
npx drizzle-kit generate --name <describe_the_change>
```

## How the simulation works

Rather than a client-side `setInterval` writing to a database (which would race across multiple
browser tabs/users), the dashboard polls a server function, `getLatestState`
(`src/server/readings.functions.ts`), every 2 seconds. On each call, if the most recent stored
reading is 2+ seconds old, the server generates exactly one new reading via a small random walk
from the last one (with an occasional simulated temperature spike), persists it, and returns the
latest readings + current ranges + computed status. This keeps the simulation server-authoritative
and consistent across every connected client.
