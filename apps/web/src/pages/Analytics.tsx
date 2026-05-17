import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { AnalyticsOverview } from "@sourceiq/shared";
import { Box } from "../components/Box";
import { JobWorkspace } from "../components/JobWorkspace";
import { PageHeader } from "../components/ui/PageHeader";
import api from "../lib/api";

export function Analytics() {
  const { jobId } = useParams();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = jobId ? `/analytics/jobs/${jobId}` : "/analytics/overview?workspaceId=default-workspace";
    api(path)
      .then((d) => setData(d as AnalyticsOverview))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [jobId]);

  const content = loading ? (
    <p className="text-sm text-ink-muted">Loading analytics…</p>
  ) : !data ? (
    <p className="text-sm text-coral">Could not load analytics. Start discovery to collect data.</p>
  ) : (
    <Box className="space-y-6">
      <Box className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Profiles scanned" value={data.totalScanned} />
        <Metric label="Strong matches" value={data.totalMatched} />
        <Metric label="Avg match score" value={data.avgMatchScore} />
        <Metric label="Reply rate" value={`${Math.round(data.replyRate * 100)}%`} />
      </Box>

      {data.funnel.length > 0 ? (
        <section className="card card-pad">
          <h2 className="text-sm font-semibold text-ink">Pipeline funnel</h2>
          <ul className="mt-4 space-y-3">
            {data.funnel.map((f) => {
              const max = Math.max(...data.funnel.map((x) => x.count), 1);
              const pct = Math.round((f.count / max) * 100);
              return (
                <li key={f.stage}>
                  <Box className="mb-1 flex justify-between text-sm">
                    <span className="capitalize text-ink-muted">{f.stage}</span>
                    <span className="font-semibold text-ink">{f.count}</span>
                  </Box>
                  <Box className="h-2 overflow-hidden rounded-full bg-sand-dark">
                    <Box className="h-full rounded-full bg-ocean" style={{ width: `${pct}%` }} />
                  </Box>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {data.bySource.length > 0 ? (
        <section className="card card-pad overflow-hidden">
          <h2 className="text-sm font-semibold text-ink">Source performance</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-ink/8 text-left text-xs uppercase text-slateiq">
                <th className="pb-2 font-semibold">Source</th>
                <th className="pb-2 font-semibold">Matched</th>
                <th className="pb-2 font-semibold">Reply rate</th>
              </tr>
            </thead>
            <tbody>
              {data.bySource.map((s) => (
                <tr key={s.source} className="border-t border-ink/5">
                  <td className="py-3 capitalize text-ink">{s.source.replace("_", " ")}</td>
                  <td className="py-3 font-medium">{s.matched}</td>
                  <td className="py-3 text-emerald font-medium">{Math.round(s.replyRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </Box>
  );

  if (jobId) {
    return (
      <JobWorkspace>
        <PageHeader title="Job analytics" subtitle="Performance for this role across sources and pipeline stages." />
        {content}
      </JobWorkspace>
    );
  }

  return (
    <Box>
      <PageHeader title="Workspace analytics" subtitle="Cross-job sourcing performance and funnel health." />
      {content}
    </Box>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Box className="card card-pad text-center">
      <p className="text-3xl font-bold text-ocean">{value}</p>
      <p className="mt-1 text-xs font-medium text-ink-muted">{label}</p>
    </Box>
  );
}
