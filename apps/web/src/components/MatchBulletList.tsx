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
  const techBullets = bullets.filter((b) => b.category !== "behavioral");
  const behBullets = bullets.filter((b) => b.category === "behavioral");
  const matchedTech = techBullets.filter((b) => b.matched);
  const gapTech = techBullets.filter((b) => !b.matched);
  const matchedBeh = behBullets.filter((b) => b.matched);
  const gapBeh = behBullets.filter((b) => !b.matched);

  const showSplit = counts.technicalTotal > 0 && counts.behavioralTotal > 0;

  return (
    <div className={className}>
      {counts.total > 0 ? (
        <p className="mb-2 text-xs font-medium text-ink-muted">
          Score: 80% technical + 20% behavioral
          {showSplit ? (
            <>
              {" "}
              · Technical {counts.technicalMatched}/{counts.technicalTotal} · Behavioral{" "}
              {counts.behavioralMatched}/{counts.behavioralTotal}
            </>
          ) : (
            <> · {counts.matched}/{counts.total} requirements matched</>
          )}
        </p>
      ) : null}

      {showSplit && matchedTech.length > 0 ? (
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald">
            Technical matched
          </p>
          <ul className="mt-1.5 space-y-2.5">
            {matchedTech.map((b) => (
              <BulletRow key={b.key} bullet={b} />
            ))}
          </ul>
        </div>
      ) : null}

      {showSplit && matchedBeh.length > 0 ? (
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald">
            Behavioral matched
          </p>
          <ul className="mt-1.5 space-y-2.5">
            {matchedBeh.map((b) => (
              <BulletRow key={b.key} bullet={b} />
            ))}
          </ul>
        </div>
      ) : null}

      {!showSplit && matched.length > 0 ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald">Matched</p>
          <ul className="mt-1.5 space-y-2.5">
            {matched.map((b) => (
              <BulletRow key={b.key} bullet={b} />
            ))}
          </ul>
        </div>
      ) : null}

      {showSplit && gapTech.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-coral">Technical gaps</p>
          <ul className="mt-1.5 space-y-2.5">
            {gapTech.map((b) => (
              <BulletRow key={b.key} bullet={b} />
            ))}
          </ul>
        </div>
      ) : null}

      {showSplit && gapBeh.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-coral">Behavioral gaps</p>
          <ul className="mt-1.5 space-y-2.5">
            {gapBeh.map((b) => (
              <BulletRow key={b.key} bullet={b} />
            ))}
          </ul>
        </div>
      ) : null}

      {!showSplit && gaps.length > 0 ? (
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
