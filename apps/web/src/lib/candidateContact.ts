import type { Candidate, CandidateContact } from "@sourceiq/shared";

export function contactFromCandidate(candidate: Candidate): CandidateContact {
  return {
    email: candidate.email,
    phone: candidate.phone,
    location: candidate.location,
    linkedInUrl: candidate.linkedInUrl ?? candidate.sourceUrl,
    githubUrl: candidate.githubUrl,
    portfolioUrl: candidate.portfolioUrl,
  };
}
