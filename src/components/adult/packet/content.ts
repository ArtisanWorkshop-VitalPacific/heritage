/**
 * Everything a printed lesson needs, derived from the rung data:
 * practice words, grapheme emphasis, the Direct Instruction script, the score rows.
 * The teacher page, the student page and the score sheet all read from here.
 */

import type { Rung } from "@/lib/types";
import { getRung, tokenize } from "@/lib/ladder";

const unique = (xs: string[]) => Array.from(new Set(xs));

/** Words a child can read at this rung, in the order the book presents them. */
export function practiceWords(r: Rung): string[] {
  if (r.words.length) return unique(r.words);
  if (r.ladder) return unique(r.ladder.right.filter((x): x is string => Boolean(x)));
  if (r.pattern) return unique(r.pattern.map((p) => p.to.replace(/\s*\|\s*/g, "")));
  if (r.families) return unique(r.families.flat());
  return unique(r.pairs.flat());
}

/** "hat" -> ["ha", "t"]: through the first vowel, as the book inks it. */
export function splitVowel(word: string): [string, string] {
  const m = word.match(/^([^aeiou]*[aeiou]+)(.*)$/i);
  return m ? [m[1], m[2]] : [word, ""];
}

export interface Seg {
  text: string;
  em: boolean;
}

/** Splits a word so the target grapheme can be set in bold (black ink stands in for the book's pink). */
export function emphasize(word: string, graphemes: string[]): Seg[] {
  const lower = word.toLowerCase();
  // Split digraphs: a_e, i_e, o_e, u_e, e_e.
  for (const g of graphemes) {
    const split = /^([aeiou])_e$/.exec(g);
    if (!split) continue;
    const m = new RegExp(`^(.*?)(${split[1]})([^aeiou]{1,2})(e)$`, "i").exec(word);
    if (m) {
      return [
        { text: m[1], em: false },
        { text: m[2], em: true },
        { text: m[3], em: false },
        { text: m[4], em: true },
      ].filter((s) => s.text);
    }
  }
  // Endings.
  for (const g of graphemes) {
    if (!g.startsWith("-")) continue;
    const end = g.slice(1);
    if (lower.endsWith(end) && lower.length > end.length + 1) {
      return [
        { text: word.slice(0, word.length - end.length), em: false },
        { text: word.slice(word.length - end.length), em: true },
      ];
    }
  }
  let best: { at: number; len: number } | null = null;
  for (const g of graphemes) {
    if (!/^[a-z]+$/i.test(g)) continue;
    const at = lower.indexOf(g.toLowerCase());
    if (at < 0) continue;
    if (!best || at < best.at || (at === best.at && g.length > best.len)) best = { at, len: g.length };
  }
  if (!best) return [{ text: word, em: false }];
  return [
    { text: word.slice(0, best.at), em: false },
    { text: word.slice(best.at, best.at + best.len), em: true },
    { text: word.slice(best.at + best.len), em: false },
  ].filter((s) => s.text);
}

/** For pattern rungs: the short word, then the new word with the added part in bold. */
export function patternSegs(from: string, to: string): { from: string; to: Seg[] } {
  const f = from.replace(/\s*\|\s*/g, " ");
  const t = to;
  const base = from.replace(/\s*\|\s*/g, "");
  if (/\|/.test(from)) return { from: f, to: [{ text: t, em: false }] };
  if (t.toLowerCase().startsWith(base.toLowerCase()) && t.length > base.length) {
    return { from: f, to: [{ text: t.slice(0, base.length), em: false }, { text: t.slice(base.length), em: true }] };
  }
  return { from: f, to: [{ text: t, em: false }] };
}

/* ---------- Sounds ---------- */

const SOUND: Record<string, string> = { qu: "kw", x: "ks", c: "k" };

export function soundOf(glyph: string): string {
  const g = glyph.split(" ")[0];
  return `/${SOUND[g] ?? g}/`;
}

