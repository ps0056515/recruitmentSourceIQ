import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const WS = "default-workspace";

const JD_FULLSTACK = {
  title: "Senior Full Stack Engineer",
  company: "Acme Corp",
  summary: "Own end-to-end product features for the hiring intelligence platform.",
  mustHaves: ["TypeScript", "React", "Node.js", "PostgreSQL"],
  niceToHaves: ["AWS", "Kafka", "System design"],
  skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "REST APIs"],
  yearsExperience: 5,
  rawExcerpt: "Senior Full Stack Engineer at Acme Corp",
};

const JD_PM = {
  title: "Senior Product Manager",
  company: "Horizon Labs",
  summary: "Lead B2B SaaS roadmap for talent analytics.",
  mustHaves: ["Product strategy", "B2B SaaS", "User research"],
  niceToHaves: ["HR tech", "SQL literacy"],
  skills: ["Roadmapping", "Analytics", "Stakeholder management"],
  yearsExperience: 6,
  rawExcerpt: "Senior Product Manager at Horizon Labs",
};

type SeedCandidate = {
  id: string;
  name: string;
  headline: string;
  source: string;
  email: string;
  matchScore: number;
  stage: string;
  contactStatus: string;
  strengths: string[];
  gaps: object[];
  aiSummary: string;
  percentile: number;
};

const CANDIDATES_JOB1: SeedCandidate[] = [
  {
    id: "cand-priya",
    name: "Priya Sharma",
    headline: "Staff Engineer · TypeScript · React · Platform",
    source: "linkedin",
    email: "priya.sharma@email.com",
    matchScore: 91,
    stage: "interview",
    contactStatus: "replied",
    strengths: ["Led React platform migration", "Strong Node.js API design", "Mentors junior engineers"],
    gaps: [
      { id: "g1", label: "TypeScript", severity: "must_have", matched: true, detail: "5+ years" },
      { id: "g2", label: "React", severity: "must_have", matched: true },
      { id: "g3", label: "Kafka", severity: "nice_have", matched: false, detail: "Limited exposure" },
    ],
    aiSummary:
      "Priya is a strong fit for the full-stack role: deep TypeScript/React experience and platform ownership at scale. Gap on Kafka is trainable.",
    percentile: 95,
  },
  {
    id: "cand-arjun",
    name: "Arjun Patel",
    headline: "Senior SDE · Node.js · AWS · Fintech",
    source: "github",
    email: "arjun.patel@email.com",
    matchScore: 86,
    stage: "contacted",
    contactStatus: "sent",
    strengths: ["High-throughput APIs", "AWS production ops", "PostgreSQL tuning"],
    gaps: [
      { id: "g1", label: "React", severity: "must_have", matched: true, detail: "Side projects + prior role" },
      { id: "g2", label: "Node.js", severity: "must_have", matched: true },
      { id: "g3", label: "System design", severity: "nice_have", matched: true },
    ],
    aiSummary: "Arjun brings solid backend depth and cloud experience. Frontend is present but less recent than backend work.",
    percentile: 88,
  },
  {
    id: "cand-meera",
    name: "Meera Iyer",
    headline: "Full Stack Developer · React · GraphQL",
    source: "naukri",
    email: "meera.iyer@email.com",
    matchScore: 82,
    stage: "responded",
    contactStatus: "interested",
    strengths: ["GraphQL + React", "Notice period 15 days", "Bangalore onsite"],
    gaps: [
      { id: "g1", label: "PostgreSQL", severity: "must_have", matched: true },
      { id: "g2", label: "TypeScript", severity: "must_have", matched: true },
      { id: "g3", label: "AWS", severity: "nice_have", matched: false },
    ],
    aiSummary: "Meera matches core stack requirements and is actively looking. AWS experience is lighter than ideal.",
    percentile: 82,
  },
  {
    id: "cand-rohan",
    name: "Rohan Gupta",
    headline: "Software Engineer · Java → TypeScript transition",
    source: "indeed",
    email: "rohan.gupta@email.com",
    matchScore: 74,
    stage: "new",
    contactStatus: "not_contacted",
    strengths: ["Fast learner", "Strong CS fundamentals"],
    gaps: [
      { id: "g1", label: "TypeScript", severity: "must_have", matched: false, detail: "1 year TS" },
      { id: "g2", label: "React", severity: "must_have", matched: true },
      { id: "g3", label: "Node.js", severity: "must_have", matched: false },
    ],
    aiSummary: "Rohan is a stretch hire — good React but limited Node/TS depth for a senior bar.",
    percentile: 68,
  },
  {
    id: "cand-ananya",
    name: "Ananya Reddy",
    headline: "Frontend Lead · Design systems · React",
    source: "linkedin",
    email: "ananya.reddy@email.com",
    matchScore: 79,
    stage: "new",
    contactStatus: "not_contacted",
    strengths: ["Design system ownership", "Accessibility", "Team lead experience"],
    gaps: [
      { id: "g1", label: "React", severity: "must_have", matched: true },
      { id: "g2", label: "Node.js", severity: "must_have", matched: false },
      { id: "g3", label: "PostgreSQL", severity: "must_have", matched: false },
    ],
    aiSummary: "Ananya excels on frontend leadership; backend ownership would need validation.",
    percentile: 75,
  },
  {
    id: "cand-vikram",
    name: "Vikram Singh",
    headline: "Backend Engineer · Go · Microservices",
    source: "stackoverflow",
    email: "vikram.singh@email.com",
    matchScore: 71,
    stage: "rejected",
    contactStatus: "not_contacted",
    strengths: ["Distributed systems", "High scale"],
    gaps: [
      { id: "g1", label: "React", severity: "must_have", matched: false },
      { id: "g2", label: "TypeScript", severity: "must_have", matched: false },
    ],
    aiSummary: "Backend-heavy profile; not aligned with full-stack requirement.",
    percentile: 55,
  },
  {
    id: "cand-sarah",
    name: "Sarah Chen",
    headline: "Full Stack · Startup founder · Ex-Stripe",
    source: "github",
    email: "sarah.chen@email.com",
    matchScore: 94,
    stage: "offer",
    contactStatus: "replied",
    strengths: ["End-to-end ownership", "Payments domain", "TypeScript expert"],
    gaps: [
      { id: "g1", label: "TypeScript", severity: "must_have", matched: true },
      { id: "g2", label: "React", severity: "must_have", matched: true },
      { id: "g3", label: "Kafka", severity: "nice_have", matched: true },
    ],
    aiSummary: "Top-tier match — founder experience plus big-tech depth. In offer stage.",
    percentile: 99,
  },
  {
    id: "cand-james",
    name: "James Okonkwo",
    headline: "Senior Engineer · Remote · EU timezone",
    source: "internal_ats",
    email: "james.okonkwo@email.com",
    matchScore: 88,
    stage: "pipeline",
    contactStatus: "sent",
    strengths: ["Previous applicant — silver medalist", "Strong references"],
    gaps: [
      { id: "g1", label: "Node.js", severity: "must_have", matched: true },
      { id: "g2", label: "PostgreSQL", severity: "must_have", matched: true },
    ],
    aiSummary: "Internal ATS silver medalist from prior req — high revisit potential.",
    percentile: 90,
  },
];

