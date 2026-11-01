"use client";

import { useEffect, useRef, useState } from "react";
import { useDemo } from "@/lib/store";
import { dueReviews, getRung } from "@/lib/ladder";
import { stopSpeaking } from "@/lib/speech";
import type { Child, LadderState } from "@/lib/types";
import { BackToToday } from "./Chrome";
import { FamilyColumns, HearWord, LetterPage, PairRows, PatternCards, WordGrid, rungPracticeWords } from "./Drills";
import { VowelLadder } from "@/components/VowelLadder";
import { Seal } from "./Seal";
import { WrenAvatar, WrenSays } from "./Wren";
import { VOWELS, bandClass, cx, useReadingComfort, useSpeechReady } from "./util";

export function Drill() {
  const { child, ladder } = useDemo();
  useSpeechReady();
  useEffect(() => () => stopSpeaking(), []);
  if (!child || !ladder) {
    return (
      <div className="st-page st-empty">
        <WrenAvatar size={88} />
        <h1 className="st-h1">No reader yet.</h1>
        <p className="st-lede">Ask a grown-up to add a reader first.</p>
      </div>
    );
  }
  return <DrillView key={child.id} child={child} ladder={ladder} />;
}

function DrillView({ child, ladder }: { child: Child; ladder: LadderState }) {
  const comfort = useReadingComfort();
  const [sel, setSel] = useState(ladder.rung);
  const pickerRef = useRef<HTMLDivElement>(null);

  // /app/drill?rung=7 opens a mastered rung for review (linked from the ladder).
  useEffect(() => {
    const q = Number(new URLSearchParams(window.location.search).get("rung"));
    if (q && (q === ladder.rung || ladder.mastered.includes(q))) setSel(q);
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = pickerRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [sel]);

  const due = new Set(dueReviews(ladder));
  const choices = [ladder.rung, ...[...ladder.mastered].filter((n) => n !== ladder.rung).sort((a, b) => b - a)];
  const rung = getRung(sel);
  const words = rungPracticeWords(rung);
  const narrator = child.narrator;
  const isCurrent = sel === ladder.rung;

  return (
    <div className={cx("st-page st-drill", bandClass(child.band))} style={comfort}>
      <div className="st-topline">
        <BackToToday />
      </div>
      <header className="st-pagehead">
        <h1 className="st-h1">Practice the ladder</h1>
        <WrenSays
          narrator={narrator}
          text={rung.ladder ? "Tap any word to hear it. Or climb the ladder with me." : "Tap any word to hear it."}
          className="st-say-plain"
        />
      </header>

      <div className="st-picker" ref={pickerRef} role="group" aria-label="Choose a rung">
        {choices.map((n) => {
          const r = getRung(n);
          const current = n === ladder.rung && !ladder.mastered.includes(n);
          return (
            <button
              key={n}
              type="button"
              className="st-pick"
              aria-pressed={sel === n}
              data-kind={current ? "current" : due.has(n) ? "review" : "mastered"}
              onClick={() => {
                stopSpeaking();
                setSel(n);
              }}
            >
              {!current && <Seal n={n} short={r.short} size={28} mini />}
              <span className="st-pick-n num">{n}</span>
              <span className="st-pick-short">{r.short}</span>
              {current && <span className="st-pick-tag">Now</span>}
              {due.has(n) && <span className="st-pick-tag st-pick-tag-review">Review</span>}
            </button>
          );
        })}
      </div>

      <section className="st-drill-title" aria-live="polite">
        <p className="st-eyebrow">
          {isCurrent ? "Your rung" : "Review"} <span aria-hidden>·</span> Rung {rung.n}
        </p>
        <h2 className="st-h2">{rung.title}</h2>
      </section>

      <div className="st-drill-grid">
        {(rung.letterPages ?? []).length > 0 && (
          <section className={cx("st-drill-block", (rung.letterPages?.length ?? 0) > 2 && "st-drill-wide")} aria-label="Letter pages">
            <div className="st-lp-row" data-count={rung.letterPages?.length}>
              {rung.letterPages!.map((lp) => (
                <LetterPage key={lp.glyphs} page={lp} narrator={narrator} size="md" folio={rung.n} />
              ))}
            </div>
          </section>
        )}

        {rung.ladder && (
          <section className="st-drill-block" aria-label="Vowel ladder">
            <div className="st-ladder-wrap surface-drill">
              <VowelLadder key={rung.n} data={rung.ladder} narrator={narrator} size="lg" label={`Vowel ladder for ${rung.ladder.onset}`} />
            </div>
          </section>
        )}

        {rung.group === "vowels" && (
          <section className="st-drill-block" aria-label="The five vowels">
            <div className="st-card surface-drill st-vowelrow-card">
              <p className="st-card-eyebrow">The five vowels</p>
              <p className="st-vowelrow">
                {VOWELS.map((v, i) => {
                  const page = getRung(i + 1).letterPages![0];
                  return (
                    <HearWord key={v} word={v} narrator={narrator} say={`${v}, as in ${page.keyword}`} className="st-vowelrow-v">
                      <span className="vowel-lg">{v}</span>
                    </HearWord>
                  );
                })}
              </p>
            </div>
          </section>
        )}

        {rung.pattern?.length ? (
          <section className="st-drill-block" aria-label="Pattern">
            <div className="st-card surface-drill">
              <p className="st-card-eyebrow">Add and change</p>
              <PatternCards pattern={rung.pattern} narrator={narrator} />
            </div>
          </section>
        ) : null}

        {rung.families?.length ? (
          <section className={cx("st-drill-block", rung.families.length > 3 && "st-drill-wide")} aria-label="Word families">
            <div className="st-card surface-drill">
              <p className="st-card-eyebrow">Word families</p>
              <FamilyColumns families={rung.families} narrator={narrator} />
            </div>
          </section>
        ) : null}

        {rung.pairs.length > 0 && (
          <section className="st-drill-block st-drill-wide" aria-label="Pairs">
            <div className="st-card surface-drill">
              <p className="st-card-eyebrow">Pairs</p>
              <PairRows pairs={rung.pairs} narrator={narrator} />
            </div>
          </section>
        )}

        {words.length > 0 && rung.words.length > 0 && (
          <section className="st-drill-block st-drill-wide" aria-label="Words">
            <div className="st-card surface-drill">
              <p className="st-card-eyebrow">Words</p>
              <WordGrid words={words} narrator={narrator} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
