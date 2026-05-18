import type { ParsedJD } from "@sourceiq/shared";

type RequirementObject = { id?: string; label?: string; category?: string };
type YearsExperienceObject = { minimum?: number | null; preferred?: number | null };

function labelFromItem(item: unknown): string | null {
  if (typeof item === "string") {
    const t = item.trim();
    return t || null;
  }
  if (item && typeof item === "object" && "label" in item) {
    const label = String((item as RequirementObject).label ?? "").trim();
    return label || null;
  }
  return null;
}

export function labelsFromList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const label = labelFromItem(item);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

/** Coerce Claude / legacy JD JSON into the string[] shape the app expects. */
export function normalizeParsedJd(raw: Record<string, unknown>): ParsedJD {
  const mustHaves = labelsFromList(raw.mustHaves);
  const niceToHaves = labelsFromList(raw.niceToHaves);
  let skills = labelsFromList(raw.skills);
  if (!skills.length) {
    skills = [...new Set([...mustHaves, ...niceToHaves])];
  }

  let yearsExperience: number | undefined;
  const years = raw.yearsExperience;
  if (typeof years === "number" && !Number.isNaN(years)) {
    yearsExperience = years;
  } else if (years && typeof years === "object") {
    const y = years as YearsExperienceObject;
    const n = y.minimum ?? y.preferred;
    if (typeof n === "number" && !Number.isNaN(n)) yearsExperience = n;
  }

  const title = String(raw.title ?? "New Role").trim() || "New Role";
  const summary =
    typeof raw.summary === "string"
      ? raw.summary
      : Array.isArray(raw.summary)
        ? raw.summary.map(String).join(" ")
        : "";

  return {
    title,
    company: raw.company != null ? String(raw.company) : undefined,
    location: raw.location != null ? String(raw.location) : undefined,
    summary,
    mustHaves,
    niceToHaves,
    skills: skills.slice(0, 30),
    yearsExperience,
    rawExcerpt: String(raw.rawExcerpt ?? summary).slice(0, 1200),
  };
}

export function normalizeParsedJdFromStored(stored: unknown): ParsedJD | undefined {
  if (!stored || typeof stored !== "object") return undefined;
  return normalizeParsedJd(stored as Record<string, unknown>);
}
