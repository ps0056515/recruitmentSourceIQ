import { prisma } from "../lib/prisma.js";
import { pushGreenhouseCandidate } from "./greenhouse.js";
import { pushLeverCandidate } from "./lever.js";

export type AtsProvider = "greenhouse" | "lever" | "workday" | "taleo";

function envAtsKey(provider: AtsProvider): string | undefined {
  if (provider === "greenhouse") return process.env.GREENHOUSE_API_KEY;
  if (provider === "lever") return process.env.LEVER_API_KEY;
  return undefined;
}

export async function pushToAts(
  workspaceId: string,
  provider: AtsProvider,
  candidate: { name: string; email?: string; headline: string; matchScore: number },
) {
  const conn = await prisma.atsConnection.findFirst({
    where: { workspaceId, provider },
  });
  const apiKey = conn?.apiKeyEnc ?? envAtsKey(provider);
  if (!apiKey) {
    return { ok: false, error: "ats_not_configured" };
  }

  const config = (conn?.config ?? {}) as { jobId?: string; postingId?: string };

  try {
    if (provider === "greenhouse") {
      const { atsId } = await pushGreenhouseCandidate(apiKey, candidate, config.jobId);
      return { ok: true, atsId };
    }
    if (provider === "lever") {
      const { atsId } = await pushLeverCandidate(apiKey, candidate, config.postingId);
      return { ok: true, atsId };
    }
    return { ok: false, error: "ats_provider_not_implemented", provider };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
