import PRON from "./pron.json";

/**
 * Lesson words said the way a teacher models them on the vowel ladder: "top" is "ta, ah, op",
 * then "top". The vowel is heard three times, and it keeps its own sound every time.
 *
 * Long and short are vowel sounds, not durations. A short vowel (a in apple, e in egg, i in itch,
 * o in ox, u in up) stays short when it is held: "him" is "hi, i, im", never "hee". A long vowel
 * says its name (cake, bee, bike, boat, cube). So the chunks never carry IPA length marks on a
 * short vowel: in IPA a length mark turns it into a different vowel (/ɪː/ is heard as "ee",
 * /ɛː/ is the vowel in "air", /ɒː/ the vowel in "saw").
 *
 * Pronunciations come from the CMU Pronouncing Dictionary (ARPAbet), kept in pron.json for the
 * decodable words the lessons use, with the lesson reading where a word has two ("read" as in
 * "sea", "wind" as in "went"). Heart words (said, the, was), single letters and phonograms are
 * not in it: they are said plainly. The chunks are IPA, which Eleven v4 reads as sounds.
 */

export type Narrator = "american" | "british";

const DICT = PRON as Record<string, string>;

const VOWEL = /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)([012])$/;

const CONSONANT: Record<string, string> = {
  B: "b", CH: "tʃ", D: "d", DH: "ð", F: "f", G: "ɡ", HH: "h", JH: "dʒ", K: "k", L: "l", M: "m", N: "n", NG: "ŋ",
  P: "p", R: "ɹ", S: "s", SH: "ʃ", T: "t", TH: "θ", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ",
};

// General American. Short vowels: æ (hat), ɛ (hen), ɪ (him), ɑ (hot), ʌ (hum).
const US_VOWEL: Record<string, string> = {
  AA: "ɑ", AE: "æ", AH: "ʌ", AO: "ɔ", AW: "aʊ", AY: "aɪ", EH: "ɛ", ER: "ɝ", EY: "eɪ", IH: "ɪ", IY: "i", OW: "oʊ", OY: "ɔɪ", UH: "ʊ", UW: "u",
};

// Southern British: the vowel in path, ask and after is long.
const BATH = new Set(["after", "ask", "asked", "bath", "bathtub", "basket", "class", "fast", "glass", "grass", "last", "mask", "pass", "past", "path", "plant", "raft", "staff", "task"]);

interface Phone {
  ipa: string;
  vowel: boolean;
  stress: number;
}

/** True when the vowel is spelled with the letter o and taught as short o (dog, off, long). */
const shortO = (word: string) => word.includes("o") && !/or|ou|oa|ow|oo|oy|oi/.test(word);

function usPhones(word: string, codes: string[]): Phone[] {
  return codes.map((code, i) => {
    const v = VOWEL.exec(code);
    if (!v) return { ipa: CONSONANT[code] ?? "", vowel: false, stress: -1 };
    const stress = Number(v[2]);
    if (stress === 0 && v[1] === "AH") return { ipa: "ə", vowel: true, stress };
    if (stress === 0 && v[1] === "ER") return { ipa: "ɚ", vowel: true, stress };
    // Short o is one sound on the ladder: dog, log and off rhyme with hot, as most Americans say them.
    if (v[1] === "AO" && codes[i + 1] !== "R" && shortO(word)) return { ipa: "ɑ", vowel: true, stress };
    return { ipa: US_VOWEL[v[1]], vowel: true, stress };
  });
}

