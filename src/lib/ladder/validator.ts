import { RUNGS } from "./rungs";
import { analyzeWord, decode, normalizeWord } from "./decode";
import { inLexicon, lexEntry } from "./lexicon";

/**
 * Validates that every word in a passage is decodable at the rung, a taught sight
 * word, or an allowed name. One violation rejects the passage.
 *
 * Allowed = (in the lexicon, or an inflection of a lexicon word, and decodable at the rung)
 *         or a sight word taught at or before the rung (plus 's, and -s on nouns and verbs)
 *         or a name in `names` (case-insensitive, possessive allowed).
 */

export interface Violation {
  word: string;
  reason: string;
  /** Index of the sentence where the word first appears (validatePassage only). */
  sentence?: number;
  /** The rung at which the word becomes allowed, when there is one. */
  rung?: number;
}

export interface ValidationResult {
  ok: boolean;
  violations: Violation[];
}

/** Sight word -> the rung that introduces it. */
const SIGHT_RUNG = new Map<string, number>();
for (const r of RUNGS) for (const s of r.sight) if (!SIGHT_RUNG.has(s.toLowerCase())) SIGHT_RUNG.set(s.toLowerCase(), r.n);

/** Sight words that also take -s (comes, looks, friends). */
const SIGHT_PLURAL = new Set([
  "come", "give", "live", "love", "look", "call", "ball", "fall", "pull", "put", "word", "work", "friend", "school", "eye", "laugh", "water", "know", "war", "one",
]);

function sightRungOf(w: string): number | undefined {
  const direct = SIGHT_RUNG.get(w);
  if (direct !== undefined) return direct;
  if (w.endsWith("'s")) return SIGHT_RUNG.get(w.slice(0, -2));
  if (w === "pushes") return SIGHT_RUNG.get("push");
  if (w.endsWith("s") && SIGHT_PLURAL.has(w.slice(0, -1))) return SIGHT_RUNG.get(w.slice(0, -1));
  return undefined;
}

/** Decodable at the rung through a parse whose base word is in the lexicon. */
function lexiconAllows(w: string, rung: number): boolean {
  const a = analyzeWord(w);
  return a.parses.some((p) => p.rung <= rung && (inLexicon(p.base) || inLexicon(w)) && !lexEntry(p.base)?.irregular);
}

function nameAllows(w: string, names: string[]): boolean {
  if (!names.length) return false;
  const set = new Set(names.map((n) => normalizeWord(n)).filter(Boolean));
  return set.has(w) || (w.endsWith("'s") && set.has(w.slice(0, -2)));
}

/** Why a word is not allowed at the rung, or null when it is. */
export function explainWord(raw: string, rung: number, names: string[] = []): Violation | null {
  const display = raw.trim();
  if (/\d/.test(display)) return { word: display, reason: "uses numerals; numbers are written as words" };
  const w = normalizeWord(display);
  if (!w) return null;
  if (nameAllows(w, names)) return null;
  const sight = sightRungOf(w);
  if (sight !== undefined && sight <= rung) return null;
  if (lexiconAllows(w, rung)) return null;

  const d = decode(w, rung);
  const later = analyzeWord(w).parses.find((p) => inLexicon(p.base) || inLexicon(w));
  if (sight !== undefined) return { word: w, reason: `is a sight word taught at rung ${sight}`, rung: sight };
  if (!d.ok) {
    return { word: w, reason: d.reason ?? "is not decodable yet", rung: later && later.rung <= 40 ? later.rung : undefined };
  }
  return { word: w, reason: "is not in the word list for young readers" };
}

export function isAllowed(word: string, rung: number, names: string[] = []): boolean {
  return explainWord(word, rung, names) === null;
}

/** Splits text into word tokens, keeping internal apostrophes and splitting hyphens and dashes. */
export function passageWords(sentence: string): string[] {
  return sentence
    .replace(/[’‘`]/g, "'")
    .split(/[\s\-–—/]+/)
    .map((t) => t.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "").replace(/^'+|'+$/g, ""))
    .filter((t) => /[A-Za-z0-9]/.test(t));
}

export function validatePassage(sentences: string[], rung: number, names: string[] = []): ValidationResult {
  const violations: Violation[] = [];
  const seen = new Set<string>();
  sentences.forEach((s, si) => {
    for (const tok of passageWords(String(s ?? ""))) {
      const v = explainWord(tok, rung, names);
      if (!v) continue;
      const key = v.word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      violations.push({ ...v, sentence: si });
    }
  });
  return { ok: violations.length === 0, violations };
}