/** What the new sound is, for the rungs past the letters. Plain statements Susan can say aloud. */
const TEACH: Record<number, { say: string; child: string }> = {
  17: { say: "Two of the same letter say one sound: ll in bell, ss in miss, ff in puff. ck says /k/ after a short vowel: back, duck.", child: "bell, miss, puff, back, duck." },
  20: { say: "Two consonants open these words. Say each sound, then blend: b, l, bl. black.", child: "b, l, bl. black." },
  21: { say: "Two consonants open these words. Say each sound, then blend: t, r, tr. trap.", child: "t, r, tr. trap." },
  22: { say: "Two consonants open these words. Say each sound, then blend: s, t, st. stop.", child: "s, t, st. stop." },
  23: { say: "s and h together say one sound: /sh/, as in ship.", child: "/sh/. ship." },
  24: { say: "c and h together say /ch/, as in chin. After a short vowel at the end of a word, we write tch: match.", child: "/ch/. chin. match." },
  25: { say: "t and h together say /th/, as in thin and that. w and h together say /w/, as in which.", child: "/th/. thin. that. /w/. which." },
  26: { say: "ng says /ng/, as in sing. nk says /ngk/, as in sink.", child: "/ng/. sing. /ngk/. sink." },
  27: { say: "The e at the end is silent. It makes the a say its name: cap, cape.", child: "cap, cape." },
  28: { say: "The silent e makes the i say its name: pin, pine.", child: "pin, pine." },
  29: { say: "The silent e makes the o and the u say their names: hop, hope. cub, cube.", child: "hop, hope. cub, cube." },
  30: { say: "ee and ea both say the name of e: see, sea.", child: "see, sea." },
  31: { say: "ai and ay both say the name of a. ai comes inside a word: rain. ay comes at the end: day.", child: "rain, day." },
  32: { say: "oa and ow both say the name of o: boat, snow.", child: "boat, snow." },
  33: { say: "a and r together say /ar/, as in car.", child: "/ar/. car." },
  34: { say: "o and r together say /or/, as in fork.", child: "/or/. fork." },
  35: { say: "er, ir and ur all say /er/: her, bird, fur.", child: "/er/. her, bird, fur." },
  36: { say: "oo says two sounds. The long sound in moon. The short sound in book.", child: "moon, book." },
  37: { say: "ou and ow both say /ow/: out, cow.", child: "/ow/. out, cow." },
  38: { say: "oi and oy both say /oy/. oi comes inside a word: coin. oy comes at the end: boy.", child: "/oy/. coin, boy." },
  39: { say: "-ed and -ing are endings. -ed says /t/ in jumped and /ed/ in landed. One short vowel and one consonant: double the consonant. hop, hopped.", child: "jumped, landed, hopped." },
  40: { say: "Split a long word between the two consonants. Read each part, then the whole word: rab, bit, rabbit.", child: "rab, bit, rabbit." },
};

/* ---------- The script ---------- */

export type LineKind = "say" | "child" | "errs" | "continue";

export interface ScriptLine {
  kind: LineKind;
  text: string;
}

export interface ScriptSection {
  title: string;
  minutes: number;
  lines: ScriptLine[];
}

const say = (text: string): ScriptLine => ({ kind: "say", text });
const child = (text: string): ScriptLine => ({ kind: "child", text });
const errs = (text: string): ScriptLine => ({ kind: "errs", text });
const cont = (text: string): ScriptLine => ({ kind: "continue", text });

export const LINE_LABEL: Record<LineKind, string> = {
  say: "Say",
  child: "Child",
  errs: "If the child errs",
  continue: "Continue",
};

/** Vowels taught through rung n (rungs 1 to 5 are a, e, i, o, u). */
export function vowelsThrough(n: number): string[] {
  return ["a", "e", "i", "o", "u"].slice(0, Math.max(0, Math.min(5, n)));
}

/** A fixed practice row of the vowels learned so far, so every printing matches. */
export function pointAndSay(n: number): string[] {
  const v = vowelsThrough(n);
  if (v.length === 1) return ["a", "A", "a", "a", "A", "a"];
  const order = [0, 1, 0, 2, 1, 3, 0, 4, 2, 1, 3, 4];
  return order.filter((i) => i < v.length).slice(0, 8).map((i) => v[i]);
}

export function warmupWords(n: number): string[] {
  if (n <= 6) return vowelsThrough(n - 1);
  return practiceWords(getRung(n - 1)).slice(0, 6);
}

/** The shortest of the first three sentences, for the copywork line. */
export function copyModel(r: Rung): string {
  if (!r.passage) return r.letterPages?.[0]?.glyphs ?? r.short;
  return [...r.passage.sentences.slice(0, 3)].sort((a, b) => a.length - b.length)[0];
}

