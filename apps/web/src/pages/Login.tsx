import type { UserRole } from "@sourceiq/shared";
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { IconSpark } from "../components/Icons";
import { InputField } from "../components/ui/InputField";
import { TrustPill } from "../components/ui/TrustPill";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/cn";

const ROLES: { value: UserRole; label: string; hint: string }[] = [
  { value: "recruiter", label: "Recruiter", hint: "Full sourcing workflow" },
  { value: "hm", label: "Hiring manager", hint: "Review shortlists & pipeline" },
  { value: "leadership", label: "Leadership", hint: "Analytics & ROI" },
];

function IconMail() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

export function Login() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState("recruiter@sourceiq.local");
  const [password, setPassword] = useState("password");
  const [role, setRole] = useState<UserRole>("recruiter");

  const canSubmit = useMemo(() => email.includes("@") && password.length > 2, [email, password]);

  if (user) return <Navigate to="/jobs" replace />;

  return (
    <div className="relative min-h-full overflow-hidden bg-charcoal">
      {/* Background */}
      <div
        className="pointer-events-none absolute inset-0 bg-hero-photo bg-cover bg-center bg-no-repeat"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-hero-mesh" aria-hidden />

      {/* Top nav */}
      <header className="relative z-20 nav-glass">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-action shadow-glow">
              <IconSpark className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white">
              source<span className="text-flare">IQ</span>
            </span>
          </div>
          <button type="button" className="btn-ghost-light hidden text-sm sm:inline-flex">
            Product tour
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12 lg:px-8 lg:pb-20 lg:pt-12">
        {/* Left — story */}
        <div className="animate-fade-up max-w-xl">
          <div className="mb-6 flex flex-wrap gap-2">
            <TrustPill>8 sourcing channels</TrustPill>
            <TrustPill>AI gap analysis</TrustPill>
            <TrustPill>Pipeline + outreach</TrustPill>
          </div>

          <h1 className="hero-headline">
            Your next great hire <span className="hero-highlight">starts here</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/75 sm:text-lg">
            Parse JDs in seconds, discover across LinkedIn, GitHub, Naukri and more — then rank every candidate with
            explainable AI match scores your team can trust.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#sign-in" className="btn-primary px-8 py-3.5 text-base shadow-glow">
              Enter workspace →
            </a>
            <span className="flex items-center gap-2 text-sm text-white/50">
              <span className="flex -space-x-2">
                {["PS", "AR", "SC"].map((initials) => (
                  <span
                    key={initials}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-charcoal bg-charcoal-muted text-[10px] font-bold text-white"
                  >
                    {initials}
                  </span>
                ))}
              </span>
              500+ recruiters on demo data
            </span>
          </div>
        </div>

        {/* Right — sign-in card */}
        <div id="sign-in" className="animate-fade-up lg:-mt-4" style={{ animationDelay: "0.1s" }}>
          <div className="card-elevated overflow-hidden rounded-3xl">
            <div className="border-b border-zinc-100 bg-gradient-to-br from-zinc-50 to-white px-6 py-5 sm:px-8">
              <span className="badge-accent">Workspace access</span>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">Sign in to sourceIQ</h2>
              <p className="mt-1 text-sm text-ink-muted">Demo environment — any password works</p>
            </div>

            <form
              className="space-y-4 px-6 py-6 sm:px-8 sm:py-7"
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit && !loading) void login(email, password, role);
              }}
            >
              <InputField
                label="Work email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@company.com"
                icon={<IconMail />}
              />
              <InputField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                icon={<IconLock />}
              />

              <fieldset>
                <legend className="label">Your role</legend>
                <div className="mt-1 grid gap-2">
                  {ROLES.map((r) => (
                    <label
                      key={r.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition",
                        role === r.value
                          ? "border-action bg-action-light/60 shadow-sm"
                          : "border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50",
                      )}
                    >
                      <input
                        type="radio"
                        name="role"
                        className="mt-1 accent-action"
                        checked={role === r.value}
                        onChange={() => setRole(r.value)}
                      />
                      <span>
                        <span className="block text-sm font-bold text-ink">{r.label}</span>
                        <span className="block text-xs text-ink-muted">{r.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button type="submit" disabled={!canSubmit || loading} className="btn-primary w-full py-3.5 text-base">
                {loading ? "Opening workspace…" : "Continue to workspace →"}
              </button>

              <p className="text-center text-xs text-ink-faint">
                By continuing you agree to our demo terms. No real data is sent to third parties.
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom stats strip */}
      <div className="relative z-10 border-t border-white/10 bg-charcoal/60 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-6 sm:grid-cols-4 sm:px-8">
          {[
            { v: "40%", l: "Faster shortlists" },
            { v: "8", l: "Source channels" },
            { v: "91%", l: "Avg match clarity" },
            { v: "24/7", l: "AI ranking" },
          ].map(({ v, l }) => (
            <div key={l} className="text-center sm:text-left">
              <p className="font-display text-2xl font-extrabold text-flare">{v}</p>
              <p className="text-xs font-medium text-white/50">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
