import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/cn";
import { IconChart, IconInbox, IconJobs, IconSpark } from "./Icons";

const NAV = [
  { to: "/jobs", label: "Jobs", icon: IconJobs },
  { to: "/inbox", label: "Inbox", icon: IconInbox },
  { to: "/analytics", label: "Analytics", icon: IconChart },
] as const;

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const inJob = /^\/jobs\/[^/]+/.test(loc.pathname);

  return (
    <div className="flex min-h-full bg-sand-surface">
      {/* Desktop sidebar */}
      <aside className="sidebar-dark hidden w-64 shrink-0 md:flex">
        <div className="border-b border-white/5 px-5 py-6">
          <Link to="/jobs" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-action shadow-glow">
              <IconSpark className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              source<span className="text-flare">IQ</span>
            </span>
          </Link>
          <p className="mt-2 text-xs font-medium text-white/40">AI sourcing workspace</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/jobs"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                  isActive
                    ? "bg-action text-white shadow-md shadow-action/30"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/5 p-4">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur">
            <p className="truncate text-sm font-semibold text-white">{user?.email}</p>
            <p className="text-xs capitalize text-flare">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full rounded-full border border-white/15 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm md:hidden">
          <Link to="/jobs" className="flex items-center gap-2 font-extrabold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-action text-white">
              <IconSpark className="h-4 w-4" />
            </span>
            <span>
              source<span className="text-flare">IQ</span>
            </span>
          </Link>
          <div className="flex gap-1">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    isActive ? "bg-action text-white" : "text-ink-muted",
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </header>

        <main className={cn("mx-auto w-full flex-1 px-4 py-6 sm:px-6 lg:px-8", inJob ? "max-w-6xl" : "max-w-5xl")}>
          {children}
        </main>
      </div>
    </div>
  );
}
