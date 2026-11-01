"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDemo } from "@/lib/store";
import {
  PLACEMENT_SOUNDS,
  PLACEMENT_WORDS,
  ceilingRung,
  getRung,
  nextWordIndex,
  passageFor,
  scorePlacement,
  startIndexForAge,
  type PlacementScore,
  type WordAttempt,
} from "@/lib/ladder";
import { hasRecognition, listen, speak, stopSpeaking, type Listener } from "@/lib/speech";
import { splitHeard, wordsMatch } from "@/lib/align";
import type { Child, PlacementResult } from "@/lib/types";
import { Illustration } from "@/components/Illustration";
import { IconArrowRight, IconCheck, IconMic, IconSpeaker } from "@/components/icons";
import { Dock, LeaveControl, StepBar } from "./Chrome";
import { GlyphPlate, MicChip, type MicState } from "./Drills";
import { ReadingCheck } from "./ReadingCheck";
import { WrenAvatar, WrenSays } from "./Wren";
import { bandClass, cx, rungVisual, useReadingComfort, useSpeechReady, watchMicStart } from "./util";

type Stage =
  | { kind: "intro" }
  | { kind: "sound"; i: number }
  | { kind: "word"; idx: number }
  | { kind: "passage" }
  | { kind: "results"; score: PlacementScore; result: PlacementResult };

interface Attempt extends WordAttempt {
  word: string;
}

const SECTIONS = [
  { id: "intro", label: "Hello" },
  { id: "sound", label: "Sounds" },
  { id: "word", label: "Words" },
  { id: "passage", label: "Story" },
  { id: "results", label: "Results" },
];

export function Placement() {
  const { child } = useDemo();
  useSpeechReady();
  useEffect(() => () => stopSpeaking(), []);
  if (!child) {
    return (
      <div className="st-page st-empty">
        <WrenAvatar size={88} />
        <h1 className="st-h1">No reader yet.</h1>
        <p className="st-lede">Ask a grown-up to add a reader first.</p>
      </div>
    );
  }
  return <PlacementFlow key={child.id} child={child} />;
}

