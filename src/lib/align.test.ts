import { describe, expect, it } from "vitest";
import { accuracyOf, alignReading, liveProgress, normalizeWord, splitHeard, wcpm, wordsMatch } from "./align";

const words = (s: string) => s.split(/\s+/);

describe("wordsMatch", () => {
  it("matches exact words regardless of case and punctuation", () => {
    expect(wordsMatch('"Hop,', "hop")).toBe(true);
    expect(wordsMatch("Dad’s", "dad's")).toBe(true);
  });

  it("treats apostrophe spellings as the same word", () => {
    expect(wordsMatch("it's", "its")).toBe(true);
    expect(wordsMatch("can't", "cant")).toBe(true);
    expect(wordsMatch("Dad's", "dads")).toBe(true);
  });

  it("does not accept plural or ending slips", () => {
    expect(wordsMatch("cat", "cats")).toBe(false);
    expect(wordsMatch("pups", "pup")).toBe(false);
    expect(wordsMatch("jumped", "jump")).toBe(false);
    expect(wordsMatch("planted", "planter")).toBe(false);
    expect(wordsMatch("Dad's", "dad")).toBe(false);
  });

  it("accepts numerals for number words", () => {
    expect(wordsMatch("six", "6")).toBe(true);
    expect(wordsMatch("two", "2")).toBe(true);
    expect(wordsMatch("ten", "10")).toBe(true);
    expect(normalizeWord("3")).toBe("three");
  });

  it("accepts recognizer homophones for early words", () => {
    expect(wordsMatch("to", "two")).toBe(true);
    expect(wordsMatch("two", "too")).toBe(true);
    expect(wordsMatch("sun", "son")).toBe(true);
    expect(wordsMatch("I", "eye")).toBe(true);
    expect(wordsMatch("tail", "tale")).toBe(true);
    expect(wordsMatch("gray", "grey")).toBe(true);
    expect(wordsMatch("Mom", "mum")).toBe(true);
    expect(wordsMatch("Jim", "gym")).toBe(true);
  });

  it("is forgiving with names only when told they are names", () => {
    expect(wordsMatch("Jen", "jenn", { names: ["Jen"] })).toBe(true);
    expect(wordsMatch("Gail", "gale", { names: ["Gail"] })).toBe(true);
    expect(wordsMatch("Kate", "cate", { names: ["Kate"] })).toBe(true);
    expect(wordsMatch("Hank's", "hanks", { names: ["Hank"] })).toBe(true);
    expect(wordsMatch("hop", "hip")).toBe(false);
    expect(wordsMatch("Jen", "jenn")).toBe(false);
  });

  it("rejects different words", () => {
    expect(wordsMatch("sat", "sad")).toBe(false);
    expect(wordsMatch("the", "a")).toBe(false);
    expect(wordsMatch("", "cat")).toBe(false);
  });
});

describe("splitHeard", () => {
  it("normalizes recognizer text", () => {
    expect(splitHeard("Ned had 6 hats.")).toEqual(["ned", "had", "six", "hats"]);
    expect(splitHeard("  ")).toEqual([]);
  });
});

describe("alignReading", () => {
  const target = words("Ned had a big hat.");

  it("labels a clean read correct", () => {
    const out = alignReading(target, splitHeard("ned had a big hat"));
    expect(out.map((o) => o.status)).toEqual(["correct", "correct", "correct", "correct", "correct"]);
    expect(accuracyOf(out)).toBe(1);
  });

  it("labels substitutions, omissions and insertions", () => {
    const out = alignReading(target, splitHeard("ned has big big hat"));
    const byIndex = Object.fromEntries(out.filter((o) => o.index >= 0).map((o) => [o.index, o.status]));
    expect(byIndex[1]).toBe("substitution");
    expect(byIndex[2]).toBe("substitution");
    const omit = alignReading(target, splitHeard("ned had big hat"));
    expect(omit.find((o) => o.index === 2)?.status).toBe("omission");
    const ins = alignReading(target, splitHeard("ned had a very big hat"));
    expect(ins.filter((o) => o.status === "insertion").map((o) => o.word)).toEqual(["very"]);
    expect(accuracyOf(ins)).toBe(1);
  });

  it("counts a self-correction as correct", () => {
    const out = alignReading(words("The cat sat."), splitHeard("the cat sad sat"));
    expect(out.filter((o) => o.index >= 0).every((o) => o.status === "correct")).toBe(true);
  });

  it("forgives the recognizer's spelling of a name in the cast", () => {
    const out = alignReading(words("Jen had a bun."), splitHeard("jenn had a bun"), { names: ["Jen"] });
    expect(out[0].status).toBe("correct");
    const guessed = alignReading(words("So Jen did."), splitHeard("so jenn did"));
    expect(guessed[1].status).toBe("correct");
  });

  it("marks a plural slip as a substitution", () => {
    const out = alignReading(words("Max has six pups."), splitHeard("max has six pup"));
    expect(out[3].status).toBe("substitution");
  });
});

describe("liveProgress", () => {
  const target = words("the cat sat on the mat");

  it("advances word by word", () => {
    expect(liveProgress(target, [])).toBe(0);
    expect(liveProgress(target, splitHeard("the"))).toBe(1);
    expect(liveProgress(target, splitHeard("the cat sat on"))).toBe(4);
    expect(liveProgress(target, splitHeard("the cat sat on the mat"))).toBe(6);
  });

  it("does not jump ahead when the child repeats a phrase", () => {
    expect(liveProgress(target, splitHeard("the cat the cat sat"))).toBe(3);
    expect(liveProgress(target, splitHeard("the cat the"))).toBe(2);
  });

  it("is not thrown by the recognizer echoing earlier text", () => {
    expect(liveProgress(target, splitHeard("the the cat the cat sat the cat sat on"))).toBe(4);
  });

  it("moves past a skipped word once the next word is read", () => {
    expect(liveProgress(target, splitHeard("the cat on"))).toBe(4);
  });

  it("waits on a misread word, then catches up", () => {
    expect(liveProgress(target, splitHeard("the cat sad"))).toBe(2);
    expect(liveProgress(target, splitHeard("the cat sad on"))).toBe(4);
  });

  it("never moves back past the floor when interim text is revised", () => {
    expect(liveProgress(target, splitHeard("the cat sad"), { floor: 3 })).toBe(3);
  });
});

describe("wcpm", () => {
  it("computes words correct per minute with a 5 second floor", () => {
    expect(wcpm(30, 60)).toBe(30);
    expect(wcpm(10, 2)).toBe(120);
    expect(wcpm(10, 0)).toBe(0);
  });
});
