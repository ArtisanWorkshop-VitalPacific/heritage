"use client";

/**
 * Speech for the demo.
 * Out: ElevenLabs through /api/tts when the server has ELEVENLABS_API_KEY, otherwise the
 *      browser voice (speechSynthesis), choosing a gentle female voice where one exists.
 * In:  the browser recognizer (webkitSpeechRecognition / SpeechRecognition).
 * Nothing is recorded or stored. Only recognized text leaves the browser, and only when
 * the tutor is asked something.
 */

import type { Narrator } from "./types";

/* ---------------- Speaking ---------------- */

export interface SpeakOptions {
  narrator?: Narrator;
  /** 1 = normal. Defaults by kind. */
  rate?: number;
  kind?: "word" | "sentence" | "story" | "talk";
  onStart?: () => void;
  onEnd?: () => void;
}

const RATES = { word: 0.78, sentence: 0.86, story: 0.9, talk: 0.92 } as const;

const US_VOICES = [
  "Samantha",
  "Ava (Premium)",
  "Ava (Enhanced)",
  "Ava",
  "Allison",
  "Susan",
  "Google US English",
  "Microsoft Aria Online (Natural) - English (United States)",
  "Microsoft Jenny Online (Natural) - English (United States)",
  "Microsoft Aria",
  "Microsoft Jenny",
  "Microsoft Zira",
];
const UK_VOICES = [
  "Serena (Premium)",
  "Serena (Enhanced)",
  "Serena",
  "Kate",
  "Martha",
  "Stephanie",
  "Google UK English Female",
  "Microsoft Libby Online (Natural) - English (United Kingdom)",
  "Microsoft Sonia Online (Natural) - English (United Kingdom)",
  "Microsoft Hazel",
];

let voicesCache: SpeechSynthesisVoice[] = [];
function voices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
  return voicesCache;
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  voices();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => voices());
}

export function pickVoice(narrator: Narrator = "american"): SpeechSynthesisVoice | undefined {
  const list = voices();
  const prefs = narrator === "british" ? UK_VOICES : US_VOICES;
  for (const name of prefs) {
    const v = list.find((x) => x.name === name) ?? list.find((x) => x.name.startsWith(name));
    if (v) return v;
  }
  const lang = narrator === "british" ? "en-GB" : "en-US";
  return list.find((x) => x.lang === lang && /female|woman/i.test(x.name)) ?? list.find((x) => x.lang === lang) ?? list.find((x) => x.lang.startsWith("en"));
}

let ttsMode: "unknown" | "elevenlabs" | "browser" = "unknown";
let ttsProbe: Promise<void> | null = null;

/** Asks the server once whether ElevenLabs is configured. */
export function probeTts(): Promise<"elevenlabs" | "browser"> {
  if (ttsMode !== "unknown") return Promise.resolve(ttsMode);
  if (!ttsProbe) {
    ttsProbe = fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { tts?: string }) => {
        ttsMode = j.tts === "elevenlabs" ? "elevenlabs" : "browser";
      })
      .catch(() => {
        ttsMode = "browser";
      });
  }
  return ttsProbe.then(() => (ttsMode === "elevenlabs" ? "elevenlabs" : "browser"));
}

let currentAudio: HTMLAudioElement | null = null;
let speakToken = 0;

export function stopSpeaking() {
  speakToken++;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && ("speechSynthesis" in window || typeof Audio !== "undefined");
}

/** Splits text into sentence-sized chunks; long utterances get cut off in some browsers. */
function chunks(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function speakEleven(text: string, opts: SpeakOptions, token: number): Promise<boolean> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, narrator: opts.narrator ?? "american", kind: opts.kind ?? "sentence" }),
    });
    if (!res.ok || token !== speakToken) return false;
    const blob = await res.blob();
    if (token !== speakToken) return true;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      opts.onStart?.();
      audio.play().catch(() => resolve());
    });
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

