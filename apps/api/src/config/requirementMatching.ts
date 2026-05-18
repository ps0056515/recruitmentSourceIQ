import type { ParsedJD } from "@sourceiq/shared";
import { labelsFromList } from "../services/normalizeParsedJd.js";

const GENERIC_MUST_LABELS = new Set([
  "relevant experience",
  "core skills for role",
  "clear impact",
  "relevant ownership",
]);

/** Synonyms / substrings used when matching JD requirements to resume text. */
const REQUIREMENT_ALIASES: Record<string, string[]> = {
  "node.js": ["node.js", "nodejs", " node ", "node,"],
  nodejs: ["node.js", "nodejs", " node "],
  typescript: ["typescript", " ts ", "ts,", "ts/"],
  javascript: ["javascript", " js ", "ecmascript"],
  react: ["react", "react.js", "reactjs"],
  postgresql: ["postgresql", "postgres", " psql"],
  postgress: ["postgresql", "postgres"],
  aws: ["aws", "amazon web services"],
  kafka: ["kafka", "event streaming"],
  "system design": ["system design", "distributed systems", "architecture"],
  "product strategy": ["product strategy", "roadmap", "product vision"],
  "b2b saas": ["b2b", "saas", "b2b saas"],
  "user research": ["user research", "ux research", "customer discovery"],
};

function normalizeForMatch(text: string): string {
  return ` ${text.toLowerCase().replace(/[^\w\s.+#-]/g, " ")} `;
}

export function requirementMatched(label: string, blob: string): boolean {
  const norm = label.toLowerCase().trim();
  const haystack = normalizeForMatch(blob);

  if (haystack.includes(` ${norm} `) || haystack.includes(norm)) return true;

  const aliases = REQUIREMENT_ALIASES[norm] ?? [];
  for (const alias of aliases) {
    if (haystack.includes(normalizeForMatch(alias).trim())) return true;
  }

  const tokens = norm.split(/[\s/+,]+/).filter((t) => t.length > 2);
  if (tokens.length === 0) return false;
  const hits = tokens.filter((t) => haystack.includes(` ${t} `) || haystack.includes(t));
  return hits.length >= Math.ceil(tokens.length * 0.5);
}

/** Concrete must-haves for scoring — prefers JD skills over generic parser fallbacks. */
export function resolveMustRequirements(parsedJd: ParsedJD): string[] {
  const must = labelsFromList(parsedJd.mustHaves as unknown);
  const skills = labelsFromList(parsedJd.skills as unknown);
  const concreteMust = must.filter((m) => !GENERIC_MUST_LABELS.has(m.toLowerCase().trim()));

  if (concreteMust.length >= 2) {
    return dedupeLabels(concreteMust).slice(0, 8);
  }

  const merged = dedupeLabels([...concreteMust, ...must, ...skills]).filter(
    (m) => !GENERIC_MUST_LABELS.has(m.toLowerCase().trim()),
  );

  if (merged.length >= 2) return merged.slice(0, 8);
  if (skills.length >= 2) return dedupeLabels(skills).slice(0, 8);
  if (must.length) return dedupeLabels(must).slice(0, 8);
  return ["Relevant experience", "Core skills for role"];
}

function dedupeLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of labels) {
    const key = label.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label.trim());
  }
  return out;
}

export function buildManualMatchSummary(
  name: string,
  score: number,
  roleTitle: string,
  mustGaps: Array<{ label: string; matched: boolean }>,
): string {
  const matched = mustGaps.filter((g) => g.matched).map((g) => g.label);
  const missed = mustGaps.filter((g) => !g.matched).map((g) => g.label);
  const total = mustGaps.length;

  if (total === 0) {
    return `${name} scored ${score}% vs ${roleTitle} (no structured requirements on job brief).`;
  }

  if (matched.length === total) {
    return `${name} scored ${score}% vs ${roleTitle}: all ${total} key requirements matched (${matched.slice(0, 4).join(", ")}).`;
  }

  if (matched.length === 0) {
    return `${name} scored ${score}% vs ${roleTitle}: none of ${total} key requirements matched in pasted resume. Missing: ${missed.slice(0, 5).join(", ")}.`;
  }

  return `${name} scored ${score}% vs ${roleTitle}: ${matched.length}/${total} requirements matched. Strong: ${matched.slice(0, 3).join(", ")}. Gaps: ${missed.slice(0, 3).join(", ")}.`;
}
