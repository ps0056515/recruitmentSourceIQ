import type {
  BatchManualImportResult,
  Candidate,
  GapItem,
  Job,
  ManualImportResult,
  MatchVerdict,
  ParsedJD,
  ProfileSource,
  ResumeImprovement,
} from "@sourceiq/shared";
import { jobs, candidates as memCandidates } from "../store.js";
import { prisma } from "../lib/prisma.js";
import { resolveMustRequirements } from "../config/requirementMatching.js";
import { parseResumeFromText } from "./resumeParser.js";
import { rankProfiles } from "./rankingService.js";
import { persistRankedCandidates } from "./candidatePersistence.js";
import { trackEvent } from "./analyticsService.js";
import { prismaCandidateToApi } from "./candidateMapper.js";
import { contactFromRawProfile, mergeContact } from "./candidateContact.js";

export function matchVerdictForCandidate(candidate: Pick<Candidate, "matchScore" | "gaps">): MatchVerdict {
  const gaps = candidate.gaps ?? [];
  const unmatchedMust = gaps.filter((g) => g.severity === "must_have" && !g.matched);
  if (candidate.matchScore >= 72 && unmatchedMust.length === 0) return "strong_match";
  if (candidate.matchScore >= 55 || gaps.some((g) => g.matched)) return "partial_match";
  return "weak_match";
}

export function improvementsFromGaps(gaps: GapItem[] | undefined): ResumeImprovement[] {
  return (gaps ?? [])
    .filter((g) => !g.matched && g.label?.trim())
    .map((g) => ({
      label: g.label.trim(),
      severity: g.severity,
      suggestion:
        g.detail?.trim() ||
        (g.severity === "must_have"
          ? `Add concrete evidence of ${g.label} (role, project, tools, and years).`
          : `If you have ${g.label} experience, call it out clearly near the top of the resume.`),
    }));
}

function enrichResult(result: Omit<ManualImportResult, "verdict" | "improvements">): ManualImportResult {
  return {
    ...result,
    verdict: matchVerdictForCandidate(result.candidate),
    improvements: improvementsFromGaps(result.candidate.gaps),
  };
}

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
  const base: ParsedJD = {
    title: job.title,
    company: job.company,
    summary: `Requirements for ${job.title} at ${job.company}`,
    mustHaves: job.parsedJd?.mustHaves ?? [],
    niceToHaves: job.parsedJd?.niceToHaves ?? [],
    skills: job.parsedJd?.skills ?? [],
    rawExcerpt: job.parsedJd?.rawExcerpt ?? job.title,
  };
  return {
    ...base,
    mustHaves: resolveMustRequirements(base),
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

  const parsedJd = job.parsedJd?.title
    ? { ...job.parsedJd, mustHaves: resolveMustRequirements(job.parsedJd) }
    : fallbackJd(job);
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
      candidate = prismaCandidateToApi(row);
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

  const parsedContact = contactFromRawProfile(ranked.profile);
  const contact = mergeContact(parsedContact, {
    email: candidate.email,
    phone: candidate.phone,
    location: candidate.location,
    linkedInUrl: candidate.linkedInUrl,
    githubUrl: candidate.githubUrl,
    portfolioUrl: candidate.portfolioUrl,
  });

  return enrichResult({
    candidate: { ...candidate, ...contact },
    parsedProfile: {
      name: ranked.profile.name,
      headline: ranked.profile.headline,
      skills: ranked.profile.skills,
      companies: ranked.profile.companies,
      ...contact,
    },
  });
}

export async function importManualResumesBatch(
  jobId: string,
  resumes: Array<{ resumeText: string; candidateName?: string }>,
  options?: { sourceSite?: ProfileSource },
): Promise<BatchManualImportResult> {
  const results: ManualImportResult[] = [];
  const errors: BatchManualImportResult["errors"] = [];

  for (const [index, item] of resumes.entries()) {
    try {
      const result = await importManualResume(jobId, item.resumeText, {
        candidateName: item.candidateName,
        sourceSite: options?.sourceSite,
      });
      results.push(result);
    } catch (e) {
      const error = e instanceof Error ? e.message : "import_failed";
      errors.push({
        index,
        error,
        message:
          error === "resume_too_short"
            ? "Paste at least a few lines of resume text."
            : error === "job_not_found"
              ? "Job not found."
              : String(e),
      });
    }
  }

  results.sort((a, b) => b.candidate.matchScore - a.candidate.matchScore);
  return { results, errors };
}
