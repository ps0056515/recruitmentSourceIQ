import type { SourceConnector } from "./types.js";
import { mockProfiles } from "./mockProfiles.js";

export const stackoverflowConnector: SourceConnector = {
  source: "stackoverflow",
  isConfigured() {
    return Boolean(process.env.STACKOVERFLOW_KEY);
  },
  async search({ parsedJd, limit }) {
    return mockProfiles("stackoverflow", parsedJd, Math.min(limit, 5));
  },
};
