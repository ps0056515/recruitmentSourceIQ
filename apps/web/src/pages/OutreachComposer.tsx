import type { Candidate } from "@sourceiq/shared";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Box } from "../components/Box";
import { JobWorkspace } from "../components/JobWorkspace";
import { PageHeader } from "../components/ui/PageHeader";
import api from "../lib/api";
import { candidateOrigin } from "../lib/candidateOrigin";

export function OutreachComposer() {
  const { jobId } = useParams();
  const id = useMemo(() => jobId ?? "", [jobId]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await api(`/jobs/${id}/candidates`);
      const list = c.candidates as Candidate[];
      if (!cancelled) {
        setCandidates(list);
        setSelected(list[0]?.id ?? "");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const pick = candidates.find((c) => c.id === selected);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <JobWorkspace>
      <PageHeader title="Outreach" subtitle="AI-drafted, personalized messages — review before sending." />

      {toast ? (
        <Box className="mb-4 rounded-xl border border-emerald/30 bg-emerald-light px-4 py-2 text-sm text-emerald-deep">
          {toast}
        </Box>
      ) : null}

      <Box className="grid gap-5 lg:grid-cols-5">
        <Box className="card card-pad lg:col-span-2">
          <label className="block">
            <span className="label">Recipient</span>
            <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {Math.round(c.matchScore)}% ({candidateOrigin(c).label})
                </option>
              ))}
            </select>
          </label>

          {pick ? (
            <Box className="mt-4 rounded-xl bg-sand p-3 text-xs text-ink-muted">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${candidateOrigin(pick).className}`}>
                {candidateOrigin(pick).label}
              </span>
              <p className="mt-2 font-semibold text-ink">{pick.name}</p>
              <p>{pick.headline}</p>
              {pick.aiSummary ? <p className="mt-2 text-ink/80">{pick.aiSummary}</p> : null}
              <p className="mt-1 capitalize">Status: {pick.contactStatus}</p>
            </Box>
          ) : null}

          <Box className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={!selected || drafting}
              onClick={async () => {
                setDrafting(true);
                try {
                  const d = await api(`/outreach/draft`, {
                    method: "POST",
                    body: JSON.stringify({ candidateId: selected, tone: "concise" }),
                  });
                  setSubject(d.subject);
                  setBody(d.body);
                  showToast("Draft ready — edit and send.");
                } finally {
                  setDrafting(false);
                }
              }}
            >
              {drafting ? "Drafting…" : "Generate draft"}
            </button>
            <button
              type="button"
              className="btn-success"
              disabled={!subject}
              onClick={async () => {
                const res = (await api(`/outreach/send`, {
                  method: "POST",
                  body: JSON.stringify({ candidateId: selected, subject, body, channel: "email" }),
                })) as { delivered?: boolean };
                showToast(res.delivered ? "Message sent." : "Saved — configure SMTP to deliver email.");
              }}
            >
              Send
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                const top = candidates.slice(0, 5).map((c) => c.id);
                await api(`/outreach/bulk`, { method: "POST", body: JSON.stringify({ candidateIds: top }) });
                showToast("Bulk outreach queued for top 5.");
              }}
            >
              Bulk top 5
            </button>
          </Box>
        </Box>

        <Box className="card card-pad lg:col-span-3">
          <label className="block">
            <span className="label">Subject</span>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label className="mt-4 block">
            <span className="label">Message</span>
            <textarea className="input mt-1 min-h-[320px] resize-y leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
        </Box>
      </Box>
    </JobWorkspace>
  );
}
