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
    .filter((g) => !g.matched && g.severity !== "info" && g.label?.trim())
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

function scoredGaps(gaps: GapItem[] | undefined): GapItem[] {
  return (gaps ?? []).filter((g) => g.severity !== "info");
}

function enrichResult(result: Omit<ManualImportResult, "verdict" | "improvements">): ManualImportResult {
  const gaps = scoredGaps(result.candidate.gaps);
  const matchedLabels = gaps.filter((g) => g.matched).map((g) => g.label);
  const missingLabels = gaps.filter((g) => !g.matched).map((g) => g.label);
  return {
    ...result,
    verdict: matchVerdictForCandidate(result.candidate),
    improvements: improvementsFromGaps(result.candidate.gaps),
    matchedCount: matchedLabels.length,
    missingCount: missingLabels.length,
    matchedLabels,
    missingLabels,
  };
}

/** Rank cohort + explain why #1 beats #2, etc. */
export function attachComparativeRanking(results: ManualImportResult[]): {
  results: ManualImportResult[];
  requirementColumns: Array<{ label: string; severity: GapItem["severity"] }>;
  comparisonSummary: string;
} {
  const sorted = [...results].sort((a, b) => {
    const scoreDiff = b.candidate.matchScore - a.candidate.matchScore;
    if (scoreDiff !== 0) return scoreDiff;
    const matchDiff = (b.matchedCount ?? 0) - (a.matchedCount ?? 0);
    if (matchDiff !== 0) return matchDiff;
    return a.candidate.name.localeCompare(b.candidate.name);
  });

  const labelMeta = new Map<string, GapItem["severity"]>();
  for (const r of sorted) {
    for (const g of scoredGaps(r.candidate.gaps)) {
      if (!labelMeta.has(g.label)) labelMeta.set(g.label, g.severity);
    }
  }
  const requirementColumns = [...labelMeta.entries()].map(([label, severity]) => ({ label, severity }));

  const ranked = sorted.map((r, i) => {
    const rank = i + 1;
    const next = sorted[i + 1];
    let rankReason: string;
    if (sorted.length === 1) {
      rankReason = `Only profile in this batch — scored ${Math.round(r.candidate.matchScore)}% vs JD (${r.matchedCount ?? 0} matched, ${r.missingCount ?? 0} missing). Upload more resumes together to compare.`;
    } else if (rank === 1 && next) {
      const delta = Math.round(r.candidate.matchScore - next.candidate.matchScore);
      const extra = (r.matchedLabels ?? []).filter((l) => !(next.matchedLabels ?? []).includes(l));
      const parts = [
        `#1 of ${sorted.length} — ${Math.round(r.candidate.matchScore)}% vs JD`,
        delta > 0 ? `${delta} points above ${next.candidate.name}` : `tied on score with ${next.candidate.name}; ranked by more matched requirements`,
      ];
      if (extra.length) parts.push(`unique matches: ${extra.slice(0, 4).join(", ")}`);
      if ((r.missingLabels ?? []).length) parts.push(`still missing: ${(r.missingLabels ?? []).slice(0, 3).join(", ")}`);
      rankReason = parts.join(". ") + ".";
    } else {
      const above = sorted[i - 1]!;
      const delta = Math.round(above.candidate.matchScore - r.candidate.matchScore);
      const behindOn = (above.matchedLabels ?? []).filter((l) => !(r.matchedLabels ?? []).includes(l));
      const parts = [
        `#${rank} of ${sorted.length} — ${Math.round(r.candidate.matchScore)}% vs JD`,
        delta > 0
          ? `${delta} points below ${above.candidate.name}`
          : `same score as ${above.candidate.name}; fewer matched requirements`,
      ];
      if (behindOn.length) parts.push(`behind on: ${behindOn.slice(0, 4).join(", ")}`);
      if ((r.matchedLabels ?? []).length) parts.push(`has: ${(r.matchedLabels ?? []).slice(0, 4).join(", ")}`);
      if ((r.missingLabels ?? []).length) parts.push(`missing: ${(r.missingLabels ?? []).slice(0, 4).join(", ")}`);
      rankReason = parts.join(". ") + ".";
    }
    return { ...r, rank, rankReason };
  });

  const top = ranked[0];
  const comparisonSummary =
    ranked.length <= 1
      ? "Upload 2+ resumes in one go to see a transparent head-to-head ranking."
      : `Ranked ${ranked.length} profiles vs the same JD. #1 ${top?.candidate.name ?? ""} (${Math.round(top?.candidate.matchScore ?? 0)}%) — ordering is by match % then # of requirements matched. Soft traits are not scored from CVs.`;

  return { results: ranked, requirementColumns, comparisonSummary };
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
  options?: {
    candidateName?: string;
    sourceSite?: ProfileSource;
    salarySignal?: string;
    noticePeriod?: string;
  },
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
  resumes: Array<{
    resumeText: string;
    candidateName?: string;
    salarySignal?: string;
    noticePeriod?: string;
  }>,
  options?: { sourceSite?: ProfileSource },
): Promise<BatchManualImportResult> {
  const results: ManualImportResult[] = [];
  const errors: BatchManualImportResult["errors"] = [];

  for (const [index, item] of resumes.entries()) {
    try {
      const result = await importManualResume(jobId, item.resumeText, {
        candidateName: item.candidateName,
        sourceSite: options?.sourceSite,
        salarySignal: item.salarySignal,
        noticePeriod: item.noticePeriod,
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

  const compared = attachComparativeRanking(results);
  return { ...compared, errors };
}
