import { getRung } from "@/lib/ladder";

/**
 * One sample child for every depiction on the site, matching the app's seed:
 * Nora, 6, on rung 10 with rungs 1 to 9 mastered, 31 to 44 words correct per minute over 8 weeks.
 */
export const SAMPLE = {
  child: "Nora",
  age: 6,
  rung: 10,
  mastered: 9,
  accuracy: 96,
  wcpm: 44,
  wcpmWeek1: 31,
  weekly: [31, 33, 34, 36, 38, 40, 42, 44],
  review: "hid",
  paperMinutes: 38,
  screenMinutes: 11,
} as const;

export const SAMPLE_RUNG = getRung(SAMPLE.rung);
export const NEXT_RUNG = getRung(SAMPLE.rung + 1);

/** "The letters c and k" -> "the letters c and k", for use mid-sentence. */
export const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Splits a printed token into leading punctuation, the word, and trailing punctuation. Straight quotes become curly. */
export function splitToken(token: string): { lead: string; word: string; trail: string } {
  const m = token.match(/^([^A-Za-z']*)([A-Za-z']+(?:-[A-Za-z']+)*)(.*)$/);
  const curly = (s: string, open: boolean) => s.replace(/"/g, open ? "“" : "”").replace(/'/g, "’");
  if (!m) return { lead: "", word: curly(token, false), trail: "" };
  return { lead: curly(m[1], true), word: m[2].replace(/'/g, "’"), trail: curly(m[3], false) };
}

/** The class on Mrs. Finch's mastery board (Oak Hill Classical Academy, Primer Class). */
export const PRIMER_CLASS: { name: string; rung: number; review?: number[] }[] = [
  { name: "Ada", rung: 16 },
  { name: "Clara", rung: 12 },
  { name: "Lucy", rung: 11 },
  { name: "Nora", rung: 10 },
  { name: "Owen", rung: 9, review: [7] },
  { name: "Henry", rung: 7 },
  { name: "Silas", rung: 6 },
];
