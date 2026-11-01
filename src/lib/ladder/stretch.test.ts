import { describe, expect, it } from "vitest";
import { canStretch, stressedVowel } from "./stretch";

describe("stretched lesson words", () => {
  it("stretches decodable lesson words and says heart words, letters and phonograms plainly", () => {
    for (const w of ["top", "Hen", "cake", "rabbit"]) expect(canStretch(w)).toBe(true);
    for (const w of ["the", "said", "was", "a", "i", "o", "ar", "ee", "ing", "ed"]) expect(canStretch(w)).toBe(false);
  });

  it("finds the stressed vowel", () => {
    expect(stressedVowel("top")).toBe(0);
    expect(stressedVowel("rabbit")).toBe(0);
    expect(stressedVowel("upon")).toBe(1);
    expect(stressedVowel("inside")).toBe(1);
  });
});
