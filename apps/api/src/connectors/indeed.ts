import { randomUUID } from "crypto";
import type { ParsedJD, RawCandidateProfile } from "@sourceiq/shared";
import type { SourceConnector } from "./types.js";
import { allowMockConnectors } from "../lib/config.js";
import { fetchJson, jdSearchTerms } from "./utils.js";
import { mockProfiles } from "./mockProfiles.js";
import { isTavilyConfigured, tavilyProfiles } from "./tavily.js";

type IndeedResume = {
  resumeKey?: string;
  name?: string;
  headline?: string;
  location?: string;
  skills?: string[];
  resumeUrl?: string;
};

type IndeedSearchResponse = {
  resumes?: IndeedResume[];
  results?: IndeedResume[];
};

async function indeedResumeSearch(parsedJd: ParsedJD, limit: number): Promise<RawCandidateProfile[]> {
  const apiKey = process.env.INDEED_API_KEY;
  const publisherId = process.env.INDEED_PUBLISHER_ID;
  if (!apiKey || !publisherId) return [];

  const q = jdSearchTerms(parsedJd);
  const params = new URLSearchParams({
    publisher: publisherId,
    v: "2",
    format: "json",
    q,
    limit: String(Math.min(limit, 25)),
  });

  const base = process.env.INDEED_API_BASE ?? "https://api.indeed.com/ads";
  const { ok, data } = await fetchJson<IndeedSearchResponse>(`${base}/resumesearch?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const rows = data?.resumes ?? data?.results ?? [];
  if (!ok || !rows.length) return [];

  return rows.slice(0, limit).map((r) => ({
    source: "indeed" as const,
    externalId: r.resumeKey ?? r.name ?? randomUUID(),
    profileUrl: r.resumeUrl,
    name: r.name ?? "Indeed candidate",
    headline: r.headline ?? `Indeed · ${parsedJd.title}`,
    location: r.location ?? parsedJd.location,
    skills: r.skills?.length ? r.skills : parsedJd.skills.slice(0, 5),
    companies: [],
    recency: "moderate" as const,
    raw: { indeed: r },
  }));
}

export const indeedConnector: SourceConnector = {
  source: "indeed",
  isConfigured() {
    return Boolean(
      (process.env.INDEED_API_KEY && process.env.INDEED_PUBLISHER_ID) || isTavilyConfigured(),
    );
  },
  async search({ parsedJd, config, limit }) {
    const apiHits = await indeedResumeSearch(parsedJd, limit);
    if (apiHits.length) return apiHits;

    if (isTavilyConfigured()) {
      const hits = await tavilyProfiles("indeed", parsedJd, limit, config.keywords);
      if (hits.length) return hits;
    }

    if (allowMockConnectors()) return mockProfiles("indeed", parsedJd, Math.min(limit, 8));
    throw new Error("indeed_not_configured: set INDEED_API_KEY + INDEED_PUBLISHER_ID or TAVILY_API_KEY");
  },
};
