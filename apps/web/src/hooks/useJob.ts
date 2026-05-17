import type { Job } from "@sourceiq/shared";
import { useEffect, useState } from "react";
import api from "../lib/api";

export function useJob(jobId: string | undefined) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await api(`/jobs/${jobId}`);
        if (!cancelled) setJob(data.job as Job);
      } catch (e) {
        if (!cancelled) {
          const data = await api(`/jobs`).catch(() => null);
          const found = data ? (data.jobs as Job[]).find((j) => j.id === jobId) ?? null : null;
          if (found) setJob(found);
          else setError(String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return { job, loading, error };
}
