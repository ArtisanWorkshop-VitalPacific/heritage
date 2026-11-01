"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDemo, type SessionOutcome } from "@/lib/store";
import {
  CLEAN_READS_TO_MASTER,
  LESSON_STEPS,
  MAX_RUNG,
  dueReviews,
  getRung,
  passageFor,
  type LessonStep,
} from "@/lib/ladder";
import { requestPassage } from "@/lib/tutor-client";
import { speak, stopSpeaking } from "@/lib/speech";
import type { Child, LadderState, LetterPage as LetterPageData, Narrator, Passage, Rung, WordOutcome } from "@/lib/types";
import { IconArrowRight, IconCheck, IconRefresh, IconSpeaker } from "@/components/icons";
import { Dock, LeaveControl, StepBar } from "./Chrome";
import {
  HearWord,
  LetterPage,
  PairRows,
  RungPattern,
  WordGrid,
  hasPatternPage,
  onlyVowelsChange,
  patternSplit,
  rungPracticeWords,
} from "./Drills";
import { PassageView, ReadingCheck, type PassageLike } from "./ReadingCheck";
import { MasteryMoment } from "./Seal";
import { CleanReads } from "./StudentHome";
import { WrenAvatar, WrenSays } from "./Wren";
import { VOWELS, bandClass, capitalize, cx, daySeed, reviewWordsFrom, sentenceCase, useReadingComfort, useSpeechReady, warmupWords } from "./util";

const LABELS: Record<LessonStep, string> = {
  warmup: "Warm up",
  teach: "Learn",
  words: "Words",
  passage: "Story",
  check: "Check",
  close: "Close",
};

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five"];

interface LessonResult {
  kind: "passage" | "sounds";
  outcomes: WordOutcome[];
  accuracy: number;
  wcpm: number;
  seconds: number;
  session: SessionOutcome;
  /** The letters of the sound drill, for the marked strip on the check step. */
  items?: string[];
}

export function Lesson() {
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
  return <LessonFlow key={child.id} child={child} ladder={ladder} />;
}

/** The rung named by ?r=N when it is the current rung or a mastered one; otherwise the current rung. */
function requestedRung(l: LadderState): number {
  try {
    const raw = new URLSearchParams(window.location.search).get("r");
    const n = raw === null ? NaN : Number(raw);
    if (Number.isInteger(n) && (n === l.rung || l.mastered.includes(n))) return n;
  } catch {
    /* no query: the current rung */
  }
  return l.rung;
}

