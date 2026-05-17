import type { Candidate, Job, ParsedJD } from "@sourceiq/shared";

const JD_FULLSTACK: ParsedJD = {
  title: "Senior Full Stack Engineer",
  company: "Acme Corp",
  summary: "Own end-to-end product features for the hiring intelligence platform.",
  mustHaves: ["TypeScript", "React", "Node.js", "PostgreSQL"],
  niceToHaves: ["AWS", "Kafka", "System design"],
  skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "REST APIs"],
  yearsExperience: 5,
  rawExcerpt: "Senior Full Stack Engineer at Acme Corp",
};

const JD_PM: ParsedJD = {
  title: "Senior Product Manager",
  company: "Horizon Labs",
  summary: "Lead B2B SaaS roadmap for talent analytics.",
  mustHaves: ["Product strategy", "B2B SaaS", "User research"],
  niceToHaves: ["HR tech", "SQL literacy"],
  skills: ["Roadmapping", "Analytics", "Stakeholder management"],
  yearsExperience: 6,
  rawExcerpt: "Senior Product Manager at Horizon Labs",
};

const now = new Date().toISOString();

export const DEMO_JOBS: Job[] = [
  {
    id: "seed-job-1",
    title: JD_FULLSTACK.title,
    company: JD_FULLSTACK.company!,
    location: "Bangalore / Remote",
    parsedJd: JD_FULLSTACK,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    stats: { scanned: 142, matched: 8, shortlisted: 3, outreachSent: 2, replies: 3 },
  },
  {
    id: "seed-job-2",
    title: JD_PM.title,
    company: JD_PM.company!,
    location: "San Francisco",
    parsedJd: JD_PM,
    status: "DRAFT",
    createdAt: now,
    updatedAt: now,
    stats: { scanned: 0, matched: 0, shortlisted: 0, outreachSent: 0, replies: 0 },
  },
];

