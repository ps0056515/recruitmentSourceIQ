import type { Candidate } from "@sourceiq/shared";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Box } from "../components/Box";
import { JobWorkspace } from "../components/JobWorkspace";
import { MatchBadge } from "../components/MatchBadge";
import { SourceDot } from "../components/SourceDot";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import api from "../lib/api";
import { candidateOrigin } from "../lib/candidateOrigin";

export function RankedList() {
  const { jobId } = useParams();
  const id = useMemo(() => jobId ?? "", [jobId]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await api(`/jobs/${id}/candidates`);
        if (!cancelled) setCandidates(c.candidates as Candidate[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const createShare = async () => {
    const res = await api(`/share/jobs/${id}`, { method: "POST", body: JSON.stringify({}) });
    setShareUrl(`${window.location.origin}${res.url}`);
  };

  return (
    <JobWorkspace>
      <PageHeader
        title="Ranked candidates"
        subtitle="Scores compare each profile to your saved job brief. Pasted resumes are matched against JD must-haves; discovery rows are connector results."
        actions={
          <Box className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => void createShare()}>
              Share with HM
            </button>
            <Link to={`/jobs/${id}/pipeline`} className="btn-primary">
              Open pipeline
            </Link>
          </Box>
        }
      />

      {shareUrl ? (
        <Box className="mb-4 rounded-xl border border-violet/30 bg-violet-light px-4 py-3 text-sm">
          <p className="font-medium text-violet">Hiring manager link (read-only)</p>
          <a href={shareUrl} className="mt-1 block truncate text-ocean hover:underline" target="_blank" rel="noreferrer">
            {shareUrl}
          </a>
        </Box>
      ) : null}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading candidates…</p>
      ) : candidates.length === 0 ? (
        <EmptyState
          title="No candidates yet"
          description="Run discovery from the job brief to populate this list."
          action={
            <Link to={`/jobs/${id}/setup`} className="btn-primary">
              Go to job brief
            </Link>
          }
        />
      ) : (
        <Box className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/8 bg-sand/80 text-xs uppercase tracking-wide text-slateiq">
              <tr>
                <th className="px-4 py-3 font-semibold">Candidate</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Match</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="border-t border-ink/5 transition hover:bg-ocean-light/30">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-ink">{c.name}</p>
                    <p className="text-xs text-ink-muted">{c.headline}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${candidateOrigin(c).className}`}>
                      {candidateOrigin(c).label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <SourceDot source={c.source} label />
                  </td>
                  <td className="px-4 py-4">
                    <MatchBadge score={c.matchScore} gaps={c.gaps} />
                  </td>
                  <td className="px-4 py-4 capitalize text-xs text-ink-muted">{c.stage}</td>
                  <td className="px-4 py-4 text-right">
                    <Link to={`/candidates/${c.id}`} className="text-sm font-medium text-ocean hover:underline">
                      View profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}
    </JobWorkspace>
  );
}