function LessonFlow({ child, ladder }: { child: Child; ladder: LadderState }) {
  const { actions } = useDemo();
  const router = useRouter();
  // The lesson keeps the rung it started on, even after a mastery moves the ladder on.
  const comfort = useReadingComfort();
  const [snap] = useState(ladder);
  // Printed packets open /app/lesson?r=N: the current rung, or a mastered rung to review.
  const [rungN] = useState(() => requestedRung(snap));
  const review = rungN !== snap.rung;
  const rung = getRung(rungN);
  const vowelRung = rung.group === "vowels";
  const narrator = child.narrator;

  const stepIds = useMemo<LessonStep[]>(() => (vowelRung ? LESSON_STEPS.filter((s) => s !== "passage") : [...LESSON_STEPS]), [vowelRung]);
  const steps = stepIds.map((id) => ({ id, label: id === "words" && vowelRung ? "Sounds" : LABELS[id] }));
  const [stepIndex, setStepIndex] = useState(0);
  const step = stepIds[stepIndex];

  const startedAt = useRef(Date.now());
  const recordedRef = useRef(false);
  const [result, setResult] = useState<LessonResult | null>(null);
  const [story, setStory] = useState<{ passage: Passage; generated: boolean; fresh: boolean } | null>(() => {
    const p = vowelRung ? undefined : passageFor(rungN);
    return p ? { passage: p, generated: false, fresh: false } : null;
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [stepIndex]);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  const goTo = (id: LessonStep) => setStepIndex(Math.max(0, stepIds.indexOf(id)));
  const next = () => setStepIndex((i) => Math.min(stepIds.length - 1, i + 1));

  /** Records the reading exactly once, then moves to the check. */
  const record = (kind: LessonResult["kind"], outcomes: WordOutcome[], accuracy: number, rate: number, seconds: number, items?: string[]) => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    const screenMinutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60_000));
    const session = actions.recordSession({
      childId: child.id,
      date: new Date().toISOString(),
      rung: rungN,
      passageId: kind === "passage" ? story?.passage.id : undefined,
      accuracy,
      wcpm: rate,
      outcomes,
      screenMinutes,
      paperMinutes: 0,
      source: "screen",
    });
    setResult({ kind, outcomes, accuracy, wcpm: rate, seconds, session, items });
    advanceTimer.current = setTimeout(() => goTo("check"), kind === "passage" ? 900 : 300);
  };

  return (
    <div className={cx("st-page st-lesson", bandClass(child.band))} data-step={step} style={comfort}>
      <StepBar
        steps={steps}
        current={stepIndex}
        end={
          <>
            <span className="st-stepbar-rung" aria-hidden>
              {review ? "Review \u00b7 " : ""}Rung {rung.n}
            </span>
            <LeaveControl what="lesson" />
          </>
        }
      />
      <h1 className="visually-hidden" ref={headingRef} tabIndex={-1}>
        {review ? "Review. " : ""}Rung {rung.n}, {rung.title}. {steps[stepIndex]?.label}.
      </h1>

      <div className="st-stage" key={step}>
        {step === "warmup" && <WarmupStep child={child} snap={snap} rung={rung} onNext={next} />}
        {step === "teach" && <TeachStep rung={rung} narrator={narrator} onNext={next} />}
        {step === "words" &&
          (vowelRung ? (
            <SoundDrillStep
              rung={rung}
              child={child}
              onFinish={(outcomes, accuracy, seconds, items) => record("sounds", outcomes, accuracy, 0, seconds, items)}
            />
          ) : (
            <WordsStep rung={rung} narrator={narrator} onNext={next} />
          ))}
        {step === "passage" && story && (
          <PassageStep
            child={child}
            rung={rung}
            story={story}
            setStory={setStory}
            onComplete={(outcomes, accuracy, rate, seconds) => record("passage", outcomes, accuracy, rate, seconds)}
          />
        )}
        {step === "check" && result && <CheckStep child={child} rung={rung} result={result} passage={story?.passage} review={review} onNext={next} />}
        {step === "close" && <CloseStep child={child} rung={rung} result={result} onDone={() => router.push("/app/student")} />}
      </div>
    </div>
  );
}

/* ---------- Warm up ---------- */

function WarmupStep({ child, snap, rung, onNext }: { child: Child; snap: LadderState; rung: Rung; onNext: () => void }) {
  const words = useMemo(() => warmupWords(rung.n, snap.mastered, dueReviews(snap), daySeed()), [rung.n, snap]);
  if (!words.length) return <VowelWarmup child={child} rung={rung} onNext={onNext} />;
  return <TickWords child={child} words={words} onNext={onNext} />;
}

