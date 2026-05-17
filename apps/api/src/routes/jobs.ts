import { randomUUID } from "crypto";
import { Router } from "express";
import type { ParsedJD, ProfileSource, SearchConfig } from "@sourceiq/shared";
import { PRD_SOURCES } from "@sourceiq/shared";
import { jobs, candidates } from "../store.js";
import { prisma } from "../lib/prisma.js";
import { startSearch } from "../services/searchOrchestrator.js";
import { runMockSearch } from "../services/mockSearch.js";
import { importManualResume } from "../services/manualImportService.js";
import { jobToApi } from "./jobHelpers.js";
import { prismaCandidateToApi } from "../services/candidateMapper.js";
import { dedupeCandidatesByName } from "../services/candidateList.js";

export const jobsRouter = Router();

const DEFAULT_WORKSPACE = "default-workspace";

async function ensureWorkspace() {
  await prisma.workspace.upsert({
    where: { id: DEFAULT_WORKSPACE },
    create: { id: DEFAULT_WORKSPACE, name: "Demo Agency" },
    update: {},
  });
}

jobsRouter.get("/", async (_req, res) => {
  try {
    await ensureWorkspace();
    const rows = await prisma.job.findMany({
      where: { workspaceId: DEFAULT_WORKSPACE },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { candidates: true } } },
    });
    return res.json({ jobs: rows.map(jobToApi) });
  } catch {
    return res.json({ jobs: Array.from(jobs.values()) });
  }
});

jobsRouter.post("/", async (req, res) => {
  const title = String(req.body?.title ?? "Untitled role");
  const company = String(req.body?.company ?? "sourceIQ Demo Co.");
  const now = new Date().toISOString();

  try {
    await ensureWorkspace();
    const row = await prisma.job.create({
      data: {
        workspaceId: DEFAULT_WORKSPACE,
        title,
        company,
        location: req.body?.location ? String(req.body.location) : null,
        status: "DRAFT",
      },
    });
    const job = jobToApi(row);
    jobs.set(job.id, job);
    return res.status(201).json({ job });
  } catch {
    const job = {
      id: randomUUID(),
      title,
      company,
      createdAt: now,
      updatedAt: now,
    };
    jobs.set(job.id, job);
    return res.status(201).json({ job });
  }
});

jobsRouter.patch("/:id", async (req, res) => {
  try {
    const row = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        ...(req.body?.parsedJd ? { parsedJd: req.body.parsedJd } : {}),
        ...(req.body?.title ? { title: String(req.body.title) } : {}),
        ...(req.body?.company ? { company: String(req.body.company) } : {}),
        ...(req.body?.searchConfig ? { searchConfig: req.body.searchConfig } : {}),
      },
    });
    const job = jobToApi(row);
    jobs.set(job.id, job);
    return res.json({ job });
  } catch {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: "job_not_found" });
    const next = {
      ...job,
      ...(req.body?.parsedJd ? { parsedJd: req.body.parsedJd as ParsedJD } : {}),
      updatedAt: new Date().toISOString(),
    };
    jobs.set(job.id, next);
    return res.json({ job: next });
  }
});

jobsRouter.get("/:id", async (req, res) => {
  try {
    const row = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { candidates: true } } },
    });
    if (!row) return res.status(404).json({ error: "job_not_found" });
    const job = jobToApi(row);
    jobs.set(job.id, job);
    return res.json({ job });
  } catch {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: "job_not_found" });
    return res.json({ job });
  }
});

jobsRouter.post("/:id/search", async (req, res) => {
  const sources = (req.body?.sources as ProfileSource[] | undefined) ?? [...PRD_SOURCES];
  const keywords = (req.body?.keywords as string[] | undefined) ?? [];

  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: "job_not_found" });

    const config: SearchConfig = {
      jobId: job.id,
      sources,
      maxResults: req.body?.maxResults ?? 40,
      keywords,
      scoreWeights: req.body?.scoreWeights,
    };

    await prisma.job.update({
      where: { id: job.id },
      data: { searchConfig: config as object, status: "SEARCHING" },
    });

    res.status(202).json({ started: true, jobId: job.id });
    void startSearch(job.id, sources, config).catch((e) => console.error("[search]", e));
    return;
  } catch {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: "job_not_found" });
    res.status(202).json({ started: true, jobId: job.id });
    void runMockSearch(job, sources).catch(console.error);
    return;
  }
});

jobsRouter.post("/:id/manual-import", async (req, res) => {
  const resumeText = String(req.body?.resumeText ?? "");
  const candidateName = req.body?.candidateName ? String(req.body.candidateName) : undefined;
  const sourceSite = req.body?.sourceSite as ProfileSource | undefined;

  try {
    const result = await importManualResume(req.params.id, resumeText, { candidateName, sourceSite });
    return res.status(201).json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "import_failed";
    if (msg === "job_not_found") return res.status(404).json({ error: msg });
    if (msg === "resume_too_short") {
      return res.status(400).json({ error: msg, message: "Paste at least a few lines of resume text." });
    }
    if (msg === "jd_required") {
      return res.status(400).json({ error: msg, message: "Save a job brief first so we can compare the resume." });
    }
    console.error("[manual-import]", e);
    return res.status(500).json({ error: "import_failed", message: String(e) });
  }
});

jobsRouter.get("/:id/candidates", async (req, res) => {
  try {
    const rows = await prisma.candidate.findMany({
      where: { jobId: req.params.id },
      include: { sources: true },
      orderBy: { matchScore: "desc" },
    });
    const list = dedupeCandidatesByName(rows.map((c) => prismaCandidateToApi(c)));
    return res.json({ candidates: list });
  } catch {
    const list = dedupeCandidatesByName(
      Array.from(candidates.values()).filter((c) => c.jobId === req.params.id),
    );
    return res.json({ candidates: list });
  }
});
