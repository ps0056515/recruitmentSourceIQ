# sourceIQ — Windows install (PowerShell)
# Usage: .\scripts\install.ps1
#        .\scripts\install.ps1 -WithInfra -Seed

param(
    [switch]$WithInfra,
    [switch]$Seed,
    [switch]$SkipDb
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "==> sourceIQ install (Windows)" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js 20+ is required. Install from https://nodejs.org/"
}
$nodeVer = (node -v) -replace 'v', ''
if ([version]$nodeVer -lt [version]"20.0.0") {
    Write-Warning "Node $nodeVer detected; Node 20+ is recommended."
}

Write-Host "==> npm install" -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Environment files" -ForegroundColor Cyan
node scripts/setup-env.mjs

if ($WithInfra) {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is required for -WithInfra. Install Docker Desktop or use remote Postgres."
    }
    Write-Host "==> Docker infrastructure (Postgres, Redis, Kafka, ClickHouse)" -ForegroundColor Cyan
    docker compose up -d
    Start-Sleep -Seconds 5
}

if (-not $SkipDb) {
    Write-Host "==> Prisma generate + db push" -ForegroundColor Cyan
    npm run db:generate -w @sourceiq/api
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "prisma generate failed (API running?). Stop dev server and run: npm run db:generate -w @sourceiq/api"
    }
    npm run db:push
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "db:push failed. Check DATABASE_URL in apps/api/.env"
    }
    if ($Seed) {
        Write-Host "==> Seed demo data" -ForegroundColor Cyan
        npm run db:seed
    }
}

Write-Host ""
Write-Host "Done. Next steps:" -ForegroundColor Green
Write-Host "  1. Edit apps/api/.env (DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY)"
Write-Host "  2. npm run dev"
Write-Host "  3. Open http://localhost:5173"