function speakBrowser(text: string, opts: SpeakOptions, token: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
    const synth = window.speechSynthesis;
    const parts = chunks(text);
    const voice = pickVoice(opts.narrator);
    const rate = opts.rate ?? RATES[opts.kind ?? "sentence"];
    let i = 0;
    let started = false;
    const next = () => {
      if (token !== speakToken || i >= parts.length) return resolve();
      const u = new SpeechSynthesisUtterance(parts[i++]);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? (opts.narrator === "british" ? "en-GB" : "en-US");
      u.rate = rate;
      u.pitch = 1.04;
      u.volume = 1;
      u.onstart = () => {
        if (!started) {
          started = true;
          opts.onStart?.();
        }
      };
      u.onend = () => setTimeout(next, opts.kind === "word" ? 120 : 260);
      u.onerror = () => next();
      synth.speak(u);
    };
    synth.cancel();
    // Safari needs a tick after cancel before speaking again.
    setTimeout(next, 30);
  });
}

/** Speaks text in the tutor's voice. Resolves when finished or interrupted. */
export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  stopSpeaking();
  const token = ++speakToken;
  const mode = await probeTts();
  if (token !== speakToken) return;
  let done = false;
  if (mode === "elevenlabs") done = await speakEleven(text, opts, token);
  if (!done && token === speakToken) await speakBrowser(text, opts, token);
  if (token === speakToken) opts.onEnd?.();
}

/* ---------------- Listening ---------------- */

type RecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function hasRecognition(): boolean {
  return ctor() !== null;
}

export interface ListenHandlers {
  /** Full transcript so far: finalized text plus the current interim guess. */
  onText?: (finalText: string, interimText: string) => void;
  onStart?: () => void;
  onEnd?: (finalText: string) => void;
  onError?: (error: "not-allowed" | "no-speech" | "network" | "unsupported" | "other") => void;
}

export interface Listener {
  stop(): void;
  abort(): void;
  readonly active: boolean;
}

/**
 * Starts the recognizer. continuous=true keeps listening through pauses
 * (reading checks); false stops after one utterance (push-to-talk, single words).
 */
export function listen(handlers: ListenHandlers, opts: { continuous?: boolean; lang?: string } = {}): Listener | null {
  const C = ctor();
  if (!C) {
    handlers.onError?.("unsupported");
    return null;
  }
  stopSpeaking();
  const rec = new C();
  rec.lang = opts.lang ?? "en-US";
  rec.continuous = opts.continuous ?? false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let finalText = "";
  let active = true;
  let stopping = false;

  rec.onstart = () => handlers.onStart?.();
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const t = r[0]?.transcript ?? "";
      if (r.isFinal) finalText = `${finalText} ${t}`.trim();
      else interim += t;
    }
    handlers.onText?.(finalText, interim.trim());
  };
  rec.onerror = (e) => {
    const map: Record<string, "not-allowed" | "no-speech" | "network" | "other"> = {
      "not-allowed": "not-allowed",
      "service-not-allowed": "not-allowed",
      "no-speech": "no-speech",
      network: "network",
    };
    handlers.onError?.(map[e.error] ?? "other");
  };
  rec.onend = () => {
    // Chrome ends continuous sessions after long silences; restart unless we asked to stop.
    if (opts.continuous && !stopping && active) {
      try {
        rec.start();
        return;
      } catch {
        /* fall through */
      }
    }
    active = false;
    handlers.onEnd?.(finalText);
  };

  try {
    rec.start();
  } catch {
    handlers.onError?.("other");
    return null;
  }

  return {
    stop() {
      stopping = true;
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    },
    abort() {
      stopping = true;
      active = false;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    },
    get active() {
      return active;
    },
  };
}

/* ---------------- Phonics helpers ---------------- */

/** What the tutor says for a word tapped in a passage: the word, then the word slowly in parts. */
export function sayWordWithParts(word: string, parts: string[], narrator?: Narrator) {
  const clean = word.replace(/[^A-Za-z']/g, "");
  const text = parts.length > 1 ? `${clean}. ${parts.join(", ")}. ${clean}.` : `${clean}.`;
  return speak(text, { narrator, kind: "word" });
}
