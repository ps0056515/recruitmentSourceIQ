import { vi } from "vitest";

/** Keep API tests on in-memory paths — no Postgres connection waits. */
process.env.USE_KAFKA = "false";
process.env.USE_CLICKHOUSE = "false";
process.env.ANTHROPIC_API_KEY = "";
process.env.SKIP_AUTH = "true";
process.env.DEMO_MODE = "true";
process.env.ALLOW_MOCK_CONNECTORS = "true";
process.env.JWT_SECRET = "test-secret";

function prismaRejectProxy(): unknown {
  const reject = () => Promise.reject(new Error("prisma_unavailable_in_tests"));
  return new Proxy(reject, {
    get() {
      return prismaRejectProxy();
    },
    apply: reject,
  });
}

vi.mock("../lib/prisma.js", () => ({
  prisma: prismaRejectProxy(),
}));
