/**
 * Builds the stretched audio for a lesson word from one natural recording of the word, so every
 * part carries the same vowel the voice uses in the word itself: "top" becomes
 * "to (ta), o (ah, held), op... top". Speech engines change a vowel when it is said on its own
 * (a short u comes out rounded, like "oo"), so the vowel is never synthesized alone: it is cut from
 * the word and held with WSOLA, which lengthens a sound without changing its pitch or quality.
 *
 * Input: 16-bit PCM and the per-character timings ElevenLabs returns with it.
 */

export interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/* Words with two pronunciations are recorded in a short phrase that fixes the lesson reading. */
const CARRIER: Record<string, string> = {
  read: "to read",
  wind: "the wind",
  use: "we use",
  bow: "we bow",
  row: "a row",
  close: "so close",
};

/** The text to record for a lesson word. */
export const sourceText = (word: string) => `${CARRIER[word] ?? word}.`;

const VOWEL_LETTER = /[aeiou]/;

/**
 * Letter range [from, to) of the vowel the lesson teaches, given which vowel sound carries the
 * stress (0 for the first). A vowel team is one unit (ea, oa, ow, ay), as is a vowel with r (ar,
 * or, er) and igh. The u in qu is a consonant. A silent final e is never a vowel sound of its own.
 */
export function vowelLetters(word: string, stressed = 0): [number, number] | null {
  const w = word.toLowerCase();
  const runs: [number, number][] = [];
  let i = 0;
  while (i < w.length) {
    const isVowel = VOWEL_LETTER.test(w[i]) && !(w[i] === "u" && w[i - 1] === "q");
    if (!isVowel) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < w.length && VOWEL_LETTER.test(w[j])) j++;
    if (w.startsWith("gh", j) && w[j - 1] === "i") j += 2;
    else if (j < w.length && /[wy]/.test(w[j])) j++;
    else if (j < w.length && w[j] === "r" && !VOWEL_LETTER.test(w[j + 1] ?? "")) j++;
    runs.push([i, j]);
    i = j;
  }
  // A final e after a consonant is silent (cake, home, cube).
  const last = runs[runs.length - 1];
  if (runs.length > 1 && last && last[0] === w.length - 1 && w.endsWith("e")) runs.pop();
  return runs[Math.min(stressed, runs.length - 1)] ?? null;
}

/** Index of the first letter in the alignment, past any leading spaces or tags. */
const firstLetter = (chars: string) => chars.replace(/\[[^\]]*\]/g, (m) => " ".repeat(m.length)).search(/[a-z]/);

const hann = (n: number) => Float32Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));

/** Lengthens a sound by `factor` without changing its pitch or vowel quality (WSOLA). */
export function stretch(x: Float32Array, factor: number, sampleRate: number): Float32Array {
  const n = Math.round(0.03 * sampleRate);
  if (x.length < n * 2 || factor <= 1) return x.slice();
  const hs = Math.floor(n / 2);
  const ha = hs / factor;
  const tol = Math.round(0.008 * sampleRate);
  const outLen = Math.round(x.length * factor);
  const y = new Float32Array(outLen + n);
  const norm = new Float32Array(outLen + n);
  const win = hann(n);
  let prev = 0;
  for (let k = 0; k * hs < outLen; k++) {
    let best = Math.min(Math.round(k * ha), x.length - n);
    if (k > 0) {
      const natural = prev + hs;
      let score = -Infinity;
      for (let d = -tol; d <= tol; d++) {
        const p = Math.round(k * ha) + d;
        if (p < 0 || p + n > x.length) continue;
        let s = 0;
        for (let i = 0; i < n; i += 2) s += (natural + i < x.length ? x[natural + i] : 0) * x[p + i];
        if (s > score) {
          score = s;
          best = p;
        }
      }
    }
    best = Math.max(0, Math.min(best, x.length - n));
    for (let i = 0; i < n; i++) {
      y[k * hs + i] += x[best + i] * win[i];
      norm[k * hs + i] += win[i];
    }
    prev = best;
  }
  for (let i = 0; i < outLen; i++) if (norm[i] > 1e-3) y[i] /= norm[i];
  return y.slice(0, outLen);
}

function fade(x: Float32Array, inSec: number, outSec: number, sampleRate: number): Float32Array {
  const y = x.slice();
  const a = Math.min(Math.round(inSec * sampleRate), y.length >> 1);
  const b = Math.min(Math.round(outSec * sampleRate), y.length >> 1);
  for (let i = 0; i < a; i++) y[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / a);
  for (let i = 0; i < b; i++) y[y.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / b);
  return y;
}

interface Frames {
  rms: number[];
  zcr: number[];
  hop: number;
}

function frames(x: Float32Array, from: number, to: number, sampleRate: number): Frames {
  const hop = Math.round(0.01 * sampleRate);
  const len = Math.round(0.02 * sampleRate);
  const rms: number[] = [];
  const zcr: number[] = [];
  for (let s = from; s + len <= to; s += hop) {
    let e = 0;
    let z = 0;
    for (let i = s; i < s + len; i++) {
      e += x[i] * x[i];
      if (i > s && x[i] >= 0 !== x[i - 1] >= 0) z++;
    }
    rms.push(Math.sqrt(e / len));
    zcr.push(z / len);
  }
  return { rms, zcr, hop };
}

export interface StretchTiming {
  /** Pause between the parts, and before the whole word, in seconds. */
  gap: number;
  beforeWord: number;
  /** How long the held vowel lasts, in seconds. */
  hold: number;
}

export const TIMING: StretchTiming = { gap: 0.2, beforeWord: 0.55, hold: 0.6 };

