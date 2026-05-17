import { randomUUID } from "crypto";
import type { GapItem, ParsedJD, RawCandidateProfile } from "@sourceiq/shared";
import { claudeJson, claudeText } from "../lib/llm.js";

export interface RankedProfile {
  profile: RawCandidateProfile;
  matchScore: number;
  gaps: GapItem[];
  strengths: string[];
  aiSummary: string;
  scoreBreakdown: Record<string, number>;
  percentile?: number;
}

function profileEvidenceBlob(profile: RawCandidateProfile): string {
  const resumeText = String(profile.raw?.resumeText ?? profile.raw?.excerpt ?? "");
  return [
    profile.name,
    profile.headline,
    profile.skills.join(" "),
    profile.companies.join(" "),
    resumeText,
  ]
    .join(" ")
    .toLowerCase();
}

function requirementMatched(label: string, blob: string): boolean {
  const norm = label.toLowerCase().trim();
  if (blob.includes(norm)) return true;
  const tokens = norm.split(/[\s/+,]+/).filter((t) => t.length > 2);
  if (tokens.length === 0) return false;
  const hits = tokens.filter((t) => blob.includes(t));
  return hits.length >= Math.ceil(tokens.length * 0.5);
}

function heuristicRank(parsedJd: ParsedJD, profile: RawCandidateProfile): RankedProfile {
  const blob = profileEvidenceBlob(profile);
  const must = parsedJd.mustHaves.length ? parsedJd.mustHaves : parsedJd.skills;
  const nice = parsedJd.niceToHaves.slice(0, 3);

  const mustGaps: GapItem[] = must.slice(0, 5).map((label) => {
    const matched = requirementMatched(label, blob);
    return {
      id: randomUUID(),
      label,
      severity: "must_have" as const,
      matched,
      detail: matched ? "Found in resume/profile text" : "Not found in pasted content",
    };
  });

  const niceGaps: GapItem[] = nice.map((label) => {
    const matched = requirementMatched(label, blob);
    return {
      id: randomUUID(),
      label,
      severity: "nice_have" as const,
      matched,
      detail: matched ? "Mentioned in resume" : "Not mentioned",
    };
  });

  const gaps = [...mustGaps, ...niceGaps];
  const mustMatched = mustGaps.filter((g) => g.matched).length;
  const niceMatched = niceGaps.filter((g) => g.matched).length;
  const mustPct = mustGaps.length ? mustMatched / mustGaps.length : 0.5;
  const nicePct = niceGaps.length ? niceMatched / niceGaps.length : 0.5;
  const score = Math.round(mustPct * 70 + nicePct * 30);

  const isManual = profile.source === "manual_paste";
  const summary = isManual
    ? `${profile.name} scored ${score}% vs job brief: ${mustMatched}/${mustGaps.length} must-haves matched from pasted resume.`
    : `${profile.name} aligns with ${parsedJd.title} based on ${profile.skills.slice(0, 4).join(", ")}.`;

  return {
    profile,
    matchScore: Math.min(98, Math.max(20, score)),
    gaps,
    strengths: profile.skills.slice(0, 3).map((s) => `Evidence: ${s}`),
    aiSummary: summary,
    scoreBreakdown: {
      skillMatch: Math.round(score * 0.4),
      experienceDepth: Math.round(score * 0.25),
      domainRelevance: Math.round(score * 0.2),
      profileSignals: Math.round(score * 0.1),
      activityRecency: Math.round(score * 0.05),
    },
  };
}

export async function rankProfiles(
  parsedJd: ParsedJD,
  profiles: RawCandidateProfile[],
): Promise<RankedProfile[]> {
  const claudeResults = await claudeJson<
    Array<{ name: string; matchScore: number; gaps: GapItem[]; strengths: string[]; summary: string }>
  >(
    "You score candidates 0-100 vs a JD. Return JSON array with name, matchScore, gaps (id,label,severity,matched,detail), strengths, summary.",
    `JD: ${JSON.stringify(parsedJd)}\nCandidates: ${JSON.stringify(
      profiles.map((p) => ({
        name: p.name,
        headline: p.headline,
        skills: p.skills,
        resumeExcerpt: String(p.raw?.resumeText ?? p.raw?.excerpt ?? "").slice(0, 4000),
      })),
    )}`,
  );

  let ranked: RankedProfile[];
  if (claudeResults?.length) {
    ranked = profiles.map((profile, i) => {
      const c = claudeResults.find((r) => r.name === profile.name) ?? claudeResults[i];
      const base = heuristicRank(parsedJd, profile);
      return {
        ...base,
        matchScore: c?.matchScore ?? base.matchScore,
        gaps: c?.gaps?.length ? c.gaps : base.gaps,
        strengths: c?.strengths ?? base.strengths,
        aiSummary: c?.summary ?? base.aiSummary,
      };
    });
  } else {
    ranked = profiles.map((p) => heuristicRank(parsedJd, p));
  }

  ranked.sort((a, b) => b.matchScore - a.matchScore);
  const n = ranked.length;
  ranked.forEach((r, i) => {
    r.percentile = n ? Math.max(1, Math.round(((n - i) / n) * 100)) : 100;
  });

  for (const r of ranked.slice(0, 5)) {
    const enhanced = await claudeText(
      "Write one paragraph why candidate matches role and gaps.",
      `Role: ${parsedJd.title}\nCandidate: ${JSON.stringify(r.profile)}\nScore: ${r.matchScore}`,
    );
    if (enhanced) r.aiSummary = enhanced;
  }

  return ranked;
}
