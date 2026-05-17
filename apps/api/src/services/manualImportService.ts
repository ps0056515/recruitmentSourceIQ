import type { Candidate, Job, ManualImportResult, ParsedJD, ProfileSource } from "@sourceiq/shared";
import { jobs, candidates as memCandidates } from "../store.js";
import { prisma } from "../lib/prisma.js";
import { parseResumeFromText } from "./resumeParser.js";
import { rankProfiles } from "./rankingService.js";
import { persistRankedCandidates } from "./candidatePersistence.js";
import { trackEvent } from "./analyticsService.js";

async function getJob(jobId: string): Promise<(Job & { workspaceId?: string }) | null> {
  try {
    const row = await prisma.job.findUnique({ where: { id: jobId } });
    if (!row) return jobs.get(jobId) ?? null;
    return {
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location ?? undefined,
      parsedJd: row.parsedJd as unknown as ParsedJD | undefined,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      workspaceId: row.workspaceId,
    };
  } catch {
    return jobs.get(jobId) ?? null;
  }
}

function fallbackJd(job: Job): ParsedJD {
  return {
    title: job.title,
    company: job.company,
    summary: `Requirements for ${job.title} at ${job.company}`,
    mustHaves: job.parsedJd?.mustHaves?.length ? job.parsedJd.mustHaves : ["Relevant experience", "Core skills for role"],
    niceToHaves: job.parsedJd?.niceToHaves ?? [],
    skills: job.parsedJd?.skills ?? [],
    rawExcerpt: job.parsedJd?.rawExcerpt ?? job.title,
  };
}

export async function importManualResume(
  jobId: string,
  resumeText: string,
  options?: { candidateName?: string; sourceSite?: ProfileSource },
): Promise<ManualImportResult> {
  const trimmed = resumeText.trim();
  if (trimmed.length < 40) {
    throw new Error("resume_too_short");
  }

  const job = await getJob(jobId);
  if (!job) throw new Error("job_not_found");

  const parsedJd = job.parsedJd?.title ? job.parsedJd : fallbackJd(job);
  const profile = await parseResumeFromText(trimmed, options);
  const [ranked] = await rankProfiles(parsedJd, [profile]);
  if (!ranked) throw new Error("ranking_failed");

  await persistRankedCandidates(jobId, [ranked]);

  let candidate: Candidate | undefined;
  try {
    const row = await prisma.candidate.findFirst({
      where: { jobId, name: ranked.profile.name },
      orderBy: { createdAt: "desc" },
      include: { sources: true },
    });
    if (row) {
      candidate = {
        id: row.id,
        jobId: row.jobId,
        name: row.name,
        headline: row.headline,
        source: "manual_paste",
        sources: row.sources.map((s) => s.source) as ProfileSource[],
        matchScore: Math.round(row.matchScore),
        gaps: row.gaps as unknown as Candidate["gaps"],
        strengths: row.strengths as unknown as string[],
        stage: row.stage as Candidate["stage"],
        contactStatus: row.contactStatus as Candidate["contactStatus"],
        aiSummary: row.aiSummary ?? undefined,
        email: row.email ?? undefined,
        percentile: row.percentile ?? undefined,
        scoreBreakdown: row.scoreBreakdown as Record<string, number> | undefined,
      };
    }
  } catch {
    // memory fallback below
  }

  if (!candidate) {
    const fromMem = Array.from(memCandidates.values()).find(
      (c) => c.jobId === jobId && c.name === ranked.profile.name,
    );
    candidate = fromMem;
  }

  if (!candidate) {
    throw new Error("persist_failed");
  }

  if (job.workspaceId) {
    await trackEvent(job.workspaceId, "manual_resume_import", {
      jobId,
      candidateId: candidate.id,
      matchScore: candidate.matchScore,
      sourceSite: options?.sourceSite ?? "manual_paste",
    }).catch(() => undefined);
  }

  return {
    candidate,
    parsedProfile: {
      name: ranked.profile.name,
      headline: ranked.profile.headline,
      email: ranked.profile.email,
      skills: ranked.profile.skills,
      companies: ranked.profile.companies,
    },
  };
}
