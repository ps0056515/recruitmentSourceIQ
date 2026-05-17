import { Router } from "express";
import { pushToAts, type AtsProvider } from "../ats/index.js";
import { prisma } from "../lib/prisma.js";

export const atsRouter = Router();

atsRouter.post("/candidates/:id/export", async (req, res) => {
  const provider = String(req.body?.provider ?? "greenhouse") as AtsProvider;
  const candidate = await prisma.candidate.findUnique({ where: { id: req.params.id } });
  if (!candidate) return res.status(404).json({ error: "not_found" });

  const job = await prisma.job.findUnique({ where: { id: candidate.jobId } });
  const result = await pushToAts(job?.workspaceId ?? "default-workspace", provider, {
    name: candidate.name,
    email: candidate.email ?? undefined,
    headline: candidate.headline,
    matchScore: candidate.matchScore,
  });
  res.json(result);
});

atsRouter.post("/connections", async (req, res) => {
  const { workspaceId, provider, apiKey } = req.body ?? {};
  if (!workspaceId || !provider) return res.status(400).json({ error: "missing_fields" });
  const existing = await prisma.atsConnection.findFirst({
    where: { workspaceId: String(workspaceId), provider: String(provider) },
  });
  const conn = existing
    ? await prisma.atsConnection.update({
        where: { id: existing.id },
        data: { apiKeyEnc: String(apiKey ?? "") },
      })
    : await prisma.atsConnection.create({
        data: {
          workspaceId: String(workspaceId),
          provider: String(provider),
          apiKeyEnc: String(apiKey ?? ""),
        },
      });
  res.json({ connection: conn });
});