/** British vowels for the same codes. R after a vowel is not sounded; it lengthens the vowel. */
function ukPhones(word: string, codes: string[]): Phone[] {
  const out: Phone[] = [];
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    const next = codes[i + 1];
    const v = VOWEL.exec(code);
    if (!v) {
      // Drop an R that does not lead into a vowel.
      if (code === "R" && out.length && out[out.length - 1].vowel && !(next && VOWEL.test(next))) continue;
      out.push({ ipa: CONSONANT[code] ?? "", vowel: false, stress: -1 });
      continue;
    }
    const stress = Number(v[2]);
    const beforeR = next === "R" && !(codes[i + 2] && VOWEL.test(codes[i + 2]));
    let ipa: string;
    switch (v[1]) {
      case "AA":
        ipa = beforeR || !word.includes("o") ? "ɑː" : "ɒ";
        break;
      case "AO":
        ipa = beforeR || next === "L" || !shortO(word) ? "ɔː" : "ɒ";
        break;
      case "AE":
        ipa = stress > 0 && BATH.has(word) ? "ɑː" : "æ";
        break;
      case "OW":
        ipa = "əʊ";
        break;
      case "ER":
        ipa = stress === 0 ? "ə" : "ɜː";
        break;
      case "IY":
        ipa = beforeR ? "ɪə" : "iː";
        break;
      case "EH":
        ipa = beforeR ? "ɛə" : "ɛ";
        break;
      case "UW":
        ipa = "uː";
        break;
      case "AH":
        ipa = stress === 0 ? "ə" : "ʌ";
        break;
      default:
        ipa = US_VOWEL[v[1]];
    }
    out.push({ ipa, vowel: true, stress });
  }
  return out;
}

function phonesFor(word: string, narrator: Narrator): Phone[] | null {
  const w = word.toLowerCase();
  const arpa = DICT[w];
  if (!arpa) return null;
  const codes = arpa.split(" ");
  return narrator === "british" ? ukPhones(w, codes) : usPhones(w, codes);
}

/** The plain word in IPA, e.g. "tɑp". Null for heart words and words the lessons do not use. */
export function wordIPA(word: string, narrator: Narrator = "american"): string | null {
  const phones = phonesFor(word, narrator);
  return phones ? phones.map((p) => p.ipa).join("") : null;
}

export interface StretchParts {
  /** Sounds before the vowel ("t" in top). */
  onset: string;
  /** The vowel the lesson teaches, as it sounds in this word ("ɑ" in top, "eɪ" in cake, "ju" in cube). */
  vowel: string;
  /** Sounds after the vowel ("p" in top). */
  rest: string;
}

/** The word split around its stressed vowel. Long u keeps its y ("cube": k, ju, b), since it says its name. */
export function stretchParts(word: string, narrator: Narrator = "american"): StretchParts | null {
  const phones = phonesFor(word, narrator);
  if (!phones) return null;
  let at = phones.findIndex((p) => p.vowel && p.stress === 1);
  if (at < 0) at = phones.findIndex((p) => p.vowel && p.stress === 2);
  if (at < 0) return null;
  let from = at;
  if (/^u/.test(phones[at].ipa) && phones[at - 1]?.ipa === "j" && word.toLowerCase().includes("u")) from = at - 1;
  const join = (list: Phone[]) => list.map((p) => p.ipa).join("");
  return { onset: join(phones.slice(0, from)), vowel: join(phones.slice(from, at + 1)), rest: join(phones.slice(at + 1)) };
}

/**
 * The three parts a teacher says: onset with the vowel, the vowel alone, the vowel with the rest.
 * "top" is ["tɑ", "ɑ", "ɑp"]. Words that start on the vowel drop the first part ("up": "ʌ", "ʌp");
 * words that end on it drop the last ("bee": "bi", "i").
 */
export function stretchedChunks(word: string, narrator: Narrator = "american"): string[] | null {
  const parts = stretchParts(word, narrator);
  if (!parts) return null;
  const { onset, vowel, rest } = parts;
  return [onset ? onset + vowel : "", vowel, rest ? vowel + rest : ""].filter(Boolean);
}

/** Lesson words have a stretched form; anything else is said plainly. */
export function canStretch(word: string): boolean {
  return Boolean(DICT[word.toLowerCase()]);
}

/** The dictionary entry (ARPAbet) for a lesson word, e.g. "T AA1 P". */
export function arpabet(word: string): string | null {
  return DICT[word.toLowerCase()] ?? null;
}