function TickWords({ child, words, onNext }: { child: Child; words: string[]; onNext: () => void }) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set());
  const all = ticked.size === words.length;
  const toggle = (w: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });

  return (
    <>
      <WrenSays
        narrator={child.narrator}
        text={all ? `Good, ${child.name}. You read them all.` : "Let us warm up. Read each word to me. Tap a word to hear it."}
        floating
        className="st-say-top"
      />
      <ul className="st-warm">
        {words.map((w) => {
          const on = ticked.has(w);
          return (
            <li key={w} className="st-warm-card surface-drill" data-done={on || undefined}>
              <HearWord word={w} narrator={child.narrator} large className="st-warm-word" />
              <button type="button" className="st-tick" aria-pressed={on} onClick={() => toggle(w)}>
                <span className="st-tick-box" aria-hidden>
                  <IconCheck size={22} />
                </span>
                <span>{on ? "Read" : "I read it"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Dock>
        <p className="st-dock-count num" aria-live="polite">
          {ticked.size} of {words.length} read
        </p>
        <button type="button" className="btn btn-primary btn-xl st-primary" onClick={onNext}>
          Next
          <IconArrowRight size={22} />
        </button>
      </Dock>
    </>
  );
}

const VOWEL_PAGES: LetterPageData[] = VOWELS.map((v) => getRung(VOWELS.indexOf(v) + 1).letterPages![0]);

/** Before any words are mastered, the warm up is the vowels learned so far. */
function VowelWarmup({ child, rung, onNext }: { child: Child; rung: Rung; onNext: () => void }) {
  const learned = rung.n <= 5 ? VOWEL_PAGES.slice(0, rung.n - 1) : VOWEL_PAGES;
  const [ticked, setTicked] = useState<ReadonlySet<number>>(() => new Set());

  if (!learned.length) {
    return (
      <>
        <WrenSays
          narrator={child.narrator}
          text="These are the five vowels: a, e, i, o, u. Every word needs one. Today you meet a."
          floating
          className="st-say-top"
        />
        <div className="st-card surface-drill st-vowelrow-card">
          <p className="st-vowelrow" aria-label="a, e, i, o, u">
            {VOWELS.map((v) => (
              <HearWord key={v} word={v} narrator={child.narrator} large className="st-vowelrow-v" say={v}>
                <span className="vowel-lg">{v}</span>
              </HearWord>
            ))}
          </p>
        </div>
        <Dock>
          <span />
          <button type="button" className="btn btn-primary btn-xl st-primary" onClick={onNext}>
            Next
            <IconArrowRight size={22} />
          </button>
        </Dock>
      </>
    );
  }

  return (
    <>
      <WrenSays
        narrator={child.narrator}
        text={ticked.size === learned.length ? `Good, ${child.name}. You know these sounds.` : "Let us warm up. Say the sound of each letter. Tap the picture to hear it."}
        floating
        className="st-say-top"
      />
      <ul className="st-warm st-warm-vowels">
        {learned.map((lp, i) => {
          const on = ticked.has(i);
          return (
            <li key={lp.glyphs} className="st-warm-card st-warm-lp" data-done={on || undefined}>
              <LetterPage page={lp} narrator={child.narrator} size="sm" />
              <button
                type="button"
                className="st-tick"
                aria-pressed={on}
                onClick={() =>
                  setTicked((prev) => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  })
                }
              >
                <span className="st-tick-box" aria-hidden>
                  <IconCheck size={22} />
                </span>
                <span>{on ? "Said" : "I said it"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Dock>
        <p className="st-dock-count num" aria-live="polite">
          {ticked.size} of {learned.length} said
        </p>
        <button type="button" className="btn btn-primary btn-xl st-primary" onClick={onNext}>
          Next
          <IconArrowRight size={22} />
        </button>
      </Dock>
    </>
  );
}

/* ---------- Learn ---------- */

type TeachPage = { kind: "letter"; page: LetterPageData } | { kind: "pattern" };

function patternLine(rung: Rung): string {
  if (rung.ladder) {
    const i = rung.ladder.left.findIndex((x, k) => x && rung.ladder!.right[k]);
    const a = rung.ladder.left[i] ?? rung.ladder.left[0];
    const b = rung.ladder.right[i] ?? rung.ladder.right[0];
    return `This is the ladder for ${rung.ladder.onset}. Start at the bottom and climb. ${a}, ${b}.`;
  }
  if (rung.pattern?.length) {
    const p = rung.pattern[0];
    const s = patternSplit(p.from, p.to);
    if (s.syllables) return `Two short parts make one longer word. ${s.syllables.join(", ")}. ${p.to}.`;
    return `Add a letter or two, and the word changes. ${p.from}, ${p.to}.`;
  }
  if (rung.families?.length) return "Each column is a family of words. Read down each column.";
  return "Read these with me.";
}

function TeachStep({ rung, narrator, onNext }: { rung: Rung; narrator: Narrator; onNext: () => void }) {
  const pages = useMemo<TeachPage[]>(
    () => [...(rung.letterPages ?? []).map((page) => ({ kind: "letter" as const, page })), ...(hasPatternPage(rung) ? [{ kind: "pattern" as const }] : [])],
    [rung],
  );
  const [i, setI] = useState(0);
  const page = pages[i];
  const last = i >= pages.length - 1;
  const nextIsLetter = pages[i + 1]?.kind === "letter";

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [i]);

  if (!page) {
    return (
      <Dock>
        <span />
        <button type="button" className="btn btn-primary btn-xl st-primary" onClick={onNext}>
          Next
        </button>
      </Dock>
    );
  }

  const line = page.kind === "letter" ? page.page.say : patternLine(rung);

  return (
    <>
      <WrenSays narrator={narrator} text={line} floating className="st-say-top" />
      <div className="st-teach" key={i}>
        {page.kind === "letter" ? (
          <LetterPage page={page.page} narrator={narrator} size="lg" folio={rung.n} priority />
        ) : (
          <RungPattern rung={rung} narrator={narrator} size="lg" />
        )}
      </div>
      <Dock>
        {pages.length > 1 ? (
          <p className="st-dock-count num" aria-label={`Page ${i + 1} of ${pages.length}`}>
            <span className="st-pagedots" aria-hidden>
              {pages.map((_, k) => (
                <span key={k} data-on={k === i || undefined} />
              ))}
            </span>
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="btn btn-primary btn-xl st-primary"
          onClick={() => {
            stopSpeaking();
            if (last) onNext();
            else setI(i + 1);
          }}
        >
          {last ? "Next" : nextIsLetter ? "Next letter" : "Next"}
          <IconArrowRight size={22} />
        </button>
      </Dock>
    </>
  );
}

/* ---------- Words ---------- */

function WordsStep({ rung, narrator, onNext }: { rung: Rung; narrator: Narrator; onNext: () => void }) {
  const words = rungPracticeWords(rung);
  const line = rung.pairs.length
    ? onlyVowelsChange(rung.pairs)
      ? "Read each pair, top and bottom. Only the vowel changes."
      : "Read each pair, top and bottom. Listen for what changes."
    : "Read each word. Tap a word to hear it.";
  return (
    <>
      <WrenSays narrator={narrator} text={line} floating className="st-say-top" />
      {rung.pairs.length > 0 && (
        <section className="st-card surface-drill" aria-label="Pairs">
          <p className="st-card-eyebrow">Pairs</p>
          <PairRows pairs={rung.pairs} narrator={narrator} />
        </section>
      )}
      {words.length > 0 && (
        <section className="st-card surface-drill" aria-label="Words">
          <p className="st-card-eyebrow">Words</p>
          <WordGrid words={words} narrator={narrator} />
        </section>
      )}
      <Dock>
        <span />
        <button type="button" className="btn btn-primary btn-xl st-primary" onClick={onNext}>
          Next
          <IconArrowRight size={22} />
        </button>
      </Dock>
    </>
  );
}

/* ---------- Sounds (rungs 1 to 5) ---------- */

/** Eight letters to say, the new vowel among the ones already learned. */
function soundItems(n: number): string[] {
  const target = VOWELS[n - 1];
  const others = VOWELS.slice(0, n - 1);
  let k = 0;
  return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    if ([0, 2, 3, 5, 7].includes(i)) return target;
    return others.length ? others[k++ % others.length] : target.toUpperCase();
  });
}

function SoundDrillStep({
  rung,
  child,
  onFinish,
}: {
  rung: Rung;
  child: Child;
  onFinish: (outcomes: WordOutcome[], accuracy: number, seconds: number, items: string[]) => void;
}) {
  const items = useMemo(() => soundItems(rung.n), [rung.n]);
  const [marked, setMarked] = useState<ReadonlySet<number>>(() => new Set());
  const started = useRef(Date.now());
  const lp = rung.letterPages?.[0];
  const toggle = (i: number) =>
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <>
      <WrenSays
        narrator={child.narrator}
        text={`Say the sound of each letter, ${child.name}. Start at the top. Your grown-up taps any letter that needs help.`}
        floating
        className="st-say-top"
      />
      <section className={cx("st-card surface-drill st-sounds", bandClass(child.band))} aria-label="Sound drill">
        <p className="st-card-eyebrow">For the grown-up: tap a letter that needed help</p>
        <ol className="st-sounds-row">
          {items.map((v, i) => (
            <li key={i}>
              <button type="button" className="st-sound" data-review={marked.has(i) || undefined} aria-pressed={marked.has(i)} onClick={() => toggle(i)}>
                <span className="vowel-lg">{v}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
      <Dock>
        {lp ? (
          <button type="button" className="btn btn-quiet st-btn" onClick={() => void speak(lp.say, { narrator: child.narrator })}>
            <IconSpeaker size={20} />
            Hear {lp.glyphs.split(" ")[0]}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="btn btn-primary btn-xl st-primary"
          onClick={() => {
            const outcomes: WordOutcome[] = items.map((word, index) => ({ word, index, status: marked.has(index) ? "hesitation" : "correct" }));
            const accuracy = (items.length - marked.size) / items.length;
            onFinish(outcomes, accuracy, Math.max(1, Math.round((Date.now() - started.current) / 1000)), items);
          }}
        >
          <IconCheck size={22} />
          Finish
        </button>
      </Dock>
    </>
  );
}

/* ---------- Story ---------- */

function PassageStep({
  child,
  rung,
  story,
  setStory,
  onComplete,
}: {
  child: Child;
  rung: Rung;
  story: { passage: Passage; generated: boolean; fresh: boolean };
  setStory: (s: { passage: Passage; generated: boolean; fresh: boolean }) => void;
  onComplete: (outcomes: WordOutcome[], accuracy: number, wcpm: number, seconds: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(false);
  const [writerOff, setWriterOff] = useState(false);
  const readingRef = useRef(false);

  const newStory = async () => {
    stopSpeaking();
    setLoading(true);
    const res = await requestPassage({ rung: rung.n, childName: child.name, interests: child.interests });
    setLoading(false);
    // The child began reading while the story was being written: keep the page they are on.
    if (readingRef.current) return;
    const generated = res.source === "generated" && res.violations.length === 0;
    const fallback = passageFor(rung.n);
    const passage = generated ? res.passage : fallback ?? res.passage;
    // No story writer right now (the AI gateway is off): keep today's story and retire the button,
    // rather than "writing" the same story again.
    if (!generated) setWriterOff(true);
    setStory({ passage, generated, fresh: true });
  };

  const intro = story.fresh
    ? story.generated
      ? `Here is a new story for you, ${child.name}. Read it to me.`
      : `Today’s story is the one for you, ${child.name}. Read it to me.`
    : undefined;

  return (
    <ReadingCheck
      key={`${story.passage.id}:${story.passage.title}:${story.generated ? "g" : "c"}`}
      passage={story.passage}
      band={child.band}
      narrator={child.narrator}
      childName={child.name}
      introLine={intro}
      onComplete={onComplete}
      onPhaseChange={(p) => {
        readingRef.current = p !== "ready";
        setReading(p === "listening" || p === "marking");
      }}
      note={
        story.generated ? (
          <>
            <IconCheck size={16} />
            Every word checked: decodable at rung {rung.n}
          </>
        ) : undefined
      }
      readyExtra={
        !reading &&
        !writerOff && (
          <button type="button" className="btn btn-quiet st-btn st-newstory" onClick={() => void newStory()} disabled={loading} aria-busy={loading}>
            <IconRefresh size={20} className={loading ? "st-spin" : undefined} />
            {loading ? "Writing a story" : "New story"}
          </button>
        )
      }
    />
  );
}

/* ---------- Check ---------- */

function checkLine(child: Child, rung: Rung, r: LessonResult, review: boolean): string {
  const s = r.session;
  const left = Math.max(0, CLEAN_READS_TO_MASTER - s.cleanReads);
  if (review) {
    return s.clean
      ? `A clean review, ${child.name}. Rung ${rung.n} stays mastered.`
      : `Good reading, ${child.name}. We will review rung ${rung.n} again soon.`;
  }
  if (s.masteredRung) return `${capitalize(NUMBER_WORDS[CLEAN_READS_TO_MASTER] ?? String(CLEAN_READS_TO_MASTER))} clean reads, ${child.name}. Rung ${rung.n} is mastered.`;
  if (r.kind === "sounds") {
    if (s.clean) return `You said every sound, ${child.name}. ${capitalize(NUMBER_WORDS[left] ?? String(left))} more clean drill masters rung ${rung.n}.`;
    return `Good work, ${child.name}. We will say the marked letters again next time.`;
  }
  if (s.clean) return `That was a clean read, ${child.name}. ${capitalize(NUMBER_WORDS[left] ?? String(left))} more clean read masters rung ${rung.n}.`;
  if (s.remediate) return `Good effort, ${child.name}. We will practice the marked words and read this story again next time.`;
  return `Good reading, ${child.name}. Let us look at the marked words again.`;
}

function CheckStep({
  child,
  rung,
  result,
  passage,
  review: isReview,
  onNext,
}: {
  child: Child;
  rung: Rung;
  result: LessonResult;
  passage?: PassageLike;
  review: boolean;
  onNext: () => void;
}) {
  const marked = useMemo(() => new Set(result.outcomes.filter((o) => o.index >= 0 && o.status !== "correct").map((o) => o.index)), [result.outcomes]);
  const review = reviewWordsFrom(result.outcomes);
  const s = result.session;
  const reads = s.masteredRung ? CLEAN_READS_TO_MASTER : s.cleanReads;
  const correct = result.outcomes.filter((o) => o.index >= 0 && o.status === "correct").length;
  const total = result.outcomes.filter((o) => o.index >= 0).length;

  return (
    <>
      {result.kind === "passage" && passage ? (
        <PassageView passage={passage} band={child.band} narrator={child.narrator} marked={marked} phase="done" className="st-passage-done" hideIllustration />
      ) : (
        <section className={cx("st-card surface-drill st-sounds", bandClass(child.band))} aria-label="Sound drill">
          <ol className="st-sounds-row">
            {(result.items ?? []).map((v, i) => (
              <li key={i}>
                <span className="st-sound" data-review={marked.has(i) || undefined}>
                  <span className="vowel-lg">{v}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="st-sheet glass glass-strong glass-lg" aria-label="How it went">
        <WrenSays narrator={child.narrator} text={checkLine(child, rung, result, isReview)} />
        <dl className="st-stats">
          {result.kind === "passage" ? (
            <>
              <div className="st-stat">
                <dt>Accuracy</dt>
                <dd className="num">
                  {Math.round(result.accuracy * 100)}
                  <small>%</small>
                </dd>
              </div>
              <div className="st-stat">
                <dt>Words correct per minute</dt>
                <dd className="num">{result.wcpm > 0 ? result.wcpm : <small>Not timed</small>}</dd>
              </div>
            </>
          ) : (
            <div className="st-stat">
              <dt>Sounds said</dt>
              <dd className="num">
                {correct}
                <small> of {total}</small>
              </dd>
            </div>
          )}
          {isReview ? (
            <div className="st-stat st-stat-reads">
              <dt>Review</dt>
              <dd className="st-stat-text">{s.clean ? "Clean. Still mastered." : "We will read it again soon."}</dd>
            </div>
          ) : (
            <div className="st-stat st-stat-reads">
              <dt>{s.masteredRung ? "Mastered" : "This rung"}</dt>
              <dd>
                <CleanReads reads={reads} mastered={Boolean(s.masteredRung)} />
              </dd>
            </div>
          )}
        </dl>
        {result.kind === "passage" && (
          <div className="st-review">
            {review.length ? (
              <>
                <p className="st-review-label">Words to look at again</p>
                <ul className="st-review-words">
                  {review.map((w) => (
                    <li key={w}>
                      <HearWord word={w} narrator={child.narrator} className="st-review-word" />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="st-review-label">Every word read.</p>
            )}
          </div>
        )}
      </section>

      <Dock>
        <span />
        <button type="button" className="btn btn-primary btn-xl st-primary" onClick={onNext}>
          Next
          <IconArrowRight size={22} />
        </button>
      </Dock>
    </>
  );
}

/* ---------- Close ---------- */

function CloseStep({ child, rung, result, onDone }: { child: Child; rung: Rung; result: LessonResult | null; onDone: () => void }) {
  const mastered = result?.session.masteredRung;
  const word = rung.classicalWord;
  const nextRung = mastered && rung.n < MAX_RUNG ? getRung(rung.n + 1) : undefined;
  const lp = rung.letterPages?.[0];

  let line = "";
  if (mastered) line += `You mastered rung ${rung.n}, ${child.name}. `;
  if (word) line += `Today’s word is ${word.word}. ${capitalize(word.word)} means ${word.gloss}.`;
  else if (lp) line += `Today you learned ${lp.glyphs.split(" ")[0]}, as in ${lp.keyword}. Well done.`;
  else line += `Well done today, ${child.name}.`;

  const caption = <WrenSays narrator={child.narrator} text={line} floating />;

  return (
    <>
      {mastered ? (
        <MasteryMoment n={rung.n} short={rung.short} next={nextRung ? `Next: rung ${nextRung.n}, ${nextRung.title.charAt(0).toLowerCase()}${nextRung.title.slice(1)}.` : undefined} />
      ) : null}
      {!word && <WrenSays narrator={child.narrator} text={line} floating className="st-say-top" />}
      {word ? (
        <section className="st-wotd surface-drill" aria-label="Word of the day">
          {caption}
          <p className="st-card-eyebrow">Word of the day</p>
          <p className="st-wotd-word">{word.word}</p>
          <p className="st-wotd-gloss">{sentenceCase(word.gloss)}</p>
          <button
            type="button"
            className="btn btn-quiet st-btn"
            onClick={() => void speak(`${word.word}. ${capitalize(word.word)} means ${word.gloss}.`, { narrator: child.narrator })}
          >
            <IconSpeaker size={20} />
            Hear it
          </button>
        </section>
      ) : lp ? (
        <div className="st-teach st-teach-sm">
          <LetterPage page={lp} narrator={child.narrator} size="md" folio={rung.n} />
        </div>
      ) : null}
      <Dock>
        <span />
        <button
          type="button"
          className="btn btn-primary btn-xl st-primary"
          onClick={() => {
            stopSpeaking();
            onDone();
          }}
        >
          Back to today
        </button>
      </Dock>
    </>
  );
}
