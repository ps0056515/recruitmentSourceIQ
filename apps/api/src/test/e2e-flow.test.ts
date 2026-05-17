import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { candidates, jobs } from "../store.js";
import { SAMPLE_JD_TEXT, SAMPLE_RESUME_STRONG, SAMPLE_RESUME_WEAK } from "./fixtures.js";
import { authHeader, poll, seedDemoStore } from "./helpers.js";

const app = createApp();
const api = request(app);

describe("sourceIQ API end-to-end flow (in-memory)", () => {
  beforeEach(() => {
    seedDemoStore();
  });

  describe("health & auth", () => {
    it("GET /health returns ok", async () => {
      const res = await api.get("/health");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it("login → me round-trip", async () => {
      const login = await api
        .post("/api/v1/auth/login")
        .send({ email: "qa@sourceiq.local", role: "recruiter" });
      expect(login.status).toBe(200);
      expect(login.body.token).toBeTruthy();
      expect(login.body.user.email).toBe("qa@sourceiq.local");

      const me = await api.get("/api/v1/auth/me").set(authHeader(login.body.token));
      expect(me.status).toBe(200);
      expect(me.body.email).toBe("qa@sourceiq.local");
    });
  });

  describe("jobs & demo data", () => {
    it("lists demo jobs with correct titles and brief", async () => {
      const res = await api.get("/api/v1/jobs");
      expect(res.status).toBe(200);
      const ids = res.body.jobs.map((j: { id: string }) => j.id);
      expect(ids).toContain("seed-job-1");
      const job = res.body.jobs.find((j: { id: string }) => j.id === "seed-job-1");
      expect(job.title).toBe("Senior Full Stack Engineer");
      expect(job.company).toBe("Acme Corp");
      expect(job.parsedJd?.mustHaves).toContain("TypeScript");
    });

    it("GET job by id matches store", async () => {
      const res = await api.get("/api/v1/jobs/seed-job-1");
      expect(res.status).toBe(200);
      expect(res.body.job.id).toBe("seed-job-1");
      expect(jobs.get("seed-job-1")?.title).toBe(res.body.job.title);
    });

    it("lists eight deduped candidates for seed-job-1", async () => {
      const res = await api.get("/api/v1/jobs/seed-job-1/candidates");
      expect(res.status).toBe(200);
      expect(res.body.candidates).toHaveLength(8);
      const names = res.body.candidates.map((c: { name: string }) => c.name);
      expect(names).toContain("Priya Sharma");
      expect(names).toContain("Sarah Chen");
      expect(new Set(names).size).toBe(8);
    });

    it("candidate detail returns gaps and score for Priya", async () => {
      const res = await api.get("/api/v1/candidates/cand-priya");
      expect(res.status).toBe(200);
      expect(res.body.candidate.name).toBe("Priya Sharma");
      expect(res.body.candidate.matchScore).toBe(91);
      expect(res.body.job.id).toBe("seed-job-1");
      const tsGap = res.body.candidate.gaps.find((g: { label: string }) => g.label === "TypeScript");
      expect(tsGap?.matched).toBe(true);
    });
  });

  describe("job brief (JD parse + patch)", () => {
    it("parses JD text into structured brief", async () => {
      const res = await api.post("/api/v1/jd/parse").send({ text: SAMPLE_JD_TEXT });
      expect(res.status).toBe(200);
      expect(res.body.parsed.title).toMatch(/Full Stack/i);
      expect(res.body.parsed.mustHaves?.length).toBeGreaterThan(0);
    });

    it("creates job, saves brief, and requires brief for meaningful import", async () => {
      const created = await api.post("/api/v1/jobs").send({ title: "QA Engineer", company: "Test Co" });
      expect(created.status).toBe(201);
      const jobId = created.body.job.id as string;

      const parsed = await api.post("/api/v1/jd/parse").send({ text: SAMPLE_JD_TEXT });
      const patched = await api
        .patch(`/api/v1/jobs/${jobId}`)
        .send({ parsedJd: parsed.body.parsed });
      expect(patched.status).toBe(200);
      const brief = patched.body.job.parsedJd;
      const skills = [...(brief?.mustHaves ?? []), ...(brief?.skills ?? [])].join(" ");
      expect(skills.toLowerCase()).toContain("typescript");
    });
  });

  describe("manual resume import", () => {
    it("rejects short resume", async () => {
      const res = await api
        .post("/api/v1/jobs/seed-job-1/manual-import")
        .send({ resumeText: "too short" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("resume_too_short");
    });

    it("imports strong resume with JD-aligned score and manual_paste source", async () => {
      const before = (await api.get("/api/v1/jobs/seed-job-1/candidates")).body.candidates.length;

      const res = await api.post("/api/v1/jobs/seed-job-1/manual-import").send({
        resumeText: SAMPLE_RESUME_STRONG,
        candidateName: "Alex Rivera",
        sourceSite: "linkedin",
      });
      expect(res.status).toBe(201);
      expect(res.body.candidate.name).toBe("Alex Rivera");
      expect(res.body.candidate.source).toBe("manual_paste");
      expect(res.body.candidate.matchScore).toBeGreaterThanOrEqual(50);
      expect(res.body.parsedProfile.skills).toEqual(expect.arrayContaining(["TypeScript"]));

      const after = await api.get("/api/v1/jobs/seed-job-1/candidates");
      expect(after.body.candidates.length).toBeGreaterThanOrEqual(before);
      const alex = after.body.candidates.find((c: { name: string }) => c.name === "Alex Rivera");
      expect(alex).toBeTruthy();
      expect(alex.matchScore).toBe(res.body.candidate.matchScore);
    });

    it("scores weak resume lower than strong resume", async () => {
      const strong = await api.post("/api/v1/jobs/seed-job-1/manual-import").send({
        resumeText: SAMPLE_RESUME_STRONG,
        candidateName: "Score Strong",
      });
      const weak = await api.post("/api/v1/jobs/seed-job-1/manual-import").send({
        resumeText: SAMPLE_RESUME_WEAK.repeat(3),
        candidateName: "Score Weak",
      });
      expect(strong.body.candidate.matchScore).toBeGreaterThan(weak.body.candidate.matchScore);
    });
  });

  describe("automated discovery (mock search)", () => {
    it("starts search and adds candidates over time", async () => {
      const jobId = "seed-job-2";
      const parsed = await api.post("/api/v1/jd/parse").send({ text: SAMPLE_JD_TEXT });
      await api.patch(`/api/v1/jobs/${jobId}`).send({ parsedJd: parsed.body.parsed });

      const start = await api
        .post(`/api/v1/jobs/${jobId}/search`)
        .send({ sources: ["linkedin", "github"], maxResults: 10 });
      expect(start.status).toBe(202);
      expect(start.body.started).toBe(true);

      const list = await poll(
        () => api.get(`/api/v1/jobs/${jobId}/candidates`),
        (res) => res.status === 200 && res.body.candidates.length > 0,
        { timeoutMs: 10_000 },
      );
      expect(list.body.candidates.length).toBeGreaterThan(0);
      const first = list.body.candidates[0];
      expect(first.matchScore).toBeGreaterThan(0);
      expect(first.name).not.toMatch(/^Candidate \d/i);
    });
  });

  describe("pipeline, outreach, inbox, analytics, share", () => {
    it("updates candidate stage", async () => {
      const res = await api
        .patch("/api/v1/candidates/cand-ananya/stage")
        .send({ stage: "contacted" });
      expect(res.status).toBe(200);
      expect(res.body.candidate.stage).toBe("contacted");
      expect(candidates.get("cand-ananya")?.stage).toBe("contacted");
    });

    it("drafts and sends outreach for demo candidate", async () => {
      const draft = await api
        .post("/api/v1/outreach/draft")
        .send({ candidateId: "cand-priya", tone: "concise" });
      expect(draft.status).toBe(200);
      expect(draft.body.subject).toBeTruthy();
      expect(draft.body.body).toMatch(/Priya|Hi/i);

      const sent = await api.post("/api/v1/outreach/send").send({
        candidateId: "cand-priya",
        subject: draft.body.subject,
        body: draft.body.body,
      });
      expect(sent.status).toBe(200);
    });

    it("returns inbox messages for workspace", async () => {
      const res = await api.get("/api/v1/inbox");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThan(0);
    });

    it("returns analytics overview and job analytics", async () => {
      const overview = await api.get("/api/v1/analytics/overview?workspaceId=default-workspace");
      expect(overview.status).toBe(200);
      expect(overview.body.totalMatched).toBeGreaterThan(0);

      const job = await api.get("/api/v1/analytics/jobs/seed-job-1");
      expect(job.status).toBe(200);
      expect(job.body.totalMatched).toBe(8);
    });

    it("share link returns HM shortlist with scored candidates", async () => {
      const created = await api.post("/api/v1/share/jobs/seed-job-1").send({});
      expect(created.status).toBe(201);
      const token = created.body.token ?? "demo-hm-shortlist";

      const view = await api.get(`/api/v1/share/${token}`);
      expect(view.status).toBe(200);
      expect(view.body.jobTitle).toMatch(/Full Stack/i);
      expect(view.body.candidates.length).toBeGreaterThan(0);
      for (const c of view.body.candidates) {
        expect(c.matchScore).toBeGreaterThanOrEqual(80);
      }
    });
  });
});
