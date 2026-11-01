import type { WordOutcome } from "./types";

/**
 * Aligns what the recognizer heard against the passage.
 * Signatures are stable; the optional `opts` argument adds names (pass `passage.cast`)
 * so the recognizer's spellings of names (Jen, Jenn) are not marked as misreadings.
 */

export interface AlignOptions {
  /** Proper names in the passage (Passage.cast). Names match forgivingly. */
  names?: string[];
}

/** Groups of words the recognizer cannot tell apart. Any member matches any other. */
const HOMOPHONE_GROUPS: string[][] = [
  ["to", "two", "too"], ["for", "four", "fore"], ["one", "won"], ["sun", "son"], ["red", "read"], ["read", "reed"],
  ["see", "sea"], ["i", "eye", "aye"], ["be", "bee"], ["hi", "high"], ["no", "know"], ["so", "sew", "sow"],
  ["meet", "meat"], ["tail", "tale"], ["pail", "pale"], ["sail", "sale"], ["rain", "reign", "rein"], ["week", "weak"],
  ["dear", "deer"], ["their", "there", "they're"], ["ate", "eight"], ["nun", "none"], ["hour", "our"], ["by", "buy", "bye"],
  ["wood", "would"], ["not", "knot"], ["new", "knew"], ["right", "write"], ["hear", "here"], ["your", "you're"],
  ["blue", "blew"], ["made", "maid"], ["mail", "male"], ["peek", "peak"], ["plain", "plane"], ["road", "rode", "rowed"],
  ["rose", "rows"], ["hole", "whole"], ["which", "witch"], ["flour", "flower"], ["hare", "hair"], ["bear", "bare"],
  ["pear", "pair"], ["tea", "tee"], ["beet", "beat"], ["jim", "gym"], ["nose", "knows"], ["cell", "sell"],
  ["sent", "cent", "scent"], ["sum", "some"], ["in", "inn"], ["led", "lead"], ["night", "knight"], ["heel", "heal"],
  ["feet", "feat"], ["seem", "seam"], ["wait", "weight"], ["way", "weigh"], ["toe", "tow"], ["hay", "hey"],
  ["ant", "aunt"], ["add", "ad"], ["fir", "fur"], ["herd", "heard"], ["main", "mane"], ["real", "reel"],
  ["seen", "scene"], ["stair", "stare"], ["tide", "tied"], ["toad", "towed"], ["we", "wee"], ["horse", "hoarse"],
  ["board", "bored"], ["cheap", "cheep"], ["groan", "grown"], ["him", "hymn"], ["oar", "or", "ore"], ["pain", "pane"],
  ["roll", "role"], ["root", "route"], ["tow", "toe"], ["moose", "mousse"], ["hall", "haul"], ["ball", "bawl"],
  ["mom", "mum", "mam", "mama"], ["dad", "da"], ["ok", "okay"], ["gray", "grey"], ["color", "colour"],
];

const HOMOPHONES = new Map<string, Set<string>>();
for (const g of HOMOPHONE_GROUPS) for (const w of g) {
  const s = HOMOPHONES.get(w) ?? new Set<string>();
  g.forEach((x) => x !== w && s.add(x));
  HOMOPHONES.set(w, s);
}

const NUMBERS: Record<string, string> = {
  "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine",
  "10": "ten", "11": "eleven", "12": "twelve", "13": "thirteen", "14": "fourteen", "15": "fifteen", "16": "sixteen",
  "17": "seventeen", "18": "eighteen", "19": "nineteen", "20": "twenty", "30": "thirty", "40": "forty", "50": "fifty",
  "100": "hundred", "1st": "first", "2nd": "second", "3rd": "third",
};

