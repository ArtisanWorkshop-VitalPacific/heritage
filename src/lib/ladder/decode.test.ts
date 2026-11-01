import { describe, expect, it } from "vitest";
import { decode, decodeRung, isDecodable } from "./decode";
import { partsFor } from "./phonics";
import { bankFor, namesFor, newWordsAt } from "./bank";
import { explainWord, isAllowed, validatePassage } from "./validator";
import { RUNG_GROUPS } from "./rungs";

const at = (w: string) => decodeRung(w);

describe("consonants and short vowels by rung", () => {
  it("places CVC words at the rung of their last new letter", () => {
    expect(at("mat")).toBe(6);
    expect(at("sip")).toBe(7);
    expect(at("bun")).toBe(8);
    expect(at("dog")).toBe(9);
    expect(at("hen")).toBe(10);
    expect(at("cat")).toBe(11);
    expect(at("fog")).toBe(12);
    expect(at("jam")).toBe(13);
    expect(at("rug")).toBe(14);
    expect(at("web")).toBe(15);
    expect(at("fox")).toBe(16);
    expect(at("quiz")).toBe(16);
    expect(at("yes")).toBe(16);
  });

  it("is not decodable before the letters are taught", () => {
    expect(isDecodable("hat", 9)).toBe(false);
    expect(decode("hat", 9).reason).toBe("uses the letter h, taught at rung 10");
    expect(isDecodable("mat", 5)).toBe(false);
  });

  it("accepts final s that sounds like z", () => {
    expect(at("is")).toBe(7);
    expect(at("has")).toBe(10);
    expect(at("his")).toBe(10);
    expect(at("as")).toBe(7);
  });

  it("allows hard c and g only", () => {
    expect(at("cot")).toBe(11);
    expect(at("gum")).toBe(9);
    expect(at("gem")).toBeNull();
    expect(decode("gem", 40).reason).toMatch(/soft g/);
    expect(at("cent")).toBeNull();
    expect(at("face")).toBeNull();
    expect(at("age")).toBeNull();
  });

  it("uses lexicon tags for hard g before e or i", () => {
    expect(at("get")).toBe(9);
    expect(at("gift")).toBe(19);
    expect(at("girl")).toBe(35);
  });
});

describe("doubles and blends", () => {
  it("doubles at 17", () => {
    for (const w of ["bell", "kiss", "puff", "buzz", "duck", "egg", "add"]) expect(at(w), w).toBe(17);
  });

  it("the all family at 17", () => {
    expect(at("ball")).toBe(17);
    expect(at("small")).toBe(22);
    expect(at("shall")).toBe(23);
  });

  it("coda clusters at 18 and 19, nch at 24", () => {
    expect(at("tent")).toBe(18);
    expect(at("jump")).toBe(18);
    expect(at("nest")).toBe(19);
    expect(at("milk")).toBe(19);
    expect(at("next")).toBe(19);
    expect(at("bench")).toBe(24);
  });

  it("onset blends: l at 20, r at 21, s at 22, including after digraphs", () => {
    expect(at("flag")).toBe(20);
    expect(at("crab")).toBe(21);
    expect(at("stop")).toBe(22);
    expect(at("twin")).toBe(22);
    expect(at("split")).toBe(22);
    expect(at("squid")).toBe(22);
    expect(at("three")).toBe(30);
    expect(at("shrub")).toBe(23);
    expect(at("thrush")).toBe(25);
  });
});

describe("digraphs, silent e, teams and r-controlled vowels", () => {
  it("digraphs", () => {
    expect(at("ship")).toBe(23);
    expect(decode("ship", 22).reason).toBe("uses the sh sound, taught at rung 23");
    expect(at("chop")).toBe(24);
    expect(at("catch")).toBe(24);
    expect(at("thin")).toBe(25);
    expect(at("whip")).toBe(25);
    expect(at("sing")).toBe(26);
    expect(at("pink")).toBe(26);
  });

  it("silent e by vowel", () => {
    expect(at("cake")).toBe(27);
    expect(at("kite")).toBe(28);
    expect(at("rope")).toBe(29);
    expect(at("cube")).toBe(29);
    expect(at("these")).toBe(29);
    expect(at("rose")).toBe(29);
    expect(at("more")).toBe(34);
  });

  it("vowel teams and the two sounds of ow", () => {
    expect(at("tree")).toBe(30);
    expect(at("leaf")).toBe(30);
    expect(at("rain")).toBe(31);
    expect(at("play")).toBe(31);
    expect(at("boat")).toBe(32);
    expect(at("snow")).toBe(32);
    expect(at("cow")).toBe(37);
    expect(at("town")).toBe(37);
    expect(at("bowl")).toBe(32);
    expect(at("moon")).toBe(36);
    expect(at("book")).toBe(36);
    expect(at("cloud")).toBe(37);
    expect(at("coin")).toBe(38);
    expect(at("boy")).toBe(38);
  });

  it("r-controlled vowels", () => {
    expect(at("car")).toBe(33);
    expect(at("corn")).toBe(34);
    expect(at("her")).toBe(35);
    expect(at("bird")).toBe(35);
    expect(at("church")).toBe(35);
    expect(at("horse")).toBe(34);
  });
});

