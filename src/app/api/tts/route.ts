export const dynamic = "force-dynamic";

/**
 * ElevenLabs text to speech, used only when ELEVENLABS_API_KEY is set.
 * Otherwise returns 204 and the client uses the browser voice.
 * ELEVENLABS_VOICE_ID / ELEVENLABS_VOICE_ID_UK choose the American and British narrators.
 */

// Gentle, warm female defaults from the ElevenLabs library. Replace with the licensed tutor voice.
const DEFAULT_US = "EXAVITQu4vr4xnSDxMaL"; // "Sarah"
const DEFAULT_UK = "pFZP5JQG7iQjIQuC4Bku"; // "Lily"

const SPEED: Record<string, number> = { word: 0.82, sentence: 0.9, story: 0.94, talk: 0.95 };

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return new Response(null, { status: 204 });

  let body: { text?: string; narrator?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Send JSON with a text field." }, { status: 400 });
  }
  const text = String(body.text ?? "").trim().slice(0, 600);
  if (!text) return Response.json({ error: "Text is empty." }, { status: 400 });

  const british = body.narrator === "british";
  const voice = (british ? process.env.ELEVENLABS_VOICE_ID_UK : process.env.ELEVENLABS_VOICE_ID) || (british ? DEFAULT_UK : DEFAULT_US);
  const model = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: SPEED[body.kind ?? "sentence"] ?? 0.9 },
    }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);

  if (!res || !res.ok || !res.body) return new Response(null, { status: 204 });
  return new Response(res.body, { headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=86400" } });
}
