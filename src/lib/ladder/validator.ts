/**
 * ENGINE AGENT OWNS THIS FILE. Stub with the final signature.
 * Validates that every word in a passage is decodable at the rung, a taught sight
 * word, or an allowed name. One violation rejects the passage.
 */

export interface Violation {
  word: string;
  reason: string;
}

export interface ValidationResult {
  ok: boolean;
  violations: Violation[];
}

export function validatePassage(sentences: string[], rung: number, names: string[] = []): ValidationResult {
  void sentences;
  void rung;
  void names;
  return { ok: true, violations: [] };
}

export function isAllowed(word: string, rung: number, names: string[] = []): boolean {
  void word;
  void rung;
  void names;
  return true;
}
