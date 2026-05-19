# sourceIQ

AI-assisted recruitment workspace: parse job descriptions, score candidates against requirements, run multi-source discovery, and manage outreach — with a React UI and Express API.

## Stack

| Layer | Tech |
|--------|------|
| Web | React 18, Vite, Tailwind (`apps/web`) |
| API | Express, Prisma, WebSockets (`apps/api`) |
| Shared types | `packages/shared` |
| Database | PostgreSQL (required for production path) |
| Optional | Redis, Kafka (Redpanda), ClickHouse via Docker |

## Prerequisites

- **Node.js 20+** and npm 10+
- **PostgreSQL** — local Docker, remote host, or `docker compose` from this repo
- **Anthropic API key** (recommended) for JD parsing and resume matching
- **Docker Desktop** (optional) for Postgres + Redis + Kafka + ClickHouse

## Quick install

### Windows (PowerShell)

```powershell
cd d:\Work\Projects\recruitmentSourceIQ
.\scripts\install.ps1 -WithInfra -Seed
```

### macOS / Linux

```bash
cd recruitmentSourceIQ
chmod +x scripts/install.sh
./scripts/install.sh --with-infra --seed
```

### npm only (cross-platform)

```bash
npm install
npm run setup:env
npm run db:generate
npm run db:push
npm run db:seed    # optional demo jobs & candidates
npm run dev
```

| Script | Description |
|--------|-------------|
| `npm run setup` | Install deps + env files + Prisma generate + `db:push` |
| `npm run setup:full` | Above + Docker infra + seed |
| `npm run setup:env` | Copy `.env.example` → `.env` and `apps/api/.env` |
| `npm run dev` | API (`:4001`) + Web (`:5173`) |
| `npm run dev:api` | API only |
| `npm run dev:web` | Web only |
| `npm run build` | Build shared, API, and web |
| `npm run test` | API unit tests (Vitest) |
| `npm run infra:up` | `docker compose up -d` |
| `npm run infra:down` | `docker compose down` |
| `npm run db:push` | Apply Prisma schema to Postgres |
| `npm run db:seed` | Seed workspace, jobs, candidates |

## Run without Docker (minimal)

Use an existing Postgres instance (local or remote).

1. **Install**

   ```bash
   npm install
   npm run setup:env
   ```

2. **Configure** `apps/api/.env` (Prisma reads this file):

   ```env
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
   PORT=4001
   JWT_SECRET=your-long-random-secret
   ANTHROPIC_API_KEY=sk-ant-...
   USE_KAFKA=false
   USE_CLICKHOUSE=false
   DEMO_MODE=false
   REQUIRE_DATABASE=true
   ```

   Copy the same values to the repo root `.env` if you use root-level tooling.

3. **Database**

   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

4. **Start**

   ```bash
   npm run dev
   ```

5. Open **http://localhost:5173** — register/login with any email + password (first login creates the user).

## Run with Docker infrastructure

```bash
npm run infra:up
# wait ~10s for Postgres
npm run setup:env
# ensure apps/api/.env has:
# DATABASE_URL=postgresql://sourceiq:sourceiq@localhost:5432/sourceiq
npm run db:push
npm run db:seed
npm run dev
```

Services:

| Service | Port |
|---------|------|
| Postgres | 5432 |
| Redis | 6379 |
| Kafka (Redpanda) | 19092 |
| ClickHouse HTTP | 8123 |
| API | 4001 |
| Web (Vite) | 5173 |

## Environment variables

See [.env.example](.env.example). Important fields:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection (required) |
| `JWT_SECRET` | Auth tokens |
| `ANTHROPIC_API_KEY` | Claude JD parse, resume scoring |
| `USE_KAFKA` / `USE_CLICKHOUSE` | Set `false` for minimal local setup |
| `TAVILY_API_KEY` / `GITHUB_TOKEN` | Real candidate discovery connectors |
| `SMTP_*` | Outreach email |

## Project layout

```
recruitmentSourceIQ/
├── apps/
│   ├── api/          # Express API, Prisma, workers
│   └── web/          # Vite React app
├── packages/
│   └── shared/       # Shared TypeScript types
├── scripts/          # install.ps1, install.sh, setup-env.mjs
├── docker-compose.yml
└── .env.example
```

## Troubleshooting

**`EPERM` on `prisma generate`** — Stop `npm run dev` (Node locks the query engine on Windows), then run `npm run db:generate`.

**`db:push` auth failed** — `DATABASE_URL` in `apps/api/.env` must match your Postgres host/user (not an old localhost default).

**`/auth/me` 500** — Log out, set `JWT_SECRET`, restart API, log in again.

**Prisma `phone` column missing** — After pulling contact-details changes: stop API → `npm run db:push`.

## Docs per app

- [apps/api/README.md](apps/api/README.md) — API, database, tests
- [apps/web/README.md](apps/web/README.md) — Frontend dev

## License

Private — internal use.
