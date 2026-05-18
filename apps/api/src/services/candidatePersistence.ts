import { randomUUID } from "crypto";
import type { RankedProfile } from "./rankingService.js";
import { dedupeKey } from "./deduplication.js";
import { prisma } from "../lib/prisma.js";
import { candidates as memCandidates } from "../store.js";

export async function persistRankedCandidates(jobId: string, ranked: RankedProfile[]) {
  for (const r of ranked) {
    const key = dedupeKey(r.profile);
    const mergedSources = (r.profile.raw?.mergedSources as string[] | undefined) ?? [r.profile.source];

    try {
      const candidate = await prisma.candidate.upsert({
        where: { jobId_dedupeKey: { jobId, dedupeKey: key } },
        create: {
          jobId,
          dedupeKey: key,
          name: r.profile.name,
          headline: r.profile.headline,
          email: r.profile.email,
          phone: r.profile.phone,
          location: r.profile.location,
          matchScore: r.matchScore,
          scoreBreakdown: r.scoreBreakdown,
          gaps: r.gaps as object,
          strengths: r.strengths as object,
          aiSummary: r.aiSummary,
          percentile: r.percentile,
          salarySignal: r.profile.salarySignal,
          noticePeriod: r.profile.noticePeriod,
          recency: r.profile.recency,
          sources: {
            create: mergedSources.map((source) => ({
              source,
              externalId: r.profile.externalId,
              profileUrl: r.profile.profileUrl,
              rawProfile: (r.profile.raw ?? {}) as object,
            })),
          },
        },
        update: {
          matchScore: r.matchScore,
          scoreBreakdown: r.scoreBreakdown,
          gaps: r.gaps as object,
          strengths: r.strengths as object,
          aiSummary: r.aiSummary,
          percentile: r.percentile,
          email: r.profile.email,
          phone: r.profile.phone,
          location: r.profile.location,
          headline: r.profile.headline,
        },
      });

      memCandidates.set(candidate.id, {
        id: candidate.id,
        jobId,
        name: candidate.name,
        headline: candidate.headline,
        source: r.profile.source,
        sources: mergedSources as never[],
        sourceUrl: r.profile.profileUrl,
        matchScore: r.matchScore,
        gaps: r.gaps as never[],
        strengths: r.strengths as string[],
        stage: candidate.stage as never,
        contactStatus: candidate.contactStatus as never,
        email: r.profile.email ?? candidate.email ?? undefined,
        phone: r.profile.phone ?? candidate.phone ?? undefined,
        location: r.profile.location ?? candidate.location ?? undefined,
        linkedInUrl:
          (r.profile.raw?.linkedInUrl as string | undefined) ??
          (r.profile.profileUrl?.includes("linkedin") ? r.profile.profileUrl : undefined),
        githubUrl: r.profile.raw?.githubUrl as string | undefined,
        portfolioUrl: r.profile.raw?.portfolioUrl as string | undefined,
        aiSummary: r.aiSummary,
        percentile: r.percentile,
        scoreBreakdown: r.scoreBreakdown,
      });
    } catch {
      // DB unavailable — memory only
      const id = randomUUID();
      memCandidates.set(id, {
        id,
        jobId,
        name: r.profile.name,
        headline: r.profile.headline,
        source: r.profile.source,
        matchScore: r.matchScore,
        gaps: r.gaps as never[],
        strengths: r.strengths,
        stage: "new",
        contactStatus: "not_contacted",
        email: r.profile.email,
        phone: r.profile.phone,
        location: r.profile.location,
        sourceUrl: r.profile.profileUrl,
        linkedInUrl: r.profile.raw?.linkedInUrl as string | undefined,
        githubUrl: r.profile.raw?.githubUrl as string | undefined,
        portfolioUrl: r.profile.raw?.portfolioUrl as string | undefined,
        aiSummary: r.aiSummary,
      });
    }
  }
}
