import { fetchJson } from "../connectors/utils.js";

export async function pushGreenhouseCandidate(
  apiKey: string,
  candidate: { name: string; email?: string; headline: string },
  jobId?: string,
): Promise<{ atsId: string }> {
  const [firstName, ...rest] = candidate.name.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;

  const body: Record<string, unknown> = {
    first_name: firstName,
    last_name: lastName,
    company: candidate.headline.slice(0, 120),
    title: candidate.headline.slice(0, 120),
  };
  if (candidate.email) {
    body.email_addresses = [{ value: candidate.email, type: "personal" }];
  }
  if (jobId) body.applications = [{ job_id: Number(jobId) }];

  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  const { ok, data, status } = await fetchJson<{ id: number }>(
    "https://harvest.greenhouse.io/v1/candidates",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "On-Behalf-Of": process.env.GREENHOUSE_ON_BEHALF_OF ?? "",
      },
      body: JSON.stringify(body),
    },
  );

  if (!ok || !data?.id) {
    throw new Error(`greenhouse_push_failed:${status}`);
  }
  return { atsId: String(data.id) };
}
