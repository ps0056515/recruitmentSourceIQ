import { Router } from "express";
import bcrypt from "bcryptjs";
import type { UserRole } from "@sourceiq/shared";
import { prisma } from "../lib/prisma.js";
import { signToken, verifyToken } from "../lib/authJwt.js";
import { DEFAULT_WORKSPACE, isDemoMode, skipAuth } from "../lib/config.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const email = String(req.body?.email ?? "").toLowerCase().trim();
  const password = String(req.body?.password ?? "");
  const roleHint = req.body?.role as UserRole | undefined;

  if (!email || !password) {
    return res.status(400).json({ error: "email_and_password_required" });
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await prisma.workspace.upsert({
        where: { id: DEFAULT_WORKSPACE },
        create: { id: DEFAULT_WORKSPACE, name: "sourceIQ Workspace" },
        update: {},
      });
      const hash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          email,
          name: email.split("@")[0] ?? "Recruiter",
          role: roleHint ?? "recruiter",
          workspaceId: DEFAULT_WORKSPACE,
          passwordHash: hash,
        },
      });
    } else if (user.passwordHash) {
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "invalid_credentials" });
    } else {
      const hash = await bcrypt.hash(password, 10);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    }

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      workspaceId: user.workspaceId,
    });

    return res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
    });
  } catch (e) {
    if (skipAuth() || isDemoMode()) {
      const token = await signToken({
        sub: "dev-user",
        email,
        role: roleHint ?? "recruiter",
        workspaceId: DEFAULT_WORKSPACE,
      });
      return res.json({
        token,
        user: { id: "dev-user", email, role: roleHint ?? "recruiter", name: email.split("@")[0] },
      });
    }
    console.error("[auth/login]", e);
    return res.status(503).json({ error: "auth_unavailable", message: "Database required for login." });
  }
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

authRouter.get("/me", async (req, res) => {
  try {
    let payload = req.user;
    if (!payload) {
      const header = String(req.headers.authorization ?? "");
      const raw = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (!raw) return res.status(401).json({ error: "unauthorized" });
      try {
        payload = await verifyToken(raw);
      } catch {
        return res.status(401).json({ error: "invalid_token" });
      }
    }

    if (UUID_RE.test(payload.sub)) {
      try {
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (user) {
          return res.json({ id: user.id, email: user.email, role: user.role, name: user.name });
        }
      } catch (e) {
        console.warn("[auth/me] db lookup failed:", e);
      }
    }

    return res.json({
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.email.split("@")[0] || "User",
    });
  } catch (e) {
    console.error("[auth/me]", e);
    return res.status(500).json({ error: "auth_me_failed" });
  }
});
