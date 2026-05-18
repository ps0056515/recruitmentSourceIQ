import type { SourceConnector } from "./types.js";
import { allowMockConnectors } from "../lib/config.js";
import { mockProfiles } from "./mockProfiles.js";
import { isTavilyConfigured, tavilyProfiles } from "./tavily.js";

export const portfolioConnector: SourceConnector = {
  source: "portfolio",
  isConfigured() {
    return isTavilyConfigured();
  },
  async search({ parsedJd, config, limit }) {
    if (isTavilyConfigured()) {
      const hits = await tavilyProfiles("portfolio", parsedJd, limit, config.keywords);
      if (hits.length) return hits;
    }

    if (allowMockConnectors()) return mockProfiles("portfolio", parsedJd, Math.min(limit, 6));
    throw new Error("portfolio_not_configured: set TAVILY_API_KEY for web portfolio discovery");
  },
};
