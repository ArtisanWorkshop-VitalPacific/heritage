/**
 * Mrs. Wren's voice on the server: ElevenLabs text to speech. Used by /api/tts and the health probe.
 *
 * Voices (override with ELEVENLABS_VOICE_ID / ELEVENLABS_VOICE_ID_UK):
 *   American: Gentle Mara, a gentle, slow-paced voice. Fallback: Matilda (premade).
 *   British:  Sandy Soft, a mature, soft voice with controlled pacing. Fallback: Lily (premade).
 *
 * Models (override with ELEVENLABS_MODEL / ELEVENLABS_WORD_MODEL):
 *   Lines, stories and talk: Eleven v4 Turbo, the fast expressive model, then Eleven v4.
 *     v4 has no speed setting, so pacing comes from audio tags and punctuation.
 *   Single words and sounds: Multilingual v2 at a slow speed, which keeps phonics clear.
 *   Every request falls back to Multilingual v2 if a newer model refuses it.
 */

export type SpeechKind = "word" | "sentence" | "story" | "talk";
export const SPEECH_KINDS: readonly SpeechKind[] = ["word", "sentence", "story", "talk"];

const VOICES = {
  american: ["3cb1kceDIYlJwnoZWqaw" /* Gentle Mara */, "XrExE9yKIg1WjnnlVkGX" /* Matilda */],
  british: ["ymZ2m14IsFBURjROEE2J" /* Sandy Soft */, "pFZP5JQG7iQjIQuC4Bku" /* Lily */],
} as const;

const STABLE = "eleven_multilingual_v2";
const SPEED: Record<SpeechKind, number> = { word: 0.8, sentence: 0.9, story: 0.92, talk: 0.94 };
// Delivery for the expressive models. A tag holds until the next one.
const DIRECTION: Record<SpeechKind, string> = {
  word: "[softly] [slowly]",
  sentence: "[warmly]",
  story: "[warmly] [slowly]",
  talk: "[warmly]",
};

// Models that refused a request are skipped by this server instance from then on.
const refused = new Set<string>();

export function modelsFor(kind: SpeechKind): string[] {
  const env = kind === "word" ? process.env.ELEVENLABS_WORD_MODEL : process.env.ELEVENLABS_MODEL;
  const preferred = env ? [env] : kind === "word" ? [STABLE] : ["eleven_v4_turbo", "eleven_v4"];
  return [...preferred, STABLE].filter((m, i, a) => a.indexOf(m) === i && !refused.has(m));
}

export function voicesFor(narrator: string): string[] {
  const british = narrator === "british";
  const env = british ? process.env.ELEVENLABS_VOICE_ID_UK : process.env.ELEVENLABS_VOICE_ID;
  const list: readonly string[] = british ? VOICES.british : VOICES.american;
  return [env, ...list].filter((v, i, a): v is string => Boolean(v) && a.indexOf(v) === i);
}

const expressive = (model: string) => /^eleven_v[34]/.test(model);

function payload(text: string, model: string, kind: SpeechKind) {
  if (expressive(model)) {
    // v3 and v4 read only stability. Audio tags carry the warmth and the pace.
    return { text: `${DIRECTION[kind]} ${text}`, model_id: model, voice_settings: { stability: 0.5 } };
  }
  return {
    text,
    model_id: model,
    voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: SPEED[kind] },
  };
}

export interface SpeechFailure {
  model: string;
  voice: string;
  status: number | null;
  detail: string;
}

export type SpeechResult =
  | { ok: true; audio: ReadableStream<Uint8Array>; model: string; voice: string; failures: SpeechFailure[] }
  | { ok: false; failures: SpeechFailure[] };

/** Speaks `text` with the first voice and model that works. Square brackets never come from callers. */
export async function synthesize(key: string, rawText: string, narrator: string, kind: SpeechKind): Promise<SpeechResult> {
  const text = rawText.replace(/[[\]]/g, "").trim().slice(0, 600);
  const failures: SpeechFailure[] = [];
  for (const voice of voicesFor(narrator)) {
    for (const model of modelsFor(kind)) {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify(payload(text, model, kind)),
        signal: AbortSignal.timeout(15000),
      }).catch(() => null);

      if (res?.ok && res.body) return { ok: true, audio: res.body, model, voice, failures };

      const detail = res ? (await res.text().catch(() => "")).slice(0, 300) : "network error";
      failures.push({ model, voice, status: res?.status ?? null, detail });
      // A bad key or an exhausted quota fails the same way for every voice and model.
      if (res && (res.status === 401 || res.status === 429)) return { ok: false, failures };
      if (res && res.status === 400 && /model/i.test(detail) && !/voice/i.test(detail)) refused.add(model);
      // A voice that cannot be found or used: move on to the next voice.
      if (res && (res.status === 404 || /voice/i.test(detail))) break;
    }
  }
  return { ok: false, failures };
}
