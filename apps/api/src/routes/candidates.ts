import { Router } from "express";
import type { PipelineStage } from "@sourceiq/shared";
import { prisma } from "../lib/prisma.js";
import { candidates as memCandidates, jobs as memJobs } from "../store.js";
import { prismaCandidateToApi } from "../services/candidateMapper.js";
import { jobToApi } from "./jobHelpers.js";

export const candidatesRouter = Router();

async function loadCandidate(id: string) {
  try {
    const row = await prisma.candidate.findUnique({
      where: { id },
      include: { sources: true, job: true },
    });
    if (!row) return null;
    return {
      candidate: prismaCandidateToApi(row),
      job: jobToApi(row.job),
    };
  } catch {
    const c = memCandidates.get(id);
    if (!c) return null;
    const job = memJobs.get(c.jobId);
    if (!job) return null;
    return { candidate: c, job };
  }
}

candidatesRouter.get("/:id", async (req, res) => {
  const data = await loadCandidate(req.params.id);
  if (!data) return res.status(404).json({ error: "candidate_not_found" });
  res.json(data);
});

candidatesRouter.patch("/:id", async (req, res) => {
  const stage = req.body?.stage as PipelineStage | undefined;
  const contactStatus = req.body?.contactStatus as string | undefined;
  const notes = req.body?.notes !== undefined ? String(req.body.notes) : undefined;

  try {
    const row = await prisma.candidate.update({
      where: { id: req.params.id },
      data: {
        ...(stage ? { stage } : {}),
        ...(contactStatus ? { contactStatus } : {}),
      },
      include: { sources: true },
    });
    const candidate = prismaCandidateToApi(row);
    memCandidates.set(candidate.id, candidate);
    return res.json({ candidate });
  } catch {
    const c = memCandidates.get(req.params.id);
    if (!c) return res.status(404).json({ error: "candidate_not_found" });
    const next = {
      ...c,
      ...(stage ? { stage } : {}),
      ...(contactStatus ? { contactStatus: contactStatus as typeof c.contactStatus } : {}),
      ...(notes !== undefined ? { notes } : {}),
    };
    memCandidates.set(c.id, next);
    return res.json({ candidate: next });
  }
});

candidatesRouter.patch("/:id/stage", async (req, res) => {
  const stage = String(req.body?.stage ?? "") as PipelineStage;
  if (!stage) return res.status(400).json({ error: "stage_required" });

  try {
    const row = await prisma.candidate.update({
      where: { id: req.params.id },
      data: { stage },
      include: { sources: true },
    });
    const candidate = prismaCandidateToApi(row);
    memCandidates.set(candidate.id, candidate);
    return res.json({ candidate });
  } catch {
    const c = memCandidates.get(req.params.id);
    if (!c) return res.status(404).json({ error: "candidate_not_found" });
    const next = { ...c, stage };
    memCandidates.set(c.id, next);
    return res.json({ candidate: next });
  }
});
