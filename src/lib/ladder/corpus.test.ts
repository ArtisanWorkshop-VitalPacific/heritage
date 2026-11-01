import { describe, expect, it } from "vitest";
import { RUNGS } from "./rungs";
import { PASSAGES, passageFor, tokenize } from "./corpus";
import { PLACEMENT_WORDS } from "./placement";
import { validatePassage, isAllowed, explainWord } from "./validator";
import { decodeRung } from "./decode";
import { bankFor, newWordsAt } from "./bank";
import { LEXICON } from "./lexicon";

/** Every word a rung puts in front of a child, with where it came from. */
function contentWords(n: number): { word: string; where: string }[] {
  const r = RUNGS.find((x) => x.n === n)!;
  const out: { word: string; where: string }[] = [];
  r.words.forEach((w) => out.push({ word: w, where: "practice word" }));
  r.pairs.flat().forEach((w) => out.push({ word: w, where: "pair" }));
  r.ladder?.right.forEach((w) => w && out.push({ word: w, where: "ladder" }));
  r.pattern?.forEach((p) => out.push({ word: p.to, where: "pattern" }));
  r.families?.flat().forEach((w) => out.push({ word: w, where: "family" }));
  return out;
}

describe("rung content validates at its own rung", () => {
  for (const r of RUNGS) {
    it(`rung ${r.n}: ${r.title}`, () => {
      const names = r.passage?.cast ?? [];
      const bad: string[] = [];
      if (r.passage) {
        const v = validatePassage([r.passage.title, ...r.passage.sentences], r.n, names);
        for (const x of v.violations) bad.push(`passage "${x.word}": ${x.reason}`);
      }
      for (const { word, where } of contentWords(r.n)) {
        const v = explainWord(word, r.n, names);
        if (v) bad.push(`${where} "${word}": ${v.reason}`);
      }
      expect(bad).toEqual([]);
    });
  }
});

describe("practice words", () => {
  it("every rung from 6 to 40 has 8 to 12 practice words", () => {
    for (const r of RUNGS.filter((x) => x.n >= 6)) {
      expect(r.words.length, `rung ${r.n}`).toBeGreaterThanOrEqual(8);
      expect(r.words.length, `rung ${r.n}`).toBeLessThanOrEqual(12);
    }
  });

  it("practice words feature the rung's new pattern (first decodable at that rung)", () => {
    const off: string[] = [];
    for (const r of RUNGS.filter((x) => x.n >= 6)) {
      for (const w of r.words) if (decodeRung(w) !== r.n) off.push(`rung ${r.n} "${w}" decodes at ${decodeRung(w)}`);
    }
    expect(off).toEqual([]);
  });
});

describe("placement", () => {
  it("every placement word validates at its rung and is new at that rung", () => {
    const off: string[] = [];
    for (const p of PLACEMENT_WORDS) {
      if (!isAllowed(p.word, p.rung)) off.push(`${p.word} not allowed at ${p.rung}: ${explainWord(p.word, p.rung)?.reason}`);
      if (decodeRung(p.word) !== p.rung) off.push(`${p.word} decodes at ${decodeRung(p.word)}, placed at ${p.rung}`);
    }
    expect(off).toEqual([]);
  });
});

describe("corpus", () => {
  it("has a passage for every rung from 6 to 40", () => {
    expect(PASSAGES.length).toBe(35);
    for (let n = 6; n <= 40; n++) expect(passageFor(n)?.rung).toBe(n);
  });

  it("tokenizes with punctuation kept for display", () => {
    const t = tokenize(["Ned said, \"Hop, hen, hop!\"", "Dad’s cap."]);
    expect(t.map((x) => x.clean)).toEqual(["ned", "said", "hop", "hen", "hop", "dad's", "cap"]);
    expect(t[2].display).toBe("\"Hop,");
  });
});

describe("lexicon and banks", () => {
  it("has 700 to 1000 words", () => {
    expect(LEXICON.length).toBeGreaterThanOrEqual(700);
    expect(LEXICON.length).toBeLessThanOrEqual(1000);
  });

  it("banks grow with the rung and new words partition them", () => {
    let prev = 0;
    for (let n = 1; n <= 40; n++) {
      const b = bankFor(n);
      expect(b.length).toBeGreaterThanOrEqual(prev);
      expect(b.length - prev).toBe(newWordsAt(n).length);
      prev = b.length;
    }
    expect(bankFor(5)).toEqual([]);
    expect(newWordsAt(6)).toContain("mat");
    expect(newWordsAt(23)).toContain("ship");
    expect(bankFor(22)).not.toContain("ship");
  });

  it("every rung from 6 to 40 adds words", () => {
    for (let n = 6; n <= 40; n++) expect(newWordsAt(n).length, `rung ${n}`).toBeGreaterThan(0);
  });
});
