import type { UserRole } from "@sourceiq/shared";
import { loadDemoIntoMemory, DEMO_CANDIDATES, DEMO_JOBS } from "../data/demoDataset.js";
import { jobs, candidates } from "../store.js";

export function resetMemoryStore(): void {
  jobs.clear();
  candidates.clear();
}

export function seedDemoStore(): void {
  resetMemoryStore();
  const loaded = loadDemoIntoMemory(jobs, candidates);
  if (!loaded) {
    for (const j of DEMO_JOBS) jobs.set(j.id, j);
    for (const c of DEMO_CANDIDATES) candidates.set(c.id, c);
  }
}

export function loginToken(email = "recruiter@sourceiq.local", role: UserRole = "recruiter"): string {
  return Buffer.from(JSON.stringify({ sub: "user_1", email, role, iat: Date.now() }), "utf8").toString(
    "base64url",
  );
}

export function authHeader(token?: string): { Authorization: string } {
  return { Authorization: `Bearer ${token ?? loginToken()}` };
}

export async function poll<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  opts?: { timeoutMs?: number; intervalMs?: number },
): Promise<T> {
  const timeoutMs = opts?.timeoutMs ?? 8000;
  const intervalMs = opts?.intervalMs ?? 200;
  const deadline = Date.now() + timeoutMs;
  let last: T;
  while (Date.now() < deadline) {
    last = await fn();
    if (predicate(last)) return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`poll timed out after ${timeoutMs}ms`);
}
