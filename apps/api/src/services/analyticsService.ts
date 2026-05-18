import { randomUUID } from "crypto";
import type { AnalyticsOverview } from "@sourceiq/shared";
import { prisma } from "../lib/prisma.js";
import { insertAnalyticsEvent } from "../lib/clickhouse.js";

export async function trackEvent(
  workspaceId: string,
  eventType: string,
  payload: Record<string, unknown>,
  jobId?: string,
) {
  const eventId = randomUUID();
  try {
    await prisma.analyticsEvent.create({
      data: { workspaceId, jobId, eventType, payload: payload as object },
    });
  } catch {
    /* memory-only tests */
  }
  await insertAnalyticsEvent({ eventId, workspaceId, jobId, eventType, payload });
}

export async function getJobAnalytics(jobId: string): Promise<AnalyticsOverview> {
  try {
    return await getJobAnalyticsFromDb(jobId);
  } catch {
    throw new Error("analytics_db_unavailable");
  }
}

async function getJobAnalyticsFromDb(jobId: string): Promise<AnalyticsOverview> {
  const candidates = await prisma.candidate.findMany({
    where: { jobId },
    include: { sources: true, outreach: true, inboxReplies: true },
  });
  const outreachSent = await prisma.outreachMessage.count({ where: { jobId, status: "sent" } });
  const replies = await prisma.inboxReply.count({ where: { jobId } });

  const runs = await prisma.searchRun.findMany({ where: { jobId } });
  const totalScanned = runs.reduce((s, r) => s + r.totalScanned, 0);
  const totalMatched = candidates.length;
  const avgMatchScore = totalMatched
    ? Math.round(candidates.reduce((s, c) => s + c.matchScore, 0) / totalMatched)
    : 0;

  const bySourceMap = new Map<string, { scanned: number; matched: number; outreach: number; replies: number }>();
  for (const run of runs) {
    const progress = run.sourceProgress as Record<string, { found?: number }> | null;
    if (progress) {
      for (const [source, p] of Object.entries(progress)) {
        const cur = bySourceMap.get(source) ?? { scanned: 0, matched: 0, outreach: 0, replies: 0 };
        cur.scanned += p.found ?? 0;
        bySourceMap.set(source, cur);
      }
    }
  }

  for (const c of candidates) {
    for (const src of c.sources ?? []) {
      const cur = bySourceMap.get(src.source) ?? { scanned: 0, matched: 0, outreach: 0, replies: 0 };
      cur.matched += 1;
      cur.outreach += c.outreach.filter((o) => o.status === "sent").length;
      cur.replies += c.inboxReplies.length;
      bySourceMap.set(src.source, cur);
    }
  }

  const funnelStages = ["new", "contacted", "responded", "interview", "offer", "hired", "rejected"];
  const funnel = funnelStages.map((stage) => ({
    stage,
    count: candidates.filter((c) => c.stage === stage).length,
  }));

  return {
    totalScanned,
    totalMatched,
    replyRate: outreachSent ? replies / outreachSent : 0,
    avgMatchScore,
    bySource: [...bySourceMap.entries()].map(([source, v]) => ({
      source,
      scanned: v.scanned || v.matched,
      matched: v.matched,
      replyRate: v.outreach ? v.replies / v.outreach : 0,
    })),
    funnel,
  };
}

export async function getOverviewAnalytics(workspaceId: string): Promise<AnalyticsOverview> {
  try {
    return await getOverviewAnalyticsFromDb(workspaceId);
  } catch {
    throw new Error("analytics_db_unavailable");
  }
}

async function getOverviewAnalyticsFromDb(workspaceId: string): Promise<AnalyticsOverview> {
  const jobs = await prisma.job.findMany({ where: { workspaceId } });
  let totalScanned = 0;
  let totalMatched = 0;
  let replyNum = 0;
  let replyDen = 0;
  let scoreSum = 0;
  const bySourceAcc = new Map<string, { scanned: number; matched: number; outreach: number; replies: number }>();

  for (const j of jobs) {
    const a = await getJobAnalytics(j.id);
    totalScanned += a.totalScanned;
    totalMatched += a.totalMatched;
    replyNum += a.replyRate * (a.totalMatched || 0);
    replyDen += a.totalMatched || 0;
    scoreSum += a.avgMatchScore * (a.totalMatched || 0);
    for (const row of a.bySource) {
      const cur = bySourceAcc.get(row.source) ?? { scanned: 0, matched: 0, outreach: 0, replies: 0 };
      cur.scanned += row.scanned;
      cur.matched += row.matched;
      bySourceAcc.set(row.source, cur);
    }
  }

  const allCandidates = await prisma.candidate.findMany({
    where: { job: { workspaceId } },
    include: { sources: true },
  });
  const funnelStages = ["new", "contacted", "interview", "offer", "hired"];
  const funnel = funnelStages.map((stage) => ({
    stage,
    count: allCandidates.filter((c) => c.stage === stage).length,
  }));

  return {
    totalScanned,
    totalMatched,
    replyRate: replyDen ? replyNum / replyDen : 0,
    avgMatchScore: totalMatched ? Math.round(scoreSum / totalMatched) : 0,
    bySource: [...bySourceAcc.entries()].map(([source, v]) => ({
      source,
      scanned: v.scanned,
      matched: v.matched,
      replyRate: 0,
    })),
    funnel,
  };
}
