import { describe, expect, it } from "vitest";
import { buildTutorSystemPrompt, capForBand, cleanSpoken, countWords, normalizeTutorRequest } from "./persona";

const base = normalizeTutorRequest({
  messages: [],
  rung: 23,
  context: "lesson",
  child: { name: "Eli", age: 8, band: "B", sex: "boy", interests: ["ships", "maps"], faithTrack: false, modernComparisons: false },
  passage: { title: "The Fish Shop", sentences: ["Josh and Pam went to the fish shop."] },
});

describe("system prompt", () => {
  it("carries the rung, the passage, the allowed words and the rules", () => {
    const p = buildTutorSystemPrompt(base);
    expect(p).toContain("Mrs. Wren");
    expect(p).toContain("rung 23");
    expect(p).toContain("The Fish Shop");
    expect(p).toContain("ships, maps");
    expect(p).toMatch(/Allowed words to read at this rung \(a sample\): .*\bship\b/);
    expect(p).toMatch(/Never use the word "wrong"/);
    expect(p).toMatch(/tell a parent or another grown-up/);
    expect(p).toMatch(/Do not use modern comparisons/);
    expect(p).toMatch(/Do not bring up religion/);
    expect(p).not.toMatch(/[—–]/);
  });

  it("switches registers for faith track and modern comparisons", () => {
    const p = buildTutorSystemPrompt({ ...base, child: { ...base.child, faithTrack: true, modernComparisons: true } });
    expect(p).toMatch(/Scripture/);
    expect(p).toMatch(/modern comparison only when it makes an idea clearer/);
  });

  it("tells the tutor not to help during placement", () => {
    expect(buildTutorSystemPrompt({ ...base, context: "placement" })).toMatch(/Do not read the test words/);
  });
});

describe("speakable text", () => {
  it("strips markdown, emoji, stage directions, dashes and wrapping quotes", () => {
    expect(cleanSpoken('"**Well done**, Eli! 🎉 *smiles* You read it — every word."')).toBe("Well done, Eli! You read it, every word.");
    expect(cleanSpoken("- First, look.\n- Then say it")).toBe("First, look. Then say it.");
    expect(cleanSpoken("Mrs. Wren: Hello there")).toBe("Hello there.");
  });

  it("caps replies by band at sentence boundaries", () => {
    const long = Array.from({ length: 10 }, (_, i) => `This is sentence number ${i} here.`).join(" ");
    expect(countWords(capForBand(long, "A"))).toBeLessThanOrEqual(34);
    expect(capForBand(long, "C").split(".").filter(Boolean).length).toBeLessThanOrEqual(3);
    expect(capForBand("One two three.", "A")).toBe("One two three.");
  });

  it("fills defaults for a partial request", () => {
    const r = normalizeTutorRequest({ child: { name: "" }, rung: "x" });
    expect(r.child.name).toBe("friend");
    expect(r.rung).toBe(6);
    expect(r.child.band).toBe("A");
  });
});
