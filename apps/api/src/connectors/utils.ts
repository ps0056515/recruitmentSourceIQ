import type { ParsedJD } from "@sourceiq/shared";

export async function fetchJson<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const timeoutMs = init?.timeoutMs ?? 25_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

export function jdSearchTerms(parsedJd: ParsedJD, keywords?: string[]): string {
  const parts = [
    ...(keywords ?? []),
    parsedJd.title,
    ...parsedJd.skills.slice(0, 4),
    ...parsedJd.mustHaves.slice(0, 2),
  ]
    .map((s) => s?.trim())
    .filter(Boolean);
  return [...new Set(parts)].join(" ").slice(0, 120);
}

export function nameFromTitle(title: string): string {
  const cleaned = title
    .replace(/\s*[-|–—]\s*LinkedIn.*$/i, "")
    .replace(/\s*[-|–—]\s*Indeed.*$/i, "")
    .replace(/\s*[-|–—]\s*Naukri.*$/i, "")
    .replace(/\s*[-|–—]\s*GitHub.*$/i, "")
    .replace(/\s*[-|·]\s*.*$/, "")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 4) return words.join(" ");
  return cleaned.slice(0, 48) || "Unknown";
}

export function skillsFromText(text: string, seed: string[]): string[] {
  const lower = text.toLowerCase();
  const found = seed.filter((s) => lower.includes(s.toLowerCase()));
  return [...new Set([...found, ...seed.slice(0, 3)])].slice(0, 8);
}
