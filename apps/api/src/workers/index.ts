import { KAFKA_TOPICS, subscribe } from "../lib/kafka.js";
import type { ProfileSource, SearchConfig } from "@sourceiq/shared";
import { executeSearch } from "../services/searchOrchestrator.js";

export async function startWorkers() {
  await subscribe(KAFKA_TOPICS.SEARCH_TASKS, async (msg) => {
    const { jobId, sources, config } = msg as {
      jobId: string;
      sources: ProfileSource[];
      config: SearchConfig;
    };
    await executeSearch(jobId, sources, config);
  });
}
