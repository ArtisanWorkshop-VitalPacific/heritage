import type { Passage } from "../types";
import { RUNGS } from "./rungs";

/** The passage for a rung, or the nearest one below it. */
export function passageFor(rung: number): Passage | undefined {
  for (let n = Math.min(40, Math.max(1, rung)); n >= 1; n--) {
    const p = RUNGS.find((r) => r.n === n)?.passage;
    if (p) return p;
  }
  return RUNGS.find((r) => r.passage)?.passage;
}

/** All passages, lowest rung first. */
export const PASSAGES: Passage[] = RUNGS.flatMap((r) => (r.passage ? [r.passage] : []));

/** Splits a passage into display tokens: words keep their punctuation for display, `clean` for scoring. */
export interface Token {
  i: number; // word index within the passage
  display: string; // as printed, with punctuation
  clean: string; // lowercase letters and apostrophes only
  sentence: number;
}

export function tokenize(sentences: string[]): Token[] {
  const out: Token[] = [];
  let i = 0;
  sentences.forEach((s, si) => {
    for (const raw of s.split(/\s+/).filter(Boolean)) {
      const clean = raw.toLowerCase().replace(/[^a-z']/g, "").replace(/^'+|'+$/g, "");
      if (!clean) continue;
      out.push({ i: i++, display: raw, clean, sentence: si });
    }
  });
  return out;
}
