const API_PREFIX = "/api/v1";

export function getToken(): string | null {
  return localStorage.getItem("sourceiq_token");
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem("sourceiq_token");
  else localStorage.setItem("sourceiq_token", token);
}

async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_PREFIX}${path}`, { ...init, headers });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || "request_failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

export default api;
