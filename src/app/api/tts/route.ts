import { SPEECH_KINDS, synthesize, type SpeechKind } from "@/lib/eleven";

export const dynamic = "force-dynamic";

/**
 * Mrs. Wren's voice. ElevenLabs when ELEVENLABS_API_KEY is set (see src/lib/eleven.ts for the
 * voices and models); otherwise 204, and the client uses the browser voice.
 */

/** Only this site may spend the key: same-origin requests from a browser. */
function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return new Response(null, { status: 204 });
  if (!sameOrigin(req)) return new Response(null, { status: 403 });

  let body: { text?: string; narrator?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Send JSON with a text field." }, { status: 400 });
  }
  const text = String(body.text ?? "");
  if (!text.trim()) return Response.json({ error: "Text is empty." }, { status: 400 });
  const kind: SpeechKind = SPEECH_KINDS.includes(body.kind as SpeechKind) ? (body.kind as SpeechKind) : "sentence";

  const result = await synthesize(key, text, body.narrator ?? "american", kind);
  for (const f of result.failures) console.error(`[tts] ${f.model} with voice ${f.voice} failed: ${f.status ?? "-"} ${f.detail}`);
  if (!result.ok) return new Response(null, { status: 204 });

  return new Response(result.audio, {
    headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=86400", "x-tts-model": result.model, "x-tts-voice": result.voice },
  });
}
