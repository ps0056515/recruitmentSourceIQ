import { Router } from "express";
import { getDemoShareView } from "../data/demoDataset.js";
import { isDemoMode } from "../lib/config.js";
import { createShareLink, getShareView } from "../services/shareService.js";

export const shareRouter = Router();

shareRouter.post("/jobs/:jobId", async (req, res) => {
  try {
    const { token, url } = await createShareLink(req.params.jobId, req.body?.filters);
    return res.status(201).json({ token, url });
  } catch {
    if (isDemoMode()) {
      return res.status(201).json({ token: "demo-hm-shortlist", url: "/share/demo-hm-shortlist" });
    }
    return res.status(503).json({ error: "share_unavailable" });
  }
});

shareRouter.get("/:token", async (req, res) => {
  try {
    const view = await getShareView(req.params.token);
    if (view) return res.json(view);
  } catch {
    /* fall through */
  }
  if (isDemoMode() && req.params.token === "demo-hm-shortlist") {
    const demo = getDemoShareView("seed-job-1");
    if (demo) return res.json(demo);
  }
  return res.status(404).json({ error: "link_expired_or_invalid" });
});