export function normalizeWord(w: string): string {
  const s = String(w ?? "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9']/g, "")
    .replace(/^'+|'+$/g, "");
  return NUMBERS[s] ?? s;
}

/** Splits recognizer text into normalized words ("6" -> "six", "Dad’s" -> "dad's"). */
export function splitHeard(text: string): string[] {
  return String(text ?? "")
    .split(/[\s\-–—]+/)
    .map(normalizeWord)
    .filter(Boolean);
}

function lev(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array<number>(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

/** A rough sound key for names: Jen ~ Jenn, Kate ~ Cate, Gail ~ Gale, Liz ~ Lizz. */
function nameKey(s: string): string {
  return s
    .replace(/'s$/, "")
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/c(?=[aou]|$)/g, "k")
    .replace(/q/g, "k")
    .replace(/x/g, "ks")
    .replace(/(ee|ea|ie)/g, "i")
    .replace(/(ai|ay|ae|ey|ei)/g, "a")
    .replace(/(oa|ow|oe)/g, "o")
    .replace(/y$/, "i")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/([^aeiou])e$/, "$1");
}

function nameSet(opts?: AlignOptions): Set<string> {
  return new Set((opts?.names ?? []).map(normalizeWord).filter(Boolean));
}

function matchNormalized(t: string, h: string, names: Set<string>): boolean {
  if (!t || !h) return false;
  if (t === h) return true;
  const ta = t.replace(/'/g, "");
  const ha = h.replace(/'/g, "");
  if (ta === ha) return true; // it's / its, dad's / dads, can't / cant
  if (HOMOPHONES.get(t)?.has(h) || HOMOPHONES.get(ta)?.has(ha)) return true;
  const base = t.replace(/'s$/, "");
  if (names.has(base)) {
    // "Hank's" heard as "hanks" compares as hank / hank.
    const hn = t.endsWith("'s") && ha.endsWith("s") ? ha.slice(0, -1) : h.replace(/'s$/, "");
    if (nameKey(base) === nameKey(hn)) return true;
    if (base.length >= 3 && base[0] === hn[0] && lev(base, hn) <= 1) return true;
    if (base.length >= 5 && lev(base, hn) <= 2) return true;
  }
  return false;
}

/**
 * True when the heard word counts as reading the target word.
 * Plural or ending slips (cat / cats, jump / jumped) are not matches.
 */
export function wordsMatch(target: string, heard: string, opts?: AlignOptions): boolean {
  return matchNormalized(normalizeWord(target), normalizeWord(heard), nameSet(opts));
}

/** Names guessed from the passage when none are given: capitalized words inside a sentence. */
function guessNames(target: string[]): Set<string> {
  const out = new Set<string>();
  target.forEach((raw, i) => {
    if (i === 0 || !/^[A-Z][a-z]/.test(raw)) return;
    const prev = target[i - 1];
    if (/[.!?]["”’)]*$/.test(prev)) return;
    out.add(normalizeWord(raw).replace(/'s$/, ""));
  });
  return out;
}

/**
 * Needleman-Wunsch alignment of target words against heard words.
 * Labels each target word correct, substitution or omission; extra heard words are insertions.
 */
export function alignReading(target: string[], heard: string[], opts?: AlignOptions): WordOutcome[] {
  const names = opts?.names ? nameSet(opts) : guessNames(target);
  const T = target.map(normalizeWord);
  const H = heard.map(normalizeWord).filter(Boolean);
  const m = T.length;
  const n = H.length;
  const GAP = -1;
  const ok = (i: number, j: number) => matchNormalized(T[i], H[j], names);
  const score = (i: number, j: number) => (ok(i, j) ? 2 : -1);
  const S: number[][] = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) S[i][0] = i * GAP;
  for (let j = 1; j <= n; j++) S[0][j] = j * GAP;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) S[i][j] = Math.max(S[i - 1][j - 1] + score(i - 1, j - 1), S[i - 1][j] + GAP, S[i][j - 1] + GAP);

  const out: WordOutcome[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && S[i][j] === S[i - 1][j - 1] + score(i - 1, j - 1)) {
      out.push({ word: target[i - 1], index: i - 1, status: ok(i - 1, j - 1) ? "correct" : "substitution", heard: H[j - 1] });
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
 * Index of the next word the child should read, given everything heard so far.
 * Aligns the whole transcript against each prefix of the passage and keeps the best,
 * so a repeated phrase (the child re-reading, or the recognizer echoing earlier text)
 * never pushes the underline ahead, and a revised interim word cannot jump it forward.
 * Pass the previous value as `floor` to keep the underline from moving back.
 */
export function liveProgress(target: string[], heard: string[], opts?: AlignOptions & { floor?: number }): number {
  const floor = Math.max(0, Math.min(target.length, opts?.floor ?? 0));
  const names = opts?.names ? nameSet(opts) : guessNames(target);
  const T = target.map(normalizeWord);
  const H = heard.map(normalizeWord).filter(Boolean);
  if (!H.length || !T.length) return floor;
  const MATCH = 2;
  const SUB = -1;
  const OMIT = -1.5;
  const INSERT = -0.5;
  const m = T.length;
  const n = H.length;
  // S[i][j]: best score aligning target[0..i) with heard[0..j).
  let prev = Array<number>(n + 1);
  prev[0] = 0;
  for (let j = 1; j <= n; j++) prev[j] = j * INSERT;
  let best = 0;
  let bestScore = prev[n];
  for (let i = 1; i <= m; i++) {
    const cur = Array<number>(n + 1);
    cur[0] = i * OMIT;
    for (let j = 1; j <= n; j++) {
      const diag = prev[j - 1] + (matchNormalized(T[i - 1], H[j - 1], names) ? MATCH : SUB);
      cur[j] = Math.max(diag, prev[j] + OMIT, cur[j - 1] + INSERT);
    }
    if (cur[n] > bestScore) {
      bestScore = cur[n];
      best = i;
    }
    prev = cur;
  }
  return Math.max(floor, best);
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
