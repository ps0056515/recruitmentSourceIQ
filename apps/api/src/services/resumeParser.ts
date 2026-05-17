import type { ProfileSource, RawCandidateProfile } from "@sourceiq/shared";
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
    email?: string;
    location?: string;
    skills: string[];
    companies: string[];
    yearsExperience?: number;
  }>(
    "Extract resume fields as JSON: name, headline, email, location, skills[], companies[], yearsExperience. Use only what is in the text.",
    clipped,
  );

  const name = options?.candidateName?.trim() || claude?.name || firstMeaningfulLine(text);
  const email = claude?.email ?? extractEmail(text);
  const skills = claude?.skills?.length ? claude.skills : extractSkills(text);
  const companies = claude?.companies?.length ? claude.companies : extractCompanies(text);
  const site = options?.sourceSite ?? "manual_paste";
  const siteLabel = site === "manual_paste" ? "manual import" : site.replace("_", " ");

  return {
    source: "manual_paste",
    name,
    headline: claude?.headline ?? `${skills[0] ?? "Professional"} · pasted from ${siteLabel}`,
    email,
    location: claude?.location,
    skills: skills.length ? skills : ["General experience"],
    companies: companies.length ? companies : [],
    yearsExperience: claude?.yearsExperience,
    raw: {
      importedFrom: site,
      pastedAt: new Date().toISOString(),
      resumeText: clipped,
      excerpt: clipped.slice(0, 500),
    },
  };
}
