import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { ShareViewPayload } from "@sourceiq/shared";
import { Box } from "../components/Box";
import { IconSpark } from "../components/Icons";
import api from "../lib/api";

export function ShareView() {
  const { token } = useParams();
  const [view, setView] = useState<ShareViewPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    api(`/share/${token}`)
      .then((v) => setView(v as ShareViewPayload))
      .catch(() => setError(true));
  }, [token]);

  if (error) {
    return (
      <Box className="flex min-h-full items-center justify-center bg-sand p-6">
        <Box className="card card-pad max-w-md text-center">
          <p className="text-lg font-semibold text-ink">Link unavailable</p>
          <p className="mt-2 text-sm text-ink-muted">This share link has expired or is invalid. Ask your recruiter for a new one.</p>
        </Box>
      </Box>
    );
  }

  if (!view) {
    return (
      <Box className="flex min-h-full items-center justify-center">
        <p className="text-sm text-ink-muted">Loading shortlist…</p>
      </Box>
    );
  }

  return (
    <Box className="min-h-full bg-sand">
      <header className="bg-charcoal px-6 py-10 text-white">
        <Box className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-action shadow-glow">
            <IconSpark className="h-5 w-5" />
          </span>
          <Box>
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">Hiring manager shortlist</p>
            <h1 className="text-2xl font-bold">{view.jobTitle}</h1>
            <p className="text-sm text-white/80">{view.company}</p>
          </Box>
        </Box>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <p className="text-sm text-ink-muted">
          {view.candidates.length} candidate{view.candidates.length === 1 ? "" : "s"} · read-only view
        </p>
        {view.candidates.map((c) => (
          <article key={c.id} className="card card-pad">
            <Box className="flex items-start justify-between gap-3">
              <Box>
                <h2 className="text-lg font-semibold text-ink">{c.name}</h2>
                <p className="text-sm text-ink-muted">{c.headline}</p>
              </Box>
              <span className="rounded-full bg-emerald px-3 py-1 text-sm font-bold text-white">{Math.round(c.matchScore)}</span>
            </Box>
            {c.aiSummary ? <p className="mt-4 text-sm leading-relaxed text-ink/90">{c.aiSummary}</p> : null}
          </article>
        ))}
      </main>
    </Box>
  );
}
