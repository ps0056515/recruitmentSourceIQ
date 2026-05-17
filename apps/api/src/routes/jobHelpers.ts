import type { ParsedJD, SearchConfig } from "@sourceiq/shared";

export function jobToApi(row: {
  id: string;
  title: string;
  company: string;
  location: string | null;
  parsedJd: unknown;
  searchConfig: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string | null;
  _count?: { candidates: number };
}) {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location ?? undefined,
    parsedJd: row.parsedJd as ParsedJD | undefined,
    searchConfig: row.searchConfig as SearchConfig | undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ownerId: row.ownerId ?? undefined,
    stats: {
      scanned: 0,
      matched: row._count?.candidates ?? 0,
      shortlisted: 0,
      outreachSent: 0,
      replies: 0,
    },
  };
}
