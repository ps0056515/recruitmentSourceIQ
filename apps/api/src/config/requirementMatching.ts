import type { GapItem, ParsedJD, RequirementCategory } from "@sourceiq/shared";
import { labelsFromList } from "../services/normalizeParsedJd.js";

/** Overall match score weights (must sum to 100). */
export const SCORE_WEIGHT_TECHNICAL = 80;
export const SCORE_WEIGHT_BEHAVIORAL = 20;

const DEFAULT_BEHAVIORAL_REQUIREMENTS = [
  "Strong communication",
  "Collaboration and teamwork",
  "Ownership and accountability",
];

const BEHAVIORAL_LABEL_PATTERNS = [
  /\bcommunication\b/i,
  /\bleadership\b/i,
  /\bownership\b/i,
  /\bimpact\b/i,
  /\bambiguity\b/i,
  /\bteamwork\b/i,
  /\bcollaborat/i,
  /\bstakeholder/i,
  /\bmentor/i,
  /\bcoach/i,
  /\bproblem[- ]?solving\b/i,
  /\bcritical thinking\b/i,
  /\bculture\b/i,
  /\bpresentation\b/i,
  /\binfluence\b/i,
  /\binitiative\b/i,
  /\badaptab/i,
];

const TECHNICAL_LABEL_PATTERNS = [
  /\btypescript\b/i,
  /\bjavascript\b/i,
  /\bpython\b/i,
  /\bjava\b/i,
  /\breact\b/i,
  /\bangular\b/i,
  /\bnode\.?js\b/i,
  /\baws\b/i,
  /\bazure\b/i,
  /\bgcp\b/i,
  /\bsql\b/i,
  /\bpostgres/i,
  /\bmongo/i,
  /\bdocker\b/i,
  /\bkubernetes\b/i,
  /\bkafka\b/i,
  /\betl\b/i,
  /\bapi\b/i,
  /\bmicroservice/i,
  /\bdata engineer/i,
  /\bmachine learning\b/i,
  /\bllm\b/i,
  /\bterraform\b/i,
  /\bci\/cd\b/i,
  /\b\d+\+?\s*years?\b/i,
];

const GENERIC_MUST_LABELS = new Set([
  "relevant experience",
  "core skills for role",
  "clear impact",
  "relevant ownership",
  "comfort with ambiguity",
]);

function isGenericMustLabel(label: string): boolean {
  return GENERIC_MUST_LABELS.has(label.toLowerCase().trim());
}

