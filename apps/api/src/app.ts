import cors from "cors";
import express from "express";
import { requireAuth } from "./middleware/requireAuth.js";
import { authRouter } from "./routes/auth.js";
import { jdRouter } from "./routes/jd.js";
import { jobsRouter } from "./routes/jobs.js";
import { candidatesRouter } from "./routes/candidates.js";
import { outreachRouter } from "./routes/outreach.js";
import { analyticsRouter } from "./routes/analytics.js";
import { inboxRouter } from "./routes/inbox.js";
import { shareRouter } from "./routes/share.js";
import { atsRouter } from "./routes/ats.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "4mb" }));

  app.get("/health", (_req, res) =>
    res.json({
      ok: true,
      kafka: process.env.USE_KAFKA === "true",
      clickhouse: process.env.USE_CLICKHOUSE === "true",
      demoMode: process.env.DEMO_MODE === "true",
    }),
  );

  app.use(requireAuth);

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/jd", jdRouter);
  app.use("/api/v1/jobs", jobsRouter);
  app.use("/api/v1/candidates", candidatesRouter);
  app.use("/api/v1/outreach", outreachRouter);
  app.use("/api/v1/analytics", analyticsRouter);
  app.use("/api/v1/inbox", inboxRouter);
  app.use("/api/v1/share", shareRouter);
  app.use("/api/v1/ats", atsRouter);

  return app;
}
