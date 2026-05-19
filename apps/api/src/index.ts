import "dotenv/config";
import http from "http";
import { WebSocketServer } from "ws";
import { createApp } from "./app.js";
import { handleUpgrade } from "./ws/searchProgress.js";
import { connectKafka } from "./lib/kafka.js";
import { initClickHouse } from "./lib/clickhouse.js";
import { startWorkers } from "./workers/index.js";
import { prisma } from "./lib/prisma.js";
import { jobs, candidates as memCandidates } from "./store.js";
import { jobToApi } from "./routes/jobHelpers.js";
import { prismaCandidateToApi } from "./services/candidateMapper.js";
import { loadDemoIntoMemory } from "./data/demoDataset.js";
import { isDemoMode, requireDatabase } from "./lib/config.js";

async function warmMemoryCache() {
  try {
    const jobRows = await prisma.job.findMany({
      include: { _count: { select: { candidates: true } } },
    });
    for (const row of jobRows) jobs.set(row.id, jobToApi(row));

    const candRows = await prisma.candidate.findMany({ include: { sources: true } });
    for (const row of candRows) memCandidates.set(row.id, prismaCandidateToApi(row));

    if (jobRows.length) {
      console.log(`  Loaded ${jobRows.length} jobs, ${candRows.length} candidates from Postgres`);
      return true;
    }
  } catch (e) {
    if (requireDatabase()) throw e;
    console.warn("  Postgres unavailable:", e instanceof Error ? e.message : e);
  }

  if (isDemoMode() && loadDemoIntoMemory(jobs, memCandidates)) {
    console.log("  DEMO_MODE: loaded demo dataset into memory");
    return true;
  }

  if (requireDatabase()) {
    throw new Error("Database required but empty. Run: npm run infra:up && npm run db:push && npm run db:seed");
  }

  console.log("  No jobs in database. Create a job via the UI or run db:seed.");
  return false;
}

const app = createApp();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  handleUpgrade(req, socket, head, wss);
});

async function boot() {
  await warmMemoryCache();
  await connectKafka();
  await initClickHouse();
  await startWorkers();

  const port = Number(process.env.PORT ?? 3333);
  server.listen(port, () => {
    console.log(`sourceIQ API + WS on http://localhost:${port}`);
    console.log(`  Mode: ${isDemoMode() ? "demo" : "production"}`);
    console.log(`  Kafka: ${process.env.USE_KAFKA === "true" ? "on" : "in-memory bus"}`);
    console.log(`  Claude: ${process.env.ANTHROPIC_API_KEY ? "on" : "heuristics"}`);
    console.log(`  Email: ${process.env.SMTP_HOST ? "SMTP" : "not configured"}`);
    console.log(`  Tavily: ${process.env.TAVILY_API_KEY ? "on" : "off"}`);
    console.log(`  Proxycurl: ${process.env.PROXYCURL_API_KEY ? "on" : "off"}`);
  });
}

boot().catch((e) => {
  console.error("boot failed", e);
  process.exit(1);
});
