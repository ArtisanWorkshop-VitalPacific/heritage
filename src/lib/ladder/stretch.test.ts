import { describe, expect, it } from "vitest";
import PRON from "./pron.json";
import { canStretch, stretchedChunks, wordIPA } from "./stretch";

describe("stretched lesson words", () => {
  it("keeps a short vowel short in every part", () => {
    expect(stretchedChunks("top")).toEqual(["tɑ", "ɑ", "ɑp"]);
    expect(stretchedChunks("nut")).toEqual(["nʌ", "ʌ", "ʌt"]);
    expect(stretchedChunks("bun")).toEqual(["bʌ", "ʌ", "ʌn"]);
    expect(stretchedChunks("mat")).toEqual(["mæ", "æ", "æt"]);
    expect(stretchedChunks("hen")).toEqual(["hɛ", "ɛ", "ɛn"]);
    expect(stretchedChunks("him")).toEqual(["hɪ", "ɪ", "ɪm"]);
  });

  it("drops the first part when the word starts on its vowel, and the last when it ends on it", () => {
    expect(stretchedChunks("up")).toEqual(["ʌ", "ʌp"]);
    expect(stretchedChunks("and")).toEqual(["æ", "ænd"]);
    expect(stretchedChunks("bee")).toEqual(["bi", "i"]);
    expect(stretchedChunks("air", "british")).toEqual(["ɛə"]);
  });

  it("gives a long vowel its name", () => {
    expect(stretchedChunks("cake")).toEqual(["keɪ", "eɪ", "eɪk"]);
    expect(stretchedChunks("bike")).toEqual(["baɪ", "aɪ", "aɪk"]);
    expect(stretchedChunks("boat")).toEqual(["boʊ", "oʊ", "oʊt"]);
    expect(stretchedChunks("cube")).toEqual(["kju", "ju", "jub"]);
    expect(stretchedChunks("use")).toEqual(["ju", "juz"]);
    expect(stretchedChunks("boat", "british")).toEqual(["bəʊ", "əʊ", "əʊt"]);
  });

  it("holds r-controlled and two-syllable words on the stressed vowel", () => {
    expect(stretchedChunks("car")).toEqual(["kɑ", "ɑ", "ɑɹ"]);
    expect(stretchedChunks("mitten")).toEqual(["mɪ", "ɪ", "ɪtən"]);
  });

  it("uses the lesson reading of words with two pronunciations", () => {
    expect(wordIPA("read")).toBe("ɹid");
    expect(wordIPA("red")).toBe("ɹɛd");
    expect(wordIPA("wind")).toBe("wɪnd");
    expect(wordIPA("in")).toBe("ɪn");
  });

  it("says short o the same way in hot, dog and off", () => {
    expect(wordIPA("hot")).toBe("hɑt");
    expect(wordIPA("dog")).toBe("dɑɡ");
    expect(wordIPA("off")).toBe("ɑf");
    expect(wordIPA("all")).toBe("ɔl");
    expect(wordIPA("dog", "british")).toBe("dɒɡ");
    expect(wordIPA("all", "british")).toBe("ɔːl");
  });

  it("speaks Southern British vowels for the British narrator", () => {
    expect(stretchedChunks("top", "british")).toEqual(["tɒ", "ɒ", "ɒp"]);
    expect(stretchedChunks("hen", "british")).toEqual(["hɛ", "ɛ", "ɛn"]);
    expect(stretchedChunks("path", "british")).toEqual(["pɑː", "ɑː", "ɑːθ"]);
    expect(wordIPA("car", "british")).toBe("kɑː");
    expect(wordIPA("mat", "british")).toBe("mæt");
  });

  it("says heart words, letters and phonograms plainly", () => {
    for (const w of ["the", "said", "was", "a", "i", "o", "ar", "ee", "ing", "ed"]) {
      expect(canStretch(w)).toBe(false);
      expect(stretchedChunks(w)).toBeNull();
    }
    expect(canStretch("Top")).toBe(true);
  });

  it("never puts a length mark on a short vowel, in any lesson word or voice", () => {
    const ipa = /^[a-zæɑɒɔəɚɛɜɝɪʊʌθðʃʒŋɡɹː]+$/u;
    for (const word of Object.keys(PRON)) {
      for (const narrator of ["american", "british"] as const) {
        const chunks = stretchedChunks(word, narrator);
        expect(chunks, `${word} (${narrator})`).not.toBeNull();
        for (const c of chunks!) {
          expect(c, `${word} (${narrator})`).toMatch(ipa);
          expect(c, `${word} (${narrator})`).not.toMatch(/[æɛɪɒʌʊ]ː/u);
        }
      }
    }
  });
});
