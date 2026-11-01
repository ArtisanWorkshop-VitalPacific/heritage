import type { AgeBand, TutorRequest, TutorTurn } from "./types";
import { getRung, sightThrough } from "./ladder/rungs";
import { bankFor, newWordsAt } from "./ladder/bank";

/**
 * Mrs. Wren: the tutor persona, plus the helpers that keep every reply speakable.
 * Used by /api/tutor (system prompt) and by the scripted tutor (voice rules).
 */

/** Replies stay under these word counts (band A under 35, B under 50, C under 70). */
export const WORD_CAPS: Record<AgeBand, number> = { A: 34, B: 49, C: 69 };

/** Fills defaults so a partial or hostile body never breaks the tutor. */
export function normalizeTutorRequest(input: unknown): TutorRequest {
  const b = (input && typeof input === "object" ? input : {}) as Partial<TutorRequest>;
  const c = (b.child && typeof b.child === "object" ? b.child : {}) as Partial<TutorRequest["child"]>;
  const band: AgeBand = c.band === "B" || c.band === "C" ? c.band : "A";
  const rung = Math.max(1, Math.min(40, Math.round(Number(b.rung)) || 6));
  const messages: TutorTurn[] = Array.isArray(b.messages)
    ? b.messages
        .filter((m): m is TutorTurn => !!m && typeof m === "object" && typeof (m as TutorTurn).text === "string")
        .map((m) => ({ role: m.role === "tutor" ? "tutor" : "child", text: String(m.text).slice(0, 600) }))
    : [];
  const passage =
    b.passage && typeof b.passage === "object" && Array.isArray(b.passage.sentences)
      ? {
          title: String(b.passage.title ?? "").slice(0, 120),
          sentences: b.passage.sentences.filter((s) => typeof s === "string").map((s) => s.slice(0, 300)).slice(0, 12),
        }
      : undefined;
  const name = typeof c.name === "string" && c.name.trim() ? c.name.trim().slice(0, 40) : "friend";
  return {
    messages,
    rung,
    context: b.context === "talk" || b.context === "placement" ? b.context : "lesson",
    passage,
    child: {
      name,
      age: Number.isFinite(Number(c.age)) ? Math.max(3, Math.min(14, Math.round(Number(c.age)))) : band === "A" ? 6 : band === "B" ? 8 : 10,
      band,
      sex: c.sex === "boy" ? "boy" : "girl",
      interests: Array.isArray(c.interests) ? c.interests.filter((s) => typeof s === "string").map((s) => s.slice(0, 40)).slice(0, 8) : [],
      faithTrack: c.faithTrack === true,
      modernComparisons: c.modernComparisons === true,
    },
  };
}

/** Words the tutor may ask the child to read at this rung: new words first, then a sample of the rest. */
export function allowedWordSample(rung: number, max = 160): string[] {
  const fresh = newWordsAt(rung);
  const rest = bankFor(rung).filter((w) => !fresh.includes(w));
  // Prefer recent rungs: the bank is ordered by the rung each word arrives at.
  const recent = rest.slice(-Math.max(0, max - fresh.length));
  return [...fresh, ...recent].slice(0, max);
}

export function buildTutorSystemPrompt(req: TutorRequest): string {
  const { child } = req;
  const rung = getRung(Math.max(1, Math.min(40, req.rung)));
  const cap = WORD_CAPS[child.band];
  const sight = sightThrough(rung.n);
  const words = allowedWordSample(rung.n);
  const classical = rung.classicalWord;
  const interests = child.interests.length ? child.interests.join(", ") : "none given";

  const lines: string[] = [
    `You are Mrs. Wren, a gentle, warm, maternal and patient schoolmistress who teaches one child to read with phonics, in the tradition of Hay and Wingo's Reading with Phonics and the McGuffey Readers.`,
    ``,
    `THE CHILD: ${child.name}, age ${child.age}, reading band ${child.band}. Interests: ${interests}.`,
    `Speak to ${child.name} by name now and then, not in every reply.`,
    ``,
    `HOW YOU SPEAK. Every reply is read aloud by a voice, so:`,
    `- Plain sentences only. No markdown, no lists, no headings, no emoji, no stage directions, no sound effects, no quotation marks around your reply.`,
    `- One to three short sentences, fewer than ${cap + 1} words in all.`,
    `- Two registers. Use plain, simple words for instructions and corrections. Use fine old words for praise and stories (diligent, steadfast, well done, careful work), and the first time you use an old word, follow it with a plain meaning, for example: "That was diligent work. Diligent means you keep working, even when it is hard."`,
    classical ? `- Today's old word is "${classical.word}". It means: ${classical.gloss}. Use it in praise once in a while.` : ``,
    `- Never use the word "wrong". When the child misreads, use Direct Instruction: say the word correctly yourself, ask the child to say it, and tell them you will come back to it. Then do come back to it later.`,
    `- Never use dashes of any kind.`,
    ``,
    `WHAT YOU NEVER DO:`,
    `- Never compare ${child.name} to other children. Never comment on appearance.`,
    `- Never mention brands, products, screens, tablets, phones, apps, video games, television, films or licensed characters.`,
    child.modernComparisons
      ? `- You may use a modern comparison only when it makes an idea clearer, and never one that names a brand or a screen.`
      : `- Do not use modern comparisons. Keep your examples timeless: home, farm, garden, kitchen, field, sea, the seasons.`,
    child.faithTrack
      ? `- The family welcomes faith. You may draw gently on Scripture and the virtues, at most one short reference in a reply, and only when it fits naturally.`
      : `- Do not bring up religion. You may speak of virtues such as patience, honesty, kindness and courage.`,
    `- Never ask for personal information: no full names, addresses, schools, phone numbers, passwords or photos. If the child offers it, kindly say that is for the family to keep and return to reading.`,
    `- If asked, say honestly that you are Mrs. Wren, a reading helper, not a real person.`,
    ``,
    `SAFETY: If ${child.name} says they are hurt, scared, unsafe or sad, answer kindly and briefly, and encourage them to tell a parent or another grown-up they trust right away. Do not ask questions about it and do not try to solve it yourself.`,
    ``,
    `STAY ON TOPIC: reading, words, letters, sounds, stories and learning. If the child wanders, answer in one kind sentence and lead back to the lesson.`,
    `When the child asks why reading matters, tie your answer to their interests (${interests}).`,
    ``,
    `THE LESSON: rung ${rung.n} of 40, "${rung.title}". New sounds at this rung: ${rung.graphemes.join(", ")}.`,
    req.context === "placement"
      ? `This is the placement check. Do not read the test words for the child or sound them out. Encourage, and say it is fine to skip a word.`
      : req.context === "talk"
        ? `This is a conversation away from the page. Keep it short and warm, and bring it back to words and stories.`
        : `This is a reading lesson.`,
    req.passage && req.passage.sentences.length
      ? `Today's story is "${req.passage.title}": ${req.passage.sentences.join(" ")}`
      : ``,
    ``,
    `DECODABLE WORDS RULE: The child can only decode words built from the sounds taught so far. Any word you spell out, sound out, or ask the child to read MUST come from the allowed list below, or from today's story. You may speak other words aloud in conversation, but never ask the child to read or spell them. When you sound out a word, give its parts separated by commas and then the whole word, like this: sh, i, p. Ship.`,
    `Allowed words to read at this rung (a sample): ${words.join(", ") || "(the child is still learning letter sounds; ask for sounds, not words)"}.`,
    `Sight words learned by heart: ${sight.join(", ") || "none yet"}.`,
  ];
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").trim();
}

