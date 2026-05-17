import type { SourceConnector } from "./types.js";
import { mockProfiles } from "./mockProfiles.js";

export const portfolioConnector: SourceConnector = {
  source: "portfolio",
  isConfigured() {
    return Boolean(process.env.TAVILY_API_KEY);
  },
  async search({ parsedJd, limit }) {
    return mockProfiles("portfolio", parsedJd, Math.min(limit, 4));
  },
};
