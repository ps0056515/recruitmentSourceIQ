import { randomUUID } from "crypto";
import type { GapItem, ParsedJD, RawCandidateProfile } from "@sourceiq/shared";
import { claudeJson, claudeText } from "../lib/llm.js";
import {
  PROMPTS,
  candidateRankingUserMessage,
  candidateSummaryUserMessage,
} from "../config/prompts.js";
import {
  buildManualMatchSummary,
  classifyRequirement,
  computeMatchScoreFromGaps,
  requirementMatched,
  resolveScoringRequirements,
} from "../config/requirementMatching.js";

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

function normalizeGapSeverity(severity: unknown): GapItem["severity"] {
  const s = String(severity ?? "").toLowerCase();
  if (s === "must_have" || s === "critical" || s === "major") return "must_have";
  if (s === "nice_have" || s === "minor" || s === "preferred") return "nice_have";
  return "info";
}

function normalizeGapItem(g: GapItem): GapItem {
  const label = String(g.label ?? "").trim();
  const rawCat = (g as GapItem & { category?: string }).category;
  const category =
    rawCat === "technical" || rawCat === "behavioral"
      ? rawCat
      : classifyRequirement(label);
  return {
    id: g.id || randomUUID(),
    label,
    matched: Boolean(g.matched),
    severity: normalizeGapSeverity(g.severity),
    category,
    detail: g.detail ? String(g.detail).trim() : undefined,
  };
}

/** Keep full JD requirement coverage; enrich with Claude evidence where labels align. */
function mergeGaps(base: GapItem[], fromClaude: GapItem[]): GapItem[] {
  if (!fromClaude.length) return base;
  const claudeByLabel = new Map<string, GapItem>();
  for (const g of fromClaude.map(normalizeGapItem).filter((x) => x.label)) {
    claudeByLabel.set(x.label.toLowerCase(), x);
  }

  const merged = base.map((raw) => {
    const g = normalizeGapItem(raw);
    const c = claudeByLabel.get(g.label.toLowerCase());
    if (c) claudeByLabel.delete(g.label.toLowerCase());
    return c
      ? {
          ...g,
          matched: c.matched,
          detail: c.detail ?? g.detail,
          severity: c.severity !== "info" ? c.severity : g.severity,
          category: c.category ?? g.category ?? classifyRequirement(g.label),
        }
      : g;
  });

  for (const c of claudeByLabel.values()) merged.push(c);
  return merged;
}

function mergeStrengths(base: string[], fromClaude: string[]): string[] {
  return dedupeLabels([...fromClaude, ...base]).slice(0, 12);
}

function dedupeLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of labels) {
    const t = label.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function buildRequirementGaps(
  labels: string[],
  blob: string,
  severity: GapItem["severity"],
): GapItem[] {
  return labels.map((label) => {
    const matched = requirementMatched(label, blob);
    const category = classifyRequirement(label);
    return {
      id: randomUUID(),
      label,
      severity,
      category,
      matched,
      detail: matched
        ? category === "technical"
          ? "Found in resume/profile text"
          : "Demonstrated in resume or profile"
        : category === "technical"
          ? "Not found in pasted content"
          : "Limited evidence in pasted content",
    };
  });
}

function applyScoreFromGaps(rank: RankedProfile): RankedProfile {
  const normalized = rank.gaps.map(normalizeGapItem);
  const { score, scoreBreakdown } = computeMatchScoreFromGaps(normalized);
  return { ...rank, gaps: normalized, matchScore: score, scoreBreakdown };
}

function heuristicRank(parsedJd: ParsedJD, profile: RawCandidateProfile): RankedProfile {
  const blob = profileEvidenceBlob(profile);
  const { technical, behavioral } = resolveScoringRequirements(parsedJd);

  const gaps = [
    ...buildRequirementGaps(technical, blob, "must_have"),
    ...buildRequirementGaps(behavioral, blob, "nice_have"),
  ];

  const { score, scoreBreakdown } = computeMatchScoreFromGaps(gaps);

  const isManual = profile.source === "manual_paste";
  const summary = isManual
    ? buildManualMatchSummary(profile.name, score, parsedJd.title, gaps)
    : `${profile.name} aligns with ${parsedJd.title} based on ${profile.skills.slice(0, 4).join(", ")}.`;

  return {
    profile,
    matchScore: score,
    gaps,
    strengths: profile.skills.slice(0, 3).map((s) => `Evidence: ${s}`),
    aiSummary: summary,
    scoreBreakdown,
  };
}

export async function rankProfiles(
  parsedJd: ParsedJD,
  profiles: RawCandidateProfile[],
): Promise<RankedProfile[]> {
  const claudeResults = await claudeJson<
    Array<{ name: string; matchScore: number; gaps: GapItem[]; strengths: string[]; summary: string }>
  >(
    PROMPTS.candidateRanking.system,
    candidateRankingUserMessage(
      parsedJd,
      profiles.map((p) => ({
        name: p.name,
        headline: p.headline,
        skills: p.skills,
        resumeExcerpt: String(p.raw?.resumeText ?? p.raw?.excerpt ?? "").slice(0, 4000),
      })),
    ),
  );

  let ranked: RankedProfile[];
  if (claudeResults?.length) {
    ranked = profiles.map((profile, i) => {
      const c = claudeResults.find((r) => r.name === profile.name) ?? claudeResults[i];
      const base = heuristicRank(parsedJd, profile);
      return applyScoreFromGaps({
        ...base,
        gaps: mergeGaps(base.gaps, c?.gaps ?? []),
        strengths: mergeStrengths(base.strengths, c?.strengths ?? []),
        aiSummary: c?.summary ?? base.aiSummary,
      });
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
      PROMPTS.candidateSummaryEnhance.system,
      candidateSummaryUserMessage(parsedJd.title, r.profile, r.matchScore, r.gaps, r.strengths),
    );
    if (enhanced) {
      r.aiSummary = enhanced;
      const lines = enhanced
        .split(/\n+/)
        .map((l) => l.replace(/^[-*•\d.)]+\s*/, "").trim())
        .filter((l) => l.length > 8);
      if (lines.length >= 2) {
        r.strengths = mergeStrengths(r.strengths, lines);
      }
    }
  }

  return ranked;
}
