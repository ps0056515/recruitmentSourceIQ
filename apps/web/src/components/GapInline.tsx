import type { GapItem } from "@sourceiq/shared";
import { cn } from "../lib/cn";

export function GapInline({ gap }: { gap: GapItem }) {
  const styles =
    gap.severity === "must_have"
      ? gap.matched
        ? "border-emerald/30 bg-emerald-light text-emerald-deep"
        : "border-coral/40 bg-coral-light text-coral"
      : gap.severity === "nice_have"
        ? gap.matched
          ? "border-emerald/30 bg-emerald-light text-emerald-deep"
          : "border-amber-400/40 bg-amber-50 text-amber-800"
        : "border-ink/10 bg-sand text-slateiq";

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium", styles)}>
      <span aria-hidden>{gap.matched ? "✓" : "○"}</span>
      {gap.label}
    </span>
  );
}
