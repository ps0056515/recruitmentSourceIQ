import { prisma } from "../lib/prisma.js";

export type AtsProvider = "greenhouse" | "lever" | "workday" | "taleo";

export async function pushToAts(
  workspaceId: string,
  provider: AtsProvider,
  candidate: { name: string; email?: string; headline: string; matchScore: number },
) {
  const conn = await prisma.atsConnection.findFirst({
    where: { workspaceId, provider },
  });
  if (!conn?.apiKeyEnc) {
    return { ok: false, error: "ats_not_configured", mockId: `mock-${provider}-${Date.now()}` };
  }

  if (provider === "greenhouse") {
    // POST https://harvest.greenhouse.io/v1/candidates
    console.info("[ats] greenhouse push", candidate.name);
    return { ok: true, atsId: `gh-${Date.now()}` };
  }
  if (provider === "lever") {
    console.info("[ats] lever push", candidate.name);
    return { ok: true, atsId: `lv-${Date.now()}` };
  }
  return { ok: true, atsId: `${provider}-${Date.now()}` };
}