function PlacementFlow({ child }: { child: Child }) {
  const { actions } = useDemo();
  const router = useRouter();
  const comfort = useReadingComfort();
  const startIndex = startIndexForAge(child.age);
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [sounds, setSounds] = useState<boolean[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [mic, setMic] = useState<"on" | "denied" | "off">(() => (hasRecognition() ? "on" : "off"));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stageKey = stage.kind === "sound" ? `s${stage.i}` : stage.kind === "word" ? `w${stage.idx}` : stage.kind;
  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [stageKey]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const finish = (s: boolean[], words: Attempt[], passage?: { accuracy: number; wcpm: number }) => {
    const score = scorePlacement({ sounds: s, words: words.map(({ rung, correct }) => ({ rung, correct })), passage });
    const result: PlacementResult = {
      childId: child.id,
      date: new Date().toISOString(),
      soundsKnown: score.soundsKnown,
      soundsTotal: PLACEMENT_SOUNDS.length,
      wordsRead: words.filter((w) => w.correct).length,
      wordsTried: words.length,
      ceilingRung: score.ceilingRung,
      passageAccuracy: passage?.accuracy ?? 0,
      wcpm: passage?.wcpm ?? 0,
      rung: score.rung,
    };
    actions.savePlacement(result);
    setStage({ kind: "results", score, result });
  };

  const answerSound = (knows: boolean) => {
    if (stage.kind !== "sound") return;
    stopSpeaking();
    const next = [...sounds, knows];
    setSounds(next);
    if (stage.i + 1 < PLACEMENT_SOUNDS.length) setStage({ kind: "sound", i: stage.i + 1 });
    else if (next.filter(Boolean).length < 6) finish(next, []);
    else setStage({ kind: "word", idx: startIndex });
  };

  const answerWord = (correct: boolean) => {
    if (stage.kind !== "word") return;
    stopSpeaking();
    const w = PLACEMENT_WORDS[stage.idx];
    const next = [...attempts, { rung: w.rung, correct, word: w.word }];
    setAttempts(next);
    const ni = nextWordIndex(next, startIndex);
    if (ni !== null) setStage({ kind: "word", idx: ni });
    else if (ceilingRung(next) >= 6) setStage({ kind: "passage" });
    else finish(sounds, next);
  };

  const sectionIndex = SECTIONS.findIndex((s) => s.id === stage.kind);
  const ceiling = ceilingRung(attempts);
  const passage = stage.kind === "passage" ? passageFor(ceiling) : undefined;

  return (
    <div className={cx("st-page st-placement", bandClass(child.band))} data-stage={stage.kind} style={comfort}>
      <StepBar
        steps={SECTIONS}
        current={sectionIndex}
        end={
          <>
            <span className="st-stepbar-rung">Placement</span>
            {stage.kind !== "results" && <LeaveControl what="placement" />}
          </>
        }
      />
      <h1 className="visually-hidden" ref={headingRef} tabIndex={-1}>
        Placement. {SECTIONS[sectionIndex]?.label}.
      </h1>

      <div className="st-stage" key={stageKey}>
        {stage.kind === "intro" && <Intro child={child} onBegin={() => setStage({ kind: "sound", i: 0 })} />}

        {stage.kind === "sound" && <SoundProbe child={child} i={stage.i} onAnswer={answerSound} />}

        {stage.kind === "word" && (
          <WordProbe
            child={child}
            idx={stage.idx}
            count={attempts.length}
            mic={mic}
            onMic={setMic}
            onAnswer={answerWord}
          />
        )}

        {stage.kind === "passage" && passage && (
          <ReadingCheck
            passage={passage}
            band={child.band}
            narrator={child.narrator}
            childName={child.name}
            introLine={`Last of all, ${child.name}, read this story to me.`}
            onComplete={(_o, accuracy, wcpm) => {
              timer.current = setTimeout(() => finish(sounds, attempts, { accuracy, wcpm }), 900);
            }}
          />
        )}

        {stage.kind === "results" && (
          <Results child={child} score={stage.score} result={stage.result} onStart={() => router.push("/app/lesson")} />
        )}
      </div>
    </div>
  );
}

/* ---------- Intro ---------- */

function Intro({ child, onBegin }: { child: Child; onBegin: () => void }) {
  return (
    <>
      <WrenSays
        narrator={child.narrator}
        size="lg"
        floating
        className="st-say-top"
        text={`Hello, ${child.name}. I am Mrs. Wren. Let us find the right place for you to begin.`}
        speech={`Hello, ${child.name}. I am Mrs. Wren. Let us find the right place for you to begin. First some letter sounds. Then some words. Then one short story.`}
      />
      <section className="st-card surface-drill st-agenda" aria-label="What we will do">
        <ol className="st-agenda-list">
          <li>
            <span className="st-agenda-n num">1</span>
            <span>
              <strong>Sounds.</strong> Say the sound of ten letters.
            </span>
          </li>
          <li>
            <span className="st-agenda-n num">2</span>
            <span>
              <strong>Words.</strong> Read a few words out loud.
            </span>
          </li>
          <li>
            <span className="st-agenda-n num">3</span>
            <span>
              <strong>Story.</strong> Read one short story.
            </span>
          </li>
        </ol>
        <p className="st-grownup">
          <span className="st-grownup-label">For the grown-up</span>
          About ten minutes. Sit beside {child.name}. You mark the sounds. The microphone listens for words, and you can always tap instead. The
          placement only finds the starting rung.
        </p>
      </section>
      <Dock>
        <span />
        <button type="button" className="btn btn-primary btn-xl st-primary" onClick={onBegin}>
          Begin
          <IconArrowRight size={22} />
        </button>
      </Dock>
    </>
  );
}

/* ---------- Sounds ---------- */

function SoundProbe({ child, i, onAnswer }: { child: Child; i: number; onAnswer: (knows: boolean) => void }) {
  const item = PLACEMENT_SOUNDS[i];
  return (
    <>
      <WrenSays
        narrator={child.narrator}
        floating
        className="st-say-top"
        auto={i === 0}
        text={i === 0 ? "What sound does this letter make? Say it out loud." : "What sound does this letter make?"}
      />
      <section className="st-probe surface-drill" aria-label={`Letter ${item.grapheme}`}>
        <div className="st-probe-art">
          <Illustration id={item.spot} alt="" className="st-probe-spot" priority />
        </div>
        <p className={cx("st-probe-glyph", /^[aeiou]$/.test(item.grapheme) && "st-probe-vowel")}>{item.grapheme}</p>
        <button type="button" className="btn btn-quiet st-btn st-probe-hear" onClick={() => void speak(item.keyword, { narrator: child.narrator, kind: "word" })}>
          <IconSpeaker size={20} />
          Hear it
        </button>
        <p className="st-probe-count num">
          Sound {i + 1} of {PLACEMENT_SOUNDS.length}
        </p>
      </section>
      <Dock className="st-dock-answers">
        <p className="st-dock-label">For the grown-up</p>
        <div className="st-answers">
          <button type="button" className="btn btn-secondary btn-xl st-answer" onClick={() => onAnswer(false)}>
            Not yet
          </button>
          <button type="button" className="btn btn-primary btn-xl st-answer" onClick={() => onAnswer(true)}>
            <IconCheck size={22} />
            Knows it
          </button>
        </div>
      </Dock>
    </>
  );
}

/* ---------- Words ---------- */

function WordProbe({
  child,
  idx,
  count,
  mic,
  onMic,
  onAnswer,
}: {
  child: Child;
  idx: number;
  count: number;
  mic: "on" | "denied" | "off";
  onMic: (m: "on" | "denied" | "off") => void;
  onAnswer: (correct: boolean) => void;
}) {
  const item = PLACEMENT_WORDS[idx];
  const [chip, setChip] = useState<MicState>(mic === "on" ? "idle" : "off");
  const [heard, setHeard] = useState("");
  const [matched, setMatched] = useState(false);
  const [round, setRound] = useState(0);
  const answered = useRef(false);
  const onAnswerRef = useRef(onAnswer);
  const onMicRef = useRef(onMic);
  useEffect(() => {
    onAnswerRef.current = onAnswer;
    onMicRef.current = onMic;
  });

  // Listen for the word: one utterance at a time, a few tries, then wait for the grown-up.
  useEffect(() => {
    if (mic !== "on") return;
    let alive = true;
    let tries = 0;
    let listener: Listener | null = null;
    let wait: ReturnType<typeof setTimeout> | null = null;
    let cancelWatch: (() => void) | null = null;

    const start = () => {
      if (!alive || answered.current) return;
      listener = listen(
        {
          onStart: () => {
            cancelWatch?.();
            if (alive) setChip("listening");
          },
          onText: (fin, interim) => {
            if (!alive || answered.current) return;
            const words = splitHeard(`${fin} ${interim}`);
            if (words.some((h) => wordsMatch(item.word, h))) {
              answered.current = true;
              setMatched(true);
              setChip("heard");
              listener?.abort();
              wait = setTimeout(() => onAnswerRef.current(true), 950);
            } else if (fin) {
              setHeard(fin);
            }
          },
          onError: (err) => {
            if (!alive) return;
            if (err === "no-speech") return;
            alive = false;
            listener?.abort();
            onMicRef.current(err === "not-allowed" ? "denied" : "off");
          },
          onEnd: () => {
            if (!alive || answered.current) return;
            tries += 1;
            if (tries < 4) wait = setTimeout(start, 350);
            else setChip("paused");
          },
        },
        { continuous: false },
      );
      if (!listener && alive) {
        onMicRef.current("off");
        return;
      }
      if (tries === 0 && !cancelWatch) {
        // A recognizer that never starts: carry on with taps.
        cancelWatch = watchMicStart(() => {
          if (!alive || answered.current) return;
          alive = false;
          listener?.abort();
          onMicRef.current("off");
        });
      }
    };

    // A short pause so Mrs. Wren's prompt is not heard as the answer.
    wait = setTimeout(start, count === 0 && round === 0 ? 2800 : 500);
    return () => {
      alive = false;
      cancelWatch?.();
      if (wait) clearTimeout(wait);
      listener?.abort();
    };
  }, [mic, item.word, count, round]);

  /** Asks for the microphone again from a tap, which some browsers require. */
  const retryMic = () => {
    const probe: Listener | null = listen(
      {
        onStart: () => {
          probe?.abort();
          onMic("on");
        },
        onError: (err) => {
          if (err === "not-allowed") onMic("denied");
        },
      },
      { continuous: false },
    );
  };

  const tap = (correct: boolean) => {
    if (answered.current) return;
    answered.current = true;
    onAnswer(correct);
  };

  const chipState: MicState = mic === "on" ? chip : "off";

  return (
    <>
      <WrenSays narrator={child.narrator} floating className="st-say-top" auto={count === 0} text={count === 0 ? "Now read this word to me." : "Read this word to me."} />
      <section className="st-probe st-probe-word surface-drill" aria-label={`Word ${count + 1}`}>
        <p className="st-probe-word-text" data-matched={matched || undefined}>
          {item.word}
          {matched && (
            <span className="st-probe-tick" aria-hidden>
              <IconCheck size={30} />
            </span>
          )}
        </p>
        <div className="st-probe-mic">
          <MicChip state={chipState} label={chipState === "heard" ? "Read it" : undefined} />
          {chipState === "paused" && (
            <button type="button" className="btn btn-quiet st-btn" onClick={() => setRound((r) => r + 1)}>
              <IconMic size={20} />
              Listen again
            </button>
          )}
        </div>
        {heard && !matched && mic === "on" && <p className="st-probe-heard">Heard {"“"}{heard}{"”"}</p>}
        {mic !== "on" && (
          <p className="st-probe-heard">
            {mic === "denied" ? "The microphone is off for this page. Listen, then tap." : "This browser cannot listen. Listen, then tap."}
          </p>
        )}
        {mic === "denied" && (
          <button type="button" className="btn btn-quiet st-btn" onClick={retryMic}>
            <IconMic size={20} />
            Try the microphone
          </button>
        )}
        <p className="st-probe-count num">Word {count + 1}</p>
      </section>
      <Dock className="st-dock-answers">
        <p className="st-dock-label">For the grown-up</p>
        <div className="st-answers">
          <button type="button" className="btn btn-secondary btn-xl st-answer" onClick={() => tap(false)}>
            Not yet
          </button>
          <button type="button" className="btn btn-primary btn-xl st-answer" onClick={() => tap(true)}>
            <IconCheck size={22} />
            Read it
          </button>
        </div>
      </Dock>
    </>
  );
}

/* ---------- Results ---------- */

function Results({ child, score, result, onStart }: { child: Child; score: PlacementScore; result: PlacementResult; onStart: () => void }) {
  const rung = getRung(score.rung);
  const visual = rungVisual(rung);
  const hadPassage = result.wcpm > 0 || result.passageAccuracy > 0;
  const lower = rung.title.charAt(0).toLowerCase() + rung.title.slice(1);

  return (
    <>
      <WrenSays
        narrator={child.narrator}
        size="lg"
        floating
        className="st-say-top"
        text={`Well done, ${child.name}. You begin at rung ${rung.n}: ${lower}.`}
      />
      <section className="st-placed surface-drill" aria-label="Placement result">
        <div className="st-placed-page">
          {visual.spot ? (
            <div className="st-today-lp">
              <Illustration id={visual.spot} alt="" className="st-today-spot" />
              <span className="st-today-glyphs" aria-hidden>
                {visual.glyphs.split(" ").map((g, k) => (
                  <span key={k} className={/^[aeiou]$/i.test(g) ? "vowel-lg" : undefined}>
                    {g}
                  </span>
                ))}
              </span>
            </div>
          ) : (
            <div className="st-today-lp st-today-lp-plate">
              <GlyphPlate glyphs={visual.glyphs} size="lg" />
            </div>
          )}
        </div>
        <div className="st-placed-body">
          <p className="st-eyebrow">Starting rung</p>
          <p className="st-placed-rung">
            Rung <span className="num">{rung.n}</span>
          </p>
          <h2 className="st-today-title">{rung.title}</h2>
          <p className="st-grownup">
            <span className="st-grownup-label">For the grown-up</span>
            {score.reason}
          </p>
        </div>
      </section>

      <dl className="st-stats st-stats-card">
        <div className="st-stat">
          <dt>Sounds known</dt>
          <dd className="num">
            {result.soundsKnown}
            <small> of {result.soundsTotal}</small>
          </dd>
        </div>
        <div className="st-stat">
          <dt>Words read</dt>
          <dd className="num">
            {result.wordsRead}
            <small> of {result.wordsTried}</small>
          </dd>
        </div>
        {hadPassage && (
          <>
            <div className="st-stat">
              <dt>Story accuracy</dt>
              <dd className="num">
                {Math.round(result.passageAccuracy * 100)}
                <small>%</small>
              </dd>
            </div>
            <div className="st-stat">
              <dt>Words correct per minute</dt>
              <dd className="num">{result.wcpm}</dd>
            </div>
          </>
        )}
      </dl>

      <Dock>
        <span />
        <button type="button" className="btn btn-primary btn-xl st-primary" onClick={onStart}>
          Start the first lesson
          <IconArrowRight size={22} />
        </button>
      </Dock>
    </>
  );
}
