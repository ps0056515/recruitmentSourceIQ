# @sourceiq/api

Express API for sourceIQ: auth, jobs, JD parsing, candidate ranking, search orchestration, outreach, and analytics.

## Install

From the **repository root**:

```bash
npm install
npm run setup:env
```

Configure **`apps/api/.env`** (required for Prisma and `dotenv`):

```bash
cp ../../.env.example .env   # or use: npm run setup:env from root
```

Edit at minimum:

```env
DATABASE_URL=postgresql://sourceiq:sourceiq@localhost:5432/sourceiq
PORT=4001
JWT_SECRET=change-me
ANTHROPIC_API_KEY=
USE_KAFKA=false
USE_CLICKHOUSE=false
```

### Database setup

```bash
# from repo root
npm run db:generate -w @sourceiq/api
npm run db:push
npm run db:seed
```

Or from this directory:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### Run

```bash
# from repo root (recommended)
npm run dev:api

# or here
npm run dev
```

API: **http://localhost:4001**  
Health: `GET /health`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | `tsx watch` dev server |
| `npm run build` | `tsc` → `dist/` |
| `npm run start` | Run compiled `dist/index.js` |
| `npm run db:generate` | Prisma client generate |
| `npm run db:push` | Push schema to Postgres |
| `npm run db:seed` | Seed demo workspace & jobs |
| `npm run test` | Vitest unit tests |
| `npm run test:watch` | Vitest watch mode |

## Test DB connection

```bash
npx tsx scripts/test-db-connect.ts "postgresql://user:pass@host:5432/db"
```

## Key paths

| Path | Purpose |
|------|---------|
| `src/index.ts` | Server boot, Kafka/ClickHouse workers |
| `src/config/prompts.ts` | LLM prompts (JD, resume, ranking) |
| `src/services/jdParser.ts` | JD → structured brief |
| `src/services/rankingService.ts` | Resume vs JD scoring |
| `prisma/schema.prisma` | Database schema |
| `prisma/seed.ts` | Demo data |

## Tests

```bash
npm run test
```

Uses in-memory mode (`SKIP_AUTH`, no real Postgres) for most e2e API tests.

## Production notes

- Set `JWT_SECRET` to a strong random value.
- Set `REQUIRE_DATABASE=true` and `DEMO_MODE=false`.
- Provide `ANTHROPIC_API_KEY` for accurate matching.
- Enable `USE_KAFKA` / `USE_CLICKHOUSE` only when those services are running.
