import { describe, expect, it } from "vitest";
import { captionOf, partsCaption, piecesOf } from "./speech";

describe("sounds inside a line", () => {
  it("shows a vowel sound as its letter and a sounded-out word as its parts", () => {
    expect(captionOf("⟦a⟧, as in apple.")).toBe("a, as in apple.");
    expect(captionOf("Let us sound it out together. ⟦hat⟧. Now you say it.")).toBe("Let us sound it out together. ha, a, at... hat. Now you say it.");
    expect(partsCaption("top")).toBe("to, o, op");
    expect(partsCaption("up")).toBe("u, up");
    expect(partsCaption("cake")).toBe("ca, a, ake");
  });

  it("splits a line into text, short vowel sounds and sounded-out words", () => {
    expect(piecesOf("⟦a⟧, as in apple.")).toEqual([{ vowel: "a" }, { text: ", as in apple." }]);
    expect(piecesOf("Listen: ⟦hen⟧. Now you try.")).toEqual([{ text: "Listen:" }, { word: "hen" }, { text: ". Now you try." }]);
    expect(piecesOf("⟦o⟧")).toEqual([{ vowel: "o" }]);
    expect(piecesOf("Plain words only.")).toEqual([{ text: "Plain words only." }]);
  });
});
