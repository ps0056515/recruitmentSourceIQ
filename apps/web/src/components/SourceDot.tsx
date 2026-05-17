import type { ProfileSource } from "@sourceiq/shared";
import { SOURCE_COLORS } from "@sourceiq/shared";

export function SourceDot({ source, label }: { source: ProfileSource; label?: boolean }) {
  const color = SOURCE_COLORS[source];
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: color }} />
      {label ? (
        <span className="text-xs text-ink/80">{source === "manual_paste" ? "Manual import" : source.replace(/_/g, " ")}</span>
      ) : null}
    </span>
  );
}
