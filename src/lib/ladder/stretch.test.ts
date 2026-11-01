import { describe, expect, it } from "vitest";
import PRON from "./pron.json";
import { canStretch, stretchedChunks, wordIPA } from "./stretch";

describe("stretched lesson words", () => {
  it("holds the short vowel between the onset and the rest of the word", () => {
    expect(stretchedChunks("top")).toEqual(["tɑ", "ɑːː", "ɑp"]);
    expect(stretchedChunks("nut")).toEqual(["nʌ", "ʌːː", "ʌt"]);
    expect(stretchedChunks("bun")).toEqual(["bʌ", "ʌːː", "ʌn"]);
    expect(stretchedChunks("mat")).toEqual(["mæ", "æːː", "æt"]);
    expect(stretchedChunks("hen")).toEqual(["hɛ", "ɛːː", "ɛn"]);
    expect(stretchedChunks("him")).toEqual(["hɪ", "ɪːː", "ɪm"]);
  });

  it("drops the first chunk when the word starts on its vowel, and the last when it ends on it", () => {
    expect(stretchedChunks("up")).toEqual(["ʌːː", "ʌp"]);
    expect(stretchedChunks("and")).toEqual(["æːː", "ænd"]);
    expect(stretchedChunks("bee")).toEqual(["bi", "iːː"]);
    // A word that is all vowel is the held vowel, then the word.
    expect(stretchedChunks("air", "british")).toEqual(["eəːː"]);
  });

  it("holds the vowel team or long vowel the lesson teaches", () => {
    expect(stretchedChunks("cake")).toEqual(["keɪ", "eɪːː", "eɪk"]);
    expect(stretchedChunks("car")).toEqual(["kɑ", "ɑːː", "ɑɹ"]);
    expect(stretchedChunks("mitten")).toEqual(["mɪ", "ɪːː", "ɪtən"]);
  });

  it("uses the lesson reading of words with two pronunciations", () => {
    expect(wordIPA("read")).toBe("ɹid");
    expect(wordIPA("red")).toBe("ɹɛd");
    expect(wordIPA("wind")).toBe("wɪnd");
    expect(wordIPA("in")).toBe("ɪn");
  });

  it("speaks Southern British vowels for the British narrator", () => {
    expect(stretchedChunks("top", "british")).toEqual(["tɒ", "ɒːː", "ɒp"]);
    expect(stretchedChunks("hot", "british")).toEqual(["hɒ", "ɒːː", "ɒt"]);
    expect(stretchedChunks("path", "british")).toEqual(["pɑː", "ɑːː", "ɑːθ"]);
    expect(wordIPA("car", "british")).toBe("kɑː");
    expect(wordIPA("boat", "british")).toBe("bəʊt");
    expect(wordIPA("mat", "british")).toBe("mæt");
  });

  it("says heart words, letters and phonograms plainly", () => {
    for (const w of ["the", "said", "was", "a", "i", "o", "ar", "ee", "ing", "ed"]) {
      expect(canStretch(w)).toBe(false);
      expect(stretchedChunks(w)).toBeNull();
    }
    expect(canStretch("Top")).toBe(true);
  });

  it("has a clean stretched form for every lesson word in both voices", () => {
    const ipa = /^[a-zæɑɒɔəɚɛɜɝɪʊʌθðʃʒŋɡɹːˈ]+$/u;
    for (const word of Object.keys(PRON)) {
      for (const narrator of ["american", "british"] as const) {
        const chunks = stretchedChunks(word, narrator);
        expect(chunks, `${word} (${narrator})`).not.toBeNull();
        expect(chunks!.length, `${word} (${narrator})`).toBeGreaterThanOrEqual(1);
        for (const c of chunks!) expect(c, `${word} (${narrator})`).toMatch(ipa);
      }
    }
  });
});
