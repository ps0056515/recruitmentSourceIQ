import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { RawCandidateProfile } from "@sourceiq/shared";
import { createApp } from "../app.js";
import { parseJdFromText } from "../services/jdParser.js";
import { parseResumeFromText } from "../services/resumeParser.js";
import { rankProfiles } from "../services/rankingService.js";
import { seedDemoStore } from "./helpers.js";
import {
  JD_MINIMAL_TEXT,
  PARSED_JD_FULLSTACK,
  PARSED_JD_PM,
  RESUME_PARTIAL_MATCH,
  RESUME_PERFECT_MATCH,
  RESUME_PM_MATCH,
  RESUME_WRONG_ROLE,
  SAMPLE_JD_TEXT,
  SAMPLE_RESUME_STRONG,
  SAMPLE_RESUME_WEAK,
} from "./jd-resume-fixtures.js";

vi.mock("../lib/llm.js", () => ({
  claudeJson: vi.fn().mockResolvedValue(null),
  claudeText: vi.fn().mockResolvedValue(null),
}));

function profileFromResume(
  name: string,
  resumeText: string,
  skills: string[] = [],
): RawCandidateProfile {
  return {
    source: "manual_paste",
    name,
    headline: `${name} · candidate`,
    skills: skills.length ? skills : ["General"],
    companies: [],
    raw: { resumeText, excerpt: resumeText.slice(0, 500) },
  };
}

describe("JD parsing (heuristic, no Claude)", () => {
  it("extracts title and must-haves from structured JD", async () => {
    const parsed = await parseJdFromText(SAMPLE_JD_TEXT);
    expect(parsed.title).toMatch(/Full Stack/i);
    expect(parsed.mustHaves).toEqual(
      expect.arrayContaining(["TypeScript", "React", "Node.js", "PostgreSQL"]),
    );
    expect(parsed.niceToHaves).toEqual(expect.arrayContaining(["AWS", "Kafka"]));
    expect(parsed.yearsExperience).toBeGreaterThanOrEqual(5);
  });

  it("extracts skill hints from minimal JD", async () => {
    const parsed = await parseJdFromText(JD_MINIMAL_TEXT);
    expect(parsed.mustHaves).toContain("Go");
    expect(parsed.skills).toContain("Go");
  });

  it("provides fallback must-haves when bullets missing", async () => {
    const parsed = await parseJdFromText("Hiring a designer\nNo bullet sections here.");
    expect(parsed.mustHaves.length).toBeGreaterThan(0);
    expect(parsed.rawExcerpt.length).toBeGreaterThan(0);
  });
});

describe("Resume parsing (heuristic, no Claude)", () => {
  it("extracts name, skills, and stores resume text in raw", async () => {
    const p = await parseResumeFromText(SAMPLE_RESUME_STRONG, { candidateName: "Alex Rivera" });
    expect(p.name).toBe("Alex Rivera");
    expect(p.skills.map((s) => s.toLowerCase())).toEqual(
      expect.arrayContaining(["typescript", "react", "node.js", "postgresql"]),
    );
    expect(String(p.raw?.resumeText)).toContain("TalentStack");
    expect(p.source).toBe("manual_paste");
  });

  it("uses heuristic skills for weak resume without engineering stack", async () => {
    const p = await parseResumeFromText(SAMPLE_RESUME_WEAK, { candidateName: "Bob Tester" });
    const blob = `${p.skills.join(" ")} ${String(p.raw?.resumeText)}`.toLowerCase();
    expect(blob).not.toContain("typescript");
    expect(blob).not.toContain("postgresql");
    expect(blob).toMatch(/wordpress|html|junior/i);
  });
});

