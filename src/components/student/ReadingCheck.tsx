"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AgeBand, Narrator, Passage, WordOutcome } from "@/lib/types";
import { partsFor, tokenize, type Token } from "@/lib/ladder";
import { accuracyOf, alignReading, liveProgress, splitHeard, wcpm } from "@/lib/align";
import { hasRecognition, listen, sayWordWithParts, stopSpeaking, type Listener } from "@/lib/speech";
import { Illustration } from "@/components/Illustration";
import { IconCheck, IconMic } from "@/components/icons";
import { MicChip } from "./Drills";
import { WrenSays } from "./Wren";
import { bandClass, bareWord, curly, cx, formatClock, isVowelPart, watchMicStart } from "./util";

export type ReadingPhase = "ready" | "listening" | "marking" | "done";

export type PassageLike = Pick<Passage, "title" | "sentences"> & { illustration?: string; id?: string; cast?: string[] };

/* ---------- Passage view ---------- */

export interface PassageViewProps {
  passage: PassageLike;
  band: AgeBand;
  narrator?: Narrator;
  phase?: ReadingPhase;
  /** Index of the next word to read while listening. */
  place?: number;
  /** Words that carry the ochre review underline. */
  marked?: ReadonlySet<number>;
  /** Called on a word tap. Return false to skip hearing the word in parts. */
  onWordTap?: (index: number) => boolean | void;
  /** Mrs. Wren, floated over the top of the card. */
  caption?: ReactNode;
  /** A quiet line under the passage. */
  note?: ReactNode;
  hideIllustration?: boolean;
  className?: string;
}

interface Bar {
  x: number;
  y: number;
  w: number;
}

interface Pop {
  index: number;
  x: number;
  y: number;
  below: boolean;
}

