import type { Candidate } from "@sourceiq/shared";
import { matchBulletCounts, matchBulletsForCandidate } from "../lib/matchBullets";

export function MatchBulletList({
  candidate,
  className = "mt-3",
}: {
  candidate: Pick<Candidate, "strengths" | "gaps" | "aiSummary">;
  className?: string;
}) {
  const bullets = matchBulletsForCandidate(candidate);
  const counts = matchBulletCounts(candidate);

  if (!bullets.length) return null;

  const matched = bullets.filter((b) => b.matched);
  const gaps = bullets.filter((b) => !b.matched);

  return (
    <div className={className}>
      {counts.total > 0 ? (
        <p className="mb-2 text-xs font-medium text-ink-muted">
          {counts.matched}/{counts.total} key requirements matched
        </p>
      ) : null}

      {matched.length > 0 ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald">Matched</p>
          <ul className="mt-1.5 space-y-2.5">
            {matched.map((b) => (
              <BulletRow key={b.key} bullet={b} />
            ))}
          </ul>
        </div>
      ) : null}

      {gaps.length > 0 ? (
        <div className={matched.length ? "mt-4" : undefined}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-coral">Gaps</p>
          <ul className="mt-1.5 space-y-2.5">
            {gaps.map((b) => (
              <BulletRow key={b.key} bullet={b} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function BulletRow({ bullet }: { bullet: { label: string; matched: boolean; detail?: string } }) {
  return (
    <li className="flex gap-2 text-sm leading-snug text-ink/90">
      <span
        className={bullet.matched ? "shrink-0 text-emerald" : "shrink-0 text-coral"}
        aria-hidden
      >
        {bullet.matched ? "✓" : "○"}
      </span>
      <span>
        <span className="font-medium">{bullet.label}</span>
        {bullet.detail ? (
          <span className="mt-0.5 block text-xs font-normal text-ink-muted">{bullet.detail}</span>
        ) : null}
      </span>
    </li>
  );
}
