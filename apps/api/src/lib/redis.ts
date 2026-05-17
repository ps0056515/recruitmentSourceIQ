import { Redis } from "ioredis";

const memory = new Map<string, string>();

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!client) client = new Redis(process.env.REDIS_URL);
  return client;
}

export async function cacheGet(key: string): Promise<string | null> {
  const r = getRedis();
  if (r) return r.get(key);
  return memory.get(key) ?? null;
}

export async function cacheSet(key: string, value: string, ttlSec = 3600) {
  const r = getRedis();
  if (r) {
    await r.set(key, value, "EX", ttlSec);
    return;
  }
  memory.set(key, value);
}