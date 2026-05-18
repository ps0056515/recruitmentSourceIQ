/** Runtime flags — production defaults to real data paths only. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export function allowMockConnectors(): boolean {
  return process.env.ALLOW_MOCK_CONNECTORS === "true" || isDemoMode();
}

export function requireDatabase(): boolean {
  return process.env.REQUIRE_DATABASE === "true" || (!isDemoMode() && process.env.NODE_ENV === "production");
}

export function skipAuth(): boolean {
  return process.env.SKIP_AUTH === "true" || process.env.NODE_ENV === "test";
}

export const DEFAULT_WORKSPACE = process.env.DEFAULT_WORKSPACE_ID ?? "default-workspace";
