import type { BatchRequirementColumn, ManualImportResult } from "@sourceiq/shared";

/** Merge new scored resumes into an existing batch and re-rank transparently. */
export function mergeAndRankBatch(
  prev: ManualImportResult[],
  incoming: ManualImportResult[],
): {
  results: ManualImportResult[];
  requirementColumns: BatchRequirementColumn[];
  comparisonSummary: string;
} {
  const byKey = new Map<string, ManualImportResult>();
  for (const r of [...prev, ...incoming]) {
    const key = (r.candidate.name || r.candidate.id).toLowerCase().trim();
    const existing = byKey.get(key);
    if (!existing || r.candidate.matchScore >= existing.candidate.matchScore) {
      byKey.set(key, r);
    }
  }

  const sorted = [...byKey.values()].sort((a, b) => {
    const scoreDiff = b.candidate.matchScore - a.candidate.matchScore;
    if (scoreDiff !== 0) return scoreDiff;
    const matchDiff = (b.matchedCount ?? 0) - (a.matchedCount ?? 0);
    if (matchDiff !== 0) return matchDiff;
    return a.candidate.name.localeCompare(b.candidate.name);
  });

  const labelMeta = new Map<string, BatchRequirementColumn["severity"]>();
  for (const r of sorted) {
    for (const g of (r.candidate.gaps ?? []).filter((x) => x.severity !== "info")) {
      if (!labelMeta.has(g.label)) labelMeta.set(g.label, g.severity);
    }
  }
  const requirementColumns = [...labelMeta.entries()].map(([label, severity]) => ({ label, severity }));

  const results = sorted.map((r, i) => {
    const rank = i + 1;
    const gaps = (r.candidate.gaps ?? []).filter((g) => g.severity !== "info");
    const matchedLabels = r.matchedLabels ?? gaps.filter((g) => g.matched).map((g) => g.label);
    const missingLabels = r.missingLabels ?? gaps.filter((g) => !g.matched).map((g) => g.label);
    const next = sorted[i + 1];
    let rankReason: string;
    if (sorted.length === 1) {
      rankReason = `Only profile in this batch — ${Math.round(r.candidate.matchScore)}% vs JD (${matchedLabels.length} matched, ${missingLabels.length} missing). Select multiple files together to compare.`;
    } else if (rank === 1 && next) {
      const delta = Math.round(r.candidate.matchScore - next.candidate.matchScore);
      const extra = matchedLabels.filter((l) => !(next.matchedLabels ?? []).includes(l));
      rankReason = [
        `#1 of ${sorted.length} — ${Math.round(r.candidate.matchScore)}% vs JD`,
        delta > 0
          ? `${delta} points above ${next.candidate.name}`
          : `tied on score with ${next.candidate.name}`,
        extra.length ? `unique matches: ${extra.slice(0, 4).join(", ")}` : null,
        missingLabels.length ? `still missing: ${missingLabels.slice(0, 3).join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(". ") + ".";
    } else {
      const above = sorted[i - 1]!;
      const delta = Math.round(above.candidate.matchScore - r.candidate.matchScore);
      const behindOn = (above.matchedLabels ?? []).filter((l) => !matchedLabels.includes(l));
      rankReason = [
        `#${rank} of ${sorted.length} — ${Math.round(r.candidate.matchScore)}% vs JD`,
        delta > 0 ? `${delta} points below ${above.candidate.name}` : `same score band as ${above.candidate.name}`,
        behindOn.length ? `behind on: ${behindOn.slice(0, 4).join(", ")}` : null,
        matchedLabels.length ? `has: ${matchedLabels.slice(0, 4).join(", ")}` : null,
        missingLabels.length ? `missing: ${missingLabels.slice(0, 4).join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(". ") + ".";
    }
    return {
      ...r,
      rank,
      rankReason,
      matchedLabels,
      missingLabels,
      matchedCount: matchedLabels.length,
      missingCount: missingLabels.length,
    };
  });

  const top = results[0];
  const comparisonSummary =
    results.length <= 1
      ? "Upload 2+ resumes together (multi-select) to see head-to-head ranking."
      : `Ranked ${results.length} profiles on the same JD. #1 ${top?.candidate.name ?? ""} at ${Math.round(top?.candidate.matchScore ?? 0)}% — ordered by match %, then requirements matched.`;

  return { results, requirementColumns, comparisonSummary };
}