/* ------------------------------------------------------------------------- */
/* Speakable text                                                             */
/* ------------------------------------------------------------------------- */

const STAGE_VERBS = /\b(smil|laugh|chuckl|nod|clap|paus|whisper|gigg|grin|wink|sigh|beam|lean|point|gestur|warmly|gently|softly|kneel|wave|hug)/i;

/** Strips markdown, emoji, stage directions, wrapping quotes and dashes; collapses whitespace. */
export function cleanSpoken(input: string): string {
  let t = String(input ?? "");
  t = t.replace(/```[\s\S]*?```/g, " ").replace(/`/g, "");
  t = t.replace(/^\s*(mrs\.?\s*wren|tutor|assistant)\s*:\s*/i, "").trim();
  t = stripWrappingQuotes(t);
  // Bold first, so its asterisks are not read as stage directions.
  t = t.replace(/(\*\*|__)(.+?)\1/g, "$2");
  // Stage directions: *smiles*, (laughs softly), [pause]
  t = t.replace(/\*([^*\n]{1,60})\*/g, (m, inner: string) => (STAGE_VERBS.test(inner) ? " " : inner));
  t = t.replace(/\(([^)\n]{1,60})\)/g, (m, inner: string) => (STAGE_VERBS.test(inner) || inner.split(/\s+/).length <= 4 ? " " : `, ${inner},`));
  t = t.replace(/\[[^\]\n]{0,60}\]/g, " ");
  // Markdown structure
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  t = t.replace(/^\s*(?:[-*•+]|\d+[.)])\s+/gm, "");
  t = t.replace(/(^|[\s(])[*_](\S(?:.*?\S)?)[*_](?=[\s).,!?]|$)/g, "$1$2");
  t = t.replace(/[*#~>|]/g, " ");
  // Emoji and pictographs
  t = t.replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu, "");
  // Dashes become commas
  t = t.replace(/\s*(?:—|–|--)\s*/g, ", ").replace(/\s+-\s+/g, ", ");
  // Lines into sentences
  t = t
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/[.!?,;:]["”’)]*$/.test(l) ? l : `${l}.`))
    .join(" ");
  t = stripWrappingQuotes(t.replace(/\s+/g, " ").trim());
  t = t.replace(/\s+([,.!?;:])/g, "$1").replace(/,\s*,+/g, ",").replace(/^[,;:\s]+/, "").replace(/([.!?]),/g, "$1");
  if (t && !/[.!?]["”’)]?$/.test(t)) t = `${t}.`;
  return t;
}

/** Removes quotes around the whole reply (not quotes inside it). */
function stripWrappingQuotes(s: string): string {
  let t = s.trim();
  for (let i = 0; i < 2; i++) {
    const m = t.match(/^["“”'‘’]([\s\S]*)["“”'‘’]$/);
    if (m && !/["“”]/.test(m[1])) t = m[1].trim();
  }
  return t;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

/** Keeps whole sentences (at most three) under the band's word cap. */
export function capForBand(text: string, band: AgeBand, maxSentences = 3): string {
  const cap = WORD_CAPS[band] ?? WORD_CAPS.A;
  const sentences = text.match(/[^.!?]+[.!?]+["”’)]*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  const out: string[] = [];
  let n = 0;
  for (const s of sentences) {
    const k = countWords(s);
    if (out.length >= maxSentences || n + k > cap) break;
    out.push(s);
    n += k;
  }
  if (!out.length && sentences.length) {
    const words = sentences[0].split(/\s+/).slice(0, cap);
    return `${words.join(" ").replace(/[,;:]$/, "")}.`;
  }
  return out.join(" ");
}
