import type { ProfileSource } from "@sourceiq/shared";
import type { SourceConnector } from "./types.js";
import { linkedinConnector } from "./linkedin.js";
import { naukriConnector } from "./naukri.js";
import { indeedConnector } from "./indeed.js";
import { githubConnector } from "./github.js";
import { stackoverflowConnector } from "./stackoverflow.js";
import { portfolioConnector } from "./portfolio.js";
import { internalAtsConnector } from "./internalAts.js";

const ALL: SourceConnector[] = [
  linkedinConnector,
  naukriConnector,
  indeedConnector,
  githubConnector,
  stackoverflowConnector,
  portfolioConnector,
  internalAtsConnector,
];

const MAP = new Map<ProfileSource, SourceConnector>(ALL.map((c) => [c.source, c]));

export function getConnector(source: ProfileSource): SourceConnector | undefined {
  return MAP.get(source);
}

export function getConnectors(sources: ProfileSource[]): SourceConnector[] {
  return sources.map((s) => MAP.get(s)).filter((c): c is SourceConnector => Boolean(c));
}
