"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useDemo } from "@/lib/store";
import { passageFor } from "@/lib/ladder";
import { askTutor } from "@/lib/tutor-client";
import { hasRecognition, listen, speak, stopSpeaking, type Listener } from "@/lib/speech";
import type { Child, TutorTurn } from "@/lib/types";
import { IconArrowRight, IconMic, IconSpeaker, IconStop } from "@/components/icons";
import { BackToToday } from "./Chrome";
import { WrenAvatar } from "./Wren";
import { Illustration } from "@/components/Illustration";
import { bandClass, cx, greetingFor, scrollBehavior, useSpeechReady, watchMicStart } from "./util";

const STARTERS = ["Read me the story", "What does diligent mean?", "Why do I need to read?", "Tell me a fable"];
const MAX_TURNS = 20;
const HOLD_MS = 380;

export function Talk() {
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
  return <TalkView key={child.id} child={child} rung={ladder.rung} />;
}

function loadTurns(key: string, fallback: TutorTurn[]): TutorTurn[] {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    const t = JSON.parse(raw) as TutorTurn[];
    return Array.isArray(t) && t.length ? t.slice(-MAX_TURNS) : fallback;
  } catch {
    return fallback;
  }
}

function TalkView({ child, rung }: { child: Child; rung: number }) {
  const storeKey = `hr:talk:${child.id}`;
  const [turns, setTurns] = useState<TutorTurn[]>(() =>
    loadTurns(storeKey, [{ role: "tutor", text: `${greetingFor()}, ${child.name}. What would you like to talk about?` }]),
  );
  const [mic, setMic] = useState<"on" | "denied" | "off">(() => (hasRecognition() ? "on" : "off"));
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  const turnsRef = useRef(turns);
  const draftRef = useRef("");
  const thinkingRef = useRef(false);
  const listenerRef = useRef<Listener | null>(null);
  const stoppingRef = useRef(false);
  const press = useRef<{ at: number } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const aliveRef = useRef(true);
  const speakGuard = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelWatch = useRef<(() => void) | null>(null);

  const passage = passageFor(rung);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      stoppingRef.current = true;
      cancelWatch.current?.();
      listenerRef.current?.abort();
      if (speakGuard.current) clearTimeout(speakGuard.current);
    };
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storeKey, JSON.stringify(turns.slice(-MAX_TURNS)));
    } catch {
      /* private mode: the conversation lasts for this view */
    }
  }, [turns, storeKey]);

  // Follow the conversation as it grows; leave the page where it is on arrival.
  const arrivalCount = useRef(turns.length);
  useEffect(() => {
    if (turns.length <= arrivalCount.current && !draft && !thinking) return;
    endRef.current?.scrollIntoView({ block: "end", behavior: scrollBehavior() });
  }, [turns.length, draft, thinking]);

  const sayTurn = useCallback(
    (text: string, index: number) => {
      if (speakGuard.current) clearTimeout(speakGuard.current);
      speakGuard.current = setTimeout(() => setSpeakingIndex(null), 2000 + text.split(/\s+/).length * 480);
      void speak(text, {
        narrator: child.narrator,
        kind: "talk",
        onStart: () => setSpeakingIndex(index),
        onEnd: () => {
          if (speakGuard.current) clearTimeout(speakGuard.current);
          setSpeakingIndex(null);
        },
      });
    },
    [child.narrator],
  );

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || thinkingRef.current) return;
      stopSpeaking();
      setSpeakingIndex(null);
      setStatus(null);
      const history: TutorTurn[] = [...turnsRef.current, { role: "child" as const, text: clean }].slice(-MAX_TURNS);
      turnsRef.current = history;
      setTurns(history);
      thinkingRef.current = true;
      setThinking(true);
      const reply = await askTutor({
        messages: history,
        child: {
          name: child.name,
          age: child.age,
          band: child.band,
          sex: child.sex,
          interests: child.interests,
          faithTrack: child.faithTrack,
          modernComparisons: child.modernComparisons,
        },
        rung,
        context: "talk",
        passage: passage ? { title: passage.title, sentences: passage.sentences } : undefined,
      });
      thinkingRef.current = false;
      if (!aliveRef.current) return;
      setThinking(false);
      const next: TutorTurn[] = [...turnsRef.current, { role: "tutor" as const, text: reply.text }].slice(-MAX_TURNS);
      turnsRef.current = next;
      setTurns(next);
      sayTurn(reply.text, next.length - 1);
    },
    [child, passage, rung, sayTurn],
  );

  const startListening = () => {
    if (listenerRef.current || thinkingRef.current || mic !== "on") return;
    stopSpeaking();
    setSpeakingIndex(null);
    setStatus(null);
    stoppingRef.current = false;
    draftRef.current = "";
    setDraft("");
    const l = listen(
      {
        onStart: () => {
          cancelWatch.current?.();
          setListening(true);
        },
        onText: (fin, interim) => {
          const t = `${fin} ${interim}`.trim();
          draftRef.current = t;
          setDraft(t);
        },
        onError: (err) => {
          cancelWatch.current?.();
          if (!aliveRef.current) return;
          if (err === "not-allowed") setMic("denied");
          else if (err === "no-speech") setStatus("I did not hear anything. Hold the button and speak.");
          else if (!stoppingRef.current && !draftRef.current) setMic("off");
        },
        onEnd: (fin) => {
          cancelWatch.current?.();
          listenerRef.current = null;
          if (!aliveRef.current) return;
          setListening(false);
          const text = (fin || draftRef.current).trim();
          draftRef.current = "";
          setDraft("");
          if (text) void send(text);
        },
      },
      { continuous: false },
    );
    if (!l) {
      setListening(false);
      return;
    }
    listenerRef.current = l;
    setListening(true);
    cancelWatch.current?.();
    cancelWatch.current = watchMicStart(() => {
      stoppingRef.current = true;
      listenerRef.current?.abort();
      listenerRef.current = null;
      setListening(false);
      setMic("off");
    });
  };

  const stopListening = () => {
    stoppingRef.current = true;
    listenerRef.current?.stop();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = typed;
    setTyped("");
    void send(t);
  };

  const canSpeakIn = mic === "on";
  const label = thinking
    ? "Mrs. Wren is thinking"
    : listening
      ? "Listening. Let go to send."
      : speakingIndex !== null
        ? "Mrs. Wren is speaking"
        : "Hold to talk";

  return (
    <div className={cx("st-page st-talk", bandClass(child.band))}>
      <div className="st-topline">
        <BackToToday />
      </div>
      <header className="st-pagehead">
        <h1 className="st-h1">Talk with Mrs. Wren</h1>
      </header>

      {turns.length <= 1 && !draft && !thinking && (
        <div className="st-talk-hello" aria-hidden>
          <span className="st-talk-portrait">
            <Illustration id="wren" alt="" priority />
          </span>
        </div>
      )}

      <ol className="st-chat" aria-label="Conversation">
        {turns.map((t, i) => (
          <li key={i} className="st-bubble" data-role={t.role}>
            {t.role === "tutor" && <WrenAvatar size={44} speaking={speakingIndex === i} />}
            <div className="st-bubble-body">
              <p>{t.text}</p>
              {t.role === "tutor" && (
                <button type="button" className="st-bubble-hear" onClick={() => sayTurn(t.text, i)} aria-label="Hear this again">
                  <IconSpeaker size={18} />
                </button>
              )}
            </div>
          </li>
        ))}
        {draft && (
          <li className="st-bubble st-bubble-draft" data-role="child" aria-live="polite">
            <div className="st-bubble-body">
              <p>{draft}</p>
            </div>
          </li>
        )}
        {thinking && (
          <li className="st-bubble" data-role="tutor" aria-live="polite">
            <WrenAvatar size={44} />
            <div className="st-bubble-body">
              <p className="st-typing" aria-label="Mrs. Wren is thinking">
                <span />
                <span />
                <span />
              </p>
            </div>
          </li>
        )}
      </ol>
      <div className="st-starters" role="group" aria-label="Things to ask">
        {STARTERS.map((s) => (
          <button key={s} type="button" className="st-starter" disabled={thinking || listening} onClick={() => void send(s)}>
            {s}
          </button>
        ))}
      </div>
      <div ref={endRef} className="st-chat-end" aria-hidden />

      <div className="st-talkdock">

        {canSpeakIn ? (
          <div className="st-mic-dock">
            {status && <p className="st-talk-status">{status}</p>}
            <button
              type="button"
              className={cx("st-talkbtn glass-navy", listening && "st-talkbtn-on")}
              aria-pressed={listening}
              aria-label={listening ? "Stop and send" : "Hold to talk, or tap to start"}
              disabled={thinking}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                if (listening) {
                  press.current = null;
                  stopListening();
                  return;
                }
                press.current = { at: Date.now() };
                startListening();
              }}
              onPointerUp={() => {
                const p = press.current;
                press.current = null;
                if (p && Date.now() - p.at >= HOLD_MS) stopListening();
              }}
              onPointerCancel={() => {
                if (press.current) {
                  press.current = null;
                  stopListening();
                }
              }}
              onClick={(e) => {
                // Keyboards and screen readers: a click toggles listening.
                if (e.detail === 0) {
                  if (listening) stopListening();
                  else startListening();
                }
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {listening ? <IconStop size={34} /> : <IconMic size={38} />}
            </button>
            <p className="st-talk-label" aria-live="polite">
              {label}
            </p>
          </div>
        ) : (
          <form className="st-typebar glass glass-strong glass-lg" onSubmit={onSubmit}>
            <label className="visually-hidden" htmlFor="st-type">
              Type for {child.name}
            </label>
            <input
              id="st-type"
              className="st-type-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={`A grown-up can type for ${child.name}`}
              autoComplete="off"
              enterKeyHint="send"
            />
            <button type="submit" className="btn btn-primary st-btn" disabled={!typed.trim() || thinking}>
              Send
              <IconArrowRight size={20} />
            </button>
            <p className="st-type-note">
              {mic === "denied" ? "The microphone is off for this page." : "This browser cannot listen."} Type what {child.name} says.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
