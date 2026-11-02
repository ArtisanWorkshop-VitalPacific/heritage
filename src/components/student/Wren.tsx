"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Narrator } from "@/lib/types";
import { captionOf, speak, type SpeakOptions } from "@/lib/speech";
import { Illustration } from "@/components/Illustration";
import { IconSpeaker } from "@/components/icons";
import { cx } from "./util";

/** The engraved wren in a round frame: Mrs. Wren's face on every student screen. */
export function WrenAvatar({ size = 56, speaking, className }: { size?: number; speaking?: boolean; className?: string }) {
  return (
    <span className={cx("st-wren", className)} data-speaking={speaking || undefined} style={{ width: size, height: size }} aria-hidden>
      <Illustration id="wren" alt="" />
    </span>
  );
}

/** Speaks a line and reports while it is being spoken. Resets itself if the voice never ends. */
export function useSay(narrator?: Narrator, kind: SpeakOptions["kind"] = "sentence") {
  const [speaking, setSpeaking] = useState(false);
  const guard = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback(
    (text: string) => {
      if (!text) return;
      if (guard.current) clearTimeout(guard.current);
      // Some browsers never fire the end event (no voices installed). Clear the state anyway.
      guard.current = setTimeout(() => setSpeaking(false), 1500 + text.split(/\s+/).length * 520);
      void speak(text, {
        narrator,
        kind,
        onStart: () => setSpeaking(true),
        onEnd: () => {
          if (guard.current) clearTimeout(guard.current);
          setSpeaking(false);
        },
      });
    },
    [narrator, kind],
  );

  useEffect(
    () => () => {
      if (guard.current) clearTimeout(guard.current);
    },
    [],
  );

  return { say, speaking };
}

export interface WrenSaysProps {
  /** The caption shown under Mrs. Wren. */
  text: string;
  /** What she says aloud, when it differs from the caption. */
  speech?: string;
  narrator?: Narrator;
  /** Speak automatically when the line appears or changes. */
  auto?: boolean;
  /** Float as a glass bubble (over a card) instead of sitting in the flow. */
  floating?: boolean;
  size?: "md" | "lg";
  className?: string;
}

/** Mrs. Wren's caption with the wren avatar and a replay button. */
export function WrenSays({ text, speech, narrator, auto = true, floating, size = "md", className }: WrenSaysProps) {
  const { say, speaking } = useSay(narrator);
  const line = speech ?? text;

  useEffect(() => {
    if (!auto || !line) return;
    // A short pause lets the screen settle before she speaks; it also absorbs double effects in development.
    const t = setTimeout(() => say(line), 280);
    return () => clearTimeout(t);
  }, [auto, line, say]);

  return (
    <div className={cx("st-say", floating && "st-say-float glass glass-strong", size === "lg" && "st-say-lg", className)}>
      <WrenAvatar size={size === "lg" ? 64 : 52} speaking={speaking} />
      <p className="st-say-text" aria-live="polite">
        <span className="visually-hidden">Mrs. Wren says: </span>
        {captionOf(text)}
      </p>
      <button type="button" className="st-say-again" onClick={() => say(line)} aria-label="Hear Mrs. Wren again">
        <IconSpeaker size={24} />
      </button>
    </div>
  );
}
