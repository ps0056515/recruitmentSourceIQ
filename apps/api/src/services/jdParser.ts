import type { ParsedJD } from "@sourceiq/shared";
import { PROMPTS } from "../config/prompts.js";
import { claudeJson } from "../lib/llm.js";
import { normalizeParsedJd } from "./normalizeParsedJd.js";

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

function firstNonEmptyLine(text: string): string {
  const line = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 2);
  return line ?? "New Role";
}

function bulletItems(section: string): string[] {
  return section
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[-*•]|^\d+\./.test(l))
    .map((l) => l.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

function sliceSection(text: string, labels: string[]): string {
  const lines = text.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim().toLowerCase().replace(/:$/, "");
    if (labels.some((k) => l.startsWith(k))) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return "";
  const out: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) break;
    const lower = l.trim().toLowerCase();
    if (["nice to have", "preferred", "requirements", "minimum"].some((h) => lower.startsWith(h))) break;
    out.push(l);
  }
  return out.join("\n");
}

const SKILL_HINT_RE =
  /\b(TypeScript|JavaScript|Python|Go|Rust|Java|Kotlin|Swift|C\+\+|C#|React|Angular|Vue|Node\.?js|Node|AWS|GCP|Azure|SQL|PostgreSQL|Postgres|MySQL|MongoDB|Kubernetes|Docker|Kafka|Redis|GraphQL|REST|LLM|ML|Terraform|CI\/CD)\b/gi;

/** Soft traits are interview signals — never invent them as JD must-haves. */
const SOFT_PLACEHOLDER = /^(clear impact|relevant ownership|strong communication|comfort with ambiguity|collaboration and teamwork|ownership and accountability)$/i;

function extractSkillHints(text: string): string[] {
  return Array.from(new Set((text.match(SKILL_HINT_RE) ?? []).map((s) => s.replace(/nodejs/i, "Node.js"))));
}

function withoutSoftPlaceholders(labels: string[]): string[] {
  return labels.filter((l) => !SOFT_PLACEHOLDER.test(l.trim()));
}

function finalizeParsed(parsed: ParsedJD, rawText: string): ParsedJD {
  const skillHints = extractSkillHints(rawText);
  let mustHaves = withoutSoftPlaceholders(parsed.mustHaves);
  let niceToHaves = withoutSoftPlaceholders(parsed.niceToHaves);
  let skills = withoutSoftPlaceholders(parsed.skills);

  if (!skills.length) skills = [...skillHints];
  else skills = Array.from(new Set([...skills, ...skillHints]));

  // Promote concrete skills when parser returned empty/soft must-haves
  if (!mustHaves.length && skills.length) {
    mustHaves = skills.slice(0, 8);
  }

  return {
    ...parsed,
    mustHaves,
    niceToHaves,
    skills: skills.slice(0, 20),
    rawExcerpt: parsed.rawExcerpt || rawText.slice(0, 1200),
  };
}

export async function parseJdFromText(raw: string): Promise<ParsedJD> {
  const text = normalize(raw);
  const claude = await claudeJson<Record<string, unknown>>(PROMPTS.jdParse.system, text.slice(0, 8000));
  if (claude?.title) {
    const normalized = normalizeParsedJd({
      ...claude,
      rawExcerpt: claude.rawExcerpt ?? text.slice(0, 1200),
    });
    return finalizeParsed(normalized, text);
  }

  const excerpt = text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
  const title = firstNonEmptyLine(text);

  const mustBlock = sliceSection(text, ["must have", "must-haves", "requirements", "minimum qualifications"]);
  const niceBlock = sliceSection(text, ["nice to have", "preferred", "bonus", "plus"]);

  const mustFromBullets = withoutSoftPlaceholders(bulletItems(mustBlock));
  const niceFromBullets = withoutSoftPlaceholders(bulletItems(niceBlock));
  const skillHints = extractSkillHints(text);

  const mustHaves = mustFromBullets.length ? mustFromBullets : skillHints.slice(0, 8);
  const niceToHaves = niceFromBullets;
  const years = /(\d+)\+?\s*years?/i.exec(text);

  return finalizeParsed(
    {
      title,
      company: undefined,
      location: undefined,
      summary: text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(" "),
      mustHaves,
      niceToHaves,
      skills: Array.from(new Set([...skillHints, ...mustHaves])).slice(0, 20),
      yearsExperience: years ? Number(years[1]) : undefined,
      rawExcerpt: excerpt,
    },
    text,
  );
}
