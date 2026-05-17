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
      return;
    }
  } catch {
    /* fall through to demo */
  }
  if (loadDemoIntoMemory(jobs, memCandidates)) {
    console.log("  Loaded demo dataset (8 candidates, 2 jobs, inbox, analytics)");
    console.log("  Tip: npm run infra:up && npm run db:push && npm run db:seed for persistent Postgres");
  }
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

  const port = Number(process.env.PORT ?? 4001);
  server.listen(port, () => {
    console.log(`sourceIQ API + WS on http://localhost:${port}`);
    console.log(`  Kafka: ${process.env.USE_KAFKA === "true" ? "on" : "in-memory bus"}`);
    console.log(`  Claude: ${process.env.ANTHROPIC_API_KEY ? "on" : "heuristics"}`);
  });
}

boot().catch((e) => {
  console.error("boot failed", e);
  process.exit(1);
});
