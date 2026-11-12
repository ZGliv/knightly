import { COACH_SYSTEM, MAX_BODY_CHARS, coachPrompt, validateCoachRequest } from "@/lib/masters/coach";

// Reads the environment on every request, so whether coaching is available follows the deployment.
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-5-5";
const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2026-10-21";

const apiKey = () => process.env.ANTHROPIC_API_KEY?.trim() || null;

/** Lets the page decide whether to offer "Why this move?". */
export function GET() {
  return Response.json({ available: apiKey() !== null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const key = apiKey();
  if (!key) return Response.json({ error: "Coach explanations are not set up." }, { status: 501 });

  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return Response.json({ error: "Request too large." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 });
  }
  const checked = validateCoachRequest(body);
  if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 });

  let upstream: Response;
  try {
    upstream = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        // A short explanation: thinking would spend the small token budget before any text.
        thinking: { type: "disabled" },
        system: COACH_SYSTEM,
        messages: [{ role: "user", content: coachPrompt(checked.facts) }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return Response.json({ error: "The coach could not be reached. Try again." }, { status: 502 });
  }
  if (!upstream.ok) {
    // Only the status is logged: never the request headers, which carry the key.
    console.error(`Coach request failed with status ${upstream.status}`);
    return Response.json({ error: "The coach is unavailable right now. Try again later." }, { status: 502 });
  }
  const data = (await upstream.json().catch(() => null)) as {
    stop_reason?: string;
    content?: { type: string; text?: string }[];
  } | null;
  const explanation = data?.content
    ?.filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("")
    .trim();
  if (!explanation || data?.stop_reason === "refusal")
    return Response.json({ error: "The coach had no explanation for this move." }, { status: 502 });
  return Response.json({ explanation }, { headers: { "Cache-Control": "no-store" } });
}
