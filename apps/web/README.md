# @sourceiq/web

Vite + React frontend for sourceIQ. Proxies `/api` and `/ws` to the API on port 3333.

## Install

From the **repository root** (workspaces install all packages):

```bash
npm install
```

The API must be running for full functionality. See [apps/api/README.md](../api/README.md).

## Run

```bash
# from repo root (API + web together)
npm run dev

# web only
npm run dev:web
```

App: **http://localhost:2222**

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server on port 2222 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |

## Proxy

`vite.config.ts` forwards:

- `/api` → `http://localhost:3333`
- `/ws` → `http://localhost:3333` (WebSocket)

Start the API before using discovery, auth, or imports.

## Main routes

| Path | Page |
|------|------|
| `/login` | Auth |
| `/jobs` | Job dashboard |
| `/jobs/:id/setup` | JD brief |
| `/jobs/:id/discover` | Live discovery & resume paste |
| `/jobs/:id/ranked` | Ranked candidates |
| `/candidates/:id` | Candidate profile |
| `/jobs/:id/outreach` | Outreach composer |
| `/analytics` | Analytics |
| `/inbox` | Reply inbox |

## Build

```bash
npm run build
```

Serve `dist/` behind any static host; configure the API base URL if not using the Vite dev proxy.