export interface Built {
  samples: Float32Array;
  /** Where the vowel was found in the recording, in seconds. For checks and logs. */
  vowel: [number, number];
  word: [number, number];
}

/**
 * Cuts the parts from the recording and joins them: onset with vowel, the vowel held, the vowel
 * with the rest, then the whole word. Null when the timings do not locate the word or its vowel.
 */
export function buildStretched(
  pcm: Float32Array,
  sampleRate: number,
  align: Alignment,
  word: string,
  stressed = 0,
  timing: StretchTiming = TIMING,
): Built | null {
  const chars = align.characters.map((c) => c.toLowerCase()).join("");
  const at = chars.lastIndexOf(word.toLowerCase());
  const letters = vowelLetters(word, stressed);
  if (at < 0 || !letters) return null;
  const t0 = align.character_start_times_seconds;
  const t1 = align.character_end_times_seconds;
  const sec = (s: number) => Math.max(0, Math.min(pcm.length, Math.round(s * sampleRate)));

  // The word, from its first letter to its last, trimmed to where there is sound. A word recorded
  // after a carrier ("to read") starts exactly at its first letter.
  let ws = sec(t0[at] - (at === firstLetter(chars) ? 0.03 : 0));
  let we = sec(t1[at + word.length - 1] + 0.12);
  const f = frames(pcm, ws, we, sampleRate);
  if (!f.rms.length) return null;
  const peak = Math.max(...f.rms);
  const loud = f.rms.map((r) => r > peak * 0.03);
  const first = loud.indexOf(true);
  const last = loud.lastIndexOf(true);
  if (first < 0) return null;
  we = Math.min(pcm.length, ws + (last + 2) * f.hop + Math.round(0.02 * sampleRate));
  ws = ws + first * f.hop;

  // The vowel: the letters' timings, narrowed to the voiced frames around them.
  const ls = sec(t0[at + letters[0]]);
  const le = sec(t1[at + letters[1] - 1]);
  const g = frames(pcm, ws, we, sampleRate);
  const gpeak = Math.max(...g.rms);
  const voiced = g.rms.map((r, i) => r > gpeak * 0.25 && g.zcr[i] < 0.15);
  let a = Math.min(voiced.length - 1, Math.max(0, Math.round(((ls + le) / 2 - ws) / g.hop)));
  if (!voiced[a]) {
    // Nearest voiced frame to the middle of the letters.
    let best = -1;
    for (let d = 1; d < voiced.length && best < 0; d++) {
      if (voiced[a - d]) best = a - d;
      else if (voiced[a + d]) best = a + d;
    }
    if (best < 0) return null;
    a = best;
  }
  let b = a;
  while (a > 0 && voiced[a - 1]) a--;
  while (b < voiced.length - 1 && voiced[b + 1]) b++;
  // A voiced run can carry on into a nasal or l (hum, hill): keep to the vowel letters, with 30 ms either side.
  const margin = Math.round(0.03 * sampleRate);
  let vs = Math.max(ws, ws + a * g.hop, ls - margin);
  let ve = Math.min(we, ws + (b + 2) * g.hop, le + margin);
  if (ve - vs < 0.06 * sampleRate) {
    vs = Math.max(ws, ws + a * g.hop);
    ve = Math.min(we, ws + (b + 2) * g.hop);
  }
  if (ve - vs < 0.06 * sampleRate) return null;

  const cut = (from: number, to: number) => pcm.slice(from, to);
  const hasOnset = vs - ws > 0.03 * sampleRate;
  const hasCoda = we - ve > 0.03 * sampleRate;
  const trim = Math.round((ve - vs) * 0.12);
  const steady = cut(vs + trim, ve - trim);
  const held = fade(stretch(steady, Math.min(4, Math.max(1, (timing.hold * sampleRate) / steady.length)), sampleRate), 0.03, 0.04, sampleRate);

  const parts: Float32Array[] = [];
  if (hasOnset) parts.push(fade(cut(ws, ve), 0.005, 0.03, sampleRate));
  parts.push(held);
  if (hasCoda) parts.push(fade(cut(vs, we), 0.015, 0.01, sampleRate));
  const whole = fade(cut(ws, we), 0.005, 0.01, sampleRate);

  const gap = Math.round(timing.gap * sampleRate);
  const lead = Math.round(0.05 * sampleRate);
  const total = lead + parts.reduce((s, p) => s + p.length, 0) + gap * (parts.length - 1) + Math.round(timing.beforeWord * sampleRate) + whole.length + lead;
  const out = new Float32Array(total);
  let pos = lead;
  parts.forEach((p, i) => {
    out.set(p, pos);
    pos += p.length + (i < parts.length - 1 ? gap : 0);
  });
  pos += Math.round(timing.beforeWord * sampleRate);
  out.set(whole, pos);

  // Level: the loudest sample at -1 dBFS.
  let max = 0;
  for (const s of out) max = Math.max(max, Math.abs(s));
  if (max > 0) {
    const k = 0.89 / max;
    for (let i = 0; i < out.length; i++) out[i] *= k;
  }
  return { samples: out, vowel: [vs / sampleRate, ve / sampleRate], word: [ws / sampleRate, we / sampleRate] };
}

/** Little-endian 16-bit PCM bytes to samples in [-1, 1]. */
export function pcmToFloat(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Float32Array(bytes.byteLength >> 1);
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
}

/** A mono 16-bit WAV file. */
export function wav(samples: Float32Array, sampleRate: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const v = new DataView(bytes.buffer);
  const text = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  text(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  return bytes;
}
