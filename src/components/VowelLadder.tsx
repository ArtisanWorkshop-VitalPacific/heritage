"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Narrator, VowelLadderData } from "@/lib/types";
import { speak, stopSpeaking } from "@/lib/speech";
import "./vowel-ladder.css";

const VOWELS = ["a", "e", "i", "o", "u"] as const;

/** Syllables that spell a real word with a long vowel; the book marks them with a dash. */
const DASHED = new Set(["he", "we", "me", "be", "she", "the", "hi", "no", "go", "so", "yo", "ye", "pa", "ma", "la"]);

/** Splits a word into the pink part (through the first vowel) and the ink remainder. */
function splitVowel(word: string): [string, string] {
  const m = word.match(/^([^aeiou]*[aeiou]+)(.*)$/i);
  return m ? [m[1], m[2]] : [word, ""];
}

export interface VowelLadderProps {
  data: VowelLadderData;
  narrator?: Narrator;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  showHeader?: boolean;
  /** Show the "Climb the ladder" control. */
  showClimb?: boolean;
  /** Called when a rung is tapped or climbed (index 0 = a). */
  onRung?: (index: number, word: string | null) => void;
  className?: string;
  label?: string;
}

export function VowelLadder({
  data,
  narrator = "american",
  size = "md",
  interactive = true,
  showHeader = true,
  showClimb = true,
  onRung,
  className,
  label,
}: VowelLadderProps) {
  const [active, setActive] = useState<number | null>(null);
  const [climbing, setClimbing] = useState(false);
  const climbToken = useRef(0);

  useEffect(
    () => () => {
      climbToken.current++;
      stopSpeaking();
    },
    [],
  );

  const sayRung = useCallback(
    async (i: number) => {
      const word = data.right[i];
      setActive(i);
      onRung?.(i, word);
      if (word) await speak(word, { narrator, kind: "word", stretch: true });
    },
    [data.right, narrator, onRung],
  );

  const climb = useCallback(async () => {
    const token = ++climbToken.current;
    setClimbing(true);
    for (let i = 0; i < 5; i++) {
      if (token !== climbToken.current) return;
      if (!data.right[i] && !data.left[i]) continue;
      const started = Date.now();
      await sayRung(i);
      const wait = Math.max(0, 750 - (Date.now() - started));
      await new Promise((r) => setTimeout(r, wait));
    }
    if (token === climbToken.current) {
      setClimbing(false);
      setTimeout(() => setActive(null), 900);
    }
  }, [data.left, data.right, sayRung]);

  const stopClimb = () => {
    climbToken.current++;
    stopSpeaking();
    setClimbing(false);
    setActive(null);
  };

  // Rows are drawn top to bottom: u, o, i, e, a. The child starts at the blue dot by a.
  const order = [4, 3, 2, 1, 0];

  const ladder = (side: "left" | "right") => (
    <div className="vl-ladder" data-side={side}>
      <span className="vl-post vl-post-l" aria-hidden />
      <span className="vl-post vl-post-r" aria-hidden />
      {Array.from({ length: 6 }, (_, k) => (
        <span key={k} className="vl-rung" style={{ ["--k" as string]: k }} aria-hidden />
      ))}
      {side === "left" && <span className="vl-dot" aria-hidden />}
      <ol className="vl-labels">
        {order.map((i) => {
          const text = side === "left" ? data.left[i] : data.right[i];
          const isActive = active === i;
          if (!text) return <li key={i} className="vl-gap" aria-hidden />;
          const [pink, ink] = side === "left" ? [text, ""] : splitVowel(text);
          const dashed = side === "left" && DASHED.has(text.toLowerCase());
          const content = (
            <>
              <span className="vl-pink">{pink}</span>
              {ink && <span className="vl-ink">{ink}</span>}
              {dashed && <span className="vl-dash" aria-hidden />}
            </>
          );
          return (
            <li key={i} className="vl-gap" data-active={isActive || undefined}>
              {interactive ? (
                <button
                  type="button"
                  className="vl-word"
                  onClick={() => {
                    stopClimb();
                    void sayRung(i);
                  }}
                  aria-label={`${text}${data.right[i] ? `, ${data.right[i]}` : ""}`}
                >
                  {content}
                </button>
              ) : (
                <span className="vl-word">{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );

  return (
    <figure className={["vl", `vl-${size}`, className].filter(Boolean).join(" ")} aria-label={label ?? `Vowel ladder for ${data.onset}`}>
      {showHeader && (
        <div className="vl-header" aria-hidden>
          {VOWELS.map((v, i) => (
            <span key={v} data-active={active === i || undefined}>
              {v}
            </span>
          ))}
        </div>
      )}
      <div className="vl-pair">
        {ladder("left")}
        {ladder("right")}
      </div>
      {interactive && showClimb && (
        <div className="vl-actions">
          {climbing ? (
            <button type="button" className="btn btn-quiet" onClick={stopClimb}>
              Stop
            </button>
          ) : (
            <button type="button" className="btn btn-quiet" onClick={() => void climb()}>
              Climb the ladder
            </button>
          )}
        </div>
      )}
    </figure>
  );
}
