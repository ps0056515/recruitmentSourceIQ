import type { ParsedJD, ProfileSource } from "@sourceiq/shared";
import { PRD_SOURCES } from "@sourceiq/shared";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { JobWorkspace } from "../components/JobWorkspace";
import { GapInline } from "../components/GapInline";
import { PageHeader } from "../components/ui/PageHeader";
import api from "../lib/api";
import { useJob } from "../hooks/useJob";

const SAMPLE_JD = [
  "Senior Software Engineer", "", "Must have:", "- TypeScript", "- React",
  "", "Nice to have:", "- Hiring experience",
].join("\n");

export function JobSetup() {
  const { jobId } = useParams();
  const id = useMemo(() => jobId ?? "", [jobId]);
  const nav = useNavigate();
  const { job } = useJob(id);
  const [text, setText] = useState(SAMPLE_JD);
  const [parsed, setParsed] = useState<ParsedJD | null>(job?.parsedJd ?? null);
  const [sources, setSources] = useState<ProfileSource[]>([...PRD_SOURCES]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const parseJd = async () => {
    setParsing(true);
    setMessage(null);
    try {
      const data = await api("/jd/parse", { method: "POST", body: JSON.stringify({ text }) });
      setParsed(data.parsed as ParsedJD);
      setMessage("JD parsed — review the structured brief.");
    } catch (e) { setMessage(String(e)); } finally { setParsing(false); }
  };

  const saveJd = async () => {
    if (!parsed || !id) return;
    setSaving(true);
    try {
      await api(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify({ parsedJd: parsed, title: parsed.title }) });
      setMessage("Job brief saved.");
    } catch (e) { setMessage(String(e)); } finally { setSaving(false); }
  };

  const runSearch = async () => {
    if (!parsed || !id) return;
    setSearching(true);
    try {
      await api(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify({ parsedJd: parsed }) });
      await api(`/jobs/${id}/search`, { method: "POST", body: JSON.stringify({ sources, maxResults: 40 }) });
      nav(`/jobs/${id}/discover`);
    } catch (e) { setMessage(String(e)); setSearching(false); }
  };

  return (
    <JobWorkspace>
      <PageHeader title="Job brief" subtitle="Paste your JD — we extract requirements and configure multi-source discovery."
        actions={parsed ? <button type="button" className="btn-success" disabled={searching} onClick={() => void runSearch()}>{searching ? "Starting…" : "Run discovery"}</button> : null} />
      {message ? <p className="mb-4 rounded-xl border border-ocean/20 bg-ocean-light px-4 py-2 text-sm text-ocean">{message}</p> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card card-pad">
          <h2 className="text-sm font-semibold text-ink">Job description</h2>
          <textarea className="input mt-3 min-h-[280px] resize-y font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mt-4 flex gap-2">
            <button type="button" className="btn-primary" disabled={parsing} onClick={() => void parseJd()}>{parsing ? "Parsing…" : "Parse with AI"}</button>
            <button type="button" className="btn-secondary" disabled={!parsed || saving} onClick={() => void saveJd()}>{saving ? "Saving…" : "Save brief"}</button>
          </div>
        </section>
        <section className="card card-pad">
          <h2 className="text-sm font-semibold text-ink">Structured brief</h2>
          {!parsed ? <p className="mt-4 text-sm text-ink-muted">Parse a JD to preview requirements.</p> : (
            <div className="mt-4 space-y-4 text-sm">
              <p className="text-lg font-semibold">{parsed.title}</p>
              <p className="text-ink-muted">{parsed.summary}</p>
              <ReqList title="Must have" items={parsed.mustHaves} />
              <ReqList title="Nice to have" items={parsed.niceToHaves} />
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
              <button key={s} type="button" onClick={() => setSources((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])}
                className={`rounded-full border px-3 py-1.5 text-xs capitalize ${sources.includes(s) ? "border-ocean bg-ocean-light text-ocean" : "border-ink/10 text-ink-muted"}`}>
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </JobWorkspace>
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
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slateiq">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((x, i) => (
          <li key={reqKey(x, i)} className="text-ink/90">• {reqLabel(x)}</li>
        ))}
      </ul>
    </div>
  );
}
