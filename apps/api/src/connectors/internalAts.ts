import { randomUUID } from "crypto";
import type { RawCandidateProfile } from "@sourceiq/shared";
import type { SourceConnector } from "./types.js";
import { allowMockConnectors } from "../lib/config.js";
import { fetchJson, jdSearchTerms } from "./utils.js";
import { mockProfiles } from "./mockProfiles.js";

type AtsCandidate = {
  id?: string;
  name?: string;
  title?: string;
  email?: string;
  location?: string;
  skills?: string[];
  companies?: string[];
  profileUrl?: string;
};

type AtsSearchResponse = {
  candidates?: AtsCandidate[];
  data?: AtsCandidate[];
};

export const internalAtsConnector: SourceConnector = {
  source: "internal_ats",
  isConfigured() {
    return Boolean(process.env.ATS_INTERNAL_API_URL);
  },
  async search({ parsedJd, config, limit, jobId }) {
    const base = process.env.ATS_INTERNAL_API_URL;
    if (!base) {
      if (allowMockConnectors()) return mockProfiles("internal_ats", parsedJd, Math.min(limit, 6));
      throw new Error("internal_ats_not_configured: set ATS_INTERNAL_API_URL");
    }

    const q = jdSearchTerms(parsedJd, config.keywords);
    const url = new URL("/candidates/search", base.endsWith("/") ? base : `${base}/`);
    url.searchParams.set("q", q);
    url.searchParams.set("limit", String(Math.min(limit, 50)));
    url.searchParams.set("jobId", jobId);

    const headers: Record<string, string> = { Accept: "application/json" };
    const token = process.env.ATS_INTERNAL_API_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const { ok, data } = await fetchJson<AtsSearchResponse>(url.toString(), { headers });
    const rows = data?.candidates ?? data?.data ?? [];
    if (!ok || !rows.length) return [];

    return rows.slice(0, limit).map((r) => ({
      source: "internal_ats" as const,
      externalId: r.id ?? randomUUID(),
      profileUrl: r.profileUrl,
      name: r.name ?? "ATS candidate",
      email: r.email,
      headline: r.title ?? `Internal ATS · ${parsedJd.title}`,
      location: r.location ?? parsedJd.location,
      skills: r.skills?.length ? r.skills : parsedJd.skills.slice(0, 6),
      companies: r.companies ?? [],
      recency: "high" as const,
      raw: { ats: r },
    }));
  },
};