/** The passage as the child reads it: band face, ragged right, every word tappable. */
export function PassageView({ passage, band, narrator, phase = "ready", place, marked, onWordTap, caption, note, hideIllustration, className }: PassageViewProps) {
  const tokens = useMemo(() => tokenize(passage.sentences), [passage.sentences]);
  const bySentence = useMemo(() => {
    const out: Token[][] = passage.sentences.map(() => []);
    for (const t of tokens) out[t.sentence]?.push(t);
    return out;
  }, [tokens, passage.sentences]);

  const textRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const coreRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [layout, setLayout] = useState(0);
  const [bar, setBar] = useState<Bar | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-measure when the text box changes size (rotation, resize, fonts arriving).
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLayout((n) => n + 1));
    ro.observe(el);
    document.fonts?.ready.then(() => setLayout((n) => n + 1)).catch(() => {});
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (phase !== "listening" || place === undefined || place >= tokens.length) {
      setBar(null);
      return;
    }
    const el = coreRefs.current[place] ?? wordRefs.current[place];
    if (!el) return setBar(null);
    setBar({ x: el.offsetLeft, y: el.offsetTop + el.offsetHeight + 1, w: el.offsetWidth });
  }, [place, phase, layout, tokens.length]);

  useEffect(
    () => () => {
      if (popTimer.current) clearTimeout(popTimer.current);
    },
    [],
  );

  const showParts = useCallback(
    (i: number) => {
      const el = wordRefs.current[i];
      const box = textRef.current;
      if (!el || !box) return;
      const half = Math.min(110, box.clientWidth / 2);
      const x = Math.max(half, Math.min(box.clientWidth - half, el.offsetLeft + el.offsetWidth / 2));
      const below = el.offsetTop < 96;
      setPop({ index: i, x, y: below ? el.offsetTop + el.offsetHeight + 10 : el.offsetTop - 10, below });
      if (popTimer.current) clearTimeout(popTimer.current);
      popTimer.current = setTimeout(() => setPop(null), 3400);
      const word = tokens[i]?.clean ?? "";
      void sayWordWithParts(bareWord(tokens[i]?.display ?? word), partsFor(word), narrator);
    },
    [narrator, tokens],
  );

  const tap = (i: number) => {
    const hear = onWordTap ? onWordTap(i) : true;
    if (hear !== false) showParts(i);
  };

  const stateOf = (i: number): "read" | "current" | "ahead" | undefined => {
    if (phase !== "listening" || place === undefined) return undefined;
    return i < place ? "read" : i === place ? "current" : "ahead";
  };

  const popToken = pop ? tokens[pop.index] : undefined;
  const popParts = popToken ? partsFor(popToken.clean) : [];

  return (
    <article className={cx("st-passage surface-drill", bandClass(band), className)} data-phase={phase}>
      {caption}
      {!hideIllustration && passage.illustration && (
        <div className="st-passage-art">
          <Illustration id={passage.illustration} alt="" />
        </div>
      )}
      <h2 className="st-passage-title">{passage.title}</h2>
      <div className="st-text" ref={textRef}>
        {bySentence.map((row, si) => (
          <span className="st-sent" key={si}>
            {row.map((t) => (
              <Fragment key={t.i}>
                <button
                  ref={(el) => {
                    wordRefs.current[t.i] = el;
                  }}
                  type="button"
                  className="st-w"
                  data-state={stateOf(t.i)}
                  data-review={marked?.has(t.i) || undefined}
                  onClick={() => tap(t.i)}
                >
                  <WordFace
                    text={curly(t.display)}
                    coreRef={(el) => {
                      coreRefs.current[t.i] = el;
                    }}
                  />
                </button>{" "}
              </Fragment>
            ))}
          </span>
        ))}
        {bar && <span className="st-placebar" style={{ transform: `translate(${bar.x}px, ${bar.y}px)`, width: bar.w }} aria-hidden />}
        {pop && popToken && (
          <span
            className={cx("st-parts glass glass-strong glass-lg", pop.below && "st-parts-below")}
            style={{ left: pop.x, top: pop.y }}
            role="status"
            aria-live="polite"
          >
            <span className="st-parts-word">{bareWord(popToken.display)}</span>
            <span className="st-parts-split" aria-label={`In parts: ${popParts.join(", ")}`}>
              {popParts.map((p, k) => (
                <Fragment key={k}>
                  {k > 0 && (
                    <span className="st-parts-dot" aria-hidden>
                      ·
                    </span>
                  )}
                  <span className={isVowelPart(p) ? "vowel" : undefined}>{p}</span>
                </Fragment>
              ))}
            </span>
          </span>
        )}
      </div>
      {note && <div className="st-passage-note">{note}</div>}
    </article>
  );
}

/** A printed word: punctuation outside, the word itself in a span that carries marks. */
function WordFace({ text, coreRef }: { text: string; coreRef: (el: HTMLSpanElement | null) => void }) {
  const m = text.match(/^([^A-Za-z0-9\u2019']*)(.*?)([^A-Za-z0-9\u2019']*)$/);
  const [lead, core, trail] = m ? [m[1], m[2], m[3]] : ["", text, ""];
  return (
    <>
      {lead}
      <span className="st-w-core" ref={coreRef}>
        {core || text}
      </span>
      {trail}
    </>
  );
}

/* ---------- Reading check ---------- */

export interface ReadingCheckProps {
  passage: PassageLike;
  band: AgeBand;
  narrator?: Narrator;
  childName?: string;
  /** Called once with the per-word outcomes when the reading ends. */
  onComplete: (outcomes: WordOutcome[], accuracy: number, wcpm: number, seconds: number) => void;
  /** Mrs. Wren's line before reading starts (spoken). */
  introLine?: string;
  /** Extra controls in the dock before reading starts, e.g. "New story". */
  readyExtra?: ReactNode;
  /** A quiet line under the passage, e.g. "Every word checked". */
  note?: ReactNode;
  onPhaseChange?: (phase: ReadingPhase) => void;
  hideIllustration?: boolean;
  beginLabel?: string;
}

