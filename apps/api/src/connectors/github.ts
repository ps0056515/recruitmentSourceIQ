import type { SourceConnector } from "./types.js";
import { mockProfiles } from "./mockProfiles.js";

export const githubConnector: SourceConnector = {
  source: "github",
  isConfigured() {
    return Boolean(process.env.GITHUB_TOKEN);
  },
  async search({ parsedJd, config, limit }) {
    const q = config.keywords?.[0] ?? parsedJd.skills[0] ?? "developer";
    if (!this.isConfigured()) {
      return mockProfiles("github", parsedJd, Math.min(limit, 6));
    }
    try {
      const res = await fetch(
        `https://api.github.com/search/users?q=${encodeURIComponent(q)}+in:bio&per_page=${Math.min(limit, 10)}`,
        { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } },
      );
      if (!res.ok) return mockProfiles("github", parsedJd, 4);
      const data = (await res.json()) as { items: Array<{ login: string; html_url: string; id: number }> };
      return data.items.map((u) => ({
        source: "github" as const,
        externalId: String(u.id),
        profileUrl: u.html_url,
        name: u.login,
        headline: `GitHub · ${q}`,
        skills: parsedJd.skills.slice(0, 4),
        companies: [],
        recency: "moderate" as const,
        raw: u,
      }));
    } catch {
      return mockProfiles("github", parsedJd, 4);
    }
  },
};
