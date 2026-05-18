import type { SourceConnector } from "./types.js";
import { allowMockConnectors } from "../lib/config.js";
import { mockProfiles } from "./mockProfiles.js";
import { isProxycurlConfigured, proxycurlLinkedInSearch } from "./proxycurl.js";
import { isTavilyConfigured, tavilyProfiles } from "./tavily.js";

export const linkedinConnector: SourceConnector = {
  source: "linkedin",
  isConfigured() {
    return isProxycurlConfigured() || isTavilyConfigured();
  },
  async search(params) {
    const { parsedJd, config, limit } = params;

    if (isProxycurlConfigured()) {
      const hits = await proxycurlLinkedInSearch(parsedJd, limit, config.keywords);
      if (hits.length) return hits;
    }

    if (isTavilyConfigured()) {
      const hits = await tavilyProfiles("linkedin", parsedJd, limit, config.keywords);
      if (hits.length) return hits;
    }

    if (allowMockConnectors()) {
      return mockProfiles("linkedin", parsedJd, Math.min(limit, 8));
    }

    throw new Error("linkedin_not_configured: set PROXYCURL_API_KEY or TAVILY_API_KEY");
  },
};
