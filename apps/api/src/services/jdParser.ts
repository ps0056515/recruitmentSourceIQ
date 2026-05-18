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

export async function parseJdFromText(raw: string): Promise<ParsedJD> {
  const claude = await claudeJson<Record<string, unknown>>(PROMPTS.jdParse.system, raw.slice(0, 8000));
  if (claude?.title) {
    return normalizeParsedJd({
      ...claude,
      rawExcerpt: claude.rawExcerpt ?? raw.slice(0, 1200),
    });
  }

  const text = normalize(raw);
  const excerpt = text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
  const title = firstNonEmptyLine(text);

  const mustBlock = sliceSection(text, ["must have", "must-haves", "requirements", "minimum qualifications"]);
  const niceBlock = sliceSection(text, ["nice to have", "preferred", "bonus", "plus"]);

  const mustHaves = bulletItems(mustBlock).length
    ? bulletItems(mustBlock)
    : ["Clear impact", "Relevant ownership"];
  const niceToHaves = bulletItems(niceBlock).length
    ? bulletItems(niceBlock)
    : ["Strong communication", "Comfort with ambiguity"];

  const skillHints = Array.from(
    text.match(
      /\b(TypeScript|JavaScript|Python|Go|Rust|Java|React|Node|AWS|GCP|Azure|SQL|Kubernetes|Docker|LLM|ML)\b/g,
    ) ?? [],
  );

  const years = /(\d+)\+?\s*years?/i.exec(text);

  return {
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
    skills: Array.from(new Set([...skillHints, ...mustHaves.slice(0, 8)])).slice(0, 20),
    yearsExperience: years ? Number(years[1]) : undefined,
    rawExcerpt: excerpt,
  };
}
