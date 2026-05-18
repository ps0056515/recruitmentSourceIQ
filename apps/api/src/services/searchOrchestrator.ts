import type { ParsedJD, ProfileSource, RawCandidateProfile, SearchConfig } from "@sourceiq/shared";
import { KAFKA_TOPICS, publish } from "../lib/kafka.js";
import { prisma } from "../lib/prisma.js";
import { getConnectors } from "../connectors/registry.js";
import { mergeProfiles } from "./deduplication.js";
import { rankProfiles } from "./rankingService.js";
import { persistRankedCandidates } from "./candidatePersistence.js";
import { trackEvent } from "./analyticsService.js";
import { broadcast } from "../ws/searchProgress.js";

export async function startSearch(jobId: string, sources: ProfileSource[], config: SearchConfig) {
  await publish(KAFKA_TOPICS.SEARCH_TASKS, { jobId, sources, config });
}

export async function executeSearch(jobId: string, sources: ProfileSource[], config: SearchConfig) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("job_not_found");

  const parsedJd = job.parsedJd as unknown as ParsedJD;
  if (!parsedJd) throw new Error("jd_required");

  await prisma.job.update({ where: { id: jobId }, data: { status: "SEARCHING" } });

  const run = await prisma.searchRun.create({
    data: { jobId, sources, status: "RUNNING" },
  });

  const limit = config.maxResults ?? 50;
  const connectors = getConnectors(sources);
  let totalScanned = 0;
  const rawAll: RawCandidateProfile[] = [];
  const sourceProgress: Record<string, { found: number; status: string }> = {};

  await Promise.all(
    connectors.map(async (connector) => {
      broadcast(jobId, {
        type: "source_progress",
        jobId,
        progress: { source: connector.source, status: "searching", found: 0, message: `Scanning ${connector.source}` },
      });
      try {
        const batch = await connector.search({
          jobId,
          parsedJd,
          config,
          limit: Math.ceil(limit / connectors.length),
        });
        totalScanned += batch.length;
        sourceProgress[connector.source] = { found: batch.length, status: "done" };
        rawAll.push(...batch);
        await publish(KAFKA_TOPICS.CANDIDATES_RAW, { jobId, source: connector.source, profiles: batch });
        broadcast(jobId, {
          type: "source_progress",
          jobId,
          progress: {
            source: connector.source,
            status: "done",
            found: batch.length,
            message: `Found ${batch.length} on ${connector.source}`,
          },
        });
      } catch (e) {
        sourceProgress[connector.source] = { found: 0, status: "error" };
        broadcast(jobId, {
          type: "source_progress",
          jobId,
          progress: { source: connector.source, status: "error", found: 0, message: String(e) },
        });
      }
    }),
  );

  const merged = mergeProfiles(rawAll);
  const ranked = await rankProfiles(parsedJd, merged);
  await persistRankedCandidates(jobId, ranked);

  await prisma.searchRun.update({
    where: { id: run.id },
    data: {
      status: "COMPLETE",
      totalScanned,
      totalMatched: ranked.length,
      sourceProgress: sourceProgress as object,
      completedAt: new Date(),
    },
  });
  await prisma.job.update({ where: { id: jobId }, data: { status: "ACTIVE" } });

  await trackEvent(job.workspaceId, "search_complete", { jobId, totalScanned, totalMatched: ranked.length });

  broadcast(jobId, { type: "search_complete", jobId, total: ranked.length });

  for (const r of ranked) {
    broadcast(jobId, {
      type: "candidate_scored",
      jobId,
      candidate: {
        id: r.profile.externalId,
        jobId,
        name: r.profile.name,
        headline: r.profile.headline,
        source: r.profile.source,
        matchScore: r.matchScore,
        gaps: r.gaps,
        strengths: r.strengths,
        stage: "new",
        contactStatus: "not_contacted",
        aiSummary: r.aiSummary,
      },
    });
  }
}
