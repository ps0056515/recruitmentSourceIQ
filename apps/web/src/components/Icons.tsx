import { cn } from "../lib/cn";

type IconProps = { className?: string };

const base = "inline-block shrink-0";

export function IconJobs({ className }: IconProps) {
  return (
    <svg className={cn(base, "h-5 w-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function IconInbox({ className }: IconProps) {
  return (
    <svg className={cn(base, "h-5 w-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 6h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
      <path d="m4 6 8 7 8-7" />
    </svg>
  );
}

export function IconChart({ className }: IconProps) {
  return (
    <svg className={cn(base, "h-5 w-5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 17V11" />
      <path d="M12 17V7" />
      <path d="M16 17v-4" />
    </svg>
  );
}

export function IconSpark({ className }: IconProps) {
  return (
    <svg className={cn(base, "h-5 w-5", className)} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.4 5.2L19 9l-5.6 1.8L12 16l-1.4-5.2L5 9l5.6-1.8L12 2z" />
    </svg>
  );
}

export function IconChevron({ className }: IconProps) {
  return (
    <svg className={cn(base, "h-4 w-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg className={cn(base, "h-4 w-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
