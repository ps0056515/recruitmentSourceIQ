import { createClient, type ClickHouseClient } from "@clickhouse/client";

let client: ClickHouseClient | null = null;

export function isClickHouseEnabled() {
  return process.env.USE_CLICKHOUSE === "true";
}

export function getClickHouse(): ClickHouseClient | null {
  if (!isClickHouseEnabled()) return null;
  if (!client) {
    client = createClient({
      url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
      database: process.env.CLICKHOUSE_DATABASE ?? "sourceiq",
    });
  }
  return client;
}

export async function initClickHouse() {
  const ch = getClickHouse();
  if (!ch) return;
  try {
    await ch.command({
      query: `
      CREATE TABLE IF NOT EXISTS analytics_events (
        event_id String,
        workspace_id String,
        job_id Nullable(String),
        event_type String,
        payload String,
        created_at DateTime DEFAULT now()
      ) ENGINE = MergeTree()
      ORDER BY (workspace_id, event_type, created_at)
    `,
    });
  } catch (e) {
    console.warn("[clickhouse] unavailable, analytics will use Postgres only", e);
  }
}

export async function insertAnalyticsEvent(row: {
  eventId: string;
  workspaceId: string;
  jobId?: string;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  const ch = getClickHouse();
  if (!ch) return;
  await ch.insert({
    table: "analytics_events",
    values: [
      {
        event_id: row.eventId,
        workspace_id: row.workspaceId,
        job_id: row.jobId ?? null,
        event_type: row.eventType,
        payload: JSON.stringify(row.payload),
      },
    ],
    format: "JSONEachRow",
  });
}
