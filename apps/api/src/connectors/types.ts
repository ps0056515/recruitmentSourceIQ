import type { ParsedJD, ProfileSource, RawCandidateProfile, SearchConfig } from "@sourceiq/shared";

export interface ConnectorSearchParams {
  jobId: string;
  parsedJd: ParsedJD;
  config: SearchConfig;
  limit: number;
}

export interface SourceConnector {
  source: ProfileSource;
  isConfigured(): boolean;
  search(params: ConnectorSearchParams): Promise<RawCandidateProfile[]>;
}
