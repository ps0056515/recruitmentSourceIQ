import type { ParsedJD, ProfileSource, RawCandidateProfile } from "@sourceiq/shared";
import { fetchJson, jdSearchTerms, nameFromTitle, skillsFromText } from "./utils.js";

type TavilyResult = {
  results?: Array<{ title: string; url: string; content: string }>;
};

const SITE_FILTERS: Partial<Record<ProfileSource, string>> = {
  linkedin: "site:linkedin.com/in",
  indeed: "site:indeed.com",
  naukri: "site:naukri.com",
  portfolio: "",
};

export function isTavilyConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

export async function tavilyProfiles(
  source: ProfileSource,
  parsedJd: ParsedJD,
  limit: number,
  keywords?: string[],
): Promise<RawCandidateProfile[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const site = SITE_FILTERS[source] ?? "";
  const terms = jdSearchTerms(parsedJd, keywords);
  const query =
    source === "portfolio"
      ? `${terms} software engineer portfolio resume`
      : `${site} ${terms}`.trim();

  const { ok, data } = await fetchJson<TavilyResult>("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: Math.min(limit, 15),
      include_answer: false,
    }),
  });

  if (!ok || !data?.results?.length) return [];

  return data.results
    .filter((r) => r.url && !r.url.includes("example.com"))
    .slice(0, limit)
    .map((r, i) => {
      const name = nameFromTitle(r.title);
      const skills = skillsFromText(`${r.title} ${r.content}`, parsedJd.skills);
      return {
        source,
        externalId: `tavily-${Buffer.from(r.url).toString("base64url").slice(0, 16)}`,
        profileUrl: r.url,
        name,
        headline: r.title.slice(0, 160),
        location: parsedJd.location,
        skills,
        companies: [],
        recency: "moderate" as const,
        raw: { tavily: true, excerpt: r.content.slice(0, 2000), index: i },
      };
    });
}
