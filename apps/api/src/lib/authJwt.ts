import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@sourceiq/shared";

const SECRET = () => {
  const s = process.env.JWT_SECRET ?? process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  return new TextEncoder().encode(s ?? "sourceiq-dev-secret-change-me");
};

export type TokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  workspaceId: string;
};

export async function signToken(payload: TokenPayload, expiresIn = "7d"): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role, workspaceId: payload.workspaceId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET());
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, SECRET());
  const sub = payload.sub;
  if (!sub) throw new Error("invalid_token");
  return {
    sub,
    email: String(payload.email ?? ""),
    role: (payload.role as UserRole) ?? "recruiter",
    workspaceId: String(payload.workspaceId ?? "default-workspace"),
  };
}
