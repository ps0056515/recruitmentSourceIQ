import { fetchJson } from "../connectors/utils.js";

export async function pushLeverCandidate(
  apiKey: string,
  candidate: { name: string; email?: string; headline: string },
  postingId?: string,
): Promise<{ atsId: string }> {
  const body: Record<string, unknown> = {
    name: candidate.name,
    headline: candidate.headline,
    emails: candidate.email ? [candidate.email] : [],
  };

  const base = postingId
    ? `https://api.lever.co/v1/postings/${postingId}/apply`
    : "https://api.lever.co/v1/opportunities";

  const { ok, data, status } = await fetchJson<{ data?: { id: string }; id?: string }>(base, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      postingId
        ? { personalInformation: [{ name: "name", value: candidate.name }], ...body }
        : { name: candidate.name, headline: candidate.headline, emails: body.emails },
    ),
  });

  const id = data?.data?.id ?? data?.id;
  if (!ok || !id) throw new Error(`lever_push_failed:${status}`);
  return { atsId: id };
}
