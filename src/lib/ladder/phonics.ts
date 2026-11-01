/**
 * Grapheme chunks for "sound it out" (tap a word to hear it in parts).
 * ENGINE AGENT OWNS THIS FILE: keep the signature; align with the decoder's inventory.
 */

const MULTI = [
  "tch",
  "igh",
  "qu",
  "ck",
  "ll",
  "ss",
  "ff",
  "zz",
  "sh",
  "ch",
  "th",
  "wh",
  "ng",
  "nk",
  "ee",
  "ea",
  "ai",
  "ay",
  "oa",
  "ow",
  "ar",
  "or",
  "er",
  "ir",
  "ur",
  "oo",
  "ou",
  "oi",
  "oy",
];

/** "ship" -> ["sh","i","p"]; "cake" -> ["c","a","k","e"] with the silent e kept as its own part. */
export function partsFor(word: string): string[] {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  const out: string[] = [];
  let i = 0;
  while (i < w.length) {
    const m = MULTI.find((g) => w.startsWith(g, i));
    if (m) {
      out.push(m);
      i += m.length;
    } else {
      out.push(w[i]);
      i++;
    }
  }
  return out;
}
