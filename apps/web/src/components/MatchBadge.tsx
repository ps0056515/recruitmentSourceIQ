import type { GapItem } from "@sourceiq/shared";

function worstSeverity(gaps: GapItem[] | undefined) {
  const g = gaps ?? [];
  if (g.some((x) => x.severity === "must_have" && !x.matched)) return "risk" as const;
  if (g.some((x) => x.severity === "nice_have" && !x.matched)) return "watch" as const;
  return "ok" as const;
}

export function MatchBadge({ score, gaps }: { score: number; gaps?: GapItem[] }) {
  const band = worstSeverity(gaps);
  const hue =
    score >= 86
      ? "bg-emerald-light text-emerald-deep ring-1 ring-emerald/30"
      : score >= 72
        ? "bg-action-light text-action ring-1 ring-action/25"
        : "bg-zinc-100 text-ink ring-1 ring-zinc-200";

  const rim =
    band === "risk"
      ? "outline outline-2 outline-coral/60"
      : band === "watch"
        ? "outline outline-2 outline-amber-500/50"
        : "";

  return (
    <span className={["inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", hue, rim].join(" ")}>
      {Math.round(score)} match
      {band === "risk" ? <span className="ml-1 text-[10px] font-bold text-coral">· gap</span> : null}
      {band === "watch" ? <span className="ml-1 text-[10px] font-bold text-amber-600">· watch</span> : null}
    </span>
  );
}
