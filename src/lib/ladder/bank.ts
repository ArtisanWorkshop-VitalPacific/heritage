import { LEXICON, LEXICON_NAMES, TOPIC_WORDS, topicFor } from "./lexicon";
import { decodeRung } from "./decode";

/**
 * Word banks per rung: lexicon words the decoder can read at the rung.
 * Computed once from the lexicon and frozen; ordered by the rung each word arrives at.
 */

interface Ranked {
  word: string;
  rung: number;
}

let ranked: Ranked[] | null = null;
let rankedNames: Ranked[] | null = null;

function all(): Ranked[] {
  if (!ranked) {
    ranked = LEXICON.flatMap((e) => {
      if (e.irregular) return [];
      const r = decodeRung(e.word);
      return r === null ? [] : [{ word: e.word, rung: r }];
    });
    ranked.sort((a, b) => a.rung - b.rung);
  }
  return ranked;
}

/** Lexicon words decodable at the rung (sight words and names not included). */
export function bankFor(rung: number): string[] {
  return all()
    .filter((x) => x.rung <= rung)
    .map((x) => x.word);
}

/** Words that become decodable exactly at this rung. */
export function newWordsAt(rung: number): string[] {
  return all()
    .filter((x) => x.rung === rung)
    .map((x) => x.word);
}

/** The rung at which a lexicon word arrives, or null if it is not a decodable lexicon word. */
export function rungOfWord(word: string): number | null {
  const w = word.toLowerCase();
  return all().find((x) => x.word === w)?.rung ?? null;
}

/** Decodable first names a passage may use at the rung. */
export function namesFor(rung: number): string[] {
  if (!rankedNames) {
    rankedNames = LEXICON_NAMES.flatMap((n) => {
      const r = decodeRung(n);
      return r === null ? [] : [{ word: n, rung: r }];
    });
    rankedNames.sort((a, b) => a.rung - b.rung);
  }
  return rankedNames.filter((x) => x.rung <= rung).map((x) => x.word);
}

/** Bank words that suit the child's interests, for steering generated passages. */
export function topicWordsFor(interests: string[], rung: number): string[] {
  const bank = new Set(bankFor(rung));
  const out: string[] = [];
  for (const i of interests) {
    const key = topicFor(i);
    for (const w of key ? TOPIC_WORDS[key] : []) if (bank.has(w) && !out.includes(w)) out.push(w);
  }
  return out;
}
