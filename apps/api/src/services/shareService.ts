import { randomBytes } from "crypto";
import type { ShareViewPayload } from "@sourceiq/shared";
import { prisma } from "../lib/prisma.js";

export async function createShareLink(jobId: string, filters?: Record<string, unknown>) {
  const token = randomBytes(24).toString("hex");
  const link = await prisma.shareLink.create({
    data: {
      token,
      jobId,
      filters: (filters ?? {}) as object,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    },
  });
  return { token: link.token, url: `/share/${link.token}` };
}

export async function getShareView(token: string): Promise<ShareViewPayload | null> {
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: { job: { include: { candidates: { orderBy: { matchScore: "desc" }, take: 50 } } } },
  });
  if (!link) return null;
  if (link.expiresAt && link.expiresAt < new Date()) return null;

  const minScore = (link.filters as { minScore?: number })?.minScore ?? 70;
  const list = link.job.candidates.filter((c) => c.matchScore >= minScore);

  return {
    jobTitle: link.job.title,
    company: link.job.company,
    candidates: list.map((c) => ({
      id: c.id,
      name: c.name,
      headline: c.headline,
      matchScore: Math.round(c.matchScore),
      aiSummary: c.aiSummary ?? undefined,
    })),
  };
}
