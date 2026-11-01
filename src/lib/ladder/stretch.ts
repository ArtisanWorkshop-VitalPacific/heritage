import PRON from "./pron.json";

/**
 * Which lesson words are said stretched ("top": ta, ah, op... top), and which of their vowels
 * carries the stress. The audio itself is cut from a recording of the word (see stretch-audio.ts),
 * so each part keeps the vowel the word really has.
 *
 * Long and short are vowel sounds, not lengths. A short vowel (a in apple, e in egg, i in itch,
 * o in ox, u in up) stays short when it is held: "him" is "hi, iii, im", never "hee". A long vowel
 * says its name (cake, bee, bike, boat, cube).
 *
 * pron.json holds the CMU Pronouncing Dictionary entries (ARPAbet) for the decodable words the
 * lessons use, with the lesson reading where a word has two ("read" as in "sea", "wind" as in
 * "went"). Heart words (said, the, was), single letters and phonograms are not in it: they are
 * said plainly.
 */

export type Narrator = "american" | "british";

const DICT = PRON as Record<string, string>;

/** Lesson words have a stretched form; anything else is said plainly. */
export function canStretch(word: string): boolean {
  return Boolean(DICT[word.toLowerCase()]);
}

/** Which vowel sound carries the stress, counting from 0: "rabbit" 0, "upon" 1. */
export function stressedVowel(word: string): number {
  const vowels = (DICT[word.toLowerCase()] ?? "").split(" ").filter((c) => /\d$/.test(c));
  const primary = vowels.findIndex((c) => c.endsWith("1"));
  if (primary >= 0) return primary;
  const secondary = vowels.findIndex((c) => c.endsWith("2"));
  return secondary >= 0 ? secondary : 0;
}
