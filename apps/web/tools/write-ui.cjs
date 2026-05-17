const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "src");
const w = (rel, content) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
};

w(
  "lib/cn.ts",
  `export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
`,
);

w(
  "styles/index.css",
  `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body, #root { height: 100%; }
  body { @apply bg-sand text-ink font-sans; }
}

@layer components {
  .card { @apply rounded-2xl border border-ink/8 bg-white shadow-card; }
  .card-pad { @apply p-5 sm:p-6; }
  .btn {
    @apply inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/40 disabled:pointer-events-none disabled:opacity-50;
  }
  .btn-primary { @apply btn bg-ocean text-white hover:bg-ocean-deep; }
  .btn-secondary { @apply btn border border-ink/10 bg-white text-ink hover:bg-sand-dark/60; }
  .btn-ghost { @apply btn text-ink-muted hover:bg-ink/5; }
  .btn-success { @apply btn bg-emerald text-white hover:bg-emerald-deep; }
  .input {
    @apply w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint
      focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20;
  }
  .label { @apply block text-xs font-semibold uppercase tracking-wide text-slateiq mb-1.5; }
  .page-title { @apply text-2xl font-bold tracking-tight text-ink; }
  .page-sub { @apply mt-1 text-sm text-ink-muted max-w-2xl; }
}
`,
);

console.log("Base styles written");