describe("endings and syllables", () => {
  it("plural, verb -s and possessive 's from rung 7 on a decodable base", () => {
    expect(at("pups")).toBe(7);
    expect(at("cats")).toBe(11);
    expect(at("dad's")).toBe(9);
    expect(at("goat's")).toBe(32);
    expect(at("boxes")).toBe(16);
    expect(at("dishes")).toBe(23);
    expect(at("benches")).toBe(24);
  });

  it("-ed and -ing at 39 with doubling and silent-e drop", () => {
    expect(at("jumped")).toBe(39);
    expect(at("landed")).toBe(39);
    expect(at("hopped")).toBe(39);
    expect(at("sitting")).toBe(39);
    expect(at("baking")).toBe(39);
    expect(at("shining")).toBe(39);
    expect(at("hoped")).toBe(39);
    expect(isDecodable("jumped", 38)).toBe(false);
  });

  it("does not mistake whole words for endings", () => {
    expect(at("red")).toBe(14);
    expect(at("sled")).toBe(20);
    expect(at("king")).toBe(26);
    expect(at("kiss")).toBe(17);
  });

  it("two closed or r-controlled syllables at 40", () => {
    for (const w of ["rabbit", "napkin", "pitcher", "garden", "problem", "sunset", "lemon", "kitten"]) expect(at(w), w).toBe(40);
    expect(at("rabbits")).toBe(40);
    expect(decode("rabbit", 39).reason).toBe("uses two syllables, taught at rung 40");
    expect(at("tiger")).toBeNull();
    expect(at("paper")).toBeNull();
    expect(at("baby")).toBeNull();
  });
});

describe("irregular words", () => {
  it("are never decodable", () => {
    for (const w of ["said", "of", "you", "put", "come", "one", "son", "want", "cold", "water", "the", "was"]) expect(at(w), w).toBeNull();
  });

  it("explain why", () => {
    expect(decode("night", 40).reason).toMatch(/igh/);
    expect(decode("son", 40).reason).toMatch(/irregular/);
  });
});

describe("parts for sounding out", () => {
  it("follows the decoder's parse", () => {
    expect(partsFor("ship")).toEqual(["sh", "i", "p"]);
    expect(partsFor("cake")).toEqual(["c", "a", "k", "e"]);
    expect(partsFor("black")).toEqual(["b", "l", "a", "ck"]);
    expect(partsFor("Jumped!")).toEqual(["j", "u", "m", "p", "ed"]);
    expect(partsFor("rabbit")).toEqual(["r", "a", "b", "b", "i", "t"]);
    expect(partsFor("said")).toEqual(["said"]);
    expect(partsFor("the")).toEqual(["the"]);
  });
});

describe("validator", () => {
  it("allows lexicon words decodable at the rung, sight words and names", () => {
    expect(isAllowed("hat", 10)).toBe(true);
    expect(isAllowed("said", 9)).toBe(true);
    expect(isAllowed("said", 8)).toBe(false);
    expect(isAllowed("Nora", 6, ["Nora"])).toBe(true);
    expect(isAllowed("Nora's", 6, ["nora"])).toBe(true);
    expect(isAllowed("Ken", 11)).toBe(true);
  });

  it("reports plain reasons", () => {
    expect(explainWord("ship", 20)?.reason).toBe("uses the sh sound, taught at rung 23");
    expect(explainWord("would", 20)?.reason).toBe("is a sight word taught at rung 22");
    expect(explainWord("6", 20)?.reason).toMatch(/numerals/);
    expect(explainWord("zap", 16)).toBeNull();
    expect(explainWord("bes", 10)?.reason).toMatch(/word list/);
  });

  it("validates a whole passage and lists each problem word once", () => {
    const v = validatePassage(["The ship is big.", "The ship sank."], 20, []);
    expect(v.ok).toBe(false);
    expect(v.violations.map((x) => x.word)).toEqual(["ship", "sank"]);
    expect(v.violations[0].sentence).toBe(0);
    expect(validatePassage(["Ned had a big hat."], 10, ["Ned"]).ok).toBe(true);
  });
});

describe("banks and groups", () => {
  it("banks contain only words the decoder allows", () => {
    for (const n of [8, 17, 25, 33, 40]) for (const w of bankFor(n)) expect(isDecodable(w, n), `${w}@${n}`).toBe(true);
    expect(newWordsAt(17)).toContain("bell");
    expect(namesFor(10)).toContain("Ned");
    expect(namesFor(10)).not.toContain("Josh");
  });

  it("rung groups have unique ids and cover 1 to 40", () => {
    expect(new Set(RUNG_GROUPS.map((g) => g.id)).size).toBe(RUNG_GROUPS.length);
    expect(RUNG_GROUPS[0].from).toBe(1);
    expect(RUNG_GROUPS[RUNG_GROUPS.length - 1].to).toBe(40);
  });
});
