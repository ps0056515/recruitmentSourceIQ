import { Router } from "express";
import type { UserRole } from "@sourceiq/shared";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const email = String(req.body?.email ?? "you@sourceiq.local");
  const role = (req.body?.role as UserRole | undefined) ?? "recruiter";
  const token = Buffer.from(JSON.stringify({ sub: "user_1", email, role, iat: Date.now() }), "utf8").toString(
    "base64url",
  );

  res.json({ token, user: { id: "user_1", email, role } });
});

authRouter.get("/me", (req, res) => {
  const header = String(req.headers.authorization ?? "");
  const raw = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!raw) return res.status(401).json({ error: "unauthorized" });
  try {
    const json = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return res.json({ id: json.sub, email: json.email, role: json.role });
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
});