export const DEMO_CANDIDATES: Candidate[] = [
  {
    id: "cand-priya",
    jobId: "seed-job-1",
    name: "Priya Sharma",
    headline: "Staff Engineer · TypeScript · React · Platform",
    source: "linkedin",
    sources: ["linkedin"],
    matchScore: 91,
    stage: "interview",
    contactStatus: "replied",
    email: "priya.sharma@email.com",
    strengths: ["Led React platform migration", "Strong Node.js API design", "Mentors junior engineers"],
    gaps: [
      { id: "g1", label: "TypeScript", severity: "must_have", matched: true, detail: "5+ years" },
      { id: "g2", label: "React", severity: "must_have", matched: true },
      { id: "g3", label: "Kafka", severity: "nice_have", matched: false, detail: "Limited exposure" },
    ],
    aiSummary:
      "Priya is a strong fit: deep TypeScript/React experience and platform ownership at scale. Kafka gap is trainable.",
    percentile: 95,
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Priya%20Sharma",
  },
  {
    id: "cand-arjun",
    jobId: "seed-job-1",
    name: "Arjun Patel",
    headline: "Senior SDE · Node.js · AWS · Fintech",
    source: "github",
    sources: ["github"],
    matchScore: 86,
    stage: "contacted",
    contactStatus: "sent",
    email: "arjun.patel@email.com",
    strengths: ["High-throughput APIs", "AWS production ops", "PostgreSQL tuning"],
    gaps: [
      { id: "g1", label: "React", severity: "must_have", matched: true },
      { id: "g2", label: "Node.js", severity: "must_have", matched: true },
      { id: "g3", label: "System design", severity: "nice_have", matched: true },
    ],
    aiSummary: "Solid backend depth and cloud experience. Frontend is present but less recent.",
    percentile: 88,
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Arjun%20Patel",
  },
  {
    id: "cand-meera",
    jobId: "seed-job-1",
    name: "Meera Iyer",
    headline: "Full Stack Developer · React · GraphQL",
    source: "naukri",
    sources: ["naukri"],
    matchScore: 82,
    stage: "responded",
    contactStatus: "interested",
    email: "meera.iyer@email.com",
    strengths: ["GraphQL + React", "Notice period 15 days", "Bangalore onsite"],
    gaps: [
      { id: "g1", label: "PostgreSQL", severity: "must_have", matched: true },
      { id: "g2", label: "TypeScript", severity: "must_have", matched: true },
      { id: "g3", label: "AWS", severity: "nice_have", matched: false },
    ],
    aiSummary: "Matches core stack and is actively looking. AWS experience is lighter than ideal.",
    percentile: 82,
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Meera%20Iyer",
  },
  {
    id: "cand-sarah",
    jobId: "seed-job-1",
    name: "Sarah Chen",
    headline: "Full Stack · Ex-Stripe · TypeScript",
    source: "github",
    sources: ["github", "linkedin"],
    matchScore: 94,
    stage: "offer",
    contactStatus: "replied",
    email: "sarah.chen@email.com",
    strengths: ["End-to-end ownership", "Payments domain", "TypeScript expert"],
    gaps: [
      { id: "g1", label: "TypeScript", severity: "must_have", matched: true },
      { id: "g2", label: "React", severity: "must_have", matched: true },
      { id: "g3", label: "Kafka", severity: "nice_have", matched: true },
    ],
    aiSummary: "Top-tier match — big-tech depth plus founder experience. Currently in offer stage.",
    percentile: 99,
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Sarah%20Chen",
  },
  {
    id: "cand-ananya",
    jobId: "seed-job-1",
    name: "Ananya Reddy",
    headline: "Frontend Lead · Design systems · React",
    source: "linkedin",
    matchScore: 79,
    stage: "new",
    contactStatus: "not_contacted",
    email: "ananya.reddy@email.com",
    strengths: ["Design system ownership", "Accessibility", "Team lead experience"],
    gaps: [
      { id: "g1", label: "React", severity: "must_have", matched: true },
      { id: "g2", label: "Node.js", severity: "must_have", matched: false },
    ],
    aiSummary: "Excellent frontend leadership; backend ownership needs validation.",
    percentile: 75,
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Ananya%20Reddy",
  },
  {
    id: "cand-rohan",
    jobId: "seed-job-1",
    name: "Rohan Gupta",
    headline: "Software Engineer · Java → TypeScript",
    source: "indeed",
    matchScore: 74,
    stage: "new",
    contactStatus: "not_contacted",
    email: "rohan.gupta@email.com",
    strengths: ["Fast learner", "Strong CS fundamentals"],
    gaps: [
      { id: "g1", label: "TypeScript", severity: "must_have", matched: false, detail: "1 year TS" },
      { id: "g2", label: "Node.js", severity: "must_have", matched: false },
    ],
    aiSummary: "Stretch hire — good React but limited Node/TS depth for senior bar.",
    percentile: 68,
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Rohan%20Gupta",
  },
  {
    id: "cand-james",
    jobId: "seed-job-1",
    name: "James Okonkwo",
    headline: "Senior Engineer · Remote · EU timezone",
    source: "internal_ats",
    matchScore: 88,
    stage: "contacted",
    contactStatus: "sent",
    email: "james.okonkwo@email.com",
    strengths: ["Prior silver medalist", "Strong references", "PostgreSQL expert"],
    gaps: [
      { id: "g1", label: "Node.js", severity: "must_have", matched: true },
      { id: "g2", label: "PostgreSQL", severity: "must_have", matched: true },
    ],
    aiSummary: "Internal ATS revisit — high potential from previous req cycle.",
    percentile: 90,
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=James%20Okonkwo",
  },
  {
    id: "cand-vikram",
    jobId: "seed-job-1",
    name: "Vikram Singh",
    headline: "Backend Engineer · Go · Microservices",
    source: "stackoverflow",
    matchScore: 71,
    stage: "rejected",
    contactStatus: "not_contacted",
    email: "vikram.singh@email.com",
    strengths: ["Distributed systems", "High scale"],
    gaps: [
      { id: "g1", label: "React", severity: "must_have", matched: false },
      { id: "g2", label: "TypeScript", severity: "must_have", matched: false },
    ],
    aiSummary: "Backend-heavy; not aligned with full-stack requirement.",
    percentile: 55,
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Vikram%20Singh",
  },
];

