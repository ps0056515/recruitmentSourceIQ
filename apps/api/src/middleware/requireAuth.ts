import type { NextFunction, Request, Response } from "express";
import { skipAuth } from "../lib/config.js";
import { verifyToken, type TokenPayload } from "../lib/authJwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const PUBLIC_PREFIXES = ["/health", "/api/v1/auth/login"];

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (skipAuth()) return next();

  const path = req.path;
  if (PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p))) return next();
  if (req.method === "GET" && /^\/api\/v1\/share\/[^/]+$/.test(path)) return next();

  const header = String(req.headers.authorization ?? "");
  const raw = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!raw) return res.status(401).json({ error: "unauthorized" });

  verifyToken(raw)
    .then((user) => {
      req.user = user;
      next();
    })
    .catch(() => res.status(401).json({ error: "invalid_token" }));
}
