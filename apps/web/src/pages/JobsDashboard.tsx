import type { Job } from "@sourceiq/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IconChevron, IconPlus } from "../components/Icons";
import { TrustPill } from "../components/ui/TrustPill";
import { PageHeader } from "../components/ui/PageHeader";
import { Modal } from "../components/ui/Modal";
import { EmptyState } from "../components/ui/EmptyState";
import api from "../lib/api";

export function JobsDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("Senior Software Engineer");
  const [company, setCompany] = useState("sourceIQ Demo Co.");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api(`/jobs`);
      setJobs(data.jobs);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createJob = async () => {
    setCreating(true);
    try {
      const data = await api(`/jobs`, { method: "POST", body: JSON.stringify({ title, company }) });
      setJobs((prev) => [data.job, ...prev]);
      setModalOpen(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  const totalMatched = jobs.reduce((s, j) => s + (j.stats?.matched ?? 0), 0);
  const totalReplies = jobs.reduce((s, j) => s + (j.stats?.replies ?? 0), 0);

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      {/* Hero strip */}
      <section className="relative overflow-hidden rounded-none bg-charcoal px-4 py-10 sm:px-8 sm:py-12 lg:rounded-3xl lg:mx-0">
        <div className="pointer-events-none absolute inset-0 bg-hero-mesh opacity-80" aria-hidden />
        <div className="relative">
          <div className="mb-4 flex flex-wrap gap-2">
            <TrustPill variant="dark">Live demo data</TrustPill>
            <TrustPill variant="dark">{jobs.length} active roles</TrustPill>
            <TrustPill variant="dark">{totalMatched} candidates ranked</TrustPill>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Your hiring pipeline, <span className="text-flare">supercharged</span>
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/65">
            Brief → multi-source discovery → AI-ranked shortlists → pipeline → outreach. One workspace, zero chaos.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button type="button" className="btn-primary px-6 py-3" onClick={() => setModalOpen(true)}>
              <IconPlus /> New job
            </button>
            <dl className="flex gap-6 text-sm">
              <div>
                <dt className="text-white/45">Replies</dt>
                <dd className="text-xl font-extrabold text-white">{totalReplies}</dd>
              </div>
              <div>
                <dt className="text-white/45">Matched</dt>
                <dd className="text-xl font-extrabold text-flare">{totalMatched}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="mt-8 px-0 sm:px-0">
        <PageHeader
          title="Your jobs"
          subtitle="Pick a role to continue sourcing — each card tracks match, outreach, and replies."
          actions={
            <button type="button" className="btn-secondary lg:hidden" onClick={() => setModalOpen(true)}>
              <IconPlus /> New job
            </button>
          }
        />

        {error ? (
          <div className="mb-4 rounded-xl border border-coral/30 bg-coral-light px-4 py-3 text-sm text-coral">{error}</div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="job-card animate-pulse">
                <div className="h-5 w-2/3 rounded-lg bg-zinc-200" />
                <div className="mt-3 h-4 w-1/3 rounded bg-zinc-100" />
                <div className="mt-6 grid grid-cols-3 gap-2">
                  <div className="h-14 rounded-xl bg-zinc-100" />
                  <div className="h-14 rounded-xl bg-zinc-100" />
                  <div className="h-14 rounded-xl bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            description="Create your first role to parse a JD and start multi-source discovery."
            action={
              <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
                Create a job
              </button>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {jobs.map((j) => (
              <article key={j.id} className="group job-card">
                <div className="job-card-accent" aria-hidden />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-ink">{j.title}</h2>
                    <p className="text-sm font-medium text-ink-muted">{j.company}</p>
                  </div>
                  {j.parsedJd ? (
                    <span className="rounded-full bg-emerald-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-deep">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slateiq">
                      Draft
                    </span>
                  )}
                </div>

                <dl className="mt-5 grid grid-cols-3 gap-2 text-xs">
                  <div className="stat-tile">
                    <dt className="font-medium text-ink-faint">Matched</dt>
                    <dd className="mt-0.5 text-lg font-extrabold text-ink">{j.stats?.matched ?? 0}</dd>
                  </div>
                  <div className="stat-tile">
                    <dt className="font-medium text-ink-faint">Outreach</dt>
                    <dd className="mt-0.5 text-lg font-extrabold text-ink">{j.stats?.outreachSent ?? 0}</dd>
                  </div>
                  <div className="stat-tile">
                    <dt className="font-medium text-ink-faint">Replies</dt>
                    <dd className="mt-0.5 text-lg font-extrabold text-action">{j.stats?.replies ?? 0}</dd>
                  </div>
                </dl>

                <Link
                  to={`/jobs/${j.id}/setup`}
                  className="mt-5 flex w-full items-center justify-center gap-1 rounded-full bg-action py-3 text-sm font-bold text-white shadow-md shadow-action/20 transition hover:bg-action-hover"
                >
                  {j.parsedJd ? "Continue workflow" : "Set up job brief"}
                  <IconChevron className="text-white/80" />
                </Link>

                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-4">
                  <QuickLink to={`/jobs/${j.id}/discover`} label="Discovery" />
                  <QuickLink to={`/jobs/${j.id}/ranked`} label="Candidates" />
                  <QuickLink to={`/jobs/${j.id}/pipeline`} label="Pipeline" />
                  <QuickLink to={`/jobs/${j.id}/outreach`} label="Outreach" />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create a new job"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={creating || !title.trim()} onClick={() => void createJob()}>
              {creating ? "Creating…" : "Create job"}
            </button>
          </>
        }
      >
        <label className="block">
          <span className="label">Job title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="mt-4 block">
          <span className="label">Company</span>
          <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
        </label>
      </Modal>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-ink-muted transition hover:border-action/30 hover:text-action"
    >
      {label}
    </Link>
  );
}
