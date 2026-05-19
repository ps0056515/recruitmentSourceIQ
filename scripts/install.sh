#!/usr/bin/env bash
# sourceIQ — macOS / Linux install
# Usage: ./scripts/install.sh
#        ./scripts/install.sh --with-infra --seed

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WITH_INFRA=false
SEED=false
SKIP_DB=false

for arg in "$@"; do
  case "$arg" in
    --with-infra) WITH_INFRA=true ;;
    --seed) SEED=true ;;
    --skip-db) SKIP_DB=true ;;
    -h|--help)
      echo "Usage: $0 [--with-infra] [--seed] [--skip-db]"
      exit 0
      ;;
  esac
done

echo "==> sourceIQ install"
command -v node >/dev/null || { echo "Node.js 20+ required"; exit 1; }

echo "==> npm install"
npm install

echo "==> Environment files"
node scripts/setup-env.mjs

if [ "$WITH_INFRA" = true ]; then
  command -v docker >/dev/null || { echo "Docker required for --with-infra"; exit 1; }
  echo "==> Docker infrastructure"
  docker compose up -d
  sleep 5
fi

if [ "$SKIP_DB" = false ]; then
  echo "==> Prisma generate + db push"
  npm run db:generate -w @sourceiq/api || echo "warn: prisma generate failed (stop API if file locked)"
  npm run db:push || echo "warn: db:push failed — check DATABASE_URL in apps/api/.env"
  if [ "$SEED" = true ]; then
    echo "==> Seed demo data"
    npm run db:seed
  fi
fi

echo ""
echo "Done. Next:"
echo "  1. Edit apps/api/.env"
echo "  2. npm run dev"
echo "  3. Open http://localhost:5173"
