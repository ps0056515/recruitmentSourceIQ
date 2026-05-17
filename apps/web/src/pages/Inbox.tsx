import { useEffect, useState } from "react";
import type { InboxItem } from "@sourceiq/shared";
import { Box } from "../components/Box";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import api from "../lib/api";

const INTENT_STYLE: Record<string, string> = {
  interested: "bg-emerald-light text-emerald-deep",
  not_interested: "bg-coral-light text-coral",
  more_info: "bg-amber-100 text-amber-800",
  ambiguous: "bg-sand-dark text-slateiq",
};

export function Inbox() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/inbox")
      .then((r) => setItems((r as { items: InboxItem[] }).items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <PageHeader title="Reply inbox" subtitle="Unified candidate replies with AI intent classification and draft responses." />

      {loading ? (
        <p className="text-sm text-ink-muted">Loading replies…</p>
      ) : items.length === 0 ? (
        <EmptyState title="Inbox is empty" description="When candidates reply to outreach, messages appear here with intent labels." />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="card card-pad">
              <Box className="flex flex-wrap items-start justify-between gap-2">
                <Box>
                  <p className="font-semibold text-ink">{item.candidateName}</p>
                  <p className="text-xs text-ink-muted">
                    {item.channel} · {new Date(item.receivedAt).toLocaleString()}
                  </p>
                </Box>
                {item.intentLabel ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${INTENT_STYLE[item.intentLabel] ?? INTENT_STYLE.ambiguous}`}
                  >
                    {item.intentLabel.replace("_", " ")}
                  </span>
                ) : null}
              </Box>
              <p className="mt-3 text-sm leading-relaxed text-ink/90">{item.body}</p>
              {item.draftReply ? (
                <Box className="mt-4 rounded-xl border border-violet/20 bg-violet-light p-4">
                  <p className="text-xs font-semibold uppercase text-violet">Suggested reply</p>
                  <p className="mt-2 text-sm text-ink/90">{item.draftReply}</p>
                </Box>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Box>
  );
}
