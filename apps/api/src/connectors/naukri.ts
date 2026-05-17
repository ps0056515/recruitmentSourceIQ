import type { SourceConnector } from "./types.js";
import { mockProfiles } from "./mockProfiles.js";

export const naukriConnector: SourceConnector = {
  source: "naukri",
  isConfigured() {
    return Boolean(process.env.NAUKRI_API_KEY);
  },
  async search({ parsedJd, limit }) {
    if (!this.isConfigured()) {
      return mockProfiles("naukri", parsedJd, Math.min(limit, 10));
    }
    console.info("[naukri] RMS API key present — mock profiles with salary/notice signals");
    return mockProfiles("naukri", parsedJd, Math.min(limit, 10));
  },
};