/** Synonyms / substrings used when matching JD requirements to resume text. */
const REQUIREMENT_ALIASES: Record<string, string[]> = {
  "node.js": ["node.js", "nodejs", " node ", "node,"],
  nodejs: ["node.js", "nodejs", " node "],
  typescript: ["typescript", " ts ", "ts,", "ts/"],
  javascript: ["javascript", " js ", "ecmascript"],
  angular: ["angular", "angularjs", " angular "],
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
  const nice = labelsFromList(parsedJd.niceToHaves as unknown);
  const skills = labelsFromList(parsedJd.skills as unknown);
  const concreteMust = must.filter((m) => !isGenericMustLabel(m));

  if (concreteMust.length >= 2) {
    return dedupeLabels(concreteMust).slice(0, 8);
  }

  // Job brief never parsed real must-haves (e.g. only "Clear impact") — score on skills + concrete nice-to-haves
  const skillPool = dedupeLabels([...concreteMust, ...skills, ...nice]).filter(
    (m) => !isGenericMustLabel(m),
  );

  if (skillPool.length >= 2) return skillPool.slice(0, 8);
  if (skills.length >= 2) return dedupeLabels(skills).slice(0, 8);
  if (skills.length === 1 && nice.some((n) => !isGenericMustLabel(n))) {
    return dedupeLabels([...skills, ...nice.filter((n) => !isGenericMustLabel(n))]).slice(0, 8);
  }

  if (must.length && !must.every(isGenericMustLabel)) {
    return dedupeLabels(must).slice(0, 8);
  }

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

/** Classify a JD requirement label for 80/20 scoring. */
export function classifyRequirement(label: string): RequirementCategory {
  const norm = label.toLowerCase().trim();
  if (isGenericMustLabel(label)) return "behavioral";
  if (BEHAVIORAL_LABEL_PATTERNS.some((p) => p.test(norm))) return "behavioral";
  if (TECHNICAL_LABEL_PATTERNS.some((p) => p.test(norm))) return "technical";
  if (REQUIREMENT_ALIASES[norm]) return "technical";
  if (/^[A-Z0-9+#.]+$/.test(label.trim()) || /\.(js|ts|py)\b/i.test(label)) return "technical";
  return "behavioral";
}

export function partitionRequirements(labels: string[]): {
  technical: string[];
  behavioral: string[];
} {
  const technical: string[] = [];
  const behavioral: string[] = [];
  for (const label of dedupeLabels(labels)) {
    if (classifyRequirement(label) === "technical") technical.push(label);
    else behavioral.push(label);
  }
  return { technical, behavioral };
}

/** Requirements used for scoring: technical skills + behavioral competencies. */
export function resolveScoringRequirements(parsedJd: ParsedJD): {
  technical: string[];
  behavioral: string[];
} {
  const must = labelsFromList(parsedJd.mustHaves as unknown);
  const nice = labelsFromList(parsedJd.niceToHaves as unknown);
  const skills = labelsFromList(parsedJd.skills as unknown);
  const technicalBase = resolveMustRequirements(parsedJd);
  const all = dedupeLabels([...technicalBase, ...must, ...nice, ...skills]);
  let { technical, behavioral } = partitionRequirements(all);

  if (technical.length < 2) {
    technical = dedupeLabels([...technical, ...technicalBase, ...skills]).slice(0, 8);
  }
  if (behavioral.length === 0) {
    behavioral = dedupeLabels([
      ...nice.filter((n) => classifyRequirement(n) === "behavioral"),
      ...DEFAULT_BEHAVIORAL_REQUIREMENTS,
    ]).slice(0, 5);
  }

  return {
    technical: technical.slice(0, 10),
    behavioral: behavioral.slice(0, 6),
  };
}

export function gapCategory(gap: GapItem): RequirementCategory {
  return gap.category ?? classifyRequirement(gap.label);
}

export function computeMatchScoreFromGaps(gaps: GapItem[]): {
  score: number;
  scoreBreakdown: Record<string, number>;
} {
  const tech = gaps.filter((g) => gapCategory(g) === "technical");
  const beh = gaps.filter((g) => gapCategory(g) === "behavioral");
  const techPct = tech.length ? tech.filter((g) => g.matched).length / tech.length : 0.5;
  const behPct = beh.length ? beh.filter((g) => g.matched).length / beh.length : 0.5;
  const raw = Math.round(techPct * SCORE_WEIGHT_TECHNICAL + behPct * SCORE_WEIGHT_BEHAVIORAL);
  const score = Math.min(98, Math.max(20, raw));
  return {
    score,
    scoreBreakdown: {
      technical: Math.round(techPct * 100),
      behavioral: Math.round(behPct * 100),
      technicalWeight: SCORE_WEIGHT_TECHNICAL,
      behavioralWeight: SCORE_WEIGHT_BEHAVIORAL,
      technicalMatched: tech.filter((g) => g.matched).length,
      technicalTotal: tech.length,
      behavioralMatched: beh.filter((g) => g.matched).length,
      behavioralTotal: beh.length,
    },
  };
}

export function buildManualMatchSummary(
  name: string,
  score: number,
  roleTitle: string,
  gaps: GapItem[],
): string {
  const tech = gaps.filter((g) => gapCategory(g) === "technical");
  const beh = gaps.filter((g) => gapCategory(g) === "behavioral");
  const techHit = tech.filter((g) => g.matched).length;
  const behHit = beh.filter((g) => g.matched).length;

  if (!gaps.length) {
    return `${name} scored ${score}% vs ${roleTitle} (no structured requirements on job brief).`;
  }

  const techPart =
    tech.length > 0 ? `technical ${techHit}/${tech.length} (${SCORE_WEIGHT_TECHNICAL}% weight)` : "";
  const behPart =
    beh.length > 0 ? `behavioral ${behHit}/${beh.length} (${SCORE_WEIGHT_BEHAVIORAL}% weight)` : "";
  const breakdown = [techPart, behPart].filter(Boolean).join("; ");

  return `${name} scored ${score}% vs ${roleTitle} — ${breakdown}.`;
}
