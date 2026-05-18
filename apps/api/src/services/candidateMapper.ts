import type { Candidate, GapItem, ProfileSource } from "@sourceiq/shared";
import type { Candidate as PrismaCandidate, CandidateSource as PrismaSource } from "@prisma/client";

type Row = PrismaCandidate & { sources?: PrismaSource[] };

export function prismaCandidateToApi(row: Row): Candidate {
  const sources = row.sources ?? [];
  const primary = (sources[0]?.source ?? "linkedin") as ProfileSource;
  const raw = (sources[0]?.rawProfile ?? {}) as Record<string, unknown>;
  const profileUrl = sources[0]?.profileUrl ?? undefined;
  const linkedInUrl =
    (typeof raw.linkedInUrl === "string" ? raw.linkedInUrl : undefined) ??
    (profileUrl?.includes("linkedin") ? profileUrl : undefined);
  return {
    id: row.id,
    jobId: row.jobId,
    name: row.name,
    headline: row.headline,
    source: primary,
    sources: sources.map((s) => s.source) as ProfileSource[],
    sourceUrl: profileUrl,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    location: row.location ?? undefined,
    linkedInUrl,
    githubUrl: typeof raw.githubUrl === "string" ? raw.githubUrl : undefined,
    portfolioUrl: typeof raw.portfolioUrl === "string" ? raw.portfolioUrl : undefined,
    matchScore: Math.round(row.matchScore),
    gaps: row.gaps as unknown as GapItem[],
    strengths: row.strengths as unknown as string[],
    stage: row.stage as Candidate["stage"],
    contactStatus: row.contactStatus as Candidate["contactStatus"],
    aiSummary: row.aiSummary ?? undefined,
    percentile: row.percentile ?? undefined,
    scoreBreakdown: row.scoreBreakdown as Record<string, number> | undefined,
    salarySignal: row.salarySignal ?? undefined,
    noticePeriod: row.noticePeriod ?? undefined,
    recency: row.recency ?? undefined,
    avatarUrl:
      row.avatarUrl ??
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.name)}`,
  };
}
