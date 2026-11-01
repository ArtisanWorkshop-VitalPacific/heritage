"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { AgeBand, DemoState, Rung, WordOutcome } from "@/lib/types";
import { getRung, RUNGS } from "@/lib/ladder";
import { probeTts } from "@/lib/speech";

/** Student-surface helpers. Pure where possible; no foundation changes. */

export const VOWELS = ["a", "e", "i", "o", "u"] as const;

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Class that sets the reading face and size for an age band. */
export function bandClass(band?: AgeBand): string {
  return band === "B" ? "st-band-b" : band === "C" ? "st-band-c" : "st-band-a";
}

export function greetingFor(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Screen minutes recorded today (local day) for a child. */
export function screenMinutesToday(state: DemoState, childId: string, now = new Date()): number {
  return state.sessions
    .filter((s) => s.childId === childId && sameLocalDay(new Date(s.date), now))
    .reduce((n, s) => n + (s.screenMinutes || 0), 0);
}

export function unique<T>(list: T[]): T[] {
  return list.filter((x, i) => list.indexOf(x) === i);
}

/* ---------- Vowel colouring ---------- */

/** Vowel teams whose second letter is not a vowel letter (so they still read as one vowel). */
const TEAMS = ["igh", "ay", "oy", "ow", "ey", "aw", "ew"];

export interface VowelSpan {
  text: string;
  vowel: boolean;
}

/** Splits a word into runs of vowel and consonant letters, keeping case and punctuation. */
export function vowelSpans(word: string): VowelSpan[] {
  const out: VowelSpan[] = [];
  const lower = word.toLowerCase();
  const push = (text: string, vowel: boolean) => {
    const last = out[out.length - 1];
    if (last && last.vowel === vowel) last.text += text;
    else out.push({ text, vowel });
  };
  let i = 0;
  while (i < word.length) {
    const team = /[aeiou]/.test(lower[i]) ? TEAMS.find((t) => lower.startsWith(t, i)) : undefined;
    if (team) {
      push(word.slice(i, i + team.length), true);
      i += team.length;
      continue;
    }
    push(word[i], /[aeiou]/.test(lower[i]));
    i++;
  }
  return out;
}

/** True when a grapheme part carries a vowel sound (used to colour word parts). */
export function isVowelPart(part: string): boolean {
  return /[aeiou]/i.test(part);
}

/* ---------- Curriculum views ---------- */

/** Words to practise at a rung. Rungs without a word list draw on their pattern, families and ladder. */
export function practiceWords(r: Rung, max = 12): string[] {
  const base = r.words.length
    ? r.words
    : [
        ...(r.pattern ?? []).map((p) => p.to),
        ...(r.families ?? []).flat(),
        ...((r.ladder?.right ?? []).filter(Boolean) as string[]),
      ];
  return unique(base).slice(0, max);
}

/** Small seeded generator so a warmup is stable within a day. */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function daySeed(d = new Date()): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/**
 * Four review words from rungs already mastered: review-due rungs first, then the most recent.
 * Warmup draws only from mastered work, so every lesson opens with success.
 */
export function warmupWords(rung: number, mastered: number[], due: number[], seed: number, count = 4): string[] {
  const order = unique([...due, ...[...mastered].sort((a, b) => b - a)]).filter((n) => n < rung);
  const pool: string[] = [];
  for (const n of order.slice(0, 4)) {
    for (const w of practiceWords(getRung(n), 24)) {
      if (w === w.toLowerCase() && w.length > 1 && !pool.includes(w)) pool.push(w);
    }
  }
  const rand = seeded(seed + rung * 97);
  // Prefer words of three letters or more when there are enough of them.
  const longer = pool.filter((w) => w.length >= 3);
  const copy = longer.length >= count ? longer : [...pool];
  const picked: string[] = [];
  while (picked.length < count && copy.length) picked.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return picked;
}

/** The picture and glyphs that stand for a rung on cards and tiles. */
export function rungVisual(r: Rung): { spot?: string; glyphs: string } {
  const lp = r.letterPages?.[0];
  if (lp) return { spot: lp.spot, glyphs: lp.glyphs };
  const ill = r.passage?.illustration;
  return { spot: ill && ill.startsWith("spot-") ? ill : undefined, glyphs: r.short };
}

export function isVowelRung(n: number): boolean {
  return RUNGS.find((r) => r.n === n)?.group === "vowels";
}

/** "you tell the truth" -> "You tell the truth." */
export function sentenceCase(s: string): string {
  const t = s.trim();
  if (!t) return t;
  const cap = t[0].toUpperCase() + t.slice(1);
  return /[.!?]$/.test(cap) ? cap : `${cap}.`;
}

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Target words that were not read cleanly, in passage order, without repeats. */
export function reviewWordsFrom(outcomes: WordOutcome[], max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of outcomes) {
    if (o.index < 0 || o.status === "correct") continue;
    const w = o.word.replace(/[^A-Za-z']/g, "");
    const key = w.toLowerCase();
    if (!w || seen.has(key)) continue;
    seen.add(key);
    out.push(w);
    if (out.length >= max) break;
  }
  return out;
}

/** Printer's quotes for display: "Hop -> “Hop, hop!" -> hop!”, Dad's -> Dad’s. */
export function curly(display: string): string {
  return display
    .replace(/^"/, "\u201c")
    .replace(/"(?=[^A-Za-z]*$)/, "\u201d")
    .replace(/'/g, "\u2019");
}

/** Strips punctuation from the ends of a printed word: "\"Hop," -> "Hop". */
export function bareWord(display: string): string {
  return display.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "").replace(/^'+|'+$/g, "");
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "Review today", "Review tomorrow", "Review Thursday", "Review Nov 9" */
export function reviewWhen(dueIso: string, now = new Date()): string {
  const due = new Date(dueIso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(due) - startOf(now)) / 86_400_000);
  if (days <= 0) return "Review today";
  if (days === 1) return "Review tomorrow";
  if (days < 7) return `Review ${due.toLocaleDateString("en-US", { weekday: "long" })}`;
  return `Review ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/** "smooth", unless the reader asked the system for less motion. */
export function scrollBehavior(): ScrollBehavior {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  } catch {
    return "auto";
  }
}

/* ---------- Microphone start watch ---------- */

/**
 * Some browsers expose a recognizer that never starts and never errors. Calls onStall when the
 * recognizer has not started after `ms`, allowing more time while a permission prompt is open.
 * Returns a cancel function; call it from onStart.
 */
export function watchMicStart(onStall: () => void, ms = 6000): () => void {
  let cancelled = false;
  let t: ReturnType<typeof setTimeout> | null = null;
  const check = async (extended: boolean) => {
    if (cancelled) return;
    if (!extended) {
      let state: string | undefined;
      try {
        state = (await navigator.permissions?.query({ name: "microphone" as PermissionName }))?.state;
      } catch {
        state = undefined;
      }
      if (cancelled) return;
      if (state !== "granted" && state !== "denied") {
        // The grown-up may still be answering the browser's microphone question.
        t = setTimeout(() => void check(true), 15000);
        return;
      }
    }
    onStall();
  };
  t = setTimeout(() => void check(false), ms);
  return () => {
    cancelled = true;
    if (t) clearTimeout(t);
  };
}

/* ---------- Speech readiness ---------- */

let primed = false;

/**
 * iOS Safari only speaks after a first utterance inside a user gesture. A silent utterance
 * on the first touch unlocks the voice for the lines Mrs. Wren speaks after each step.
 */
export function primeSpeech() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  try {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  } catch {
    /* no voice on this device; captions carry the words */
  }
}

/** Warms the voice path and unlocks speech on the first touch. Use once per student page. */
export function useSpeechReady() {
  useEffect(() => {
    void probeTts();
    const onDown = () => {
      primeSpeech();
      window.removeEventListener("pointerdown", onDown, true);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, []);
}

/* ---------- Reading comfort ---------- */

type Spacing = "normal" | "wide" | "wider";
const LETTER_SPACING: Record<Spacing, string> = { normal: "0em", wide: "0.04em", wider: "0.08em" };
const WORD_SPACING: Record<Spacing, string> = { normal: "0em", wide: "0.16em", wider: "0.32em" };
const PREFS_KEY = "hr:prefs";

function readComfort(): { ls: string; ws: string } {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    const p = (raw ? JSON.parse(raw) : {}) as { letterSpacing?: string; wordSpacing?: string };
    const pick = (table: Record<Spacing, string>, v?: string) => (v && v in table ? table[v as Spacing] : table.normal);
    return { ls: pick(LETTER_SPACING, p.letterSpacing), ws: pick(WORD_SPACING, p.wordSpacing) };
  } catch {
    return { ls: LETTER_SPACING.normal, ws: WORD_SPACING.normal };
  }
}

/**
 * Letter and word spacing chosen by a grown-up in Settings ("hr:prefs"), as CSS variables
 * for the reading surfaces: passages and word drills.
 */
export function useReadingComfort(): CSSProperties {
  const [c, setC] = useState(readComfort);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREFS_KEY || e.key === null) setC(readComfort());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return { "--st-ls": c.ls, "--st-ws": c.ws } as CSSProperties;
}
