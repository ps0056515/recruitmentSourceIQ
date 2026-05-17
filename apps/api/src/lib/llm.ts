import Anthropic from "@anthropic-ai/sdk";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function claudeJson<T>(system: string, user: string): Promise<T | null> {
  if (!client) return null;
  try {
    const res = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    const text = block.text.trim();
    const json = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
    return JSON.parse(json) as T;
  } catch (e) {
    console.warn("[claude] call failed", e);
    return null;
  }
}

export async function claudeText(system: string, user: string): Promise<string | null> {
  if (!client) return null;
  try {
    const res = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = res.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : null;
  } catch {
    return null;
  }
}
