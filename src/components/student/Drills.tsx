"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { LetterPage as LetterPageData, Narrator, Rung } from "@/lib/types";
import { speak } from "@/lib/speech";
import { Illustration } from "@/components/Illustration";
import { VowelLadder } from "@/components/VowelLadder";
import { IconArrowRight, IconSpeaker } from "@/components/icons";
import { cx, practiceWords, unique, vowelSpans } from "./util";

/* ---------- Words ---------- */

/** A word with its vowels in Hay & Wingo pink. `large` uses the brighter pink for type of 32px and up. */
export function VowelWord({ word, large }: { word: string; large?: boolean }) {
  return (
    <>
      {vowelSpans(word).map((s, i) =>
        s.vowel ? (
          <span key={i} className={large ? "vowel-lg" : "vowel"}>
            {s.text}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

/** Briefly marks a control as the one being heard. */
function useFlash(ms = 900): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (t.current) clearTimeout(t.current);
  }, []);
  return [
    on,
    () => {
      setOn(true);
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => setOn(false), ms);
    },
  ];
}

export interface HearWordProps {
  word: string;
  narrator?: Narrator;
  large?: boolean;
  className?: string;
  /** What to say, when it differs from the word (e.g. "h, as in hen"). */
  say?: string;
  children?: ReactNode;
}

/** A word you can tap to hear. */
export function HearWord({ word, narrator, large, className, say, children }: HearWordProps) {
  const [on, flash] = useFlash();
  return (
    <button
      type="button"
      className={cx("st-hear", className)}
      data-on={on || undefined}
      onClick={() => {
        flash();
        // A word printed with its vowel in color is heard with the vowel held. A custom line is said as written.
        void speak(say ?? word, { narrator, kind: "word", stretch: !say });
      }}
      aria-label={`Hear ${word}`}
    >
      {children ?? <VowelWord word={word} large={large} />}
    </button>
  );
}

/* ---------- Letter page ---------- */

const VOWEL_GLYPH = /^[aeiou]$/i;

/** "h H" as two glyphs. Vowel pages print the vowel in pink, as the ladder header does. */
function Glyphs({ glyphs }: { glyphs: string }) {
  const parts = glyphs.split(/\s+/).filter(Boolean);
  return (
    <>
      {parts.map((g, i) => (
        <span key={i} className={cx("st-lp-glyph", VOWEL_GLYPH.test(g) && "vowel-lg")}>
          {g}
        </span>
      ))}
    </>
  );
}

export interface LetterPageProps {
  page: LetterPageData;
  narrator?: Narrator;
  /** Page number printed at the foot, as in the book. */
  folio?: number | string;
  size?: "sm" | "md" | "lg";
  /** Called after the page is spoken (e.g. to show the line as a caption). */
  onHear?: (page: LetterPageData) => void;
  priority?: boolean;
}

/** A Hay & Wingo letter page: one picture, very large "h H" in the book serif. Tap to hear. */
export function LetterPage({ page, narrator, folio, size = "lg", onHear, priority }: LetterPageProps) {
  const [on, flash] = useFlash(1600);
  return (
    <figure
      className={cx("st-lp", `st-lp-${size}`, "surface-drill")}
      data-on={on || undefined}
      data-wide={(page.glyphs.split(" ")[0]?.length ?? 1) > 1 || undefined}
    >
      <button
        type="button"
        className="st-lp-hit"
        onClick={() => {
          flash();
          void speak(page.say, { narrator, kind: "sentence" });
          onHear?.(page);
        }}
        aria-label={`${page.glyphs.split(" ")[0]}, as in ${page.keyword}. Hear it.`}
      >
        <span className="st-lp-art">
          <Illustration id={page.spot} alt="" className="st-lp-spot" priority={priority} />
        </span>
        <span className="st-lp-glyphs" aria-hidden>
          <Glyphs glyphs={page.glyphs} />
        </span>
        <span className="st-lp-hear" aria-hidden>
          <IconSpeaker size={20} />
        </span>
      </button>
      {folio !== undefined && (
        <figcaption className="st-lp-folio" aria-hidden>
          {folio}
        </figcaption>
      )}
    </figure>
  );
}

/** A plate with a rung's graphemes when it has no letter page (e.g. "th wh"). */
export function GlyphPlate({ glyphs, size = "md" }: { glyphs: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={cx("st-plate", `st-plate-${size}`)} aria-hidden>
      {glyphs.split(/\s+/).map((g, i) => (
        <span key={i}>
          <VowelWord word={g} large />
        </span>
      ))}
    </span>
  );
}

/* ---------- Pairs ---------- */

/** Minimal pairs set out like the book: each column is one pair, the change sits in the vowel. */
export function PairRows({ pairs, narrator }: { pairs: [string, string][]; narrator?: Narrator }) {
  return (
    <div className="st-pairs" role="list">
      {pairs.map(([a, b], i) => (
        <div key={i} className="st-pair" role="listitem">
          <HearWord word={a} narrator={narrator} large className="st-pair-word" />
          <HearWord word={b} narrator={narrator} large className="st-pair-word" />
        </div>
      ))}
    </div>
  );
}

/** Do the two words of every pair differ only in their vowels? */
export function onlyVowelsChange(pairs: [string, string][]): boolean {
  if (!pairs.length) return false;
  const skeleton = (w: string) => w.toLowerCase().replace(/[aeiou]/g, "_");
  return pairs.every(([a, b]) => a.length === b.length && skeleton(a) === skeleton(b));
}

/* ---------- Pattern: ten -> tent ---------- */

/** Splits "ten" -> "tent" into the kept start and the added letters. */
export function patternSplit(from: string, to: string): { keep: string; added: string; syllables?: string[] } {
  if (from.includes("|")) {
    return { keep: to, added: "", syllables: from.split("|").map((s) => s.trim()) };
  }
  let i = 0;
  while (i < from.length && i < to.length && from[i] === to[i]) i++;
  return { keep: to.slice(0, i), added: to.slice(i) };
}

export function PatternCards({ pattern, narrator, limit }: { pattern: { from: string; to: string }[]; narrator?: Narrator; limit?: number }) {
  const items = limit ? pattern.slice(0, limit) : pattern;
  return (
    <ul className="st-pattern">
      {items.map((p, i) => {
        const s = patternSplit(p.from, p.to);
        return (
          <li key={i} className="st-pattern-row">
            <HearWord word={s.syllables ? s.syllables.join("") : p.from} narrator={narrator} large className="st-pattern-from">
              {s.syllables ? (
                s.syllables.map((syl, k) => (
                  <span key={k} className="st-syl">
                    <VowelWord word={syl} large />
                  </span>
                ))
              ) : (
                <VowelWord word={p.from} large />
              )}
            </HearWord>
            <span className="st-pattern-arrow" aria-hidden>
              <IconArrowRight size={26} />
            </span>
            <HearWord word={p.to} narrator={narrator} large className="st-pattern-to">
              <VowelWord word={s.keep} large />
              {s.added && (
                <span className="st-added">
                  <VowelWord word={s.added} large />
                </span>
              )}
            </HearWord>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Families ---------- */

export function FamilyColumns({ families, narrator }: { families: string[][]; narrator?: Narrator }) {
  return (
    <div className="st-families" style={{ "--cols": Math.min(families.length, 3) } as CSSProperties}>
      {families.map((col, i) => (
        <ul key={i} className="st-family">
          {col.map((w) => (
            <li key={w}>
              <HearWord word={w} narrator={narrator} large className="st-family-word" />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

/* ---------- Word grid ---------- */

export function WordGrid({ words, narrator }: { words: string[]; narrator?: Narrator }) {
  return (
    <ul className="st-wordgrid">
      {unique(words).map((w) => (
        <li key={w}>
          <HearWord word={w} narrator={narrator} large className="st-tile-word" />
        </li>
      ))}
    </ul>
  );
}

/* ---------- A rung's teaching picture ---------- */

/** The ladder, pattern or families page for a rung (whichever the rung teaches with). */
export function RungPattern({ rung, narrator, size = "lg" }: { rung: Rung; narrator?: Narrator; size?: "md" | "lg" }) {
  if (rung.ladder) {
    return (
      <div className="st-ladder-wrap surface-drill">
        <VowelLadder data={rung.ladder} narrator={narrator} size={size} label={`Vowel ladder for ${rung.ladder.onset}`} />
      </div>
    );
  }
  if (rung.pattern?.length) {
    return (
      <div className="st-card surface-drill">
        <PatternCards pattern={rung.pattern} narrator={narrator} />
      </div>
    );
  }
  if (rung.families?.length) {
    return (
      <div className="st-card surface-drill">
        <FamilyColumns families={rung.families} narrator={narrator} />
      </div>
    );
  }
  return null;
}

export function hasPatternPage(rung: Rung): boolean {
  return Boolean(rung.ladder || rung.pattern?.length || rung.families?.length);
}

export function rungPracticeWords(rung: Rung): string[] {
  return practiceWords(rung);
}

/* ---------- Mic state ---------- */

export type MicState = "idle" | "listening" | "off" | "marking" | "heard" | "paused";

const MIC_LABEL: Record<MicState, string> = {
  idle: "Microphone ready",
  listening: "Listening",
  off: "Microphone off",
  marking: "Grown-up marking",
  heard: "Heard it",
  paused: "Microphone paused",
};

/** A large, calm chip that says what the microphone is doing. Readable from across a room. */
export function MicChip({ state, label, className }: { state: MicState; label?: string; className?: string }) {
  return (
    <span className={cx("st-mic", className)} data-state={state} role="status" aria-live="polite">
      <span className="st-mic-dot" aria-hidden />
      <span className="st-mic-label">{label ?? MIC_LABEL[state]}</span>
    </span>
  );
}
