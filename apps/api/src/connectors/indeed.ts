import type { SourceConnector } from "./types.js";
import { mockProfiles } from "./mockProfiles.js";

export const indeedConnector: SourceConnector = {
  source: "indeed",
  isConfigured() {
    return Boolean(process.env.INDEED_API_KEY);
  },
  async search({ parsedJd, limit }) {
    if (!this.isConfigured()) {
      return mockProfiles("indeed", parsedJd, Math.min(limit, 8));
    }
    return mockProfiles("indeed", parsedJd, Math.min(limit, 8));
  },
};
