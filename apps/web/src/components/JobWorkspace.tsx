import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useJob } from "../hooks/useJob";
import { JobStepper } from "./JobStepper";
import { IconChevron } from "./Icons";

export function JobWorkspace({ children }: { children: ReactNode }) {
  const { jobId } = useParams();
  const id = jobId ?? "";
  const { job, loading } = useJob(id);

  return (
    <div>
      <div className="mb-4 flex items-center gap-1 text-sm text-ink-muted">
        <Link to="/jobs" className="hover:text-ocean">
          Jobs
        </Link>
        <IconChevron className="text-ink-faint" />
        <span className="font-medium text-ink">{loading ? "…" : (job?.title ?? "Job")}</span>
      </div>

      {job ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-ocean-light px-2.5 py-0.5 text-xs font-medium text-ocean">{job.company}</span>
          {job.parsedJd ? (
            <span className="rounded-full bg-emerald-light px-2.5 py-0.5 text-xs font-medium text-emerald">Brief ready</span>
          ) : (
            <span className="rounded-full bg-coral-light px-2.5 py-0.5 text-xs font-medium text-coral">Needs brief</span>
          )}
          <Link to={`/jobs/${id}/analytics`} className="ml-auto text-xs font-medium text-ocean hover:underline">
            Job analytics
          </Link>
        </div>
      ) : null}

      <JobStepper jobId={id} />
      {children}
    </div>
  );
}
