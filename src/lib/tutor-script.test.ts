import { describe, expect, it } from "vitest";
import type { TutorRequest } from "./types";
import { detectIntent, isSafetyMessage, scriptedReply } from "./tutor-script";
import { countWords, WORD_CAPS } from "./persona";
import { RUNGS } from "./ladder/rungs";

function req(text: string, over: Partial<TutorRequest> = {}, history: TutorRequest["messages"] = []): TutorRequest {
  return {
    messages: [...history, { role: "child", text }],
    rung: 10,
    context: "lesson",
    child: { name: "Nora", age: 6, band: "A", sex: "girl", interests: ["horses", "baking", "birds"], faithTrack: true, modernComparisons: false },
    ...over,
  };
}

const QUESTIONS = [
  "hello",
  "Hi Mrs Wren",
  "what does diligent mean?",
  "why do I need to read?",
  "read me the story",
  "tell me a story",
  "tell me a fable",
  "how do I say hen?",
  "what's this word?",
  "I can't",
  "it's too hard",
  "I did it!",
  "I read it",
  "who are you?",
  "what are we learning today?",
  "I'm tired",
  "thank you",
  "bye",
  "can I play video games",
  "my dog is brown and fluffy",
  "yes",
];

describe("scripted tutor", () => {
  it("answers every common question within the voice rules", () => {
    for (const band of ["A", "B", "C"] as const) {
      for (const q of QUESTIONS) {
        const r = scriptedReply(req(q, { child: { ...req(q).child, band } }));
        expect(r.length, q).toBeGreaterThan(5);
        expect(r, q).not.toMatch(/\bwrong\b/i);
        expect(r, q).not.toMatch(/[—–*#_`]|\p{Extended_Pictographic}/u);
        if (!/read me the story/.test(q)) expect(countWords(r), `${band}: ${q} -> ${r}`).toBeLessThanOrEqual(WORD_CAPS[band]);
      }
    }
  });

  it("explains every classical word in the rungs", () => {
    for (const r of RUNGS) {
      if (!r.classicalWord) continue;
      const reply = scriptedReply(req(`what does ${r.classicalWord.word} mean?`));
      expect(reply.toLowerCase(), r.classicalWord.word).toContain(`${r.classicalWord.word.toLowerCase()} means`);
    }
  });

  it("tells all six fables, each with a moral", () => {
    const seen = new Set<string>();
    const history: TutorRequest["messages"] = [];
    for (let i = 0; i < 6; i++) {
      const r = scriptedReply(req("tell me another story", {}, history));
      expect(r).toMatch(/The moral:/);
      seen.add(r);
      history.push({ role: "child", text: "tell me another story" }, { role: "tutor", text: r });
    }
    expect(seen.size).toBe(6);
    for (const k of ["tortoise", "little red hen", "shepherd boy", "grasshopper", "lion", "crow"]) {
      expect([...seen].some((s) => s.toLowerCase().includes(k)), k).toBe(true);
    }
  });

  it("does not repeat itself on a repeated question", () => {
    const first = scriptedReply(req("why do I need to read?"));
    const second = scriptedReply(req("why do I need to read?", {}, [{ role: "child", text: "why do I need to read?" }, { role: "tutor", text: first }]));
    expect(second).not.toBe(first);
  });

  it("sounds out a word with its parts", () => {
    expect(scriptedReply(req("how do I say hen?"))).toMatch(/h, e, n/);
  });

  it("ties why-read to interests and greets by name", () => {
    expect(scriptedReply(req("why do I have to read"))).toMatch(/horses|baking|birds|Scripture/);
    expect(scriptedReply(req("hello"))).toContain("Nora");
  });

  it("reads the passage aloud when asked", () => {
    const r = scriptedReply(req("read me the story", { passage: { title: "The Hen in the Hat", sentences: ["Ned had a big hat."] } }));
    expect(r).toContain("Ned had a big hat.");
  });

  it("handles safety gently and without questions", () => {
    expect(isSafetyMessage("I'm scared")).toBe(true);
    expect(isSafetyMessage("someone hit me")).toBe(true);
    expect(isSafetyMessage("what does sad mean")).toBe(false);
    const r = scriptedReply(req("I am sad"));
    expect(r).toMatch(/grown-up/);
    expect(r).not.toMatch(/\?/);
  });

  it("detects intents", () => {
    expect(detectIntent("how do you say ship").intent).toBe("sayword");
    expect(detectIntent("how do you say ship").word).toBe("ship");
    expect(detectIntent("what does steadfast mean").intent).toBe("meaning");
    expect(detectIntent("tell me about the tortoise and the hare").intent).toBe("fable");
    expect(detectIntent("what are we learning today").intent).toBe("today");
  });

  it("never throws on an empty or odd request", () => {
    expect(scriptedReply({} as TutorRequest)).toBeTruthy();
    expect(scriptedReply(req(""))).toBeTruthy();
  });
});
