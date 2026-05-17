import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: ReactNode;
  hint?: string;
  variant?: "light" | "dark";
};

export function InputField({ label, icon, hint, variant = "light", className, ...props }: Props) {
  return (
    <label className="block">
      <span className={variant === "dark" ? "label-light" : "label"}>{label}</span>
      <span className="relative mt-0.5 block">
        {icon ? (
          <span
            className={cn(
              "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2",
              variant === "dark" ? "text-white/40" : "text-ink-faint",
            )}
          >
            {icon}
          </span>
        ) : null}
        <input
          className={cn(
            icon ? "input-with-icon" : "input",
            variant === "dark" && "input-dark",
            className,
          )}
          {...props}
        />
      </span>
      {hint ? <span className="mt-1 block text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}
