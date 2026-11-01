import PRON from "./pron.json";

/**
 * Stretched pronunciation for lesson words, the way a teacher models a word on the ladder:
 * "top" is said "ta, aah, op", then "top". The vowel is held and heard three times.
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

function usPhone(code: string): Phone {
  const v = VOWEL.exec(code);
  if (!v) return { ipa: CONSONANT[code] ?? "", vowel: false, stress: -1 };
  const stress = Number(v[2]);
  if (stress === 0 && v[1] === "AH") return { ipa: "ə", vowel: true, stress };
  if (stress === 0 && v[1] === "ER") return { ipa: "ɚ", vowel: true, stress };
  return { ipa: US_VOWEL[v[1]], vowel: true, stress };
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
        ipa = beforeR || next === "L" || !word.includes("o") ? "ɔː" : "ɒ";
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
        ipa = beforeR ? "eə" : "e";
        break;
      case "UW":
        ipa = "uː";
        break;
      case "AH":
        ipa = stress === 0 ? "ə" : "ʌ";
        break;
      default:
        ipa = usPhone(code).ipa;
    }
    out.push({ ipa, vowel: true, stress });
  }
  return out;
}

const lengthen = (v: string) => (v.endsWith("ː") ? `${v}ː` : `${v}ːː`);

/** The plain word in IPA, e.g. "tɑp". Null for heart words and words the lessons do not use. */
export function wordIPA(word: string, narrator: Narrator = "american"): string | null {
  const phones = phonesFor(word, narrator);
  return phones ? phones.map((p) => p.ipa).join("") : null;
}

function phonesFor(word: string, narrator: Narrator): Phone[] | null {
  const w = word.toLowerCase();
  const arpa = DICT[w];
  if (!arpa) return null;
  const codes = arpa.split(" ");
  return narrator === "british" ? ukPhones(w, codes) : codes.map(usPhone);
}

/**
 * The stretched chunks for a word: ["tɑ", "ɑːː", "ɑp"] for "top" (onset with the vowel, the vowel
 * held, the vowel with the rest of the word). Words that start with the vowel drop the first chunk
 * ("up": "ʌːː", "ʌp"); words that end on it drop the last ("go": "ɡoʊ", "oʊːː").
 */
export function stretchedChunks(word: string, narrator: Narrator = "american"): string[] | null {
  const phones = phonesFor(word, narrator);
  if (!phones) return null;
  let at = phones.findIndex((p) => p.vowel && p.stress === 1);
  if (at < 0) at = phones.findIndex((p) => p.vowel && p.stress === 2);
  if (at < 0) return null;
  const join = (list: Phone[]) => list.map((p) => p.ipa).join("");
  const onset = join(phones.slice(0, at));
  const vowel = phones[at].ipa;
  const rest = join(phones.slice(at + 1));
  const chunks = [onset ? onset + vowel : "", lengthen(vowel), rest ? vowel + rest : ""];
  return chunks.filter(Boolean);
}

/** Lesson words have a stretched form; anything else is said plainly. */
export function canStretch(word: string): boolean {
  return Boolean(DICT[word.toLowerCase()]);
}