export const DEMO_INBOX = [
  {
    id: "inbox-1",
    jobId: "seed-job-1",
    candidateId: "cand-meera",
    candidateName: "Meera Iyer",
    channel: "email",
    body: "Thanks for reaching out! I'm interested in learning more about the team and comp range. Available Thursday afternoon.",
    intentLabel: "interested" as const,
    receivedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    draftReply:
      "Hi Meera — great to hear! I'll send calendar options for Thursday and a brief on the team. Comp band is competitive for senior IC in Bangalore.",
  },
  {
    id: "inbox-2",
    jobId: "seed-job-1",
    candidateId: "cand-priya",
    candidateName: "Priya Sharma",
    channel: "linkedin",
    body: "Can you share more about the architecture and how the team uses TypeScript across the stack?",
    intentLabel: "more_info" as const,
    receivedAt: new Date(Date.now() - 8 * 3600_000).toISOString(),
    draftReply:
      "Hi Priya — we use a monorepo with shared TS types between React and Node. Happy to walk through architecture on our call.",
  },
  {
    id: "inbox-3",
    jobId: "seed-job-1",
    candidateId: "cand-rohan",
    candidateName: "Rohan Gupta",
    channel: "email",
    body: "Not looking right now but appreciate you thinking of me.",
    intentLabel: "not_interested" as const,
    receivedAt: new Date(Date.now() - 24 * 3600_000).toISOString(),
  },
];

export function loadDemoIntoMemory(
  jobs: Map<string, Job>,
  candidates: Map<string, Candidate>,
) {
  if (jobs.size > 0) return false;
  for (const j of DEMO_JOBS) jobs.set(j.id, j);
  for (const c of DEMO_CANDIDATES) candidates.set(c.id, c);
  return true;
}

export function getDemoJobAnalytics(jobId: string) {
  const list = DEMO_CANDIDATES.filter((c) => c.jobId === jobId);
  const stages = ["new", "contacted", "responded", "interview", "offer", "hired", "rejected"];
  const bySource = new Map<string, number>();
  for (const c of list) {
    bySource.set(c.source, (bySource.get(c.source) ?? 0) + 1);
  }
  return {
    totalScanned: 142,
    totalMatched: list.length,
    replyRate: 0.38,
    avgMatchScore: list.length ? Math.round(list.reduce((s, c) => s + c.matchScore, 0) / list.length) : 0,
    bySource: [...bySource.entries()].map(([source, matched]) => ({
      source,
      scanned: 28,
      matched,
      replyRate: 0.35,
    })),
    funnel: stages.map((stage) => ({ stage, count: list.filter((c) => c.stage === stage).length })),
  };
}

export function getDemoOverviewAnalytics() {
  return {
    totalScanned: 142,
    totalMatched: DEMO_CANDIDATES.length,
    replyRate: 0.38,
    avgMatchScore: Math.round(DEMO_CANDIDATES.reduce((s, c) => s + c.matchScore, 0) / DEMO_CANDIDATES.length),
    bySource: [
      { source: "linkedin", scanned: 40, matched: 2, replyRate: 0.4 },
      { source: "github", scanned: 35, matched: 2, replyRate: 0.35 },
      { source: "naukri", scanned: 25, matched: 1, replyRate: 0.5 },
    ],
    funnel: [],
  };
}

export function getDemoShareView(jobId: string) {
  const job = DEMO_JOBS.find((j) => j.id === jobId);
  if (!job) return null;
  const list = DEMO_CANDIDATES.filter((c) => c.jobId === jobId && c.matchScore >= 80);
  return {
    jobTitle: job.title,
    company: job.company,
    candidates: list.map((c) => ({
      id: c.id,
      name: c.name,
      headline: c.headline,
      matchScore: c.matchScore,
      aiSummary: c.aiSummary,
    })),
  };
}
