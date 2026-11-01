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

import { canStretch, stressedVowel, type Narrator } from "./ladder/stretch";
import { buildStretched, pcmToFloat, sourceText, wav } from "./stretch-audio";

export type SpeechKind = "word" | "sentence" | "story" | "talk";
export const SPEECH_KINDS: readonly SpeechKind[] = ["word", "sentence", "story", "talk"];

const VOICES = {
  american: ["3cb1kceDIYlJwnoZWqaw" /* Gentle Mara */, "XrExE9yKIg1WjnnlVkGX" /* Matilda */],
  british: ["ymZ2m14IsFBURjROEE2J" /* Sandy Soft */, "pFZP5JQG7iQjIQuC4Bku" /* Lily */],
} as const;

const STABLE = "eleven_multilingual_v2";
// Lesson words are recorded once with Eleven v4, said slowly, then cut into their parts.
const STRETCH_MODEL = "eleven_v4";
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

interface Attempt {
  model: string;
  body: Record<string, unknown>;
}

/** Tries each voice in turn, and each attempt (model and text) for that voice, until one answers. */
async function firstThatSpeaks(key: string, narrator: string, attempts: () => Attempt[]): Promise<SpeechResult> {
  const failures: SpeechFailure[] = [];
  for (const voice of voicesFor(narrator)) {
    for (const { model, body } of attempts()) {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({ ...body, model_id: model }),
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

/** Speaks `text` with the first voice and model that works. Square brackets never come from callers. */
export async function synthesize(key: string, rawText: string, narrator: string, kind: SpeechKind): Promise<SpeechResult> {
  const text = rawText.replace(/[[\]]/g, "").trim().slice(0, 600);
  return firstThatSpeaks(key, narrator, () => modelsFor(kind).map((model) => ({ model, body: payload(text, model, kind) })));
}

/** Sample rate of the recordings the stretched words are cut from. Below 44.1 kHz, which needs a Pro plan. */
const SOURCE_RATE = 24000;

export type StretchResult =
  | { ok: true; wav: Uint8Array<ArrayBuffer>; model: string; voice: string; failures: SpeechFailure[] }
  | { ok: false; failures: SpeechFailure[] };

/**
 * A lesson word the way a teacher models it on the ladder: "top" becomes "ta, ah, op... top".
 * The word is recorded once, with per-letter timings, and the parts are cut from that recording,
 * so the vowel in every part is the vowel of the word. Null when the word has no stretched form.
 */
export async function synthesizeStretched(key: string, word: string, narrator: Narrator): Promise<StretchResult | null> {
  if (!canStretch(word)) return null;
  const stressed = stressedVowel(word);
  const failures: SpeechFailure[] = [];
  for (const voice of voicesFor(narrator)) {
    for (const model of [STRETCH_MODEL, STABLE]) {
      if (refused.has(model)) continue;
      const body =
        model === STABLE
          ? { text: sourceText(word), model_id: model, voice_settings: { stability: 0.7, similarity_boost: 0.8, style: 0, use_speaker_boost: true, speed: 0.8 } }
          : { text: `[slowly] ${sourceText(word)}`, model_id: model, voice_settings: { stability: 0.5 } };
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=pcm_${SOURCE_RATE}`, {
        method: "POST",
        headers: { "xi-api-key": key, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      }).catch(() => null);

      if (!res?.ok) {
        const detail = res ? (await res.text().catch(() => "")).slice(0, 300) : "network error";
        failures.push({ model, voice, status: res?.status ?? null, detail });
        if (res && (res.status === 401 || res.status === 429)) return { ok: false, failures };
        if (res && res.status === 400 && /model/i.test(detail) && !/voice/i.test(detail)) refused.add(model);
        if (res && (res.status === 404 || /voice/i.test(detail))) break;
        continue;
      }

      const json = (await res.json().catch(() => null)) as {
        audio_base64?: string;
        alignment?: Parameters<typeof buildStretched>[2] | null;
        normalized_alignment?: Parameters<typeof buildStretched>[2] | null;
      } | null;
      const align = json?.alignment ?? json?.normalized_alignment;
      const built = json?.audio_base64 && align ? buildStretched(pcmToFloat(Buffer.from(json.audio_base64, "base64")), SOURCE_RATE, align, word, stressed) : null;
      if (!built) {
        failures.push({ model, voice, status: 200, detail: "the word or its vowel could not be found in the recording" });
        continue;
      }
      return { ok: true, wav: wav(built.samples, SOURCE_RATE), model, voice, failures };
    }
  }
  return { ok: false, failures };
}
