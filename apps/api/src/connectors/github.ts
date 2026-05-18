import type { SourceConnector } from "./types.js";
import { allowMockConnectors } from "../lib/config.js";
import { fetchJson, jdSearchTerms } from "./utils.js";
import { mockProfiles } from "./mockProfiles.js";

type GhUser = { login: string; id: number; html_url: string; avatar_url?: string };
type GhSearch = { items: GhUser[] };
type GhDetail = {
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
};

async function enrichUser(login: string, token: string): Promise<GhDetail | null> {
  const { ok, data } = await fetchJson<GhDetail>(`https://api.github.com/users/${encodeURIComponent(login)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "sourceIQ/1.0",
    },
  });
  return ok ? data : null;
}

export const githubConnector: SourceConnector = {
  source: "github",
  isConfigured() {
    return Boolean(process.env.GITHUB_TOKEN);
  },
  async search({ parsedJd, config, limit }) {
    const token = process.env.GITHUB_TOKEN;
    const q = jdSearchTerms(parsedJd, config.keywords);
    if (!token) {
      if (allowMockConnectors()) return mockProfiles("github", parsedJd, Math.min(limit, 6));
      throw new Error("github_not_configured");
    }

    const searchQ = `${q} in:bio,fullname type:user`.slice(0, 120);
    const { ok, data } = await fetchJson<GhSearch>(
      `https://api.github.com/search/users?q=${encodeURIComponent(searchQ)}&per_page=${Math.min(limit, 15)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "sourceIQ/1.0",
        },
      },
    );

    if (!ok || !data?.items?.length) {
      if (allowMockConnectors()) return mockProfiles("github", parsedJd, 4);
      return [];
    }

    const profiles = await Promise.all(
      data.items.slice(0, limit).map(async (u) => {
        const detail = await enrichUser(u.login, token);
        const name = detail?.name?.trim() || u.login;
        const bio = detail?.bio ?? "";
        const companies = detail?.company ? [detail.company] : [];
        const skillHits = parsedJd.skills.filter((s) =>
          `${bio} ${name}`.toLowerCase().includes(s.toLowerCase()),
        );
        return {
          source: "github" as const,
          externalId: String(u.id),
          profileUrl: u.html_url,
          name,
          headline: bio ? bio.slice(0, 160) : `GitHub · ${u.login}`,
          location: detail?.location ?? parsedJd.location,
          skills: skillHits.length ? skillHits : parsedJd.skills.slice(0, 4),
          companies,
          recency: (detail?.public_repos ?? 0) > 20 ? ("high" as const) : ("moderate" as const),
          raw: { github: u, detail },
        };
      }),
    );

    return profiles;
  },
};
