import type { ParsedJD, RawCandidateProfile } from "@sourceiq/shared";
import { fetchJson } from "./utils.js";
import { jdSearchTerms } from "./utils.js";

type PersonSearchHit = {
  linkedin_profile_url: string;
  profile?: {
    full_name?: string;
    headline?: string;
    city?: string;
    occupation?: string;
  };
};

type PersonSearchResponse = {
  results?: PersonSearchHit[];
};

export function isProxycurlConfigured(): boolean {
  return Boolean(process.env.PROXYCURL_API_KEY);
}

/** LinkedIn person search via Proxycurl (paid API). */
export async function proxycurlLinkedInSearch(
  parsedJd: ParsedJD,
  limit: number,
  keywords?: string[],
): Promise<RawCandidateProfile[]> {
  const key = process.env.PROXYCURL_API_KEY;
  if (!key) return [];

  const q = jdSearchTerms(parsedJd, keywords);
  const params = new URLSearchParams({
    keyword: q,
    page_size: String(Math.min(limit, 10)),
    enrich_profiles: "enrich",
  });
  if (parsedJd.location) params.set("city", parsedJd.location.split("/")[0]!.trim());

  const { ok, data } = await fetchJson<PersonSearchResponse>(
    `https://nubela.co/proxycurl/api/v2/search/person?${params}`,
    {
      headers: { Authorization: `Bearer ${key}` },
    },
  );

  if (!ok || !data?.results?.length) return [];

  return data.results.slice(0, limit).map((hit) => {
    const p = hit.profile;
    const name = p?.full_name ?? "LinkedIn profile";
    return {
      source: "linkedin" as const,
      externalId: hit.linkedin_profile_url,
      profileUrl: hit.linkedin_profile_url,
      name,
      headline: p?.headline ?? p?.occupation ?? "LinkedIn professional",
      location: p?.city ?? parsedJd.location,
      skills: parsedJd.skills.slice(0, 6),
      companies: [],
      recency: "moderate" as const,
      raw: { proxycurl: true, profile: p },
    };
  });
}
