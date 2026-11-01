import { describe, expect, it } from "vitest";
import { buildStretched, pcmToFloat, sourceText, stretch, vowelLetters, wav } from "./stretch-audio";

const RATE = 24000;

/** A synthetic "top": a burst for t, a voiced vowel, a closure, a burst for p. */
export function fakeTop() {
  const seg = (sec: number, f: (t: number, i: number) => number) => Float32Array.from({ length: Math.round(sec * RATE) }, (_, i) => f(i / RATE, i));
  let seed = 7;
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const parts = [
    seg(0.05, () => 0),
    seg(0.05, () => 0.3 * noise()),
    seg(0.25, (t) => 0.5 * Math.sin(2 * Math.PI * 200 * t) + 0.2 * Math.sin(2 * Math.PI * 800 * t)),
    seg(0.07, () => 0),
    seg(0.03, () => 0.2 * noise()),
    seg(0.15, () => 0),
  ];
  const pcm = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
  let at = 0;
  for (const p of parts) {
    pcm.set(p, at);
    at += p.length;
  }
  const alignment = {
    characters: ["t", "o", "p", "."],
    character_start_times_seconds: [0.05, 0.1, 0.35, 0.45],
    character_end_times_seconds: [0.1, 0.35, 0.45, 0.5],
  };
  return { pcm, alignment };
}

const crossings = (x: Float32Array) => {
  let z = 0;
  for (let i = 1; i < x.length; i++) if (x[i] >= 0 !== x[i - 1] >= 0) z++;
  return z;
};

describe("the vowel the lesson teaches, in the spelling", () => {
  it("takes single vowels, teams, r-controlled vowels and igh as one unit", () => {
    expect(vowelLetters("top")).toEqual([1, 2]);
    expect(vowelLetters("boat")).toEqual([1, 3]);
    expect(vowelLetters("snow")).toEqual([2, 4]);
    expect(vowelLetters("play")).toEqual([2, 4]);
    expect(vowelLetters("car")).toEqual([1, 3]);
    expect(vowelLetters("her")).toEqual([1, 3]);
    expect(vowelLetters("night")).toEqual([1, 4]);
    expect(vowelLetters("up")).toEqual([0, 1]);
  });

  it("skips the u in qu and a silent final e, and follows the stress", () => {
    expect(vowelLetters("queen")).toEqual([2, 4]);
    expect(vowelLetters("cake")).toEqual([1, 2]);
    expect(vowelLetters("cube")).toEqual([1, 2]);
    expect(vowelLetters("rabbit", 0)).toEqual([1, 2]);
    expect(vowelLetters("upon", 1)).toEqual([2, 3]);
    expect(vowelLetters("inside", 1)).toEqual([3, 4]);
  });

  it("records words with two readings in a phrase that fixes the lesson reading", () => {
    expect(sourceText("read")).toBe("to read.");
    expect(sourceText("wind")).toBe("the wind.");
    expect(sourceText("top")).toBe("top.");
  });
});

describe("holding a vowel", () => {
  it("lengthens a sound without changing its pitch", () => {
    const x = Float32Array.from({ length: Math.round(0.2 * RATE) }, (_, i) => Math.sin((2 * Math.PI * 220 * i) / RATE));
    const y = stretch(x, 3, RATE);
    expect(y.length).toBe(Math.round(x.length * 3));
    const pitch = (s: Float32Array) => crossings(s) / 2 / (s.length / RATE);
    expect(Math.abs(pitch(y) - 220)).toBeLessThan(220 * 0.05);
  });
});

describe("building the stretched word", () => {
  it("cuts onset with vowel, the vowel held, the vowel with the rest, then the whole word", () => {
    const { pcm, alignment } = fakeTop();
    const built = buildStretched(pcm, RATE, alignment, "top", 0, { gap: 0.2, beforeWord: 0.55, hold: 0.6 })!;
    expect(built).not.toBeNull();
    expect(built.vowel[0]).toBeGreaterThan(0.08);
    expect(built.vowel[0]).toBeLessThan(0.13);
    expect(built.vowel[1]).toBeGreaterThan(0.32);
    expect(built.vowel[1]).toBeLessThan(0.38);
    expect(built.word[0]).toBeLessThan(0.07);
    expect(built.word[1]).toBeGreaterThan(0.47);
    const seconds = built.samples.length / RATE;
    expect(seconds).toBeGreaterThan(2.6);
    expect(seconds).toBeLessThan(3.3);
    expect(Math.max(...built.samples.map(Math.abs))).toBeCloseTo(0.89, 2);
  });

  it("holds a short, breathy vowel for the full hold (a short a between a long h and t)", () => {
    const seg = (sec: number, f: (t: number) => number) => Float32Array.from({ length: Math.round(sec * RATE) }, (_, i) => f(i / RATE));
    let seed = 11;
    const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    const parts = [
      seg(0.04, () => 0),
      seg(0.16, () => 0.12 * noise()),
      seg(0.08, (t) => 0.35 * Math.sin(2 * Math.PI * 190 * t) + 0.15 * Math.sin(2 * Math.PI * 950 * t) + 0.04 * noise()),
      seg(0.06, () => 0),
      seg(0.16, () => 0.15 * noise()),
      seg(0.1, () => 0),
    ];
    const pcm = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
    let at = 0;
    for (const p of parts) {
      pcm.set(p, at);
      at += p.length;
    }
    const alignment = {
      characters: ["h", "a", "t", "."],
      character_start_times_seconds: [0.04, 0.2, 0.28, 0.5],
      character_end_times_seconds: [0.2, 0.28, 0.5, 0.55],
    };
    const built = buildStretched(pcm, RATE, alignment, "hat", 0, { gap: 0.2, beforeWord: 0.55, hold: 0.6 })!;
    expect(built).not.toBeNull();
    expect(built.vowel[0]).toBeGreaterThan(0.17);
    expect(built.vowel[1]).toBeLessThan(0.32);
    // onset part, held vowel, rest, word: well over two and a half seconds with a 0.6 s hold.
    expect(built.samples.length / RATE).toBeGreaterThan(2.6);
  });

  it("finds the word after a carrier phrase, and gives up when the word is missing", () => {
    const { pcm, alignment } = fakeTop();
    expect(buildStretched(pcm, RATE, { ...alignment, characters: ["x", "y", "z", "."] }, "top")).toBeNull();
  });

  it("writes a 16-bit mono WAV", () => {
    const bytes = wav(new Float32Array([0, 0.5, -0.5]), RATE);
    const text = (o: number, n: number) => String.fromCharCode(...bytes.slice(o, o + n));
    expect(text(0, 4)).toBe("RIFF");
    expect(text(8, 4)).toBe("WAVE");
    expect(new DataView(bytes.buffer).getUint32(24, true)).toBe(RATE);
    expect(bytes.length).toBe(44 + 6);
    expect(Array.from(pcmToFloat(bytes.slice(44))).map((x) => Math.round(x * 10) / 10)).toEqual([0, 0.5, -0.5]);
  });
});
