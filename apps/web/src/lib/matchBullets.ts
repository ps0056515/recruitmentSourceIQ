import type { Candidate, GapItem, RequirementCategory } from "@sourceiq/shared";

export type MatchBullet = {
  key: string;
  label: string;
  matched: boolean;
  detail?: string;
  category?: RequirementCategory;
};

function dedupeBullets(items: MatchBullet[]): MatchBullet[] {
  const seen = new Set<string>();
  const out: MatchBullet[] = [];
  for (const item of items) {
    const key = item.label.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function sentencesFromSummary(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.replace(/^[-*•\d.)]+\s*/, "").trim())
    .filter((s) => s.length > 10);
}

function gapBullet(g: GapItem): MatchBullet {
  return {
    key: g.id,
    label: g.label,
    matched: g.matched,
    detail: g.detail,
    category: gapCat(g),
  };
}

/** Recruiter-friendly bullets for Latest match — merges requirements, strengths, and summary. */
export function matchBulletsForCandidate(
  candidate: Pick<Candidate, "strengths" | "gaps" | "aiSummary">,
): MatchBullet[] {
  const items: MatchBullet[] = [];

  for (const g of candidate.gaps ?? []) {
    if (g.label?.trim()) items.push(gapBullet(g));
  }

  const existing = new Set(items.map((i) => i.label.toLowerCase()));
  for (const [i, label] of (candidate.strengths ?? []).entries()) {
    const t = label.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (existing.has(key)) continue;
    existing.add(key);
    items.push({ key: `strength-${i}`, label: t, matched: true });
  }

  if (items.length < 5 && candidate.aiSummary) {
    for (const [i, label] of sentencesFromSummary(candidate.aiSummary).entries()) {
      const key = label.toLowerCase();
      if (existing.has(key)) continue;
      existing.add(key);
      items.push({ key: `summary-${i}`, label, matched: true });
    }
  }

  const sorted = dedupeBullets(items).sort((a, b) => Number(b.matched) - Number(a.matched));
  return sorted.slice(0, 14);
}

function gapCat(g: GapItem): RequirementCategory {
  return g.category ?? (/communication|ownership|impact|collaborat|leadership|ambiguity/i.test(g.label)
    ? "behavioral"
    : "technical");
}

export function matchBulletCounts(candidate: Pick<Candidate, "gaps">): {
  matched: number;
  total: number;
  technicalMatched: number;
  technicalTotal: number;
  behavioralMatched: number;
  behavioralTotal: number;
} {
  const gaps = candidate.gaps ?? [];
  const tech = gaps.filter((g) => gapCat(g) === "technical");
  const beh = gaps.filter((g) => gapCat(g) === "behavioral");
  const technicalMatched = tech.filter((g) => g.matched).length;
  const behavioralMatched = beh.filter((g) => g.matched).length;
  return {
    matched: gaps.filter((g) => g.matched).length,
    total: gaps.length,
    technicalMatched,
    technicalTotal: tech.length,
    behavioralMatched,
    behavioralTotal: beh.length,
  };
}
