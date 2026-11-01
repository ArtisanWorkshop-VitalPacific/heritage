import { ILLUSTRATIONS, type IllustrationEntry } from "./illustrations.data";
import local from "./illustrations.local.json";

interface FrameSet {
  count: number;
  width: number;
  height: number;
  pattern: string; // "/illustrations/hero-frames-lg/f{n}.jpg", n is 1-based, zero-padded to 3
}

const LOCAL_RAW = local as Record<string, unknown>;
const LOCAL: Record<string, string> = Object.fromEntries(
  Object.entries(LOCAL_RAW).filter(([, v]) => typeof v === "string") as [string, string][],
);

/**
 * The hero clip as image sequences for scroll scrubbing, when the build produced them.
 * Returns null in local development (no network), in which case scrub the MP4 directly.
 */
export function heroFrames(): { sm: FrameSet; lg: FrameSet } | null {
  const f = LOCAL_RAW._heroFrames as { sm: FrameSet; lg: FrameSet } | undefined;
  return f && f.sm?.count && f.lg?.count ? f : null;
}

export function frameUrl(set: FrameSet, index0: number): string {
  const n = String(Math.max(1, Math.min(set.count, index0 + 1))).padStart(3, "0");
  return set.pattern.replace("{n}", n);
}

export interface ResolvedIllustration extends IllustrationEntry {
  src: string;
}

const BY_ID = new Map(ILLUSTRATIONS.map((i) => [i.id, i]));

export function illustration(id: string): ResolvedIllustration | undefined {
  const entry = BY_ID.get(id);
  if (!entry) return undefined;
  return { ...entry, src: LOCAL[id] ?? entry.remote };
}

/**
 * True when the build converted this engraving to transparent ink (deployed builds).
 * False in local development, where the remote PNG still carries its paper.
 */
export function isInkEngraving(id: string): boolean {
  const entry = BY_ID.get(id);
  return Boolean(entry && entry.kind === "engraving" && LOCAL[id] && LOCAL_RAW._engravingInk === true);
}

export function allIllustrations(kind?: IllustrationEntry["kind"]): ResolvedIllustration[] {
  return ILLUSTRATIONS.filter((i) => !kind || i.kind === kind).map((i) => ({ ...i, src: LOCAL[i.id] ?? i.remote }));
}

export const FABLES = [
  { id: "fable-tortoise-hare", title: "The Tortoise and the Hare", moral: "Slow and steady wins the race." },
  { id: "fable-red-hen", title: "The Little Red Hen", moral: "Those who share the work share the bread." },
  { id: "fable-shepherd-boy", title: "The Boy Who Cried Wolf", moral: "A liar is not believed, even when he tells the truth." },
  { id: "fable-ant-grasshopper", title: "The Ant and the Grasshopper", moral: "Work today for the needs of tomorrow." },
  { id: "fable-lion-mouse", title: "The Lion and the Mouse", moral: "No act of kindness is ever wasted." },
  { id: "fable-crow-pitcher", title: "The Crow and the Pitcher", moral: "Little by little does the trick." },
];