export function teacherScript(n: number): ScriptSection[] {
  const r = getRung(n);
  const out: ScriptSection[] = [];

  // 1. Warmup: mastered material only, so every lesson opens with success.
  const warm = warmupWords(n);
  if (n === 1) {
    out.push({
      title: "Warmup",
      minutes: 1,
      lines: [
        say("(Show the student page.) Today you learn your first sound. Put your finger on the big letter."),
        child("Touches a."),
        errs("Guide the finger to the letter. Say: This one. Touch it with me."),
      ],
    });
  } else if (n <= 6) {
    out.push({
      title: "Warmup",
      minutes: 2,
      lines: [
        say(`(Point to each vowel in the row.) Say each sound: ${warm.join(", ")}.`),
        child(`${warm.map((v) => `/${v}/`).join(", ")}.`),
        errs("Say: My turn. /e/, egg. Your turn. Then start the row again."),
      ],
    });
  } else {
    const example = warm[2] ?? warm[0];
    out.push({
      title: "Warmup",
      minutes: 2,
      lines: [
        say(`Read the warmup words. Touch each one: ${warm.join(", ")}.`),
        child("Reads each word."),
        errs(`Point to the word. Say: This word is ${example}. Read it with me. Then alone.`),
        cont("After the last word, read any missed word once more."),
      ],
    });
  }

  // 2. The new sound.
  if (r.letterPages?.length) {
    const pages = r.letterPages;
    const lines: ScriptLine[] = [];
    if (pages.length === 1) {
      const p = pages[0];
      const g = p.glyphs.split(" ")[0];
      const s = soundOf(p.glyphs);
      lines.push(say(`(Point to ${g}.) This letter is ${g}. ${p.say.replace(/\.$/, `: ${s}.`)} Say ${s}.`));
      lines.push(child(`${s}.`));
    } else {
      lines.push(
        say(`(Point to each letter.) ${pages.map((p) => p.say.replace(/\.$/, `: ${soundOf(p.glyphs)}.`)).join(" ")} Say each sound after me.`),
      );
      lines.push(child(`${pages.map((p) => soundOf(p.glyphs)).join(", ")}.`));
    }
    lines.push(errs("Say: My turn. Say the sound and the keyword. Your turn. Repeat until firm."));
    lines.push(cont("The child traces each big letter with a finger, then writes it once in the air."));
    out.push({ title: pages.length > 1 ? "The new letters" : r.group === "vowels" ? "The vowel" : "The new letter", minutes: 2, lines });
  } else if ((n === 18 || n === 19) && r.pattern) {
    // Ending blends: the examples come from the rung's own pattern, so they always match the page.
    const ex = r.pattern
      .slice(0, 3)
      .map((p) => `${p.from}, ${p.to}`)
      .join(". ");
    out.push({
      title: "The new sound",
      minutes: 2,
      lines: [
        say(`(Point to the words at the top of the student page.) Two consonants close these words. Say both sounds at the end: ${ex}.`),
        child(`${ex}.`),
        errs("Say: My turn. Model the sound and one word. Your turn."),
      ],
    });
  } else if (TEACH[n]) {
    out.push({
      title: "The new sound",
      minutes: 2,
      lines: [
        say(`(Point to the words at the top of the student page.) ${TEACH[n].say}`),
        child(TEACH[n].child),
        errs("Say: My turn. Model the sound and one word. Your turn."),
      ],
    });
  }

  // 3. The ladder, the pattern or the word families.
  if (r.ladder) {
    const left = r.ladder.left.filter((x): x is string => Boolean(x));
    const right = r.ladder.right.filter((x): x is string => Boolean(x));
    out.push({
      title: "The vowel ladder",
      minutes: 3,
      lines: [
        say(`Put your finger on the blue dot. Read up the first ladder: ${left.join(", ")}.`),
        child(`${left.join(", ")}.`),
        say(`Now read up the second ladder: ${right.join(", ")}.`),
        child(`${right.join(", ")}.`),
        errs(`Point to the rung. Say: ${left[0]}, ${right[0]}. Your turn. Then climb on from that rung.`),
        cont("Climb both ladders once more without help."),
      ],
    });
  } else if (r.pattern) {
    const p = r.pattern.slice(0, 3).map((x) => `${x.from.replace(/\s*\|\s*/g, ", ")}, ${x.to}`);
    out.push({
      title: n === 40 ? "Two syllables" : "The pattern",
      minutes: 3,
      lines: [
        say(`Read the first word, then the new word: ${p.join(". ")}.`),
        child(`${p.join(". ")}.`),
        errs("Cover the new part with a finger. Read the short word. Uncover it and read the new word."),
        cont("Read every pair down the page."),
      ],
    });
  } else if (r.families) {
    const col = r.families[0];
    out.push({
      title: "Word families",
      minutes: 3,
      lines: [
        say("Read each column from the top. The bold letters say the same sound in every word."),
        child(`${col.join(", ")}.`),
        errs("Point to the bold letters. Say their sound. The child reads the word again."),
        cont("Read every column."),
      ],
    });
  }

  // 4. Pairs.
  if (r.pairs.length) {
    const first = r.pairs[0];
    out.push({
      title: "Pairs",
      minutes: 2,
      lines: [
        say("These words change one sound. Read the top word, then the word under it."),
        child(`${first[0]}, ${first[1]}.`),
        errs("Point to the letter that changed. Say its sound. The child reads the pair again."),
        cont(`Read all ${r.pairs.length} pairs.`),
      ],
    });
  }

  // 5. Sight words, when the rung adds them.
  if (r.sight.length) {
    out.push({
      title: "Sight words",
      minutes: 1,
      lines: [say(`We learn these by sight: ${r.sight.join(", ")}. I say each word. You say it. Then you read it.`), child(`${r.sight.join(", ")}.`)],
    });
  }

  // 6. The passage, or point and say for the vowel rungs.
  if (r.passage) {
    out.push({
      title: "The story",
      minutes: 4,
      lines: [
        say(`Now read the story, ${r.passage.title}. Touch each word as you read.`),
        child("Reads the story aloud."),
        errs("Wait three seconds. Point to the word. Say: Sound it out. If the child is still stuck, say the word. The child rereads the sentence."),
        cont("Mark each word on the score sheet as the child reads. Time the reading in seconds."),
      ],
    });
  } else {
    out.push({
      title: "Point and say",
      minutes: 2,
      lines: [
        say("Point to each letter in the row and say its sound."),
        child(`${pointAndSay(n).slice(0, 4).map((v) => `/${v.toLowerCase()}/`).join(", ")}.`),
        errs("Say: My turn. Say the sound and the keyword. Your turn. Then start the row again."),
        cont("Mark each sound on the score sheet."),
      ],
    });
  }

  // 7. Close.
  const close: ScriptLine[] = [];
  if (r.classicalWord) {
    close.push(say(`Our word today is ${r.classicalWord.word}. ${capitalize(r.classicalWord.word)} means ${r.classicalWord.gloss}. Say ${r.classicalWord.word}.`));
    close.push(child(`${capitalize(r.classicalWord.word)}.`));
  }
  close.push(cont(r.passage ? "The child copies the model sentence on the copywork lines." : "The child copies the letters on the copywork lines."));
  close.push(cont("Scan the code on the score sheet to log the lesson and open the three-minute reading check."));
  out.push({ title: "Close", minutes: 2, lines: close });

  return out;
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/* ---------- Score sheet rows ---------- */

export interface ScoreRow {
  kind: "head" | "word";
  text: string;
  n?: number;
}

export function scoreRows(n: number): { rows: ScoreRow[]; passageWords: number } {
  const r = getRung(n);
  const rows: ScoreRow[] = [];
  let k = 0;
  let passageWords = 0;
  if (r.passage) {
    rows.push({ kind: "head", text: r.passage.title });
    for (const t of tokenize(r.passage.sentences)) {
      rows.push({ kind: "word", text: t.display.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, ""), n: ++k });
      passageWords++;
    }
  } else {
    rows.push({ kind: "head", text: "Sounds" });
    for (const v of pointAndSay(n)) rows.push({ kind: "word", text: v, n: ++k });
  }
  if (r.pairs.length) {
    rows.push({ kind: "head", text: "Pairs" });
    for (const [a, b] of r.pairs) {
      rows.push({ kind: "word", text: a, n: ++k });
      rows.push({ kind: "word", text: b, n: ++k });
    }
  }
  return { rows, passageWords };
}
