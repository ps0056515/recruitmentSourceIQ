import type {
  BatchManualImportResult,
  ManualImportResult,
  MatchVerdict,
  ProfileSource,
  SourceProgress,
} from "@sourceiq/shared";
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
type PasteMode = "single" | "batch";

const PASTE_SOURCES: { value: ProfileSource; label: string }[] = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "naukri", label: "Naukri" },
  { value: "indeed", label: "Indeed" },
  { value: "github", label: "GitHub" },
  { value: "internal_ats", label: "ATS / other" },
];

const VERDICT_LABEL: Record<MatchVerdict, string> = {
  strong_match: "Strong match",
  partial_match: "Partial match",
  weak_match: "Weak match",
};

const VERDICT_CLASS: Record<MatchVerdict, string> = {
  strong_match: "bg-emerald-light text-emerald-deep ring-1 ring-emerald/30",
  partial_match: "bg-action-light text-action ring-1 ring-action/25",
  weak_match: "bg-coral-light text-coral ring-1 ring-coral/30",
};

/** Split pasted text on a line that is only --- (3+ dashes). */
export function splitBatchResumes(raw: string): string[] {
  return raw
    .split(/\n-{3,}\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 40);
}

function VerdictPill({ verdict }: { verdict: MatchVerdict }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${VERDICT_CLASS[verdict]}`}>
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

function ImprovementsList({ result }: { result: ManualImportResult }) {
  if (!result.improvements?.length) {
    return <p className="mt-3 text-xs text-emerald">No major gaps vs the JD — resume already covers the brief well.</p>;
  }
  return (
    <Box className="mt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-coral">What to improve vs JD</p>
      <ul className="mt-1.5 space-y-2">
        {result.improvements.map((item) => (
          <li key={`${item.label}-${item.severity}`} className="text-sm leading-snug text-ink/90">
            <span className="font-medium">{item.label}</span>
            {item.severity === "must_have" ? (
              <span className="ml-1 text-[10px] font-bold uppercase text-coral">must-have</span>
            ) : null}
            <span className="mt-0.5 block text-xs text-ink-muted">{item.suggestion}</span>
          </li>
        ))}
      </ul>
    </Box>
  );
}

export function LiveDiscovery() {
  const { jobId } = useParams();
  const id = useMemo(() => jobId ?? "", [jobId]);
  const nav = useNavigate();
  const { job } = useJob(id);
  const [tab, setTab] = useState<Tab>("auto");
  const [pasteMode, setPasteMode] = useState<PasteMode>("single");
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
  const [batchResults, setBatchResults] = useState<ManualImportResult[]>([]);
  const [batchErrors, setBatchErrors] = useState<BatchManualImportResult["errors"]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const runBatchImport = async () => {
    const chunks = splitBatchResumes(resumeText);
    if (!chunks.length) {
      setImportError("Paste at least one resume (40+ characters). Separate multiple resumes with a line of ---.");
      return;
    }
    setImporting(true);
    setImportError(null);
    setBatchErrors([]);
    try {
      const payload = (await api(`/jobs/${id}/manual-import/batch`, {
        method: "POST",
        body: JSON.stringify({
          sourceSite,
          resumes: chunks.map((text) => ({ resumeText: text })),
        }),
      })) as BatchManualImportResult;
      setBatchResults(payload.results);
      setBatchErrors(payload.errors ?? []);
      setRecentImports((prev) => [...payload.results, ...prev].slice(0, 12));
      if (payload.results[0]) setExpandedId(payload.results[0].candidate.id);
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
  const batchPreviewCount = splitBatchResumes(resumeText).length;
  const strongCount = batchResults.filter((r) => r.verdict === "strong_match").length;
  const partialCount = batchResults.filter((r) => r.verdict === "partial_match").length;
  const weakCount = batchResults.filter((r) => r.verdict === "weak_match").length;

  return (
    <JobWorkspace>
      <PageHeader
        title="Live discovery"
        subtitle="Run automated multi-source scans or paste resumes for instant JD comparison and improvement hints."
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
                <p className="text-xs text-ink-muted">
                  {rows.length} sources · {doneCount} complete
                </p>
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
        <Box className="space-y-5">
          <Box className="flex gap-1 rounded-lg border border-black/10 bg-sand/60 p-1 w-fit">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${pasteMode === "single" ? "bg-white text-ink shadow-sm" : "text-ink-muted"}`}
              onClick={() => setPasteMode("single")}
            >
              Single resume
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${pasteMode === "batch" ? "bg-white text-ink shadow-sm" : "text-ink-muted"}`}
              onClick={() => setPasteMode("batch")}
            >
              Compare multiple
            </button>
          </Box>

          <Box className={`grid gap-5 ${pasteMode === "batch" ? "lg:grid-cols-5" : "lg:grid-cols-2"}`}>
            <section className={`card card-pad ${pasteMode === "batch" ? "lg:col-span-2" : ""}`}>
              <h2 className="text-sm font-semibold text-ink">
                {pasteMode === "batch" ? "Paste multiple resumes" : "Paste resume"}
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                {pasteMode === "batch"
                  ? "Paste several resumes and separate each with a line of ---. We’ll score them against your JD and show what to fix."
                  : "Copy profile text from LinkedIn, Naukri, Indeed, or any job site. AI compares it to your saved job brief."}
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
                <select
                  className="input"
                  value={sourceSite}
                  onChange={(e) => setSourceSite(e.target.value as ProfileSource)}
                >
                  {PASTE_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              {pasteMode === "single" ? (
                <label className="mt-3 block">
                  <span className="label">Candidate name (optional)</span>
                  <input
                    className="input"
                    placeholder="Auto-detected from resume if blank"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                  />
                </label>
              ) : null}

              <label className="mt-3 block">
                <span className="label">{pasteMode === "batch" ? "Resumes (separated by ---)" : "Resume / profile text"}</span>
                <textarea
                  className="input mt-1 min-h-[280px] resize-y font-mono text-xs leading-relaxed"
                  placeholder={
                    pasteMode === "batch"
                      ? "Resume 1 text…\n---\nResume 2 text…\n---\nResume 3 text…"
                      : "Paste the full resume or LinkedIn About + Experience sections here…"
                  }
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
              </label>

              {pasteMode === "batch" && batchPreviewCount > 0 ? (
                <p className="mt-2 text-xs text-ink-muted">
                  Detected <span className="font-semibold text-ink">{batchPreviewCount}</span> resume
                  {batchPreviewCount === 1 ? "" : "s"} ready to compare.
                </p>
              ) : null}

              {importError ? (
                <p className="mt-3 rounded-lg border border-coral/30 bg-coral-light px-3 py-2 text-xs text-coral">
                  {importError}
                </p>
              ) : null}

              <button
                type="button"
                className="btn-primary mt-4 w-full"
                disabled={importing || resumeText.trim().length < 40}
                onClick={() => void (pasteMode === "batch" ? runBatchImport() : runManualImport())}
              >
                {importing
                  ? pasteMode === "batch"
                    ? "Comparing resumes vs JD…"
                    : "Analyzing vs job brief…"
                  : pasteMode === "batch"
                    ? "Compare all vs JD"
                    : "Analyze & add to pipeline"}
              </button>
            </section>

            <section className={`space-y-4 ${pasteMode === "batch" ? "lg:col-span-3" : ""}`}>
              {pasteMode === "batch" ? (
                <>
                  {batchResults.length ? (
                    <Box className="card card-pad">
                      <Box className="flex flex-wrap items-center justify-between gap-2">
                        <Box>
                          <p className="text-xs font-semibold uppercase text-slateiq">Batch comparison</p>
                          <p className="text-sm text-ink-muted">
                            {batchResults.length} scored · {strongCount} strong · {partialCount} partial · {weakCount}{" "}
                            weak
                          </p>
                        </Box>
                        <Link to={`/jobs/${id}/ranked`} className="btn-secondary text-sm">
                          Open ranked list
                        </Link>
                      </Box>

                      <ul className="mt-4 divide-y divide-black/5">
                        {batchResults.map((r) => {
                          const open = expandedId === r.candidate.id;
                          return (
                            <li key={r.candidate.id} className="py-3">
                              <button
                                type="button"
                                className="flex w-full items-start justify-between gap-3 text-left"
                                onClick={() => setExpandedId(open ? null : r.candidate.id)}
                              >
                                <Box>
                                  <Box className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-ink">{r.candidate.name}</span>
                                    <VerdictPill verdict={r.verdict} />
                                  </Box>
                                  <p className="mt-0.5 text-xs text-ink-muted">{r.candidate.headline}</p>
                                </Box>
                                <MatchBadge score={r.candidate.matchScore} gaps={r.candidate.gaps} />
                              </button>
                              {open ? (
                                <Box className="mt-3 rounded-xl bg-sand/50 px-3 py-3">
                                  <MatchBulletList candidate={r.candidate} className="mt-0" />
                                  <ImprovementsList result={r} />
                                  <Box className="mt-3">
                                    <Link
                                      to={`/candidates/${r.candidate.id}`}
                                      className="text-sm font-medium text-ocean hover:underline"
                                    >
                                      View full profile →
                                    </Link>
                                  </Box>
                                </Box>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>

                      {batchErrors.length ? (
                        <p className="mt-3 text-xs text-coral">
                          {batchErrors.length} resume{batchErrors.length === 1 ? "" : "s"} could not be scored
                          {batchErrors[0]?.message ? ` (${batchErrors[0].message})` : ""}.
                        </p>
                      ) : null}
                    </Box>
                  ) : (
                    <Box className="card card-pad text-sm text-ink-muted">
                      Paste multiple resumes separated by <code className="text-ink">---</code>, then compare. You’ll
                      see strong / partial / weak matches and what each resume should improve vs the JD.
                    </Box>
                  )}
                </>
              ) : (
                <>
                  {lastImport ? (
                    <Box className="card card-pad border-2 border-emerald/30">
                      <Box className="flex items-start justify-between gap-2">
                        <Box>
                          <Box className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold uppercase text-emerald">Latest match</p>
                            <VerdictPill verdict={lastImport.verdict} />
                          </Box>
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
                      <ImprovementsList result={lastImport} />
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
                      Paste a resume and click analyze. The candidate will be scored against your JD and added to the
                      ranked list.
                    </Box>
                  )}

                  {recentImports.length > 1 ? (
                    <Box className="card card-pad">
                      <h3 className="text-xs font-semibold uppercase text-slateiq">Session imports</h3>
                      <ul className="mt-2 space-y-2">
                        {recentImports.slice(1).map((r) => (
                          <li key={r.candidate.id} className="flex items-center justify-between gap-2 text-sm">
                            <Link
                              to={`/candidates/${r.candidate.id}`}
                              className="font-medium text-ocean hover:underline"
                            >
                              {r.candidate.name}
                            </Link>
                            <span className="text-xs font-bold text-emerald">{Math.round(r.candidate.matchScore)}</span>
                          </li>
                        ))}
                      </ul>
                    </Box>
                  ) : null}
                </>
              )}
            </section>
          </Box>
        </Box>
      )}
    </JobWorkspace>
  );
}
