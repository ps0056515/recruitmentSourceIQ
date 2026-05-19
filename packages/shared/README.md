# @sourceiq/shared

Shared TypeScript types and constants used by `@sourceiq/api` and `@sourceiq/web`.

## Install

Installed automatically via npm workspaces from the repo root:

```bash
npm install
```

## Scripts

```bash
npm run build      # compile with tsc
npm run typecheck  # tsc --noEmit
```

## Usage

```ts
import type { Candidate, ParsedJD, Job } from "@sourceiq/shared";
import { PRD_SOURCES, SOURCE_COLORS } from "@sourceiq/shared";
```

No separate dev server — consumers import `src/index.ts` directly in development.
