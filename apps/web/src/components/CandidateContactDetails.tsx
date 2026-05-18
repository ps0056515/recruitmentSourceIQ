import type { CandidateContact } from "@sourceiq/shared";

function hasContact(c: CandidateContact): boolean {
  return Boolean(
    c.email || c.phone || c.location || c.linkedInUrl || c.githubUrl || c.portfolioUrl,
  );
}

export function CandidateContactDetails({
  contact,
  className = "mt-3",
}: {
  contact: CandidateContact;
  className?: string;
}) {
  if (!hasContact(contact)) {
    return (
      <p className={`text-xs text-ink-muted ${className}`}>
        No email or phone found in pasted resume — check the full profile or add manually.
      </p>
    );
  }

  const rows: Array<{ label: string; value: string; href?: string }> = [];
  if (contact.email) rows.push({ label: "Email", value: contact.email, href: `mailto:${contact.email}` });
  if (contact.phone) rows.push({ label: "Phone", value: contact.phone, href: `tel:${contact.phone.replace(/\s/g, "")}` });
  if (contact.location) rows.push({ label: "Location", value: contact.location });
  if (contact.linkedInUrl) rows.push({ label: "LinkedIn", value: "View profile", href: contact.linkedInUrl });
  if (contact.githubUrl) rows.push({ label: "GitHub", value: "View profile", href: contact.githubUrl });
  if (contact.portfolioUrl) rows.push({ label: "Portfolio", value: "Open site", href: contact.portfolioUrl });

  return (
    <div className={`rounded-xl border border-ink/8 bg-sand/60 px-3 py-2.5 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slateiq">Contact</p>
      <dl className="mt-2 space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-2 text-sm">
            <dt className="w-16 shrink-0 text-xs font-medium text-ink-muted">{row.label}</dt>
            <dd className="min-w-0 flex-1 truncate text-ink/90">
              {row.href ? (
                <a
                  href={row.href}
                  target={row.href.startsWith("http") ? "_blank" : undefined}
                  rel={row.href.startsWith("http") ? "noreferrer" : undefined}
                  className="font-medium text-ocean hover:underline"
                >
                  {row.value}
                </a>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
