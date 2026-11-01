import { getCache, waitUntil } from "@vercel/functions";
import { synthesizeStretched } from "@/lib/eleven";
import { canStretch, type Narrator } from "@/lib/ladder/stretch";
import { STRETCH_VERSION } from "@/lib/stretch-version";

export const dynamic = "force-dynamic";

/**
 * A lesson word in Mrs. Wren's voice with the vowel held: GET /api/tts/word?w=top&n=american&v=1.
 * Only the lessons' decodable words are accepted, so the spend is bounded. Each word is generated
 * once per voice, kept in Vercel's runtime cache (which outlives deployments) and in the CDN, then
 * plays at once for everyone. 404 for words without a stretched form (the client then says them
 * plainly); 204 when ElevenLabs is not configured or cannot answer.
 */

// The runtime cache keeps each word for 30 days; the CDN keeps the response until STRETCH_VERSION changes.
const KEEP_SECONDS = 60 * 60 * 24 * 30;

interface Stored {
  audio: string; // base64 mp3
  model: string;
  voice: string;
}

function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

const noStore = { "cache-control": "no-store" };

function audio(bytes: Uint8Array<ArrayBuffer>, model: string, voice: string, source: "stored" | "new") {
  return new Response(bytes, {
    headers: {
      "content-type": "audio/mpeg",
      "content-length": String(bytes.byteLength),
      // The browser keeps it a day; the CDN keeps it until STRETCH_VERSION changes.
      "cache-control": "public, max-age=86400",
      "cdn-cache-control": "public, s-maxage=31536000, immutable",
      "x-tts-model": model,
      "x-tts-voice": voice,
      "x-tts-source": source,
    },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const word = (url.searchParams.get("w") ?? "").toLowerCase().trim();
  const narrator: Narrator = url.searchParams.get("n") === "british" ? "british" : "american";
  if (url.searchParams.get("v") !== STRETCH_VERSION) return new Response(null, { status: 404, headers: noStore });
  if (!/^[a-z]{1,24}$/.test(word) || !canStretch(word)) return new Response(null, { status: 404, headers: noStore });

  const cache = getCache({ namespace: "heritage-tts" });
  const slot = `word-v${STRETCH_VERSION}-${narrator}-${word}`;
  const stored = (await cache.get(slot).catch(() => null)) as Stored | null;
  if (stored && typeof stored.audio === "string") {
    return audio(new Uint8Array(Buffer.from(stored.audio, "base64")), stored.model, stored.voice, "stored");
  }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return new Response(null, { status: 204, headers: noStore });
  // Only the app itself may spend characters on a new word.
  if (!sameOrigin(req)) return new Response(null, { status: 403, headers: noStore });

  const result = await synthesizeStretched(key, word, narrator);
  if (!result) return new Response(null, { status: 404, headers: noStore });
  for (const f of result.failures) console.error(`[tts/word] ${word}: ${f.model} with voice ${f.voice} failed: ${f.status ?? "-"} ${f.detail}`);
  if (!result.ok) return new Response(null, { status: 204, headers: noStore });

  const bytes = new Uint8Array(await new Response(result.audio).arrayBuffer());
  const entry: Stored = { audio: Buffer.from(bytes).toString("base64"), model: result.model, voice: result.voice };
  waitUntil(
    cache.set(slot, entry, { ttl: KEEP_SECONDS, name: `${narrator} ${word}` }).catch((e) => console.error(`[tts/word] could not keep ${word}:`, e)),
  );
  return audio(bytes, result.model, result.voice, "new");
}
