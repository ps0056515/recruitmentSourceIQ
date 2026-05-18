import type { CandidateContact, RawCandidateProfile } from "@sourceiq/shared";

export function contactFromRawProfile(profile: RawCandidateProfile): CandidateContact {
  const raw = profile.raw ?? {};
  return {
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedInUrl:
      (typeof raw.linkedInUrl === "string" ? raw.linkedInUrl : undefined) ??
      (profile.profileUrl?.includes("linkedin") ? profile.profileUrl : undefined),
    githubUrl: typeof raw.githubUrl === "string" ? raw.githubUrl : undefined,
    portfolioUrl: typeof raw.portfolioUrl === "string" ? raw.portfolioUrl : undefined,
  };
}

export function contactFromCandidateFields(
  row: {
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    sources?: Array<{ profileUrl?: string | null; rawProfile?: unknown }>;
  },
): CandidateContact {
  const raw = (row.sources?.[0]?.rawProfile ?? {}) as Record<string, unknown>;
  const profileUrl = row.sources?.[0]?.profileUrl ?? undefined;
  return {
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    location: row.location ?? undefined,
    linkedInUrl:
      (typeof raw.linkedInUrl === "string" ? raw.linkedInUrl : undefined) ??
      (profileUrl?.includes("linkedin") ? profileUrl : undefined),
    githubUrl: typeof raw.githubUrl === "string" ? raw.githubUrl : undefined,
    portfolioUrl: typeof raw.portfolioUrl === "string" ? raw.portfolioUrl : undefined,
  };
}

export function mergeContact(
  ...parts: Array<CandidateContact | undefined>
): CandidateContact {
  const out: CandidateContact = {};
  for (const p of parts) {
    if (!p) continue;
    if (p.email) out.email = p.email;
    if (p.phone) out.phone = p.phone;
    if (p.location) out.location = p.location;
    if (p.linkedInUrl) out.linkedInUrl = p.linkedInUrl;
    if (p.githubUrl) out.githubUrl = p.githubUrl;
    if (p.portfolioUrl) out.portfolioUrl = p.portfolioUrl;
  }
  return out;
}
