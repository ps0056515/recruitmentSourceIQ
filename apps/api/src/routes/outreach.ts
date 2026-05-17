import { randomUUID } from "crypto";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { candidates as memCandidates } from "../store.js";
import { prismaCandidateToApi } from "../services/candidateMapper.js";
import { claudeText } from "../lib/llm.js";

export const outreachRouter = Router();

async function getCandidate(id: string) {
  try {
    const row = await prisma.candidate.findUnique({ where: { id }, include: { sources: true } });
    if (row) return prismaCandidateToApi(row);
  } catch {
    /* fallback */
  }
  return memCandidates.get(id);
}

outreachRouter.post("/draft", async (req, res) => {
  const candidateId = String(req.body?.candidateId ?? "");
  const tone = String(req.body?.tone ?? "concise");
  const c = candidateId ? await getCandidate(candidateId) : undefined;
  const name = c?.name ?? "there";
  const roleHint = c?.headline ?? "this opportunity";

  const claudeDraft = c
    ? await claudeText(
        "Write a short recruiter outreach email. Return JSON: { subject, body }",
        `Candidate: ${c.name}, ${c.headline}. Role fit score: ${c.matchScore}. Tone: ${tone}. Strengths: ${c.strengths.join("; ")}`,
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
    `Demo Recruiter`,
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
  const c = candidateId ? await getCandidate(candidateId) : undefined;
  if (!c) return res.status(404).json({ error: "candidate_not_found" });

  try {
    await prisma.outreachMessage.create({
      data: {
        jobId: c.jobId,
        candidateId: c.id,
        channel: "email",
        subject,
        body,
        status: "sent",
        sentAt: new Date(),
      },
    });
    const row = await prisma.candidate.update({
      where: { id: c.id },
      data: { contactStatus: "sent", stage: c.stage === "new" ? "contacted" : c.stage },
      include: { sources: true },
    });
    const next = prismaCandidateToApi(row);
    memCandidates.set(next.id, next);
    return res.json({ ok: true, candidate: next, messageId: randomUUID() });
  } catch {
    const next = {
      ...c,
      contactStatus: "sent" as const,
      stage: (c.stage === "new" ? "contacted" : c.stage) as typeof c.stage,
      lastOutreachAt: new Date().toISOString(),
    };
    memCandidates.set(c.id, next);
    return res.json({ ok: true, candidate: next, messageId: randomUUID() });
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
      const next = prismaCandidateToApi(row);
      memCandidates.set(next.id, next);
      results.push({ id, ok: true });
    } catch {
      const next = { ...c, contactStatus: "sent" as const, lastOutreachAt: new Date().toISOString() };
      memCandidates.set(c.id, next);
      results.push({ id, ok: true });
    }
  }
  res.json({ results });
});
