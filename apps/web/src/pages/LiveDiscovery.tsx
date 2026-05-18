import type { ManualImportResult, ProfileSource, SourceProgress } from "@sourceiq/shared";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Box } from "../components/Box";
import { JobWorkspace } from "../components/JobWorkspace";
import { MatchBadge } from "../components/MatchBadge";
import { MatchBulletList } from "../components/MatchBulletList";
import { CandidateContactDetails } from "../components/CandidateContactDetails";
import { contactFromCandidate } from "../lib/candidateContact";
import { SourceDot } from "../components/SourceDot";
import { PageHeader } from "../components/ui/PageHeader";
import { useJob } from "../hooks/useJob";
import api from "../lib/api";

type WsMsg =
  | { type: "hello"; jobId: string }
  | { type: "source_progress"; jobId: string; progress: SourceProgress }
  | { type: "search_complete"; jobId: string; total: number };

type Tab = "auto" | "manual";

const PASTE_SOURCES: { value: ProfileSource; label: string }[] = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "naukri", label: "Naukri" },
  { value: "indeed", label: "Indeed" },
  { value: "github", label: "GitHub" },
  { value: "internal_ats", label: "ATS / other" },
];

export function LiveDiscovery() {
  const { jobId } = useParams();
  const id = useMemo(() => jobId ?? "", [jobId]);
  const nav = useNavigate();
  const { job } = useJob(id);
  const [tab, setTab] = useState<Tab>("auto");
  const [rows, setRows] = useState<SourceProgress[]>([]);
  const [complete, setComplete] = useState(false);
  const [running, setRunning] = useState(false);

  const [resumeText, setResumeText] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [sourceSite, setSourceSite] = useState<ProfileSource>("linkedin");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [lastImport, setLastImport] = useState<ManualImportResult | null>(null);
  const [recentImports, setRecentImports] = useState<ManualImportResult[]>([]);

  useEffect(() => {
    if (!id || tab !== "auto") return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws?jobId=${encodeURIComponent(id)}`);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data)) as WsMsg;
      if (msg.type === "source_progress") {
        setRows((prev) => {
          const without = prev.filter((r) => r.source !== msg.progress.source);
          return [...without, msg.progress].sort((a, b) => a.source.localeCompare(b.source));
        });
      }
      if (msg.type === "search_complete") {
        setComplete(true);
        setRunning(false);
      }
    };
    return () => ws.close();
  }, [id, tab]);

  const runSearch = async () => {
    setRunning(true);
    setComplete(false);
    setRows([]);
    await api(`/jobs/${id}/search`, {
      method: "POST",
      body: JSON.stringify({ sources: ["linkedin", "github", "stackoverflow", "internal_ats"], maxResults: 40 }),
    });
  };

  const runManualImport = async () => {
    setImporting(true);
    setImportError(null);
    try {
      const result = (await api(`/jobs/${id}/manual-import`, {
        method: "POST",
        body: JSON.stringify({
          resumeText,
          candidateName: candidateName.trim() || undefined,
          sourceSite,
        }),
      })) as ManualImportResult;
      setLastImport(result);
      setRecentImports((prev) => [result, ...prev].slice(0, 8));
      setResumeText("");
    } catch (e) {
      setImportError(String(e));
    } finally {
      setImporting(false);
    }
  };

  const doneCount = rows.filter((r) => r.status === "done").length;
  const progressPct = rows.length ? Math.round((doneCount / rows.length) * 100) : 0;
  const hasBrief = Boolean(job?.parsedJd?.mustHaves?.length || job?.parsedJd?.skills?.length);

  return (
    <JobWorkspace>
      <PageHeader
        title="Live discovery"
        subtitle="Run automated multi-source scans or paste a resume copied from any job board for instant JD comparison."
        actions={
          <Box className="flex gap-2">
            {tab === "auto" ? (
              <button type="button" className="btn-secondary" disabled={running} onClick={() => void runSearch()}>
                {running ? "Searching…" : "Re-run search"}
              </button>
            ) : null}
            <Link to={`/jobs/${id}/ranked`} className="btn-primary">
              Ranked list
            </Link>
          </Box>
        }
      />

      <Box className="mb-5 flex gap-1 rounded-xl border border-black/10 bg-white p-1">
        <button
          type="button"
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "auto" ? "bg-ocean text-white" : "text-ink-muted hover:bg-sand"}`}
          onClick={() => setTab("auto")}
        >
          Automated scan
        </button>
        <button
          type="button"
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "manual" ? "bg-ocean text-white" : "text-ink-muted hover:bg-sand"}`}
          onClick={() => setTab("manual")}
        >
          Manual paste
        </button>
      </Box>

      {tab === "auto" ? (
        <>
          <Box className="card card-pad mb-5">
            <Box className="flex flex-wrap items-center justify-between gap-3">
              <Box>
                <p className="font-semibold text-ink">{job?.title ?? "Job"}</p>
                <p className="text-sm text-ink-muted">{job?.company}</p>
              </Box>
              <Box className="text-right">
                <p className="text-2xl font-bold text-ocean">{progressPct}%</p>
                <p className="text-xs text-ink-muted">{rows.length} sources · {doneCount} complete</p>
              </Box>
            </Box>
            <Box className="mt-4 h-2 overflow-hidden rounded-full bg-sand-dark">
              <Box
                className="h-full rounded-full bg-gradient-to-r from-ocean to-emerald transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </Box>
            {complete ? (
              <p className="mt-3 text-sm font-medium text-emerald">Search complete — review your ranked shortlist.</p>
            ) : running ? (
              <p className="mt-3 text-sm text-ink-muted">Scanning sources…</p>
            ) : null}
          </Box>

          <Box className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.length === 0 && !running ? (
              <Box className="card card-pad col-span-full text-center text-sm text-ink-muted">
                No active search. Run discovery from the job brief, or click Re-run search.
              </Box>
            ) : (
              rows.map((r) => (
                <Box key={r.source} className="card card-pad">
                  <Box className="flex items-center justify-between">
                    <SourceDot source={r.source} label />
                    <span className="text-lg font-bold text-emerald">{r.found}</span>
                  </Box>
                  <p className="mt-2 text-xs font-semibold capitalize text-ink">{r.status}</p>
                  <p className="text-xs text-ink-muted">{r.message}</p>
                </Box>
              ))
            )}
          </Box>

          {complete ? (
            <Box className="mt-6 text-center">
              <button type="button" className="btn-success" onClick={() => nav(`/jobs/${id}/ranked`)}>
                Continue to candidates →
              </button>
            </Box>
          ) : null}
        </>
      ) : (
        <Box className="grid gap-5 lg:grid-cols-2">
          <section className="card card-pad">
            <h2 className="text-sm font-semibold text-ink">Paste resume</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Copy profile text from LinkedIn, Naukri, Indeed, or any job site. AI compares it to your saved job brief.
            </p>

            {!hasBrief ? (
              <Box className="mt-4 rounded-xl border border-coral/30 bg-coral-light px-3 py-2 text-xs text-coral">
                Save a job brief first in{" "}
                <Link to={`/jobs/${id}/setup`} className="font-semibold underline">
                  Job brief
                </Link>{" "}
                for accurate must-have / nice-to-have gap analysis.
              </Box>
            ) : null}

            <label className="mt-4 block">
              <span className="label">Copied from (optional)</span>
              <select className="input" value={sourceSite} onChange={(e) => setSourceSite(e.target.value as ProfileSource)}>
                {PASTE_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className="label">Candidate name (optional)</span>
              <input
                className="input"
                placeholder="Auto-detected from resume if blank"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
              />
            </label>

            <label className="mt-3 block">
              <span className="label">Resume / profile text</span>
              <textarea
                className="input mt-1 min-h-[280px] resize-y font-mono text-xs leading-relaxed"
                placeholder="Paste the full resume or LinkedIn About + Experience sections here…"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
            </label>

            {importError ? (
              <p className="mt-3 rounded-lg border border-coral/30 bg-coral-light px-3 py-2 text-xs text-coral">{importError}</p>
            ) : null}

            <button
              type="button"
              className="btn-primary mt-4 w-full"
              disabled={importing || resumeText.trim().length < 40}
              onClick={() => void runManualImport()}
            >
              {importing ? "Analyzing vs job brief…" : "Analyze & add to pipeline"}
            </button>
          </section>

          <section className="space-y-4">
            {lastImport ? (
              <Box className="card card-pad border-2 border-emerald/30">
                <Box className="flex items-start justify-between gap-2">
                  <Box>
                    <p className="text-xs font-semibold uppercase text-emerald">Latest match</p>
                    <h3 className="text-lg font-bold text-ink">{lastImport.candidate.name}</h3>
                    <p className="text-sm text-ink-muted">{lastImport.candidate.headline}</p>
                  </Box>
                  <MatchBadge score={lastImport.candidate.matchScore} gaps={lastImport.candidate.gaps} />
                </Box>
                <Box className="mt-3">
                  <SourceDot source="manual_paste" label />
                </Box>
                <CandidateContactDetails contact={contactFromCandidate(lastImport.candidate)} />
                <MatchBulletList candidate={lastImport.candidate} />
                <Box className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/candidates/${lastImport.candidate.id}`} className="btn-secondary text-sm">
                    View profile
                  </Link>
                  <Link to={`/jobs/${id}/ranked`} className="btn-primary text-sm">
                    See in ranked list
                  </Link>
                </Box>
              </Box>
            ) : (
              <Box className="card card-pad text-sm text-ink-muted">
                Paste a resume and click analyze. The candidate will be scored against your JD and added to the ranked list.
              </Box>
            )}

            {recentImports.length > 1 ? (
              <Box className="card card-pad">
                <h3 className="text-xs font-semibold uppercase text-slateiq">Session imports</h3>
                <ul className="mt-2 space-y-2">
                  {recentImports.slice(1).map((r) => (
                    <li key={r.candidate.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link to={`/candidates/${r.candidate.id}`} className="font-medium text-ocean hover:underline">
                        {r.candidate.name}
                      </Link>
                      <span className="text-xs font-bold text-emerald">{Math.round(r.candidate.matchScore)}</span>
                    </li>
                  ))}
                </ul>
              </Box>
            ) : null}
          </section>
        </Box>
      )}
    </JobWorkspace>
  );
}
