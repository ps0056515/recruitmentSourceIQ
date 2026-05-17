import type { SourceConnector } from "./types.js";
import { mockProfiles } from "./mockProfiles.js";

export const internalAtsConnector: SourceConnector = {
  source: "internal_ats",
  isConfigured() {
    return Boolean(process.env.ATS_INTERNAL_API_URL);
  },
  async search({ parsedJd, limit }) {
    return mockProfiles("internal_ats", parsedJd, Math.min(limit, 6));
  },
};
