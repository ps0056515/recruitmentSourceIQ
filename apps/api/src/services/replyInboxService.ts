import type { InboxItem, ReplyIntent } from "@sourceiq/shared";
import { prisma } from "../lib/prisma.js";
import { claudeText } from "../lib/llm.js";

export async function listInbox(jobId?: string): Promise<InboxItem[]> {
  const rows = await prisma.inboxReply.findMany({
    where: jobId ? { jobId } : {},
    include: { candidate: true },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    jobId: r.jobId,
    candidateId: r.candidateId,
    candidateName: r.candidate.name,
    channel: r.channel,
    body: r.body,
    intentLabel: r.intentLabel as ReplyIntent | undefined,
    receivedAt: r.receivedAt.toISOString(),
    draftReply: r.draftReply ?? undefined,
  }));
}

export async function labelIntent(body: string): Promise<ReplyIntent> {
  const t = await claudeText(
    'Classify recruiter reply intent as exactly one: interested, not_interested, more_info, ambiguous. Reply with one word only.',
    body,
  );
  const v = t?.toLowerCase().trim();
  if (v?.includes("not")) return "not_interested";
  if (v?.includes("more")) return "more_info";
  if (v?.includes("interest")) return "interested";
  return "ambiguous";
}

export async function ingestReply(input: {
  jobId: string;
  candidateId: string;
  channel: string;
  body: string;
}) {
  const intentLabel = await labelIntent(input.body);
  const draftReply = await claudeText(
    "Draft a short professional recruiter reply.",
    `Candidate said: ${input.body}\nIntent: ${intentLabel}`,
  );
  return prisma.inboxReply.create({
    data: {
      ...input,
      intentLabel,
      draftReply: draftReply ?? undefined,
    },
  });
}