describe("JD ↔ resume ranking (heuristic)", () => {
  it("perfect match scores higher than partial and weak", async () => {
    const perfect = profileFromResume("Perfect", RESUME_PERFECT_MATCH, [
      "TypeScript",
      "React",
      "Node.js",
      "PostgreSQL",
    ]);
    const partial = profileFromResume("Partial", RESUME_PARTIAL_MATCH, ["Node.js", "PostgreSQL"]);
    const weak = profileFromResume("Weak", SAMPLE_RESUME_WEAK.repeat(2), ["HTML", "CSS"]);

    const ranked = await rankProfiles(PARSED_JD_FULLSTACK, [weak, partial, perfect]);
    expect(ranked).toHaveLength(3);
    expect(ranked[0]!.profile.name).toBe("Perfect");
    expect(ranked[1]!.profile.name).toBe("Partial");
    expect(ranked[2]!.profile.name).toBe("Weak");
    expect(ranked[0]!.matchScore).toBeGreaterThan(ranked[1]!.matchScore);
    expect(ranked[1]!.matchScore).toBeGreaterThan(ranked[2]!.matchScore);
  });

  it("assigns descending percentiles for a cohort", async () => {
    const profiles = ["A", "B", "C"].map((n, i) =>
      profileFromResume(n, `Skills: ${["TypeScript", "React", "Node.js", "PostgreSQL"].slice(0, i + 1).join(", ")}`),
    );
    const ranked = await rankProfiles(PARSED_JD_FULLSTACK, profiles);
    expect(ranked[0]!.percentile).toBeGreaterThanOrEqual(ranked[1]!.percentile!);
    expect(ranked[1]!.percentile).toBeGreaterThanOrEqual(ranked[2]!.percentile!);
  });

  it("marks all must-haves matched for strong full-stack resume", async () => {
    const p = profileFromResume("Strong", SAMPLE_RESUME_STRONG, [
      "TypeScript",
      "React",
      "Node.js",
      "PostgreSQL",
    ]);
    const [r] = await rankProfiles(PARSED_JD_FULLSTACK, [p]);
    const must = r!.gaps.filter((g) => g.severity === "must_have");
    expect(must.every((g) => g.matched)).toBe(true);
    expect(r!.matchScore).toBeGreaterThanOrEqual(70);
  });

  it("flags unmatched must-haves for weak resume", async () => {
    const p = profileFromResume("Weak", SAMPLE_RESUME_WEAK, ["HTML", "WordPress"]);
    const [r] = await rankProfiles(PARSED_JD_FULLSTACK, [p]);
    const must = r!.gaps.filter((g) => g.severity === "must_have");
    const unmatched = must.filter((g) => !g.matched);
    expect(unmatched.length).toBeGreaterThan(0);
    expect(r!.matchScore).toBeLessThan(50);
  });

  it("includes nice-to-have gaps with correct severity", async () => {
    const p = profileFromResume("NoNice", RESUME_PARTIAL_MATCH);
    const [r] = await rankProfiles(PARSED_JD_FULLSTACK, [p]);
    const nice = r!.gaps.filter((g) => g.severity === "nice_have");
    expect(nice.length).toBeGreaterThan(0);
    expect(nice.some((g) => g.label === "AWS" || g.label === "Kafka")).toBe(true);
  });

  it("scores within bounded range 20–98", async () => {
    const p = profileFromResume("Any", "Random text without skills");
    const [r] = await rankProfiles(PARSED_JD_FULLSTACK, [p]);
    expect(r!.matchScore).toBeGreaterThanOrEqual(20);
    expect(r!.matchScore).toBeLessThanOrEqual(98);
  });

  it("matches requirements from resume raw text blob", async () => {
    const p = profileFromResume("RawOnly", "", []);
    p.raw = {
      resumeText: `
        Experience with TypeScript, React, Node.js and PostgreSQL databases.
        Deployed on AWS with Kafka consumers.
      `,
    };
    const [r] = await rankProfiles(PARSED_JD_FULLSTACK, [p]);
    expect(r!.matchScore).toBeGreaterThan(60);
    const ts = r!.gaps.find((g) => g.label === "TypeScript");
    expect(ts?.matched).toBe(true);
  });

  it("cross-role: PM resume scores low against engineering JD", async () => {
    const eng = profileFromResume("Eng JD", RESUME_WRONG_ROLE);
    const [r] = await rankProfiles(PARSED_JD_FULLSTACK, [eng]);
    expect(r!.matchScore).toBeLessThan(40);
  });

  it("cross-role: PM resume scores higher against PM JD", async () => {
    const pm = profileFromResume("PM", RESUME_PM_MATCH, [
      "Product strategy",
      "B2B SaaS",
      "User research",
    ]);
    const [engRank] = await rankProfiles(PARSED_JD_FULLSTACK, [pm]);
    const [pmRank] = await rankProfiles(PARSED_JD_PM, [pm]);
    expect(pmRank!.matchScore).toBeGreaterThan(engRank!.matchScore);
  });

  it("matches Node.js when resume text includes Node.js", async () => {
    const p = profileFromResume(
      "NodeDev",
      "Skills: Node.js, PostgreSQL, TypeScript, React — 5 years backend",
    );
    const [r] = await rankProfiles(PARSED_JD_FULLSTACK, [p]);
    const nodeGap = r!.gaps.find((g) => g.label === "Node.js");
    expect(nodeGap?.matched).toBe(true);
  });

  it("matches Node.js when resume says Node (alias)", async () => {
    const p = profileFromResume("NodeOnly", "Skills: Node, PostgreSQL, TypeScript, React");
    const [r] = await rankProfiles(PARSED_JD_FULLSTACK, [p]);
    const nodeGap = r!.gaps.find((g) => g.label === "Node.js");
    expect(nodeGap?.matched).toBe(true);
  });

  it("produces score breakdown components", async () => {
    const p = profileFromResume("Breakdown", SAMPLE_RESUME_STRONG);
    const [r] = await rankProfiles(PARSED_JD_FULLSTACK, [p]);
    expect(r!.scoreBreakdown).toMatchObject({
      skillMatch: expect.any(Number),
      experienceDepth: expect.any(Number),
      domainRelevance: expect.any(Number),
    });
  });

  it("manual_paste summary lists requirement match details", async () => {
    const p = profileFromResume("Manual", SAMPLE_RESUME_STRONG);
    const [r] = await rankProfiles(PARSED_JD_FULLSTACK, [p]);
    expect(r!.aiSummary).toMatch(/requirements matched|all \d+ key requirements/i);
  });
});

