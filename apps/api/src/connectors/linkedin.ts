import type { SourceConnector } from "./types.js";
import { mockProfiles } from "./mockProfiles.js";

export const linkedinConnector: SourceConnector = {
  source: "linkedin",
  isConfigured() {
    return Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
  },
  async search({ parsedJd, limit }) {
    if (!this.isConfigured()) {
      return mockProfiles("linkedin", parsedJd, Math.min(limit, 8));
    }
    console.info("[linkedin] partner API stub");
    return mockProfiles("linkedin", parsedJd, Math.min(limit, 8));
  },
};