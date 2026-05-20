export type UserRole = "recruiter" | "hm" | "leadership" | "admin";

/** PRD + legacy source identifiers */
export type ProfileSource =
  | "linkedin"
  | "naukri"
  | "indeed"
  | "github"
  | "stackoverflow"
  | "portfolio"
  | "internal_ats"
  | "handshake"
  | "wellfound"
  | "resume_bank"
  | "web"
  | "manual_paste";

export const SOURCE_COLORS: Record<ProfileSource, string> = {
  linkedin: "#0A66C2",
  naukri: "#F26522",
  indeed: "#003A9B",
  github: "#1A1A2E",
  stackoverflow: "#D85A30",
  portfolio: "#7F77DD",
  internal_ats: "#185FA5",
  handshake: "#1D9E75",
  wellfound: "#E67E22",
  resume_bank: "#8E44AD",
  web: "#6B7280",
  manual_paste: "#6B4FBB",
};

export interface CandidateContact {
  email?: string;
  phone?: string;
  location?: string;
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

export interface ManualImportResult {
  candidate: Candidate;
  parsedProfile: {
    name: string;
    headline: string;
    skills: string[];
    companies: string[];
  } & CandidateContact;
}

export const PRD_SOURCES: ProfileSource[] = [
  "linkedin",
  "naukri",
  "indeed",
  "github",
  "stackoverflow",
  "portfolio",
  "internal_ats",
];

export type PipelineStage =
  | "new"
  | "contacted"
  | "responded"
  | "interview"
  | "offer"
  | "rejected"
  | "hired"
  | "sourced"
  | "replied"
  | "screening"
  | "shortlisted";

export type ContactStatus =
  | "not_contacted"
  | "draft"
  | "sent"
  | "opened"
  | "replied"
  | "interested"
  | "rejected";

export type ReplyIntent = "interested" | "not_interested" | "more_info" | "ambiguous";

export type RequirementCategory = "technical" | "behavioral";

export interface GapItem {
  id: string;
  label: string;
  severity: "must_have" | "nice_have" | "info";
  matched: boolean;
  detail?: string;
  /** Used for 80% technical / 20% behavioral score weighting. */
  category?: RequirementCategory;
}

export interface ParsedJD {
  title: string;
  company?: string;
  location?: string;
  summary: string;
  mustHaves: string[];
  niceToHaves: string[];
  skills: string[];
  yearsExperience?: number;
  rawExcerpt: string;
}

export interface SearchConfig {
  jobId: string;
  sources: ProfileSource[];
  maxResults?: number;
  keywords?: string[];
  experienceRange?: { min: number; max: number };
  locations?: string[];
  scoreWeights?: {
    skillMatch: number;
    experienceDepth: number;
    domainRelevance: number;
    profileSignals: number;
    activityRecency: number;
  };
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  parsedJd?: ParsedJD;
  searchConfig?: SearchConfig;
  status?: string;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
  stats?: JobStats;
}

export interface JobStats {
  scanned: number;
  matched: number;
  shortlisted: number;
  outreachSent: number;
  replies: number;
}

export interface SourceProgress {
  source: ProfileSource;
  status: "pending" | "searching" | "done" | "error";
  found: number;
  message?: string;
}

export interface RawCandidateProfile {
  source: ProfileSource;
  externalId?: string;
  profileUrl?: string;
  name: string;
  headline: string;
  email?: string;
  phone?: string;
  location?: string;
  skills: string[];
  companies: string[];
  yearsExperience?: number;
  salarySignal?: string;
  noticePeriod?: string;
  recency?: "high" | "moderate" | "passive";
  raw?: Record<string, unknown>;
}

export interface Candidate {
  id: string;
  jobId: string;
  name: string;
  headline: string;
  source: ProfileSource;
  sources?: ProfileSource[];
  sourceUrl?: string;
  matchScore: number;
  gaps: GapItem[];
  strengths: string[];
  stage: PipelineStage;
  contactStatus: ContactStatus;
  lastOutreachAt?: string;
  notes?: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  aiSummary?: string;
  percentile?: number;
  scoreBreakdown?: Record<string, number>;
  salarySignal?: string;
  noticePeriod?: string;
  recency?: string;
}

export interface InboxItem {
  id: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  channel: string;
  body: string;
  intentLabel?: ReplyIntent;
  receivedAt: string;
  draftReply?: string;
}

export interface AnalyticsOverview {
  totalScanned: number;
  totalMatched: number;
  replyRate: number;
  avgMatchScore: number;
  bySource: Array<{ source: string; scanned: number; matched: number; replyRate: number }>;
  funnel: Array<{ stage: string; count: number }>;
}

export interface ShareViewPayload {
  jobTitle: string;
  company: string;
  candidates: Array<{
    id: string;
    name: string;
    headline: string;
    matchScore: number;
    aiSummary?: string;
  }>;
}

export const KAFKA_TOPICS = {
  SEARCH_TASKS: "search.tasks",
  CANDIDATES_RAW: "candidates.raw",
  CANDIDATES_SCORED: "candidates.scored",
  OUTREACH_EVENTS: "outreach.events",
  ANALYTICS_EVENTS: "analytics.events",
} as const;
