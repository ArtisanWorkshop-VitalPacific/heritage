import { analyzeWord, normalizeWord } from "./decode";
import { isIrregular } from "./lexicon";
import { RUNGS } from "./rungs";

/**
 * Parts for "sound it out" (tap a word to hear it in parts), from the decoder's parse:
 * "ship" -> ["sh","i","p"]; "cake" -> ["c","a","k","e"] with the silent e as its own part;
 * "black" -> ["b","l","a","ck"]; "jumped" -> ["j","u","m","p","ed"].
 * Heart words (said, the, was) come back whole: they are learned by sight.
 */

const SIGHT = new Set(RUNGS.flatMap((r) => r.sight.map((s) => s.toLowerCase())));

export function partsFor(word: string): string[] {
  const w = normalizeWord(word);
  if (!w) return [];
  if (isIrregular(w)) return [w];
  const a = analyzeWord(w);
  if (a.rung === null && (SIGHT.has(w) || SIGHT.has(w.replace(/'s$|s$/, "")))) return [w];
  return a.graphemes;
}