describe("JD ↔ resume API scenarios (in-memory)", () => {
  const app = createApp();
  const api = request(app);

  beforeEach(() => {
    seedDemoStore();
  });

  it("POST /jd/parse returns must-haves aligned with seed job", async () => {
    const res = await api.post("/api/v1/jd/parse").send({ text: SAMPLE_JD_TEXT });
    expect(res.status).toBe(200);
    const must = res.body.parsed.mustHaves as string[];
    expect(must).toEqual(expect.arrayContaining(["TypeScript", "React"]));
  });

  it("rejects manual import when resume too short", async () => {
    const res = await api.post("/api/v1/jobs/seed-job-1/manual-import").send({
      resumeText: "short",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("resume_too_short");
  });

  it("rejects manual import for unknown job", async () => {
    const res = await api.post("/api/v1/jobs/nonexistent-job/manual-import").send({
      resumeText: SAMPLE_RESUME_STRONG,
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("job_not_found");
  });

  it("returns 400 when job has no brief and fallback still ranks import", async () => {
    const created = await api.post("/api/v1/jobs").send({ title: "Blank Role", company: "Co" });
    const jobId = created.body.job.id as string;
    const res = await api.post(`/api/v1/jobs/${jobId}/manual-import`).send({
      resumeText: SAMPLE_RESUME_STRONG,
      candidateName: "Fallback Rank",
    });
    expect(res.status).toBe(201);
    expect(res.body.candidate.matchScore).toBeGreaterThan(0);
    expect(res.body.candidate.gaps.length).toBeGreaterThan(0);
  });

  it("strong import outscores weak on same job", async () => {
    const strong = await api.post("/api/v1/jobs/seed-job-1/manual-import").send({
      resumeText: SAMPLE_RESUME_STRONG,
      candidateName: "API Strong",
    });
    const weak = await api.post("/api/v1/jobs/seed-job-1/manual-import").send({
      resumeText: SAMPLE_RESUME_WEAK.repeat(3),
      candidateName: "API Weak",
    });
    expect(strong.body.candidate.matchScore).toBeGreaterThan(weak.body.candidate.matchScore);
  });

  it("import returns gap items with matched flags", async () => {
    const res = await api.post("/api/v1/jobs/seed-job-1/manual-import").send({
      resumeText: RESUME_PERFECT_MATCH,
      candidateName: "Gap Check",
    });
    expect(res.status).toBe(201);
    const gaps = res.body.candidate.gaps as Array<{ severity: string; matched: boolean }>;
    expect(gaps.some((g) => g.severity === "must_have" && g.matched)).toBe(true);
  });

  it("seed candidate Priya remains top-tier vs JD on detail endpoint", async () => {
    const res = await api.get("/api/v1/candidates/cand-priya");
    expect(res.body.candidate.matchScore).toBeGreaterThanOrEqual(85);
    const react = res.body.candidate.gaps.find((g: { label: string }) => g.label === "React");
    expect(react?.matched).toBe(true);
  });

  it("ranked list for seed-job-1 is sorted by matchScore descending", async () => {
    const res = await api.get("/api/v1/jobs/seed-job-1/candidates");
    const scores = res.body.candidates.map((c: { matchScore: number }) => c.matchScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });
});
