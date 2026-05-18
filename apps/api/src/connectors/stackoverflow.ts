import type { SourceConnector } from "./types.js";
import { allowMockConnectors } from "../lib/config.js";
import { fetchJson, jdSearchTerms } from "./utils.js";
import { mockProfiles } from "./mockProfiles.js";

type SoUser = {
  user_id: number;
  display_name: string;
  link: string;
  location?: string;
  reputation: number;
  profile_image?: string;
};

type SoResponse = { items: SoUser[] };

export const stackoverflowConnector: SourceConnector = {
  source: "stackoverflow",
  isConfigured() {
    return true;
  },
  async search({ parsedJd, config, limit }) {
    const tag = (config.keywords?.[0] ?? parsedJd.skills[0] ?? "typescript")
      .toLowerCase()
      .replace(/[^a-z0-9+#.-]/g, "");
    const terms = jdSearchTerms(parsedJd, config.keywords);
    const key = process.env.STACKOVERFLOW_KEY;
    const params = new URLSearchParams({
      order: "desc",
      sort: "reputation",
      tagged: tag,
      site: "stackoverflow",
      pagesize: String(Math.min(limit, 15)),
      filter: "default",
    });
    if (key) params.set("key", key);

    const { ok, data } = await fetchJson<SoResponse>(
      `https://api.stackexchange.com/2.3/users?${params}`,
    );

    if (!ok || !data?.items?.length) {
      if (allowMockConnectors()) return mockProfiles("stackoverflow", parsedJd, Math.min(limit, 6));
      return [];
    }

    return data.items.slice(0, limit).map((u) => ({
      source: "stackoverflow" as const,
      externalId: String(u.user_id),
      profileUrl: u.link,
      name: u.display_name,
      headline: `Stack Overflow · ${tag} · rep ${u.reputation.toLocaleString()}`,
      location: u.location ?? parsedJd.location,
      skills: parsedJd.skills.filter((s) => terms.toLowerCase().includes(s.toLowerCase())).slice(0, 6),
      companies: [],
      recency: u.reputation > 10_000 ? ("high" as const) : ("moderate" as const),
      raw: { stackoverflow: u },
    }));
  },
};
