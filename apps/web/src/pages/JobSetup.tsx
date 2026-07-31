import type { ParsedJD, ProfileSource } from "@sourceiq/shared";
import { PRD_SOURCES } from "@sourceiq/shared";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { JobWorkspace } from "../components/JobWorkspace";
import { GapInline } from "../components/GapInline";
import { PageHeader } from "../components/ui/PageHeader";
import api from "../lib/api";
import { useJob } from "../hooks/useJob";

const SAMPLE_JD = [
  "Senior Software Engineer",
  "",
  "Must have:",
  "- TypeScript",
  "- React",
  "- Node.js",
  "- PostgreSQL",
  "",
  "Nice to have:",
  "- AWS",
  "- Kafka",
].join("\n");

export function JobSetup() {
  const { jobId } = useParams();
  const id = useMemo(() => jobId ?? "", [jobId]);
  const nav = useNavigate();
  const { job } = useJob(id);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedJD | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [sources, setSources] = useState<ProfileSource[]>([...PRD_SOURCES]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!job || hydrated) return;
    if (job.parsedJd?.title || job.parsedJd?.mustHaves?.length || job.parsedJd?.skills?.length) {
      setParsed(job.parsedJd ?? null);
      if (job.parsedJd?.rawExcerpt?.trim()) setText(job.parsedJd.rawExcerpt);
    }
    setHydrated(true);
  }, [job, hydrated]);

  const canParse = text.trim().length >= 20;

  const parseAndSave = async () => {
    if (!id) {
      setError("Job id missing — open this page from a job.");
      return;
    }
    if (!canParse) {
      setError("Paste the full job description (at least a few lines), then parse.");
      return;
    }
    setParsing(true);
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const data = await api("/jd/parse", { method: "POST", body: JSON.stringify({ text }) });
      const next = data.parsed as ParsedJD;
      if (!next?.mustHaves?.length && !next?.skills?.length) {
        setParsed(next);
        setError(
          "Could not extract clear requirements. Add a Must have / skills section (e.g. TypeScript, React) and try again.",
        );
        return;
      }
      setParsed(next);
      await api(`/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ parsedJd: next, title: next.title }),
      });
      setMessage("Job brief parsed and saved. You can run discovery or refine the text and parse again.");
    } catch (e) {
      setError(String(e));
    } finally {
      setParsing(false);
      setSaving(false);
    }
  };

  const saveJd = async () => {
    if (!parsed || !id) {
      setError("Parse the JD first so there is a structured brief to save.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api(`/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ parsedJd: parsed, title: parsed.title }),
      });
      setMessage("Job brief saved.");
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const runSearch = async () => {
    if (!parsed || !id) {
      setError("Parse and save a job brief before running discovery.");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      await api(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify({ parsedJd: parsed }) });
      await api(`/jobs/${id}/search`, {
        method: "POST",
        body: JSON.stringify({ sources, maxResults: 40 }),
      });
      nav(`/jobs/${id}/discover`);
    } catch (e) {
      setError(String(e));
      setSearching(false);
    }
  };

  return (
    <JobWorkspace>
      <PageHeader
        title="Job brief"
        subtitle="Paste your JD once — we extract requirements, save the brief, and configure discovery."
        actions={
          parsed ? (
            <button type="button" className="btn-success" disabled={searching} onClick={() => void runSearch()}>
              {searching ? "Starting…" : "Run discovery"}
            </button>
          ) : null
        }
      />
      {message ? (
        <p className="mb-4 rounded-xl border border-ocean/20 bg-ocean-light px-4 py-2 text-sm text-ocean">{message}</p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-xl border border-coral/30 bg-coral-light px-4 py-2 text-sm text-coral">{error}</p>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card card-pad">
          <BoxHeader
            title="Job description"
            hint="Paste the full JD (must-haves, skills, nice-to-haves). One click parses and saves."
          />
          <textarea
            className="input mt-3 min-h-[280px] resize-y font-mono text-xs"
            placeholder={"Paste job description here…\n\nExample:\nSenior Software Engineer\nMust have:\n- TypeScript\n- React"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={parsing || saving || !canParse}
              onClick={() => void parseAndSave()}
            >
              {parsing || saving ? "Parsing & saving…" : "Parse & save brief"}
            </button>
            <button type="button" className="btn-secondary" disabled={!parsed || saving} onClick={() => void saveJd()}>
              {saving && !parsing ? "Saving…" : "Save again"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setText(SAMPLE_JD);
                setError(null);
                setMessage("Sample JD loaded — click Parse & save brief.");
              }}
            >
              Load sample
            </button>
          </div>
          {!canParse ? (
            <p className="mt-3 text-xs text-ink-muted">Paste at least ~20 characters of JD text to enable parse.</p>
          ) : null}
        </section>
        <section className="card card-pad">
          <h2 className="text-sm font-semibold text-ink">Structured brief</h2>
          {!parsed ? (
            <p className="mt-4 text-sm text-ink-muted">
              Paste a JD and click <span className="font-semibold text-ink">Parse & save brief</span>. Requirements
              appear here and are stored on the job.
            </p>
          ) : (
            <div className="mt-4 space-y-4 text-sm">
              <p className="text-lg font-semibold">{parsed.title}</p>
              <p className="text-ink-muted">{parsed.summary}</p>
              <ReqList title="Must have" items={parsed.mustHaves} />
              <ReqList title="Nice to have" items={parsed.niceToHaves} />
              {parsed.skills?.length ? <ReqList title="Skills" items={parsed.skills} /> : null}
              <div className="flex flex-wrap gap-2">
                <GapInline gap={{ id: "g1", label: "Must-have match", severity: "must_have", matched: true }} />
                <GapInline gap={{ id: "g2", label: "Evidence gap", severity: "nice_have", matched: false }} />
              </div>
            </div>
          )}
        </section>
      </div>
      {parsed && id ? (
        <section className="card card-pad mt-5">
          <h2 className="text-sm font-semibold text-ink">Sources</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRD_SOURCES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setSources((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
                }
                className={`rounded-full border px-3 py-1.5 text-xs capitalize ${sources.includes(s) ? "border-ocean bg-ocean-light text-ocean" : "border-ink/10 text-ink-muted"}`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </JobWorkspace>
  );
}

function BoxHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </div>
  );
}

type ReqItem = string | { id?: string; label?: string; category?: string };

function reqLabel(item: ReqItem): string {
  if (typeof item === "string") return item;
  return String(item.label ?? "");
}

function reqKey(item: ReqItem, index: number): string {
  if (typeof item === "string") return item;
  return item.id ?? `req-${index}-${reqLabel(item)}`;
}

function ReqList({ title, items }: { title: string; items: ReqItem[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slateiq">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((x, i) => (
          <li key={reqKey(x, i)} className="text-ink/90">
            • {reqLabel(x)}
          </li>
        ))}
      </ul>
    </div>
  );
}
