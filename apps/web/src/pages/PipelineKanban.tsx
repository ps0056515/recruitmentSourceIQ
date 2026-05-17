import type { Candidate, PipelineStage } from "@sourceiq/shared";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Box } from "../components/Box";
import { JobWorkspace } from "../components/JobWorkspace";
import { MatchBadge } from "../components/MatchBadge";
import { PageHeader } from "../components/ui/PageHeader";
import api from "../lib/api";

const COLS: { stage: PipelineStage; label: string; color: string }[] = [
  { stage: "new", label: "New", color: "border-slateiq/30" },
  { stage: "contacted", label: "Contacted", color: "border-ocean/30" },
  { stage: "responded", label: "Responded", color: "border-violet/30" },
  { stage: "interview", label: "Interview", color: "border-amber-500/30" },
  { stage: "offer", label: "Offer", color: "border-emerald/30" },
  { stage: "hired", label: "Hired", color: "border-emerald" },
  { stage: "rejected", label: "Rejected", color: "border-coral/30" },
];

export function PipelineKanban() {
  const { jobId } = useParams();
  const id = useMemo(() => jobId ?? "", [jobId]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await api(`/jobs/${id}/candidates`);
      if (!cancelled) setCandidates(c.candidates as Candidate[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const grouped = useMemo(() => {
    const m = new Map<PipelineStage, Candidate[]>();
    for (const { stage } of COLS) m.set(stage, []);
    for (const c of candidates) {
      const list = m.get(c.stage) ?? [];
      list.push(c);
      m.set(c.stage, list);
    }
    return m;
  }, [candidates]);

  const move = async (candidateId: string, stage: PipelineStage) => {
    await api(`/candidates/${candidateId}/stage`, { method: "PATCH", body: JSON.stringify({ stage }) });
    setCandidates((prev) => prev.map((x) => (x.id === candidateId ? { ...x, stage } : x)));
  };

  return (
    <JobWorkspace>
      <PageHeader
        title="Pipeline"
        subtitle="Drag-free kanban — change stage from the dropdown on each card."
        actions={
          <Link to={`/jobs/${id}/ranked`} className="btn-secondary">
            Back to ranked
          </Link>
        }
      />

      <Box className="flex gap-3 overflow-x-auto pb-4">
        {COLS.map(({ stage, label, color }) => (
          <Box key={stage} className={`w-64 shrink-0 rounded-2xl border-2 ${color} bg-white/60`}>
            <Box className="border-b border-ink/5 px-3 py-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{label}</p>
              <p className="text-lg font-bold text-ink">{(grouped.get(stage) ?? []).length}</p>
            </Box>
            <Box className="max-h-[calc(100vh-280px)] space-y-2 overflow-y-auto p-2">
              {(grouped.get(stage) ?? []).map((c) => (
                <Box key={c.id} className="card p-3 shadow-sm">
                  <p className="text-sm font-semibold text-ink">{c.name}</p>
                  <Box className="mt-1">
                    <MatchBadge score={c.matchScore} gaps={c.gaps} />
                  </Box>
                  <select
                    className="input mt-2 py-1.5 text-xs"
                    value={c.stage}
                    onChange={(e) => void move(c.id, e.target.value as PipelineStage)}
                  >
                    {COLS.map((col) => (
                      <option key={col.stage} value={col.stage}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                  <Link to={`/candidates/${c.id}`} className="mt-2 block text-xs font-medium text-ocean hover:underline">
                    View profile
                  </Link>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </JobWorkspace>
  );
}
