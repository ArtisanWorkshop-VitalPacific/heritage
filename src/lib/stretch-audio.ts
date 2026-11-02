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
  // 25 ms frames; a short vowel (a short a before t can be under 80 ms) gets frames half its length.
  const n = Math.max(Math.round(0.01 * sampleRate), Math.min(Math.round(0.025 * sampleRate), Math.floor(x.length / 2)));
  if (x.length < n * 2 || factor <= 1) return x.slice();
  const hs = Math.floor(n / 2);
  const ha = hs / factor;
  const tol = Math.min(Math.round(0.006 * sampleRate), Math.floor(n / 3));
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

/** Sets the loudest sample at -1 dBFS. */
function level(x: Float32Array): Float32Array {
  let max = 0;
  for (const v of x) max = Math.max(max, Math.abs(v));
  if (max > 0) {
    const k = 0.89 / max;
    for (let i = 0; i < x.length; i++) x[i] *= k;
  }
  return x;
}

/** Evens out the loudness of a held vowel (within 6 dB) so it does not fade or swell. */
function even(x: Float32Array, sampleRate: number): Float32Array {
  const block = Math.round(0.02 * sampleRate);
  const levels: number[] = [];
  for (let s = 0; s < x.length; s += block) {
    let e = 0;
    const end = Math.min(x.length, s + block);
    for (let i = s; i < end; i++) e += x[i] * x[i];
    levels.push(Math.sqrt(e / Math.max(1, end - s)));
  }
  const target = [...levels].sort((p, q) => p - q)[Math.floor(levels.length / 2)];
  if (!target) return x;
  const gains = levels.map((l) => (l > 0 ? Math.min(2, Math.max(0.5, target / l)) : 1));
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    // Linear between block centres, so the gain never steps.
    const pos = i / block - 0.5;
    const k = Math.max(0, Math.min(gains.length - 1, Math.floor(pos)));
    const t = Math.max(0, Math.min(1, pos - k));
    const gain = gains[k] * (1 - t) + gains[Math.min(gains.length - 1, k + 1)] * t;
    y[i] = x[i] * gain;
  }
  return y;
}

interface Frames {
  rms: number[];
  /** How periodic each frame is, 0 to 1: a vowel is periodic even when breathy; h, s, t and p are not. */
  pitch: number[];
  hop: number;
}

