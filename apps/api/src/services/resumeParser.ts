import type { ProfileSource, RawCandidateProfile } from "@sourceiq/shared";
import { PROMPTS } from "../config/prompts.js";
import { claudeJson } from "../lib/llm.js";

function normalize(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

function firstMeaningfulLine(text: string): string {
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (t.length < 2) continue;
    if (/^[\d\s+()-]+$/.test(t)) continue;
    if (/@/.test(t) && t.length < 60) continue;
    return t.slice(0, 80);
  }
  return "Unknown candidate";
}

function extractEmail(text: string): string | undefined {
  return text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];
}

function extractPhone(text: string): string | undefined {
  const lines = text.split("\n").slice(0, 25);
  for (const line of lines) {
    const compact = line.replace(/[^\d+]/g, "");
    if (compact.length >= 10 && compact.length <= 15) {
      const m = line.match(/(?:\+?\d[\d\s().-]{8,}\d)/);
      if (m) return m[0].trim();
    }
  }
  const m = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  return m?.[0]?.trim();
}

function extractUrl(text: string, host: string): string | undefined {
  const re = new RegExp(`https?:\\/\\/(?:www\\.)?${host.replace(".", "\\.")}[^\\s)>\\]]+`, "i");
  return text.match(re)?.[0]?.replace(/[.,;]+$/, "");
}

function pickProfileUrl(links: {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}): string | undefined {
  return links.linkedin ?? links.github ?? links.portfolio;
}

function extractSkills(text: string): string[] {
  const found = text.match(
    /\b(TypeScript|JavaScript|Python|Go|Golang|Rust|Java|React|Vue|Angular|Node\.?js|AWS|GCP|Azure|SQL|PostgreSQL|MongoDB|Kubernetes|Docker|LLM|Machine Learning|Product Management|Agile|Scrum)\b/gi,
  );
  const bullets = text
    .split("\n")
    .filter((l) => /^[-*•]/.test(l.trim()))
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter((l) => l.length > 2 && l.length < 60)
    .slice(0, 8);
  return Array.from(new Set([...(found ?? []).map((s) => s.trim()), ...bullets])).slice(0, 15);
}

function extractCompanies(text: string): string[] {
  const at = text.match(/(?:at|@)\s+([A-Z][A-Za-z0-9&.\s]{2,40})/g);
  if (!at) return [];
  return Array.from(new Set(at.map((m) => m.replace(/^(?:at|@)\s+/i, "").trim()))).slice(0, 5);
}

export async function parseResumeFromText(
  resumeText: string,
  options?: { candidateName?: string; sourceSite?: ProfileSource },
): Promise<RawCandidateProfile> {
  const text = normalize(resumeText);
  const clipped = text.slice(0, 12000);

  const claude = await claudeJson<{
    name: string;
    headline: string;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    linkedin?: string | null;
    github?: string | null;
    portfolio?: string | null;
    skills: string[];
    companies: string[];
    yearsExperience?: number | { total?: number | null };
  }>(PROMPTS.resumeParse.system, clipped);

  const name = options?.candidateName?.trim() || claude?.name || firstMeaningfulLine(text);
  const email = claude?.email ?? extractEmail(text);
  const phone = claude?.phone ?? extractPhone(text);
  const linkedInUrl =
    claude?.linkedin ??
    text.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w%-]+/i)?.[0]?.replace(/[.,;]+$/, "");
  const githubUrl = claude?.github ?? extractUrl(text, "github.com");
  const portfolioUrl = claude?.portfolio ?? undefined;
  const profileUrl = pickProfileUrl({
    linkedin: linkedInUrl,
    github: githubUrl,
    portfolio: portfolioUrl,
  });
  const years =
    typeof claude?.yearsExperience === "number"
      ? claude.yearsExperience
      : claude?.yearsExperience?.total ?? undefined;
  const skills = claude?.skills?.length ? claude.skills : extractSkills(text);
  const companies = claude?.companies?.length ? claude.companies : extractCompanies(text);
  const site = options?.sourceSite ?? "manual_paste";
  const siteLabel = site === "manual_paste" ? "manual import" : site.replace("_", " ");

  return {
    source: "manual_paste",
    name,
    headline: claude?.headline ?? `${skills[0] ?? "Professional"} · pasted from ${siteLabel}`,
    email: email ?? undefined,
    phone: phone ?? undefined,
    location: claude?.location ?? undefined,
    profileUrl,
    skills: skills.length ? skills : ["General experience"],
    companies: companies.length ? companies : [],
    yearsExperience: years,
    raw: {
      importedFrom: site,
      pastedAt: new Date().toISOString(),
      resumeText: clipped,
      excerpt: clipped.slice(0, 500),
      linkedInUrl,
      githubUrl,
      portfolioUrl,
    },
  };
}
