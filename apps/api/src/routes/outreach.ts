import { randomUUID } from "crypto";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { candidates as memCandidates } from "../store.js";
import { prismaCandidateToApi } from "../services/candidateMapper.js";
import { PROMPTS, outreachDraftUserMessage } from "../config/prompts.js";
import { claudeText } from "../lib/llm.js";
import { sendEmail, isEmailConfigured } from "../services/emailService.js";
import { trackEvent } from "../services/analyticsService.js";
import { DEFAULT_WORKSPACE } from "../lib/config.js";
import { isDemoMode } from "../lib/config.js";

export const outreachRouter = Router();

async function getCandidate(id: string) {
  try {
    const row = await prisma.candidate.findUnique({ where: { id }, include: { sources: true } });
    if (row) return prismaCandidateToApi(row);
  } catch {
    /* memory store */
  }
  return memCandidates.get(id);
}

outreachRouter.post("/draft", async (req, res) => {
  const candidateId = String(req.body?.candidateId ?? "");
  const tone = String(req.body?.tone ?? "concise");
  const c = candidateId ? await getCandidate(candidateId) : undefined;
  const name = c?.name ?? "there";
  const roleHint = c?.headline ?? "this opportunity";
  const recruiterName = req.user?.email?.split("@")[0] ?? "Recruiting team";

  const claudeDraft = c
    ? await claudeText(
        PROMPTS.outreachDraft.system,
        outreachDraftUserMessage(c.name, c.headline, c.matchScore, tone, c.strengths),
      )
    : null;

  let subject = `Quick note — ${roleHint.split("·")[0]?.trim() ?? "your background"}`;
  let body = [
    `Hi ${name.split(" ")[0] ?? name},`,
    "",
    `I'm reaching out about a role that lines up with your background in ${roleHint.split("·")[0]?.trim() ?? "engineering"}.`,
    `Our team flagged strong overlap on delivery and communication — would you be open to a 20-minute intro this week?`,
    "",
    `Best,`,
    recruiterName,
  ].join("\n");

  if (claudeDraft) {
    try {
      const parsed = JSON.parse(claudeDraft.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "")) as {
        subject?: string;
        body?: string;
      };
      if (parsed.subject) subject = parsed.subject;
      if (parsed.body) body = parsed.body;
    } catch {
      body = claudeDraft;
    }
  }

  res.json({ draftId: randomUUID(), subject, body, candidateId: c?.id });
});

outreachRouter.post("/send", async (req, res) => {
  const candidateId = String(req.body?.candidateId ?? "");
  const subject = String(req.body?.subject ?? "");
  const body = String(req.body?.body ?? "");
  const channel = String(req.body?.channel ?? "email");
  const c = candidateId ? await getCandidate(candidateId) : undefined;
  if (!c) return res.status(404).json({ error: "candidate_not_found" });

  let providerMessageId: string | undefined;
  let deliveryStatus: "sent" | "queued" = "sent";

  if (channel === "email" && c.email) {
    if (isEmailConfigured()) {
      try {
        const sent = await sendEmail({ to: c.email, subject, body });
        providerMessageId = sent.messageId;
      } catch (e) {
        console.error("[outreach/send]", e);
        return res.status(502).json({ error: "email_delivery_failed" });
      }
    } else if (!isDemoMode()) {
      return res.status(503).json({
        error: "email_not_configured",
        message: "Set SMTP_HOST, SMTP_USER, SMTP_PASS to send real email.",
      });
    } else {
      deliveryStatus = "queued";
    }
  } else if (channel === "email" && !c.email) {
    return res.status(400).json({ error: "candidate_email_missing" });
  }

  try {
    const row = await prisma.outreachMessage.create({
      data: {
        jobId: c.jobId,
        candidateId: c.id,
        channel,
        subject,
        body,
        status: deliveryStatus,
        sentAt: new Date(),
        providerMessageId,
      },
    });

    const updated = await prisma.candidate.update({
      where: { id: c.id },
      data: { contactStatus: "sent", stage: c.stage === "new" ? "contacted" : c.stage },
      include: { sources: true },
    });
    const next = prismaCandidateToApi(updated);
    memCandidates.set(next.id, next);
    await trackEvent(DEFAULT_WORKSPACE, "outreach_sent", { candidateId: c.id, channel }, c.jobId).catch(() => {});

    return res.json({
      ok: true,
      candidate: next,
      messageId: row.id,
      providerMessageId,
      delivered: deliveryStatus === "sent" && Boolean(providerMessageId || isDemoMode()),
    });
  } catch {
    const next = {
      ...c,
      contactStatus: "sent" as const,
      stage: (c.stage === "new" ? "contacted" : c.stage) as typeof c.stage,
      lastOutreachAt: new Date().toISOString(),
    };
    memCandidates.set(c.id, next);
    return res.json({
      ok: true,
      candidate: next,
      messageId: randomUUID(),
      delivered: isDemoMode(),
    });
  }
});

outreachRouter.post("/bulk", async (req, res) => {
  const ids = (req.body?.candidateIds as string[] | undefined) ?? [];
  const results = [];
  for (const id of ids) {
    const c = await getCandidate(id);
    if (!c) {
      results.push({ id, ok: false });
      continue;
    }
    try {
      await prisma.outreachMessage.create({
        data: {
          jobId: c.jobId,
          candidateId: c.id,
          channel: "email",
          subject: `Introduction — ${c.headline.split("·")[0]?.trim()}`,
          body: `Hi ${c.name.split(" ")[0]}, we'd love to connect about an open role.`,
          status: "sent",
          sentAt: new Date(),
        },
      });
      const row = await prisma.candidate.update({
        where: { id: c.id },
        data: { contactStatus: "sent" },
        include: { sources: true },
      });
      memCandidates.set(c.id, prismaCandidateToApi(row));
      await trackEvent(DEFAULT_WORKSPACE, "outreach_sent", { candidateId: c.id, bulk: true }, c.jobId);
      results.push({ id, ok: true });
    } catch {
      results.push({ id, ok: false });
    }
  }
  res.json({ results });
});
