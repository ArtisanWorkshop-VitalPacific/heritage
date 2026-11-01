import type { WordOutcome } from "./types";

/**
 * Aligns what the recognizer heard against the passage.
 * ENGINE AGENT OWNS THIS FILE: keep these signatures; improve matching and add tests.
 */

const HOMOPHONES: Record<string, string[]> = {
  to: ["two", "too"],
  two: ["to", "too"],
  for: ["four", "fore"],
  one: ["won"],
  sun: ["son"],
  red: ["read"],
  read: ["red", "reed"],
  see: ["sea"],
  sea: ["see"],
  i: ["eye", "aye"],
  be: ["bee"],
  bee: ["be"],
  hi: ["high"],
  no: ["know"],
  so: ["sew", "sow"],
  meet: ["meat"],
  meat: ["meet"],
  tail: ["tale"],
  pail: ["pale"],
  sail: ["sale"],
  rain: ["reign", "rein"],
  week: ["weak"],
  dear: ["deer"],
  their: ["there"],
  there: ["their"],
  ate: ["eight"],
  nun: ["none"],
  ned: ["ned's"],
  mom: ["mum", "mam"],
  ok: ["okay"],
};

const NUMBERS: Record<string, string> = { "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten" };

export function normalizeWord(w: string): string {
  const s = w.toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z0-9']/g, "").replace(/^'+|'+$/g, "");
  return NUMBERS[s] ?? s;
}

/** Splits recognizer text into normalized words. */
export function splitHeard(text: string): string[] {
  return text.split(/\s+/).map(normalizeWord).filter(Boolean);
}

function lev(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

export function wordsMatch(target: string, heard: string): boolean {
  const t = normalizeWord(target);
  const h = normalizeWord(heard);
  if (!t || !h) return false;
  if (t === h) return true;
  if (t.replace(/'s$/, "") === h.replace(/'s$/, "")) return true;
  if (HOMOPHONES[t]?.includes(h)) return true;
  if (t.length >= 5 && lev(t, h) <= 1) return true;
  return false;
}

/**
 * Needleman-Wunsch alignment of target words against heard words.
 * Labels each target word correct, substitution or omission; extra heard words are insertions.
 */
export function alignReading(target: string[], heard: string[]): WordOutcome[] {
  const T = target.map(normalizeWord);
  const H = heard.map(normalizeWord).filter(Boolean);
  const m = T.length;
  const n = H.length;
  const GAP = -1;
  const score = (i: number, j: number) => (wordsMatch(T[i], H[j]) ? 2 : -1);
  const S: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) S[i][0] = i * GAP;
  for (let j = 1; j <= n; j++) S[0][j] = j * GAP;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) S[i][j] = Math.max(S[i - 1][j - 1] + score(i - 1, j - 1), S[i - 1][j] + GAP, S[i][j - 1] + GAP);

  const out: WordOutcome[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && S[i][j] === S[i - 1][j - 1] + score(i - 1, j - 1)) {
      const ok = wordsMatch(T[i - 1], H[j - 1]);
      out.push({ word: target[i - 1], index: i - 1, status: ok ? "correct" : "substitution", heard: H[j - 1] });
      i--;
      j--;
    } else if (i > 0 && S[i][j] === S[i - 1][j] + GAP) {
      out.push({ word: target[i - 1], index: i - 1, status: "omission" });
      i--;
    } else {
      out.push({ word: H[j - 1], index: -1, status: "insertion", heard: H[j - 1] });
      j--;
    }
  }
  return out.reverse();
}

/**
 * Index of the next word the child should read, given the words heard so far.
 * Greedy and forgiving: looks ahead up to three words for a match.
 */
export function liveProgress(target: string[], heard: string[]): number {
  let p = 0;
  for (const h of heard) {
    for (let k = 0; k < 3 && p + k < target.length; k++) {
      if (wordsMatch(target[p + k], h)) {
        p = p + k + 1;
        break;
      }
    }
    if (p >= target.length) break;
  }
  return p;
}

/** Words correct per minute. */
export function wcpm(correct: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round((correct * 60) / Math.max(seconds, 5));
}

/** Accuracy over target words (insertions do not count against it). */
export function accuracyOf(outcomes: WordOutcome[]): number {
  const targets = outcomes.filter((o) => o.index >= 0);
  if (!targets.length) return 0;
  return targets.filter((o) => o.status === "correct").length / targets.length;
}
