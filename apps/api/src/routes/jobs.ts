import { randomUUID } from "crypto";
import { Router } from "express";
import type { ParsedJD, ProfileSource, SearchConfig } from "@sourceiq/shared";
import { PRD_SOURCES } from "@sourceiq/shared";
import { jobs, candidates } from "../store.js";
import { prisma } from "../lib/prisma.js";
import { startSearch } from "../services/searchOrchestrator.js";
import { isDemoMode } from "../lib/config.js";
import { DEFAULT_WORKSPACE } from "../lib/config.js";
import { importManualResume, importManualResumesBatch } from "../services/manualImportService.js";
import { extractTextFromUpload } from "../services/resumeFileExtract.js";
import { jobToApi } from "./jobHelpers.js";
import { normalizeParsedJd } from "../services/normalizeParsedJd.js";
import { prismaCandidateToApi } from "../services/candidateMapper.js";
import { dedupeCandidatesByName } from "../services/candidateList.js";

export const jobsRouter = Router();

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
  const parsedJd = req.body?.parsedJd
    ? normalizeParsedJd(req.body.parsedJd as Record<string, unknown>)
    : undefined;
  try {
    const row = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        ...(parsedJd ? { parsedJd } : {}),
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
      ...(parsedJd ? { parsedJd } : {}),
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
  } catch (e) {
    console.error("[search]", e);
    if (isDemoMode()) {
      const job = jobs.get(req.params.id);
      if (!job) return res.status(404).json({ error: "job_not_found" });
      const { runMockSearch } = await import("../services/mockSearch.js");
      res.status(202).json({ started: true, jobId: job.id });
      void runMockSearch(job, sources).catch(console.error);
      return;
    }
    return res.status(503).json({ error: "search_unavailable", message: "Database required for discovery." });
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

jobsRouter.post("/:id/manual-import/batch", async (req, res) => {
  const sourceSite = req.body?.sourceSite as ProfileSource | undefined;
  const raw = Array.isArray(req.body?.resumes) ? req.body.resumes : [];
  const resumes = raw
    .map((r: { resumeText?: unknown; candidateName?: unknown }) => ({
      resumeText: String(r?.resumeText ?? ""),
      candidateName: r?.candidateName ? String(r.candidateName) : undefined,
    }))
    .filter((r: { resumeText: string }) => r.resumeText.trim().length > 0);

  if (!resumes.length) {
    return res.status(400).json({
      error: "resumes_required",
      message: "Send at least one resume. Separate multiple pastes with a line of ---.",
    });
  }
  if (resumes.length > 20) {
    return res.status(400).json({ error: "too_many_resumes", message: "Compare up to 20 resumes at a time." });
  }

  try {
    const result = await importManualResumesBatch(req.params.id, resumes, { sourceSite });
    return res.status(201).json(result);
  } catch (e) {
    console.error("[manual-import/batch]", e);
    return res.status(500).json({ error: "import_failed", message: String(e) });
  }
});

jobsRouter.post("/:id/manual-import/files", async (req, res) => {
  const sourceSite = req.body?.sourceSite as ProfileSource | undefined;
  const raw = Array.isArray(req.body?.files) ? req.body.files : [];
  if (!raw.length) {
    return res.status(400).json({
      error: "files_required",
      message: "Upload at least one PDF, DOCX, or TXT resume.",
    });
  }
  if (raw.length > 20) {
    return res.status(400).json({ error: "too_many_files", message: "Upload up to 20 resumes at a time." });
  }

  const resumes: Array<{ resumeText: string; candidateName?: string }> = [];
  const errors: Array<{ index: number; fileName?: string; error: string; message: string }> = [];

  for (const [index, f] of raw.entries()) {
    const fileName = String(f?.fileName ?? f?.name ?? `file-${index + 1}`);
    try {
      const extracted = await extractTextFromUpload({
        fileName,
        mimeType: f?.mimeType ? String(f.mimeType) : undefined,
        contentBase64: String(f?.contentBase64 ?? ""),
      });
      resumes.push({
        resumeText: extracted.resumeText,
        candidateName: extracted.candidateName,
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : "extract_failed";
      const message =
        error === "unsupported_type"
          ? `${fileName}: use PDF, DOCX, or TXT.`
          : error === "doc_unsupported"
            ? `${fileName}: legacy .doc is not supported — save as .docx or PDF.`
            : error === "file_too_large"
              ? `${fileName}: max 8 MB per file.`
              : error === "resume_too_short" || error === "empty_file"
                ? `${fileName}: could not extract enough text (try a text-based PDF).`
                : `${fileName}: ${String(e)}`;
      errors.push({ index, fileName, error, message });
    }
  }

  if (!resumes.length) {
    return res.status(400).json({
      error: "extract_failed",
      message: errors[0]?.message ?? "Could not read any resume files.",
      errors,
    });
  }

  try {
    const result = await importManualResumesBatch(req.params.id, resumes, { sourceSite });
    return res.status(201).json({ ...result, errors: [...(result.errors ?? []), ...errors] });
  } catch (e) {
    console.error("[manual-import/files]", e);
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
