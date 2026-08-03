import type { ProfileSource, RawCandidateProfile } from "@sourceiq/shared";
import { PROMPTS } from "../config/prompts.js";
import { claudeJson } from "../lib/llm.js";

function normalize(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

/** Drop filename-style junk: years, role titles, underscores. */
function cleanPersonName(raw: string | undefined | null): string | undefined {
  if (!raw?.trim()) return undefined;
  let name = raw
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Strip trailing "4 Years Angular Developer" style suffixes
  name = name
    .replace(
      /\b\d+(\.\d+)?\s*\+?\s*years?\b.*$/i,
      "",
    )
    .replace(
      /\b(angular|react|node|java|python|full\s*stack|developer|engineer|resume|cv)\b.*$/i,
      "",
    )
    .replace(/[-–—|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (name.length < 2 || name.length > 60) return undefined;
  // Reject lines that look like skills/headers, not people
  if (/^(skills?|experience|summary|objective|education|projects?)\b/i.test(name)) return undefined;
  if (/\d/.test(name)) return undefined;
  return name;
}

function firstMeaningfulLine(text: string): string {
  for (const line of text.split("\n").slice(0, 12)) {
    const t = line.trim();
    if (t.length < 2) continue;
    if (/^[\d\s+()-]+$/.test(t)) continue;
    if (/@/.test(t) && t.length < 60) continue;
    if (/https?:\/\//i.test(t)) continue;
    const cleaned = cleanPersonName(t);
    if (cleaned) return cleaned;
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

/** Expected CTC / budget from resume text (LPA, lakhs, INR, etc.). */
export function extractSalaryBudget(text: string): string | undefined {
  const patterns = [
    /(?:expected\s*(?:ctc|salary|compensation|pay)|current\s*(?:ctc|salary)|ctc|budget)\s*[:\-]?\s*((?:₹|rs\.?\s*)?\d+(?:\.\d+)?\s*(?:[-–to]+\s*\d+(?:\.\d+)?)?\s*(?:lpa|lakh\.?s?|lac\.?s?|inr|k|cr)?)/i,
    /(\d+(?:\.\d+)?\s*(?:[-–]\s*\d+(?:\.\d+)?)?\s*lpa)/i,
    /((?:₹|rs\.?\s*)\d+(?:\.\d+)?\s*(?:[-–]\s*\d+(?:\.\d+)?)?\s*(?:lakh\.?s?|lac\.?s?|lpa)?)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const v = m[1].replace(/\s+/g, " ").trim();
      if (v.length >= 2 && v.length <= 40) return v;
    }
  }
  return undefined;
}

export function extractNoticePeriod(text: string): string | undefined {
  const m = text.match(
    /(?:notice\s*period|serving\s*notice|available\s*(?:in|from)?)\s*[:\-]?\s*(\d+\s*(?:days?|months?)|immediate(?:ly)?)/i,
  );
  return m?.[1]?.replace(/\s+/g, " ").trim();
}

export async function parseResumeFromText(
  resumeText: string,
  options?: {
    candidateName?: string;
    sourceSite?: ProfileSource;
    salarySignal?: string;
    noticePeriod?: string;
  },
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

  // Prefer name extracted from resume content; filename/UI hint is fallback only
  const name =
    cleanPersonName(claude?.name) ||
    cleanPersonName(firstMeaningfulLine(text)) ||
    cleanPersonName(options?.candidateName) ||
    "Unknown candidate";
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
  const salarySignal =
    options?.salarySignal?.trim() || extractSalaryBudget(text) || undefined;
  const noticePeriod =
    options?.noticePeriod?.trim() || extractNoticePeriod(text) || undefined;

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
    salarySignal,
    noticePeriod,
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
