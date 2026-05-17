import { Router } from "express";
import { DEMO_INBOX } from "../data/demoDataset.js";
import { ingestReply, listInbox } from "../services/replyInboxService.js";

export const inboxRouter = Router();

inboxRouter.get("/", async (req, res) => {
  const jobId = req.query.jobId ? String(req.query.jobId) : undefined;
  let items = await listInbox(jobId).catch(() => []);
  if (!items.length) {
    items = jobId ? DEMO_INBOX.filter((i) => i.jobId === jobId) : [...DEMO_INBOX];
  }
  res.json({ items });
});

inboxRouter.post("/", async (req, res) => {
  const { jobId, candidateId, channel, body } = req.body ?? {};
  if (!jobId || !candidateId || !body) {
    return res.status(400).json({ error: "missing_fields" });
  }
  const row = await ingestReply({
    jobId: String(jobId),
    candidateId: String(candidateId),
    channel: String(channel ?? "email"),
    body: String(body),
  });
  res.status(201).json({ reply: row });
});
