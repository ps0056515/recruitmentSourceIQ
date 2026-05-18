import { randomUUID } from "crypto";
import type { RawCandidateProfile } from "@sourceiq/shared";
import type { SourceConnector } from "./types.js";
import { allowMockConnectors } from "../lib/config.js";
import { fetchJson, jdSearchTerms } from "./utils.js";
import { mockProfiles } from "./mockProfiles.js";
import { isTavilyConfigured, tavilyProfiles } from "./tavily.js";

type NaukriProfile = {
  id?: string;
  name?: string;
  designation?: string;
  currentLocation?: string;
  keySkills?: string;
  expectedCTC?: string;
  noticePeriod?: string;
  profileUrl?: string;
};

type NaukriSearchResponse = {
  data?: NaukriProfile[];
  profiles?: NaukriProfile[];
};

async function naukriResdexSearch(
  parsedJd: import("@sourceiq/shared").ParsedJD,
  limit: number,
  keywords?: string[],
): Promise<RawCandidateProfile[]> {
  const apiKey = process.env.NAUKRI_API_KEY;
  const base = process.env.NAUKRI_API_URL ?? "https://www.naukri.com/recruit/api/v1";
  if (!apiKey) return [];

  const q = jdSearchTerms(parsedJd, keywords);
  const { ok, data } = await fetchJson<NaukriSearchResponse>(`${base}/profile/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      keyword: q,
      location: parsedJd.location?.split("/")[0]?.trim(),
      pageSize: Math.min(limit, 25),
    }),
  });

  const rows = data?.data ?? data?.profiles ?? [];
  if (!ok || !rows.length) return [];

  return rows.slice(0, limit).map((r) => ({
    source: "naukri" as const,
    externalId: r.id ?? randomUUID(),
    profileUrl: r.profileUrl,
    name: r.name ?? "Naukri candidate",
    headline: r.designation ?? `Naukri · ${parsedJd.title}`,
    location: r.currentLocation ?? parsedJd.location,
    skills: (r.keySkills ?? "")
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8),
    companies: [],
    salarySignal: r.expectedCTC,
    noticePeriod: r.noticePeriod,
    recency: "moderate" as const,
    raw: { naukri: r },
  }));
}

export const naukriConnector: SourceConnector = {
  source: "naukri",
  isConfigured() {
    return Boolean(process.env.NAUKRI_API_KEY) || isTavilyConfigured();
  },
  async search({ parsedJd, config, limit }) {
    const apiHits = await naukriResdexSearch(parsedJd, limit, config.keywords);
    if (apiHits.length) return apiHits;

    if (isTavilyConfigured()) {
      const hits = await tavilyProfiles("naukri", parsedJd, limit, config.keywords);
      if (hits.length) return hits;
    }

    if (allowMockConnectors()) return mockProfiles("naukri", parsedJd, Math.min(limit, 10));
    throw new Error("naukri_not_configured: set NAUKRI_API_KEY or TAVILY_API_KEY");
  },
};
