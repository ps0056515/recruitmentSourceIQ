import { Router } from "express";
import { getDemoJobAnalytics, getDemoOverviewAnalytics } from "../data/demoDataset.js";
import { getJobAnalytics, getOverviewAnalytics } from "../services/analyticsService.js";

export const analyticsRouter = Router();

analyticsRouter.get("/overview", async (req, res) => {
  const workspaceId = String(req.query.workspaceId ?? "default-workspace");
  try {
    const data = await getOverviewAnalytics(workspaceId);
    if (data.totalMatched > 0) return res.json(data);
  } catch {
    /* demo */
  }
  res.json(getDemoOverviewAnalytics());
});

analyticsRouter.get("/jobs/:id", async (req, res) => {
  try {
    const data = await getJobAnalytics(req.params.id);
    if (data.totalMatched > 0) return res.json(data);
  } catch {
    /* demo */
  }
  res.json(getDemoJobAnalytics(req.params.id));
});
