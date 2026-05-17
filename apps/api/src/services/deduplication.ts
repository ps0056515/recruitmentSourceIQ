import type { RawCandidateProfile } from "@sourceiq/shared";
import { createHash } from "crypto";

export function dedupeKey(profile: RawCandidateProfile): string {
  if (profile.raw?.mock || profile.source === "manual_paste") {
    const name = profile.name.toLowerCase().replace(/\s+/g, " ").trim();
    if (profile.source === "manual_paste") {
      const paste = String(profile.raw?.pastedAt ?? profile.raw?.resumeText ?? "").slice(0, 32);
      return `manual:${name}:${paste}`;
    }
    return `name:${name}`;
  }
  const email = profile.email?.toLowerCase().trim();
  if (email && !email.includes("@example.com")) return `email:${email}`;
  const url = profile.profileUrl?.toLowerCase();
  if (url) return `url:${url}`;
  const name = profile.name.toLowerCase().replace(/\s+/g, " ");
  const co = profile.companies[0]?.toLowerCase() ?? "";
  return `nameco:${createHash("sha256").update(`${name}|${co}`).digest("hex").slice(0, 16)}`;
}

export function mergeProfiles(profiles: RawCandidateProfile[]): RawCandidateProfile[] {
  const map = new Map<string, RawCandidateProfile>();
  for (const p of profiles) {
    const key = dedupeKey(p);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...p, raw: { ...p.raw, mergedSources: [p.source] } });
      continue;
    }
    const mergedSources = [
      ...new Set([
        ...((existing.raw?.mergedSources as string[]) ?? [existing.source]),
        p.source,
      ]),
    ];
    map.set(key, {
      ...existing,
      skills: [...new Set([...existing.skills, ...p.skills])],
      companies: [...new Set([...existing.companies, ...p.companies])],
      email: existing.email ?? p.email,
      salarySignal: existing.salarySignal ?? p.salarySignal,
      noticePeriod: existing.noticePeriod ?? p.noticePeriod,
      raw: { ...existing.raw, mergedSources },
    });
  }
  return [...map.values()];
}
