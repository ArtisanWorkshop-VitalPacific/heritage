"use client";

import type { Passage, TutorReply, TutorRequest } from "./types";
import type { Violation } from "./ladder/validator";
import { passageFor } from "./ladder/corpus";
import { scriptedReply } from "./tutor-script";

/**
 * Client helpers for the tutor and the passage generator.
 * ENGINE AGENT OWNS THIS FILE: keep these signatures. The engine adds a local scripted
 * fallback so the tutor still answers when the network or gateway is unavailable.
 */

export async function askTutor(req: TutorRequest): Promise<TutorReply> {
  try {
    const res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as Partial<TutorReply>;
    if (typeof j.text !== "string" || !j.text.trim()) throw new Error("empty reply");
    return { text: j.text, source: j.source === "gateway" ? "gateway" : "script", model: j.model };
  } catch {
    // Offline or the server is unreachable: Mrs. Wren answers from the local script.
    return { text: scriptedReply(req), source: "script" };
  }
}

export interface PassageResponse {
  passage: Passage;
  source: "generated" | "corpus";
  violations: Violation[];
  attempts: number;
}

export async function requestPassage(input: { rung: number; childName?: string; interests?: string[] }): Promise<PassageResponse> {
  try {
    const res = await fetch("/api/passage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as Partial<PassageResponse>;
    if (!j.passage) throw new Error("no passage");
    return { passage: j.passage, source: j.source ?? "corpus", violations: j.violations ?? [], attempts: j.attempts ?? 0 };
  } catch {
    const p = passageFor(input.rung);
    return { passage: p!, source: "corpus", violations: [], attempts: 0 };
  }
}
