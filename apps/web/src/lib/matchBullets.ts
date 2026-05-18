import type { Candidate, GapItem } from "@sourceiq/shared";

export type MatchBullet = { key: string; label: string; matched: boolean; detail?: string };

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

export function matchBulletCounts(candidate: Pick<Candidate, "gaps">): {
  matched: number;
  total: number;
} {
  const gaps = candidate.gaps ?? [];
  if (!gaps.length) return { matched: 0, total: 0 };
  const must = gaps.filter((g) => g.severity !== "nice_have");
  const pool = must.length ? must : gaps;
  return {
    matched: pool.filter((g) => g.matched).length,
    total: pool.length,
  };
}
