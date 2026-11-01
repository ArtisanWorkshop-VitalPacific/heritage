/**
 * Placement exam. About ten minutes: letter sounds (grown-up scores), an adaptive
 * word ladder (the child reads; the mic listens), and one passage at the ceiling rung.
 */

export interface SoundItem {
  id: string;
  grapheme: string;
  keyword: string;
  spot: string;
  rung: number;
}

export const PLACEMENT_SOUNDS: SoundItem[] = [
  { id: "snd-m", grapheme: "m", keyword: "mitten", spot: "spot-mitten", rung: 6 },
  { id: "snd-s", grapheme: "s", keyword: "sun", spot: "spot-sun", rung: 7 },
  { id: "snd-t", grapheme: "t", keyword: "top", spot: "spot-top", rung: 6 },
  { id: "snd-a", grapheme: "a", keyword: "apple", spot: "spot-apple", rung: 1 },
  { id: "snd-p", grapheme: "p", keyword: "pig", spot: "spot-pig", rung: 7 },
  { id: "snd-i", grapheme: "i", keyword: "ink", spot: "spot-inkwell", rung: 3 },
  { id: "snd-n", grapheme: "n", keyword: "net", spot: "spot-net", rung: 8 },
  { id: "snd-o", grapheme: "o", keyword: "ox", spot: "spot-ox", rung: 4 },
  { id: "snd-h", grapheme: "h", keyword: "hen", spot: "spot-hen", rung: 10 },
  { id: "snd-e", grapheme: "e", keyword: "egg", spot: "spot-egg", rung: 2 },
];

export interface WordItem {
  id: string;
  word: string;
  rung: number;
}

/** One probe word per rung from 6 to 40, in order. */
export const PLACEMENT_WORDS: WordItem[] = (
  [
    ["mat", 6],
    ["sip", 7],
    ["bun", 8],
    ["dog", 9],
    ["hen", 10],
    ["kit", 11],
    ["fog", 12],
    ["jam", 13],
    ["rug", 14],
    ["web", 15],
    ["fox", 16],
    ["duck", 17],
    ["tent", 18],
    ["nest", 19],
    ["flag", 20],
    ["crab", 21],
    ["stop", 22],
    ["ship", 23],
    ["chop", 24],
    ["thin", 25],
    ["sing", 26],
    ["cake", 27],
    ["kite", 28],
    ["rope", 29],
    ["tree", 30],
    ["rain", 31],
    ["boat", 32],
    ["car", 33],
    ["corn", 34],
    ["bird", 35],
    ["moon", 36],
    ["cloud", 37],
    ["coin", 38],
    ["jumping", 39],
    ["rabbit", 40],
  ] as const
).map(([word, rung]) => ({ id: `w-${word}`, word, rung }));

/** Where the word ladder starts for a child of this age. */
export function startIndexForAge(age: number): number {
  if (age <= 5) return 0; // rung 6
  if (age === 6) return 0;
  if (age === 7) return 4; // rung 10
  if (age === 8) return 8; // rung 14
  return 12; // rung 18
}

export interface WordAttempt {
  rung: number;
  correct: boolean;
}

/**
 * Adaptive rule: climb one word at a time; stop after two misses in a row,
 * or at the top. If the first two words from a high start are both missed,
 * drop back to the beginning once.
 */
export function nextWordIndex(attempts: WordAttempt[], startIndex: number): number | null {
  if (attempts.length === 0) return startIndex;
  const last2 = attempts.slice(-2);
  const missedTwo = last2.length === 2 && last2.every((a) => !a.correct);
  if (missedTwo) {
    const restarted = attempts.some((a, i) => i > 0 && a.rung < attempts[i - 1].rung);
    if (!restarted && startIndex > 0 && attempts.length === 2) return 0;
    return null;
  }
  const lastRung = attempts[attempts.length - 1].rung;
  const idx = PLACEMENT_WORDS.findIndex((w) => w.rung === lastRung);
  return idx >= 0 && idx < PLACEMENT_WORDS.length - 1 ? idx + 1 : null;
}

/** Highest rung read correctly, allowing one miss below it. */
export function ceilingRung(attempts: WordAttempt[]): number {
  const sorted = [...attempts].sort((a, b) => a.rung - b.rung);
  let ceiling = 5;
  let misses = 0;
  for (const a of sorted) {
    if (a.correct) ceiling = a.rung;
    else {
      misses++;
      if (misses > 1) break;
    }
  }
  return ceiling;
}

export interface PlacementInput {
  sounds: boolean[];
  words: WordAttempt[];
  passage?: { accuracy: number; wcpm: number };
}

export interface PlacementScore {
  soundsKnown: number;
  ceilingRung: number;
  rung: number;
  reason: string;
}

export function scorePlacement(input: PlacementInput): PlacementScore {
  const soundsKnown = input.sounds.filter(Boolean).length;
  const ceiling = ceilingRung(input.words);
  if (soundsKnown < 6) {
    return { soundsKnown, ceilingRung: ceiling, rung: 1, reason: "Start with the five short vowels and their sounds." };
  }
  if (ceiling < 6) {
    return { soundsKnown, ceilingRung: ceiling, rung: 6, reason: "Sounds are in place. Start blending with m and t." };
  }
  let rung = Math.min(40, ceiling + 1);
  let reason = `Read words through rung ${ceiling}. Start the next rung.`;
  if (input.passage && input.passage.accuracy < 0.9) {
    rung = ceiling;
    reason = `Read words through rung ${ceiling}, but the passage was under 90%. Consolidate rung ${ceiling} first.`;
  }
  return { soundsKnown, ceilingRung: ceiling, rung, reason };
}