async function main() {
  const ws = await prisma.workspace.upsert({
    where: { id: WS },
    create: { id: WS, name: "Acme Talent Co." },
    update: { name: "Acme Talent Co." },
  });

  const recruiter = await prisma.user.upsert({
    where: { email: "recruiter@sourceiq.local" },
    create: {
      email: "recruiter@sourceiq.local",
      name: "Alex Morgan",
      role: "RECRUITER",
      workspaceId: ws.id,
    },
    update: { name: "Alex Morgan" },
  });

  const job1 = await prisma.job.upsert({
    where: { id: "seed-job-1" },
    create: {
      id: "seed-job-1",
      workspaceId: ws.id,
      ownerId: recruiter.id,
      title: JD_FULLSTACK.title,
      company: JD_FULLSTACK.company,
      location: "Bangalore / Remote",
      status: "ACTIVE",
      parsedJd: JD_FULLSTACK,
    },
    update: { status: "ACTIVE", parsedJd: JD_FULLSTACK },
  });

  const job2 = await prisma.job.upsert({
    where: { id: "seed-job-2" },
    create: {
      id: "seed-job-2",
      workspaceId: ws.id,
      ownerId: recruiter.id,
      title: JD_PM.title,
      company: JD_PM.company,
      location: "San Francisco",
      status: "DRAFT",
      parsedJd: JD_PM,
    },
    update: { parsedJd: JD_PM },
  });

  await prisma.searchRun.upsert({
    where: { id: "seed-run-1" },
    create: {
      id: "seed-run-1",
      jobId: job1.id,
      sources: ["linkedin", "github", "naukri", "indeed", "stackoverflow"],
      status: "COMPLETE",
      totalScanned: 142,
      totalMatched: CANDIDATES_JOB1.length,
      completedAt: new Date(),
    },
    update: {
      totalScanned: 142,
      totalMatched: CANDIDATES_JOB1.length,
      status: "COMPLETE",
    },
  });

  for (const c of CANDIDATES_JOB1) {
    const stage = c.stage === "pipeline" ? "contacted" : c.stage;
    await prisma.candidate.upsert({
      where: { jobId_dedupeKey: { jobId: job1.id, dedupeKey: `email:${c.email}` } },
      create: {
        id: c.id,
        jobId: job1.id,
        dedupeKey: `email:${c.email}`,
        name: c.name,
        headline: c.headline,
        email: c.email,
        matchScore: c.matchScore,
        gaps: c.gaps,
        strengths: c.strengths,
        aiSummary: c.aiSummary,
        stage,
        contactStatus: c.contactStatus,
        percentile: c.percentile,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`,
        sources: {
          create: [{ source: c.source, profileUrl: `https://example.com/${c.source}/${c.id}` }],
        },
      },
      update: {
        matchScore: c.matchScore,
        gaps: c.gaps,
        strengths: c.strengths,
        aiSummary: c.aiSummary,
        stage,
        contactStatus: c.contactStatus,
        percentile: c.percentile,
      },
    });
  }

  await prisma.inboxReply.deleteMany({ where: { jobId: job1.id } });
  await prisma.inboxReply.createMany({
    data: [
      {
        id: "inbox-1",
        jobId: job1.id,
        candidateId: "cand-meera",
        channel: "email",
        body: "Thanks for reaching out! I'm interested in learning more about the team and comp range. Available Thursday afternoon.",
        intentLabel: "interested",
        draftReply:
          "Hi Meera — great to hear! I'll send calendar options for Thursday and a brief on the team structure. Comp band is competitive for senior IC in Bangalore.",
        receivedAt: new Date(Date.now() - 2 * 3600_000),
      },
      {
        id: "inbox-2",
        jobId: job1.id,
        candidateId: "cand-priya",
        channel: "linkedin",
        body: "Can you share more about the architecture and how the team uses TypeScript across the stack?",
        intentLabel: "more_info",
        draftReply:
          "Hi Priya — we use a monorepo with shared TS types between React client and Node API layer. Happy to walk through architecture on our call.",
        receivedAt: new Date(Date.now() - 8 * 3600_000),
      },
      {
        id: "inbox-3",
        jobId: job1.id,
        candidateId: "cand-rohan",
        channel: "email",
        body: "Not looking right now but appreciate you thinking of me.",
        intentLabel: "not_interested",
        receivedAt: new Date(Date.now() - 24 * 3600_000),
      },
    ],
  });

  await prisma.outreachMessage.createMany({
    data: [
      {
        id: "out-1",
        jobId: job1.id,
        candidateId: "cand-arjun",
        channel: "email",
        subject: "Senior Full Stack @ Acme Corp",
        body: "Hi Arjun, your Node/AWS background stood out…",
        status: "sent",
        sentAt: new Date(Date.now() - 48 * 3600_000),
      },
      {
        id: "out-2",
        jobId: job1.id,
        candidateId: "cand-priya",
        channel: "linkedin",
        subject: "Platform engineering role",
        body: "Priya — saw your platform migration work…",
        status: "sent",
        sentAt: new Date(Date.now() - 72 * 3600_000),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.analyticsEvent.createMany({
    data: [
      { workspaceId: ws.id, jobId: job1.id, eventType: "search_complete", payload: { totalScanned: 142, totalMatched: 8 } },
      { workspaceId: ws.id, jobId: job1.id, eventType: "outreach_sent", payload: { count: 2 } },
      { workspaceId: ws.id, jobId: job1.id, eventType: "reply_received", payload: { count: 3 } },
    ],
    skipDuplicates: true,
  });

  await prisma.shareLink.upsert({
    where: { token: "demo-hm-shortlist" },
    create: {
      token: "demo-hm-shortlist",
      jobId: job1.id,
      filters: { minScore: 80 },
    },
    update: {},
  });

  console.log("Seeded:");
  console.log("  Workspace:", ws.id);
  console.log("  Jobs:", job1.id, job2.id);
  console.log("  Candidates:", CANDIDATES_JOB1.length, "on", job1.title);
  console.log("  Inbox replies: 3");
  console.log("  HM share: /share/demo-hm-shortlist");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
