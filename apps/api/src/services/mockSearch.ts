import type { Job, ParsedJD, ProfileSource, RawCandidateProfile } from "@sourceiq/shared";
import { mockProfiles } from "../connectors/mockProfiles.js";
import { rankProfiles } from "./rankingService.js";
import { persistRankedCandidates } from "./candidatePersistence.js";
import { prisma } from "../lib/prisma.js";
import { broadcast } from "../ws/searchProgress.js";

const DEFAULT_SOURCES: ProfileSource[] = ["linkedin", "github", "naukri", "stackoverflow", "internal_ats"];

export async function runMockSearch(job: Job, activeSources: ProfileSource[]): Promise<void> {
  const wanted = activeSources.length ? activeSources : DEFAULT_SOURCES;
  const parsedJd: ParsedJD =
    job.parsedJd ??
    ({
      title: job.title,
      company: job.company,
      summary: job.title,
      mustHaves: ["TypeScript", "React", "Node.js"],
      niceToHaves: ["AWS", "System design"],
      skills: ["TypeScript", "React", "Node.js"],
      rawExcerpt: job.title,
    } as ParsedJD);

  let totalScanned = 0;
  const rawAll: RawCandidateProfile[] = [];

  for (const source of wanted) {
    broadcast(job.id, {
      type: "source_progress",
      jobId: job.id,
      progress: { source, status: "searching", found: totalScanned, message: `Scanning ${source}` },
    });

    await new Promise((r) => setTimeout(r, 300 + Math.floor(Math.random() * 200)));
    const batch = mockProfiles(source, parsedJd, 2 + (wanted.indexOf(source) % 3));
    rawAll.push(...batch);
    totalScanned += batch.length;

    broadcast(job.id, {
      type: "source_progress",
      jobId: job.id,
      progress: { source, status: "done", found: totalScanned, message: `Found ${batch.length} on ${source}` },
    });
  }

  const ranked = await rankProfiles(parsedJd, rawAll);
  await persistRankedCandidates(job.id, ranked);

  try {
    await prisma.searchRun.create({
      data: {
        jobId: job.id,
        sources: wanted,
        status: "COMPLETE",
        totalScanned,
        totalMatched: ranked.length,
        completedAt: new Date(),
      },
    });
    await prisma.job.update({ where: { id: job.id }, data: { status: "ACTIVE" } });
  } catch {
    /* memory-only */
  }

  broadcast(job.id, { type: "search_complete", jobId: job.id, total: ranked.length });
}
