import type { Candidate, Job } from "@sourceiq/shared";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Box } from "../components/Box";
import { GapInline } from "../components/GapInline";
import { MatchBadge } from "../components/MatchBadge";
import { SourceDot } from "../components/SourceDot";
import { CandidateContactDetails } from "../components/CandidateContactDetails";
import { contactFromCandidate } from "../lib/candidateContact";
import { PageHeader } from "../components/ui/PageHeader";
import api from "../lib/api";

export function CandidateProfile() {
  const { candidateId } = useParams();
  const id = useMemo(() => candidateId ?? "", [candidateId]);
  const [data, setData] = useState<{ candidate: Candidate; job: Job } | null>(null);
  const [budget, setBudget] = useState("");
  const [notice, setNotice] = useState("");
  const [savingComp, setSavingComp] = useState(false);
  const [compMsg, setCompMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api(`/candidates/${id}`);
      if (!cancelled) {
        setData({ candidate: res.candidate, job: res.job });
        setBudget(String(res.candidate.salarySignal ?? ""));
        setNotice(String(res.candidate.noticePeriod ?? ""));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const saveCompensation = async () => {
    if (!data) return;
    setSavingComp(true);
    setCompMsg(null);
    try {
      const res = await api(`/candidates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          salarySignal: budget.trim(),
          noticePeriod: notice.trim(),
        }),
      });
      setData({ ...data, candidate: res.candidate as Candidate });
      setCompMsg("Budget & notice saved.");
    } catch (e) {
      setCompMsg(String(e));
    } finally {
      setSavingComp(false);
    }
  };

  if (!data) {
    return <p className="text-sm text-ink-muted">Loading profile…</p>;
  }

  const { candidate, job } = data;

  return (
    <Box>
      <Box className="mb-4 flex items-center gap-1 text-sm text-ink-muted">
        <Link to="/jobs" className="hover:text-ocean">
          Jobs
        </Link>
        <span>›</span>
        <Link to={`/jobs/${job.id}/ranked`} className="hover:text-ocean">
          {job.title}
        </Link>
        <span>›</span>
        <span className="text-ink">{candidate.name}</span>
      </Box>

      <PageHeader
        title={candidate.name}
        subtitle={candidate.headline}
        actions={
          <Box className="flex items-center gap-2">
            <MatchBadge score={candidate.matchScore} gaps={candidate.gaps} />
            <Link to={`/jobs/${candidate.jobId}/outreach`} className="btn-success">
              Draft outreach
            </Link>
          </Box>
        }
      />

      <Box className="grid gap-5 lg:grid-cols-3">
        <Box className="card card-pad lg:col-span-1">
          <img
            src={candidate.avatarUrl ?? ""}
            alt=""
            className="mx-auto h-24 w-24 rounded-2xl border border-ink/10 bg-sand object-cover"
          />
          <Box className="mt-4 text-center">
            <SourceDot source={candidate.source} label />
            <p className="mt-2 text-xs capitalize text-ink-muted">Stage: {candidate.stage}</p>
            <p className="text-xs text-ink-muted">Outreach: {candidate.contactStatus.replace("_", " ")}</p>
          </Box>
          <CandidateContactDetails contact={contactFromCandidate(candidate)} className="mt-4 text-left" />

          <section className="mt-4 rounded-xl border border-ink/8 bg-sand/60 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slateiq">
              Budget / compensation
            </p>
            <label className="mt-2 block">
              <span className="label">Expected CTC / budget</span>
              <input
                className="input mt-1"
                placeholder="e.g. 18–22 LPA"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </label>
            <label className="mt-2 block">
              <span className="label">Notice period</span>
              <input
                className="input mt-1"
                placeholder="e.g. 30 days / Immediate"
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn-primary mt-3 w-full text-sm"
              disabled={savingComp}
              onClick={() => void saveCompensation()}
            >
              {savingComp ? "Saving…" : "Save budget"}
            </button>
            {compMsg ? <p className="mt-2 text-xs text-ink-muted">{compMsg}</p> : null}
          </section>
        </Box>

        <Box className="space-y-5 lg:col-span-2">
          <section className="card card-pad">
            <h2 className="text-sm font-semibold text-ink">Why this match</h2>
            <ul className="mt-3 space-y-2">
              {candidate.strengths.map((s) => (
                <li key={s} className="flex gap-2 text-sm text-ink/90">
                  <span className="text-emerald">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </section>

          <section className="card card-pad">
            <h2 className="text-sm font-semibold text-ink">Gap analysis</h2>
            <Box className="mt-3 flex flex-wrap gap-2">
              {candidate.gaps.map((g) => (
                <GapInline key={g.id} gap={g} />
              ))}
            </Box>
            <p className="mt-3 text-xs text-ink-muted">
              Must-have gaps highlight in coral; nice-to-have in amber; informational in slate.
            </p>
          </section>
        </Box>
      </Box>
    </Box>
  );
}
