import type { Candidate } from "@sourceiq/shared";

/** One row per person — keep highest match when search created duplicates. */
export function dedupeCandidatesByName(candidates: Candidate[]): Candidate[] {
  const map = new Map<string, Candidate>();
  for (const c of candidates) {
    const key = c.name
      .replace(/\s*\([^)]+\)\s*$/i, "")
      .toLowerCase()
      .trim();
    const prev = map.get(key);
    if (!prev || c.matchScore > prev.matchScore) {
      map.set(key, c);
    }
  }
  return [...map.values()].sort((a, b) => b.matchScore - a.matchScore);
}

export function candidateOriginLabel(c: Candidate): string {
  if (c.source === "manual_paste") return "Pasted resume";
  if (c.sources?.includes("manual_paste")) return "Pasted resume";
  const id = c.id;
  if (id.startsWith("cand-")) return "Sample data";
  return "Discovery";
}
