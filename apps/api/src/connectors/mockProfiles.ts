import { randomUUID } from "crypto";
import type { ParsedJD, ProfileSource, RawCandidateProfile } from "@sourceiq/shared";

const NAMES = [
  "Priya Sharma",
  "Arjun Patel",
  "Meera Iyer",
  "Rohan Gupta",
  "Ananya Reddy",
  "Vikram Singh",
  "Sarah Chen",
  "James Okonkwo",
  "Elena Vasquez",
  "David Kim",
  "Aisha Khan",
  "Marcus Webb",
  "Nina Kowalski",
  "Omar Hassan",
  "Lisa Park",
];

const ROLE_SNIPPETS = [
  "Staff engineer",
  "Senior IC",
  "Tech lead",
  "Full stack",
  "Platform engineer",
  "Backend-leaning full stack",
  "Frontend specialist",
  "Founding engineer",
];

let mockSeq = 0;

export function mockProfiles(
  source: ProfileSource,
  parsedJd: ParsedJD,
  count: number,
): RawCandidateProfile[] {
  const skills = parsedJd.skills.length ? parsedJd.skills : ["TypeScript", "React", "Node.js"];
  const usedNames = new Set<string>();

  return Array.from({ length: count }, (_, batchIdx) => {
    const idx = mockSeq++;
    let name = NAMES[idx % NAMES.length];
    if (usedNames.has(name)) {
      name = `${name} (${source})`;
    }
    usedNames.add(name);

    const skillA = skills[batchIdx % skills.length] ?? skills[0];
    const skillB = skills[(batchIdx + 1) % skills.length] ?? skills[0];
    const role = ROLE_SNIPPETS[idx % ROLE_SNIPPETS.length];
    const headline = `${role} · ${skillA} + ${skillB}`;

    return {
      source,
      externalId: `${source}-${randomUUID().slice(0, 8)}`,
      profileUrl: `https://example.com/${source}/${idx}`,
      name,
      headline,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}.${source}@email.com`,
      location: parsedJd.location ?? "Remote",
      skills: [...new Set([skillA, skillB, ...skills.slice(0, 3)])].slice(0, 6),
      companies: [parsedJd.company ?? "Acme Corp", "Previous Inc"],
      yearsExperience: (parsedJd.yearsExperience ?? 5) + (batchIdx % 3) - 1,
      salarySignal: source === "naukri" ? `${24 + batchIdx}-${28 + batchIdx} LPA` : undefined,
      noticePeriod: source === "naukri" ? "30 days" : undefined,
      recency: batchIdx % 3 === 0 ? "high" : "moderate",
      raw: { mock: true, source, index: idx },
    };
  });
}
