import { Router } from "express";
import { isDemoMode } from "../lib/config.js";
import { getDemoJobAnalytics, getDemoOverviewAnalytics } from "../data/demoDataset.js";
import { getJobAnalytics, getOverviewAnalytics } from "../services/analyticsService.js";

export const analyticsRouter = Router();

analyticsRouter.get("/overview", async (req, res) => {
  const workspaceId = String(req.query.workspaceId ?? "default-workspace");
  try {
    const data = await getOverviewAnalytics(workspaceId);
    return res.json(data);
  } catch (e) {
    if (isDemoMode()) return res.json(getDemoOverviewAnalytics());
    console.error("[analytics/overview]", e);
    return res.status(503).json({ error: "analytics_unavailable" });
  }
});

analyticsRouter.get("/jobs/:id", async (req, res) => {
  try {
    const data = await getJobAnalytics(req.params.id);
    return res.json(data);
  } catch (e) {
    if (isDemoMode()) return res.json(getDemoJobAnalytics(req.params.id));
    console.error("[analytics/job]", e);
    return res.status(503).json({ error: "analytics_unavailable" });
  }
});