function frames(x: Float32Array, from: number, to: number, sampleRate: number, periodicity = false): Frames {
  const hop = Math.round(0.01 * sampleRate);
  const len = Math.round(0.03 * sampleRate);
  const minLag = Math.round(sampleRate / 400);
  const maxLag = Math.round(sampleRate / 80);
  const rms: number[] = [];
  const pitch: number[] = [];
  for (let s = from; s + len <= to; s += hop) {
    let e = 0;
    for (let i = s; i < s + len; i++) e += x[i] * x[i];
    rms.push(Math.sqrt(e / len));
    if (!periodicity) continue;
    let best = 0;
    const span = len - maxLag;
    if (e > 0 && span > 0) {
      for (let lag = minLag; lag <= maxLag; lag++) {
        let c = 0;
        let a = 0;
        let b = 0;
        for (let i = s; i < s + span; i++) {
          c += x[i] * x[i + lag];
          a += x[i] * x[i];
          b += x[i + lag] * x[i + lag];
        }
        if (a > 0 && b > 0) best = Math.max(best, c / Math.sqrt(a * b));
      }
    }
    pitch.push(best);
  }
  return { rms, pitch, hop };
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
  only?: "vowel",
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

  // The vowel: the voiced stretch nearest the vowel letters. Letter timings can lean into the
  // consonants, so they bound the vowel only where voicing carries on into a voiced consonant
  // (the b in "bog", the m in "hum"). After h, p, t, s and the like, the voicing itself marks the vowel.
  const ls = sec(t0[at + letters[0]]);
  const le = sec(t1[at + letters[1] - 1]);
  const g = frames(pcm, ws, we, sampleRate, true);
  const gpeak = Math.max(...g.rms);
  const voiced = g.rms.map((r, i) => r > gpeak * 0.12 && g.pitch[i] > 0.5);
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
  // A voiced stretch may dip for a frame or two (a breathy patch): bridge gaps of up to 20 ms.
  const on = (i: number) => voiced[i] || (voiced[i - 1] && (voiced[i + 1] || voiced[i + 2])) || (voiced[i + 1] && voiced[i - 2]);
  while (a > 0 && on(a - 1)) a--;
  while (b < voiced.length - 1 && on(b + 1)) b++;
  const runStart = Math.max(ws, ws + a * g.hop);
  const runEnd = Math.min(we, ws + (b + 3) * g.hop);
  const w = word.toLowerCase();
  const VOICED = /[bdgjlmnrvwyz]/;
  const onsetVoiced = letters[0] > 0 && (VOICED.test(w[letters[0] - 1]) || w.slice(letters[0] - 2, letters[0]) === "th");
  const codaVoiced = letters[1] < w.length && VOICED.test(w[letters[1]]);
  const margin = Math.round(0.03 * sampleRate);
  let vs = onsetVoiced ? Math.max(runStart, ls - margin) : runStart;
  let ve = codaVoiced ? Math.min(runEnd, le + margin) : runEnd;
  if (ve - vs < 0.05 * sampleRate) {
    vs = runStart;
    ve = runEnd;
  }
  // Too little voicing to trust: fall back to the letters' own timings.
  if (ve - vs < 0.04 * sampleRate && le - ls >= 0.04 * sampleRate) {
    vs = Math.max(ws, ls);
    ve = Math.min(we, le);
  }
  if (ve - vs < 0.04 * sampleRate) return null;
  // No onset runs longer than a slow, careful consonant: trims a breath or hum before the word.
  const maxOnset = Math.round((0.12 + 0.08 * letters[0]) * sampleRate);
  if (vs - ws > maxOnset) ws = vs - maxOnset;

  const cut = (from: number, to: number) => pcm.slice(from, to);
  // The spelling decides the parts: "up" has no onset part, "bee" no part after the vowel. A voiced
  // onset (b, d, g) can run into the vowel, so the audio alone would miss it.
  const hasOnset = letters[0] > 0;
  const hasCoda = letters[1] < word.length;
  // The middle of the vowel, away from the consonants on either side, held for `timing.hold` at an
  // even loudness.
  const trim = Math.round((ve - vs) * 0.15);
  const steady = cut(vs + trim, ve - trim);
  // A take whose vowel is breath or noise (an h or a t cut by mistake) is not used.
  const check = frames(steady, 0, steady.length, sampleRate, true);
  if (check.pitch.length && check.pitch.reduce((s, x) => s + x, 0) / check.pitch.length < 0.45) return null;
  const held = fade(even(stretch(steady, Math.min(14, Math.max(1, (timing.hold * sampleRate) / steady.length)), sampleRate), sampleRate), 0.03, 0.05, sampleRate);

  const lead = Math.round(0.05 * sampleRate);
  if (only === "vowel") {
    // The sound alone (ă, not "ay"), as McGuffey's phonic method teaches it before the letter's name.
    const out = new Float32Array(lead + held.length + lead);
    out.set(held, lead);
    return { samples: level(out), vowel: [vs / sampleRate, ve / sampleRate], word: [ws / sampleRate, we / sampleRate] };
  }

  const parts: Float32Array[] = [];
  if (hasOnset) parts.push(fade(cut(ws, ve), 0.005, 0.03, sampleRate));
  parts.push(held);
  if (hasCoda) parts.push(fade(cut(vs, we), 0.015, 0.01, sampleRate));
  const whole = fade(cut(ws, we), 0.005, 0.01, sampleRate);

  const gap = Math.round(timing.gap * sampleRate);
  const total = lead + parts.reduce((s, p) => s + p.length, 0) + gap * (parts.length - 1) + Math.round(timing.beforeWord * sampleRate) + whole.length + lead;
  const out = new Float32Array(total);
  let pos = lead;
  parts.forEach((p, i) => {
    out.set(p, pos);
    pos += p.length + (i < parts.length - 1 ? gap : 0);
  });
  pos += Math.round(timing.beforeWord * sampleRate);
  out.set(whole, pos);

  return { samples: level(out), vowel: [vs / sampleRate, ve / sampleRate], word: [ws / sampleRate, we / sampleRate] };
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
