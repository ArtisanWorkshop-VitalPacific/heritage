import type { LadderState, Session } from "../types";

/**
 * Deterministic lesson state machine (docs/poc-state-machine.md), demo pace.
 * Demo pace: a rung is mastered after two clean reads. Production adds a delayed
 * retest seven days later before the seal is awarded.
 */

export const LESSON_STEPS = ["warmup", "teach", "words", "passage", "check", "close"] as const;
export type LessonStep = (typeof LESSON_STEPS)[number];

export const CLEAN_ACCURACY = 0.95;
export const REMEDIATE_BELOW = 0.9;
export const CLEAN_READS_TO_MASTER = 2;
export const REVIEW_AFTER_DAYS = 7;
export const MAX_RUNG = 40;

export function nextStep(step: LessonStep): LessonStep | null {
  const i = LESSON_STEPS.indexOf(step);
  return i >= 0 && i < LESSON_STEPS.length - 1 ? LESSON_STEPS[i + 1] : null;
}

export function startingState(childId: string, rung: number): LadderState {
  const r = Math.max(1, Math.min(MAX_RUNG, Math.round(rung)));
  return {
    childId,
    rung: r,
    mastered: Array.from({ length: r - 1 }, (_, i) => i + 1),
    cleanReads: {},
    review: [],
  };
}

export interface SessionResult {
  ladder: LadderState;
  clean: boolean;
  remediate: boolean;
  cleanReads: number; // clean reads on the session rung after this session
  masteredRung?: number;
}

/** Applies one reading check to the ladder. Pure. */
export function applySession(
  ladder: LadderState,
  session: Pick<Session, "rung" | "accuracy" | "date">,
): SessionResult {
  const clean = session.accuracy >= CLEAN_ACCURACY;
  const remediate = session.accuracy < REMEDIATE_BELOW;
  const next: LadderState = {
    ...ladder,
    mastered: [...ladder.mastered],
    cleanReads: { ...ladder.cleanReads },
    review: [...ladder.review],
  };

  // A review rung read again: clear or keep its review item.
  if (session.rung !== ladder.rung) {
    if (clean) next.review = next.review.filter((r) => r.rung !== session.rung);
    return { ladder: next, clean, remediate, cleanReads: next.cleanReads[session.rung] ?? 0 };
  }

  if (!clean) {
    return { ladder: next, clean, remediate, cleanReads: next.cleanReads[ladder.rung] ?? 0 };
  }

  const reads = (next.cleanReads[ladder.rung] ?? 0) + 1;
  next.cleanReads[ladder.rung] = reads;

  if (reads >= CLEAN_READS_TO_MASTER) {
    const mastered = ladder.rung;
    if (!next.mastered.includes(mastered)) next.mastered.push(mastered);
    next.mastered.sort((a, b) => a - b);
    const due = new Date(new Date(session.date).getTime() + REVIEW_AFTER_DAYS * 86_400_000).toISOString();
    next.review = [...next.review.filter((r) => r.rung !== mastered), { rung: mastered, due }];
    next.rung = Math.min(MAX_RUNG, mastered + 1);
    return { ladder: next, clean, remediate, cleanReads: reads, masteredRung: mastered };
  }

  return { ladder: next, clean, remediate, cleanReads: reads };
}

/** Review items due on or before the given date. */
export function dueReviews(ladder: LadderState, at: Date = new Date()): number[] {
  return ladder.review.filter((r) => new Date(r.due).getTime() <= at.getTime()).map((r) => r.rung);
}