const SILENCE_MS = 4000;

/**
 * Listens to the child read a passage aloud. A thin navy line follows the child's place.
 * Ends on the last word, after four seconds of quiet at the end, or on "I'm done".
 * Without a microphone it becomes tap-to-mark: a grown-up taps the words that needed help.
 * Never red: words that need another look get the ochre review underline.
 */
export function ReadingCheck({
  passage,
  band,
  narrator,
  childName,
  onComplete,
  introLine,
  readyExtra,
  note,
  onPhaseChange,
  hideIllustration,
  beginLabel = "Begin reading",
}: ReadingCheckProps) {
  const tokens = useMemo(() => tokenize(passage.sentences), [passage.sentences]);
  const target = useMemo(() => tokens.map((t) => bareWord(t.display)), [tokens]);
  const n = target.length;

  const [mode, setMode] = useState<"listen" | "tap">(() => (hasRecognition() ? "listen" : "tap"));
  const [micNote, setMicNote] = useState<null | "denied" | "unavailable">(null);
  const [phase, setPhaseState] = useState<ReadingPhase>("ready");
  const [place, setPlace] = useState(0);
  const [helped, setHelped] = useState<ReadonlySet<number>>(() => new Set());
  const [marked, setMarked] = useState<ReadonlySet<number>>(() => new Set());
  const [now, setNow] = useState(() => Date.now());
  const [micLive, setMicLive] = useState(false);

  const phaseRef = useRef<ReadingPhase>("ready");
  const cancelWatchRef = useRef<(() => void) | null>(null);
  const placeRef = useRef(0);
  const helpedRef = useRef<Set<number>>(new Set());
  const listenerRef = useRef<Listener | null>(null);
  const startAtRef = useRef(0);
  const lastHeardAtRef = useRef(0);
  const heardRef = useRef("");
  const carriedRef = useRef("");
  const restartsRef = useRef(0);
  const finishedRef = useRef(false);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onPhaseRef = useRef(onPhaseChange);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onPhaseRef.current = onPhaseChange;
  });

  const setPhase = useCallback((p: ReadingPhase) => {
    phaseRef.current = p;
    setPhaseState(p);
    onPhaseRef.current?.(p);
  }, []);

  const finalize = useCallback(
    (outcomes: WordOutcome[], seconds: number, marked = false) => {
      const accuracy = accuracyOf(outcomes);
      const correct = outcomes.filter((o) => o.index >= 0 && o.status === "correct").length;
      // A rate above what a child at this band could read is not this child's rate: a grown-up read
      // aloud, or (marking path) the clock was the grown-up's. Record it as not timed (0), so the
      // fluency chart stays true. Marking runs under eight seconds are not timed either.
      const ceiling = band === "A" ? 110 : band === "B" ? 150 : 190;
      const raw = wcpm(correct, seconds);
      const rate = raw > ceiling || (marked && seconds < 8) ? 0 : raw;
      setMarked(new Set(outcomes.filter((o) => o.index >= 0 && o.status !== "correct").map((o) => o.index)));
      setPhase("done");
      onCompleteRef.current(outcomes, accuracy, rate, seconds);
    },
    [setPhase, band],
  );

  const finishListening = useCallback(
    (reason: "end" | "silence" | "done") => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      cancelWatchRef.current?.();
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
      endTimerRef.current = null;
      const l = listenerRef.current;
      listenerRef.current = null;
      l?.abort();
      const endAt = reason === "silence" ? Math.max(lastHeardAtRef.current, startAtRef.current + 1000) : Date.now();
      const seconds = Math.max(1, Math.round((endAt - startAtRef.current) / 1000));
      const heard = splitHeard(`${carriedRef.current} ${heardRef.current}`);
      let outcomes = alignReading(target, heard, passage.cast?.length ? { names: passage.cast } : undefined);
      const help = helpedRef.current;
      if (help.size) {
        outcomes = outcomes.map((o) => (o.index >= 0 && help.has(o.index) && o.status === "correct" ? { ...o, status: "hesitation" as const } : o));
      }
      finalize(outcomes, seconds);
    },
    [finalize, target, passage.cast],
  );

  const finishMarking = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const seconds = Math.max(1, Math.round((Date.now() - startAtRef.current) / 1000));
    const help = helpedRef.current;
    const outcomes: WordOutcome[] = target.map((word, index) => ({ word, index, status: help.has(index) ? "hesitation" : "correct" }));
    finalize(outcomes, seconds, true);
  }, [finalize, target]);

  /** The microphone is unavailable: carry on as tap-to-mark, keeping the timer and any marks. */
  const toTap = useCallback(
    (why: "denied" | "unavailable") => {
      cancelWatchRef.current?.();
      const l = listenerRef.current;
      listenerRef.current = null;
      l?.abort();
      setMode("tap");
      setMicNote(why);
      if (phaseRef.current === "listening") setPhase("marking");
    },
    [setPhase],
  );

  const startListening = useCallback(() => {
    const l = listen(
      {
        onStart: () => {
          cancelWatchRef.current?.();
          if (!finishedRef.current) setMicLive(true);
        },
        onText: (fin, interim) => {
          if (finishedRef.current) return;
          heardRef.current = `${fin} ${interim}`.trim();
          lastHeardAtRef.current = Date.now();
          const p = liveProgress(target, splitHeard(`${carriedRef.current} ${heardRef.current}`), {
            names: passage.cast?.length ? passage.cast : undefined,
            floor: placeRef.current,
          });
          if (p > placeRef.current) {
            placeRef.current = p;
            setPlace(p);
          }
          if (p >= n && !endTimerRef.current) endTimerRef.current = setTimeout(() => finishListening("end"), 700);
        },
        onError: (err) => {
          if (finishedRef.current || phaseRef.current !== "listening") return;
          if (err === "no-speech") return;
          toTap(err === "not-allowed" ? "denied" : "unavailable");
        },
        onEnd: (fin) => {
          if (finishedRef.current || phaseRef.current !== "listening") return;
          // The recognizer stopped on its own. Keep what it heard and listen again.
          const latest = heardRef.current.length >= (fin ?? "").length ? heardRef.current : fin;
          carriedRef.current = `${carriedRef.current} ${latest}`.trim();
          heardRef.current = "";
          if (restartsRef.current++ < 4) startListeningRef.current();
          else if (placeRef.current >= n - 2) finishListening("silence");
          else toTap("unavailable");
        },
      },
      { continuous: true },
    );
    if (!l) {
      if (!finishedRef.current && phaseRef.current === "listening") toTap("unavailable");
      return;
    }
    listenerRef.current = l;
  }, [finishListening, n, target, toTap, passage.cast]);

  const startListeningRef = useRef(startListening);
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const begin = () => {
    stopSpeaking();
    finishedRef.current = false;
    helpedRef.current = new Set();
    setHelped(new Set());
    setMarked(new Set());
    placeRef.current = 0;
    setPlace(0);
    heardRef.current = "";
    carriedRef.current = "";
    restartsRef.current = 0;
    startAtRef.current = Date.now();
    lastHeardAtRef.current = Date.now();
    setNow(Date.now());
    if (mode === "tap") {
      setPhase("marking");
      return;
    }
    setPhase("listening");
    setMicLive(false);
    cancelWatchRef.current?.();
    cancelWatchRef.current = watchMicStart(() => {
      if (!finishedRef.current && phaseRef.current === "listening") toTap("unavailable");
    });
    startListening();
  };

  // Clock for the chip, and the four-second quiet rule at the end of the passage.
  useEffect(() => {
    if (phase !== "listening" && phase !== "marking") return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (phaseRef.current !== "listening" || finishedRef.current) return;
      const heardCount = splitHeard(`${carriedRef.current} ${heardRef.current}`).length;
      const nearEnd = placeRef.current >= n - 2 || heardCount >= n;
      if (nearEnd && Date.now() - lastHeardAtRef.current >= SILENCE_MS) finishListening("silence");
    }, 500);
    return () => clearInterval(id);
  }, [phase, n, finishListening]);

  useEffect(
    () => () => {
      finishedRef.current = true;
      cancelWatchRef.current?.();
      listenerRef.current?.abort();
      listenerRef.current = null;
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
    },
    [],
  );

  const toggleHelp = (i: number, only?: "add") => {
    const next = new Set(helpedRef.current);
    if (next.has(i) && only !== "add") next.delete(i);
    else next.add(i);
    helpedRef.current = next;
    setHelped(next);
  };

  const onWordTap = (i: number) => {
    const ph = phaseRef.current;
    if (ph === "marking") {
      toggleHelp(i);
      return false;
    }
    if (ph === "listening") toggleHelp(i, "add");
    return true;
  };

  const name = childName ? `, ${childName}` : "";
  let line: string;
  if (phase === "listening") line = micLive ? "I am listening. Tap a word if you need help." : "Getting ready to listen.";
  else if (phase === "marking") line = "Tap each word that needed help. Then tap Finish.";
  else if (phase === "done") line = "Well read. Let us look at how it went.";
  else if (mode === "tap")
    line = micNote
      ? "The microphone is off. Read the story aloud, and a grown-up will mark it."
      : introLine ?? `Read the story aloud${name}.`;
  else line = introLine ?? `Read the story to me${name}. Tap any word to hear it.`;

  const shownMarks = phase === "done" ? marked : helped;

  return (
    <div className="st-check" data-phase={phase}>
      <PassageView
        passage={passage}
        band={band}
        narrator={narrator}
        phase={phase}
        place={place}
        marked={shownMarks}
        onWordTap={onWordTap}
        hideIllustration={hideIllustration}
        note={note}
        caption={<WrenSays text={line} narrator={narrator} auto={phase === "ready"} floating />}
      />

      <div className="st-dock">
        <div className="st-dock-bar glass glass-strong glass-lg">
          {phase === "ready" && (
            <>
              <div className="st-dock-side">
                <MicChip state={mode === "listen" ? "idle" : "off"} label={mode === "listen" ? "Microphone ready" : "A grown-up marks"} />
                {readyExtra}
              </div>
              <button type="button" className="btn btn-primary btn-xl st-primary" onClick={begin}>
                {mode === "listen" && <IconMic size={24} />}
                {beginLabel}
              </button>
            </>
          )}
          {phase === "listening" && (
            <>
              <div className="st-dock-side">
                <MicChip state={micLive ? "listening" : "idle"} label={micLive ? undefined : "Starting the microphone"} />
                <span className="st-dock-clock num" aria-hidden>
                  {formatClock(now - startAtRef.current)}
                </span>
              </div>
              <button type="button" className="btn btn-primary btn-xl st-primary" onClick={() => finishListening("done")}>
                {"I’m done"}
              </button>
            </>
          )}
          {phase === "marking" && (
            <>
              <div className="st-dock-side">
                <MicChip state="marking" />
                <span className="st-dock-clock num" aria-hidden>
                  {formatClock(now - startAtRef.current)}
                </span>
              </div>
              <button type="button" className="btn btn-primary btn-xl st-primary" onClick={finishMarking}>
                <IconCheck size={24} />
                Finish
              </button>
            </>
          )}
          {phase === "done" && (
            <div className="st-dock-side">
              <MicChip state="heard" label="Reading done" />
            </div>
          )}
          {micNote && phase !== "done" && (
            <p className="st-dock-note">
              {micNote === "denied"
                ? "The microphone is off for this page. Tap the words that needed help."
                : "This browser cannot listen. Tap the words that needed help."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
