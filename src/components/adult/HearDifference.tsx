"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Child, Session } from "@/lib/types";
import { canSpeak, speak, stopSpeaking } from "@/lib/speech";
import { passageFor } from "@/lib/ladder";
import { IconPlay, IconStop } from "@/components/icons";
import { DAY, clamp, fmtDay } from "./lib";

interface Row {
  id: "first" | "last";
  week: number;
  session: Session;
  text: string;
  rate: number;
  seconds: number;
}

/** Deterministic noise so the drawn waveform is the same on every device. */
function noise(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Bars for one reading: a burst per word, gaps for pauses, flat after the reading ends. */
function bars(text: string, fraction: number, halting: boolean, count = 84): number[] {
  const rand = noise(hash(text) + (halting ? 7 : 3));
  const words = text.split(/\s+/).filter(Boolean);
  const segs: { len: number; word: boolean }[] = [];
  words.forEach((wd, i) => {
    segs.push({ len: wd.replace(/[^a-z]/gi, "").length + 2, word: true });
    if (i < words.length - 1) {
      const end = /[.!?]["”]?$/.test(wd);
      const pause = halting ? (/,$/.test(wd) ? 5 : 2) + (end ? 3 : 0) : end ? 3 : 1;
      segs.push({ len: pause, word: false });
    }
  });
  const total = segs.reduce((n, s) => n + s.len, 0);
  const used = Math.max(8, Math.round(count * fraction));
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    if (i >= used) {
      out.push(0.04);
      continue;
    }
    const pos = ((i + 0.5) / used) * total;
    let acc = 0;
    let amp = 0.05;
    for (const s of segs) {
      if (pos < acc + s.len) {
        if (s.word) {
          const within = (pos - acc) / s.len;
          amp = (0.35 + 0.65 * Math.sin(Math.PI * within)) * (0.55 + 0.45 * rand());
        }
        break;
      }
      acc += s.len;
    }
    out.push(clamp(amp, 0.04, 1));
  }
  return out;
}

/** Halting reading: a pause after every other word. */
function halting(text: string): string {
  return text
    .split(/\s+/)
    .map((wd, i) => (i % 2 === 0 && /[a-z]$/i.test(wd) ? `${wd},` : wd))
    .join(" ");
}

function estimateSeconds(text: string, rate: number): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  const commas = (text.match(/,/g) ?? []).length;
  const stops = (text.match(/[.!?]/g) ?? []).length;
  return words / (2.5 * rate) + commas * 0.32 + stops * 0.35;
}

/**
 * "Hear the difference": the child's current passage read at the week-1 pace and at
 * this week's pace. Demo audio is the tutor voice; production plays the child's recordings.
 */
export function HearDifference({ child, sessions, rung }: { child: Child; sessions: Session[]; rung: number }) {
  const [playing, setPlaying] = useState<Row["id"] | null>(null);
  const [progress, setProgress] = useState(0);
  const raf = useRef<number | undefined>(undefined);
  const speakable = typeof window !== "undefined" && canSpeak();

  const rows = useMemo<Row[]>(() => {
    const first = sessions[0];
    const last = sessions[sessions.length - 1];
    if (!first || !last || first === last) return [];
    const passage = passageFor(rung);
    const text = (passage?.sentences ?? ["I am Tom."]).slice(0, 2).join(" ");
    const lastWeek = Math.floor((new Date(last.date).getTime() - new Date(first.date).getTime()) / (7 * DAY)) + 1;
    const fastRate = 0.95;
    const slowRate = clamp(fastRate * (first.wcpm / Math.max(1, last.wcpm)), 0.55, 0.9);
    const slowText = halting(text);
    return [
      { id: "first", week: 1, session: first, text: slowText, rate: slowRate, seconds: estimateSeconds(slowText, slowRate) },
      { id: "last", week: lastWeek, session: last, text, rate: fastRate, seconds: estimateSeconds(text, fastRate) },
    ];
  }, [sessions, rung]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      stopSpeaking();
    },
    [],
  );

  const longest = Math.max(1, ...rows.map((r) => r.seconds));

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    stopSpeaking();
    setPlaying(null);
    setProgress(0);
  };

  const play = (row: Row) => {
    if (playing === row.id) return stop();
    stop();
    setPlaying(row.id);
    setProgress(0);
    let startedAt = performance.now();
    const tick = () => {
      const p = (performance.now() - startedAt) / 1000 / row.seconds;
      setProgress(Math.min(0.98, p));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    void speak(row.text, {
      narrator: child.narrator,
      rate: row.rate,
      kind: "story",
      onStart: () => {
        startedAt = performance.now();
      },
      onEnd: () => {
        if (raf.current) cancelAnimationFrame(raf.current);
        setProgress(1);
        window.setTimeout(() => {
          setPlaying((cur) => (cur === row.id ? null : cur));
          setProgress(0);
        }, 450);
      },
    });
  };

  if (rows.length === 0) {
    return (
      <p className="ap-hear-empty">
        After two weeks of timed readings, compare {child.name}&apos;s first week with this week.
      </p>
    );
  }

  return (
    <div className="ap-hear">
      {rows.map((row) => {
        const fraction = row.seconds / longest;
        const data = bars(row.text, fraction, row.id === "first");
        const isPlaying = playing === row.id;
        const played = isPlaying ? progress * fraction : 0;
        return (
          <div key={row.id} className="ap-hear-row" data-playing={isPlaying || undefined}>
            <button
              type="button"
              className="ap-hear-play"
              onClick={() => play(row)}
              disabled={!speakable}
              aria-label={isPlaying ? `Stop week ${row.week} sample` : `Play week ${row.week} sample`}
              aria-pressed={isPlaying}
            >
              {isPlaying ? <IconStop size={18} /> : <IconPlay size={18} />}
            </button>
            <div className="ap-hear-main min-0">
              <div className="ap-hear-label">
                <strong>Week {row.week}</strong>
                <span className="muted">
                  {fmtDay(row.session.date)} · <span className="num">{row.session.wcpm}</span> words a minute
                </span>
              </div>
              <svg className="ap-wave" viewBox={`0 0 ${data.length * 4} 40`} preserveAspectRatio="none" aria-hidden>
                {data.map((a, i) => {
                  const hgt = Math.max(2, a * 36);
                  const on = isPlaying && i / data.length <= played;
                  return <rect key={i} x={i * 4 + 0.8} y={20 - hgt / 2} width={2.4} height={hgt} rx={1.2} className={on ? "ap-wave-on" : "ap-wave-off"} />;
                })}
              </svg>
            </div>
          </div>
        );
      })}
      <p className="ap-hear-note">
        Sample audio in the demo. Production plays {child.name}&apos;s own recordings, kept only with your consent.
        {!speakable && " This browser cannot play speech."}
      </p>
    </div>
  );
}
