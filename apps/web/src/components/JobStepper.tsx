import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/cn";

const STEPS = [
  { key: "setup", label: "Job brief", path: (id: string) => `/jobs/${id}/setup` },
  { key: "discover", label: "Discovery", path: (id: string) => `/jobs/${id}/discover` },
  { key: "ranked", label: "Candidates", path: (id: string) => `/jobs/${id}/ranked` },
  { key: "pipeline", label: "Pipeline", path: (id: string) => `/jobs/${id}/pipeline` },
  { key: "outreach", label: "Outreach", path: (id: string) => `/jobs/${id}/outreach` },
] as const;

function activeStep(pathname: string) {
  if (pathname.includes("/setup")) return "setup";
  if (pathname.includes("/discover")) return "discover";
  if (pathname.includes("/ranked") || pathname.includes("/candidates/")) return "ranked";
  if (pathname.includes("/pipeline")) return "pipeline";
  if (pathname.includes("/outreach")) return "outreach";
  return "setup";
}

export function JobStepper({ jobId }: { jobId: string }) {
  const { pathname } = useLocation();
  const current = activeStep(pathname);

  return (
    <nav aria-label="Job workflow" className="mb-6 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 rounded-2xl border border-zinc-200/80 bg-white p-1.5 shadow-card">
        {STEPS.map((step, i) => {
          const isActive = current === step.key;
          const isPast = STEPS.findIndex((s) => s.key === current) > i;
          return (
            <li key={step.key} className="flex items-center">
              <Link
                to={step.path(jobId)}
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm",
                  isActive && "bg-action text-white shadow-md shadow-action/25",
                  !isActive && isPast && "text-emerald-deep hover:bg-emerald-light",
                  !isActive && !isPast && "text-ink-muted hover:bg-zinc-50 hover:text-ink",
                )}
              >
                <span className="mr-1.5 hidden opacity-70 sm:inline">{i + 1}.</span>
                {step.label}
              </Link>
              {i < STEPS.length - 1 ? <span className="mx-0.5 text-zinc-300">›</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
