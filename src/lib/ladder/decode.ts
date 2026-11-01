import { lexEntry, type LexEntry } from "./lexicon";

/**
 * The decoder: can a child on rung N sound this word out with what has been taught?
 * Rule-based on the Hay and Wingo ladder in rungs.ts, refined by lexicon tags
 * (irregular words, the two sounds of ow, hard g before e or i, syllable splits).
 * Pure and deterministic. The language model never decides this.
 */

export interface DecodeResult {
  ok: boolean;
  graphemes: string[];
  reason?: string;
}

export interface Requirement {
  key: string;
  rung: number;
  label: string;
}

export interface WordParse {
  rung: number;
  parts: string[];
  reqs: Requirement[];
  /** The lexicon word this parse rests on (the word itself, or its base before an ending). */
  base: string;
  kind: "syllable" | "two" | "suffix";
}

export interface WordAnalysis {
  word: string;
  /** Lowest rung at which the word decodes, or null if it never does on this ladder. */
  rung: number | null;
  graphemes: string[];
  parses: WordParse[];
  reason?: string;
}

/* ------------------------------------------------------------------------- */
/* Inventory                                                                  */
/* ------------------------------------------------------------------------- */

const V_RUNG: Record<string, number> = { a: 1, e: 2, i: 3, o: 4, u: 5 };
const C_RUNG: Record<string, number> = {
  m: 6, t: 6, s: 7, p: 7, n: 8, b: 8, d: 9, g: 9, h: 10, c: 11, k: 11, f: 12, l: 12, j: 13, r: 14, w: 15, v: 16, y: 16, z: 16, qu: 16, x: 16,
};

const req = (key: string, rung: number, label: string): Requirement => ({ key, rung, label });
const letter = (c: string) => req(c, C_RUNG[c], c === "qu" ? "the letters qu" : `the letter ${c}`);
const vowel = (v: string) => req(v, V_RUNG[v], `short ${v}`);
const DIGRAPH: Record<string, number> = { sh: 23, ch: 24, th: 25, wh: 25 };
const digraph = (d: string) => req(d, DIGRAPH[d], `the ${d} sound`);
const ALL = req("all", 17, "the all family");
const TWO = req("two-syllables", 40, "two syllables");
const SILENT_E = req("silent-e", 27, "a silent e");

const TEAM_RUNG: Record<string, number> = { ee: 30, ea: 30, ai: 31, ay: 31, oa: 32, oo: 36, ou: 37, oi: 38, oy: 38 };
const R_RUNG: Record<string, number> = { ar: 33, or: 34, er: 35, ir: 35, ur: 35 };
const VCE_RUNG: Record<string, number> = { a: 27, i: 28, o: 29, u: 29, e: 29 };

interface Piece {
  text: string;
  parts: string[];
  reqs: Requirement[];
}

const ONSETS: Piece[] = (() => {
  const out: Piece[] = [];
  for (const c of "b c d f g h j k l m n p r s t v w y z".split(" ")) out.push({ text: c, parts: [c], reqs: [letter(c)] });
  out.push({ text: "qu", parts: ["qu"], reqs: [letter("qu")] });
  for (const d of ["sh", "ch", "th", "wh"]) out.push({ text: d, parts: [d], reqs: [digraph(d)] });
  const blend = (b: string, rung: number, parts = b.split("")) =>
    out.push({ text: b, parts, reqs: [...parts.map((p) => (DIGRAPH[p] ? digraph(p) : letter(p))), req(b, rung, `the blend ${b}`)] });
  for (const b of ["bl", "cl", "fl", "gl", "pl", "sl"]) blend(b, 20);
  for (const b of ["br", "cr", "dr", "fr", "gr", "pr", "tr"]) blend(b, 21);
  blend("shr", 21, ["sh", "r"]);
  blend("thr", 21, ["th", "r"]);
  for (const b of ["sc", "sk", "sm", "sn", "sp", "st", "sw", "tw", "spl", "spr", "str", "scr"]) blend(b, 22);
  blend("squ", 22, ["s", "qu"]);
  return out;
})();

/** Codas after a short vowel. */
const SHORT_CODAS = new Map<string, Piece>();
/** Codas after a vowel team (ee, ea, ai, oa, oo, ou, oi). */
const TEAM_CODAS = new Map<string, Piece>();
/** Codas after an r-controlled vowel. */
const R_CODAS = new Map<string, Piece>();
(() => {
  const single = (m: Map<string, Piece>, cs: string) => {
    for (const c of cs.split(" ")) m.set(c, { text: c, parts: [c], reqs: [letter(c)] });
  };
  single(SHORT_CODAS, "b c d f g k l m n p s t x z");
  for (const d of ["ll", "ss", "ff", "zz", "ck", "gg", "dd", "tt"]) {
    const ls = d === "ck" ? ["c", "k"] : [d[0]];
    SHORT_CODAS.set(d, { text: d, parts: [d], reqs: [...ls.map(letter), req(d, 17, `the double letters ${d}`)] });
  }
  const dig = (m: Map<string, Piece>, d: string) => m.set(d, { text: d, parts: [d], reqs: [digraph(d)] });
  for (const d of ["sh", "ch", "th"]) {
    dig(SHORT_CODAS, d);
    dig(TEAM_CODAS, d);
    dig(R_CODAS, d);
  }
  SHORT_CODAS.set("tch", { text: "tch", parts: ["tch"], reqs: [req("tch", 24, "the tch sound")] });
  SHORT_CODAS.set("ng", { text: "ng", parts: ["ng"], reqs: [req("ng", 26, "the ng sound")] });
  SHORT_CODAS.set("nk", { text: "nk", parts: ["nk"], reqs: [req("nk", 26, "the nk sound")] });
  const cluster = (m: Map<string, Piece>, c: string, rung: number) =>
    m.set(c, { text: c, parts: c.split(""), reqs: [...c.split("").map(letter), req(c, rung, `the ending blend ${c}`)] });
  for (const c of ["nt", "nd", "mp"]) cluster(SHORT_CODAS, c, 18);
  for (const c of ["st", "sk", "sp", "ft", "lt", "lk", "lp", "lf", "ld", "lm", "pt", "ct", "xt"]) cluster(SHORT_CODAS, c, 19);
  SHORT_CODAS.set("nch", { text: "nch", parts: ["n", "ch"], reqs: [letter("n"), digraph("ch"), req("nch", 24, "the ending nch")] });

  single(TEAM_CODAS, "b d f k l m n p t");
  for (const c of ["nt", "nd", "st"]) cluster(TEAM_CODAS, c, c === "st" ? 19 : 18);
  single(R_CODAS, "b d f k l m n p t");
  cluster(R_CODAS, "st", 19);
  for (const m of [TEAM_CODAS, R_CODAS]) {
    for (const c of ["s", "v", "z"]) {
      if (m === R_CODAS && c === "z") continue;
      m.set(`${c}e`, { text: `${c}e`, parts: [c, "e"], reqs: [letter(c), SILENT_E] });
    }
  }
})();

const FINAL_TEAMS = new Set(["ee", "ea", "ay", "oy", "ow", "oo"]);
const R_TEAMS = new Set(["ee", "ea", "ai", "oa", "ou"]);
const VCE_CONS = new Set("b c d f g k l m n p r s t v z".split(" "));
/** After w, wh or qu, short a keeps its sound only before these (wag, wax, swam, quack). */
const W_A_OK = new Set(["g", "gg", "ck", "x", "m", "ng", "nk"]);
const CLOSED_ONLY = new Set(["ck", "tch", "ll", "ss", "ff", "zz", "dd", "gg", "tt", "x", "nk", "ng"]);

/* ------------------------------------------------------------------------- */
/* Syllables                                                                  */
/* ------------------------------------------------------------------------- */

type SylType = "closed" | "r" | "vce" | "team" | "all";

interface Syl {
  parts: string[];
  reqs: Requirement[];
  type: SylType;
  onset: string;
  coda: string;
}

interface Ctx {
  hardG: boolean;
  ow?: "cow" | "snow";
  /** Letter just before this syllable (for doubled consonants across a split). */
  prev?: string;
  /** Inside a two-syllable word: v may close a syllable (sev|en, riv|er). */
  inner?: boolean;
}

type Fail = "soft-c" | "soft-g" | "w-vowel" | "old" | "are" | "ere" | "open" | "y-vowel" | "structure";

function wLike(onset: string): boolean {
  return onset.endsWith("w") || onset === "wh" || onset === "qu" || onset === "squ";
}

function owReq(ctx: Ctx): Requirement {
  if (ctx.ow === "cow") return req("ow-cow", 37, "ow as in cow");
  if (ctx.ow === "snow") return req("ow-snow", 32, "ow as in snow");
  return req("ow", 37, "both sounds of ow");
}

function parseSyllable(s: string, ctx: Ctx, fails: Set<Fail>): Syl[] {
  const out: Syl[] = [];
  const onsets: Piece[] = [{ text: "", parts: [], reqs: [] }, ...ONSETS.filter((o) => s.startsWith(o.text))];
  for (const o of onsets) {
    const rest = s.slice(o.text.length);
    if (!rest) continue;
    const first = rest[0];
    if (o.text.endsWith("c") && "eiy".includes(first)) {
      fails.add("soft-c");
      continue;
    }
    if (o.text === "g" && "eiy".includes(first) && !ctx.hardG && ctx.prev !== "g") {
      fails.add("soft-g");
      continue;
    }
    if (first === "y") {
      fails.add("y-vowel");
      continue;
    }
    const add = (parts: string[], reqs: Requirement[], type: SylType, coda: string) =>
      out.push({ parts: [...o.parts, ...parts], reqs: [...o.reqs, ...reqs], type, onset: o.text, coda });

    // The all family: ball, call, small (shall keeps its short a).
    if (rest === "all" && s !== "shall") add(["all"], [ALL], "all", "");
    // Long o before ld or lt: old, cold, colt.
    if (/^ol[dt]$/.test(rest)) {
      fails.add("old");
      continue;
    }
    // r-controlled vowels
    for (const r of Object.keys(R_RUNG)) {
      if (!rest.startsWith(r)) continue;
      if (r === "ar" && wLike(o.text)) {
        fails.add("w-vowel");
        continue;
      }
      const coda = rest.slice(2);
      const c = R_CODAS.get(coda) ?? (coda === "" ? { text: "", parts: [], reqs: [] } : undefined);
      if (c) add([r, ...c.parts], [req(r, R_RUNG[r], `the ${r} sound`), ...c.reqs], "r", coda);
    }
    // Vowel teams
    for (const t of [...Object.keys(TEAM_RUNG), "ow"]) {
      if (!rest.startsWith(t)) continue;
      const coda = rest.slice(2);
      const tReq = t === "ow" ? owReq(ctx) : req(t, TEAM_RUNG[t], `the vowel team ${t}`);
      let c: Piece | undefined;
      if (coda === "") c = FINAL_TEAMS.has(t) ? { text: "", parts: [], reqs: [] } : undefined;
      else if (t === "ow") c = ["l", "n", "d"].includes(coda) ? SHORT_CODAS.get(coda) : undefined;
      else if (t === "ay" || t === "oy") c = undefined;
      else if ((coda === "r" || coda === "rd") && R_TEAMS.has(t))
        c = { text: coda, parts: coda.split(""), reqs: coda.split("").map(letter) };
      else c = TEAM_CODAS.get(coda);
      if (c) add([t, ...c.parts], [tReq, ...c.reqs], "team", coda);
    }
    // Silent e: vowel, one consonant, e
    if (V_RUNG[first] && rest.length === 3 && rest[2] === "e" && VCE_CONS.has(rest[1])) {
      const v = first;
      const c = rest[1];
      if (c === "c") fails.add("soft-c");
      else if (c === "g") fails.add("soft-g");
      else if (c === "r" && v === "a") fails.add("are");
      else if (c === "r" && v === "e") fails.add("ere");
      else if (c === "r" && v === "o") add(["or", "e"], [req("or", 34, "the or sound"), req("o_e", 29, "silent e (o_e)")], "vce", "re");
      else add([v, c, "e"], [req(`${v}_e`, VCE_RUNG[v], `silent e (${v}_e)`), letter(c)], "vce", `${c}e`);
    }
    // Short vowel, closed syllable
    if (V_RUNG[first]) {
      const coda = rest.slice(1);
      if (coda === "") {
        fails.add("open");
        continue;
      }
      const c = SHORT_CODAS.get(coda) ?? (ctx.inner && coda === "v" ? { text: "v", parts: ["v"], reqs: [letter("v")] } : undefined);
      if (!c) continue;
      if (first === "a" && wLike(o.text) && !W_A_OK.has(coda)) {
        fails.add("w-vowel");
        continue;
      }
      add([first, ...c.parts], [vowel(first), ...c.reqs], "closed", coda);
    }
  }
  return out;
}

/* ------------------------------------------------------------------------- */
/* Words                                                                      */
/* ------------------------------------------------------------------------- */

const cache = new Map<string, WordAnalysis>();

export function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z']/g, "")
    .replace(/^'+|'+$/g, "");
}

const maxRung = (reqs: Requirement[]) => reqs.reduce((m, r) => Math.max(m, r.rung), 0);

function wholeParses(w: string, entry: LexEntry | undefined, fails: Set<Fail>): WordParse[] {
  const ctx: Ctx = { hardG: !!entry?.hardG, ow: entry?.ow };
  const out: WordParse[] = [];
  for (const s of parseSyllable(w, ctx, fails)) out.push({ rung: maxRung(s.reqs), parts: s.parts, reqs: s.reqs, base: w, kind: "syllable" });

  // Two syllables (rung 40)
  const splits: [string, string, boolean][] = entry?.syl
    ? [[entry.syl[0], entry.syl[1], true]]
    : Array.from({ length: Math.max(0, w.length - 1) }, (_, k) => [w.slice(0, k + 1), w.slice(k + 1), false] as [string, string, boolean]).filter(
        ([a, b]) => /[aeiou]/.test(a) && /[aeiou]/.test(b),
      );
  for (const [a, b, curated] of splits) {
    const sink = new Set<Fail>();
    const left = parseSyllable(a, { ...ctx, inner: true }, sink);
    const right = parseSyllable(b, { ...ctx, prev: a[a.length - 1] }, sink);
    const okType = (s: Syl, half: string) =>
      s.type === "closed" || s.type === "r" || (curated && isWholeWord(half));
    for (const L of left) {
      if (!okType(L, a)) continue;
      for (const R of right) {
        if (!okType(R, b)) continue;
        if (!curated) {
          const junction = R.onset !== "" || CLOSED_ONLY.has(L.coda) || (L.type === "r" && L.coda === "");
          if (!junction || (L.type === "r" && R.onset === "")) continue;
        }
        const reqs = [...L.reqs, ...R.reqs, TWO];
        out.push({ rung: maxRung(reqs), parts: [...L.parts, ...R.parts], reqs, base: w, kind: "two" });
      }
    }
  }
  return out;
}

/** A curated compound half must itself be a decodable lexicon word (cup|cake, rain|bow). */
function isWholeWord(half: string): boolean {
  const e = lexEntry(half);
  if (!e || e.irregular) return false;
  return parseSyllable(half, { hardG: !!e.hardG, ow: e.ow }, new Set()).length > 0;
}

function suffixParses(w: string): WordParse[] {
  const out: WordParse[] = [];
  const withBase = (base: string, extraParts: (p: string[]) => string[], extra: Requirement[], allowTwo = true) => {
    if (base.length < 2) return;
    const a = analyzeInner(base, false);
    for (const p of a.parses) {
      if (!allowTwo && p.kind === "two") continue;
      const reqs = [...p.reqs, ...extra];
      out.push({ rung: maxRung(reqs), parts: extraParts(p.parts), reqs, base: p.base, kind: "suffix" });
    }
  };
  const S = req("-s", 7, "the ending -s");
  const ES = req("-es", 7, "the ending -es");
  const ED = req("-ed", 39, "the ending -ed");
  const ING = req("-ing", 39, "the ending -ing");

  if (w.endsWith("'s")) withBase(w.slice(0, -2), (p) => [...p, "'s"], [req("'s", 7, "the ending 's")]);
  if (w.endsWith("n't")) withBase(w === "can't" ? "can" : w.slice(0, -3), (p) => [...p, "'t"], [req("n't", 18, "the ending n't")], false);
  if (/(s|x|z|sh|ch)es$/.test(w)) withBase(w.slice(0, -2), (p) => [...p, "es"], [ES]);
  if (/[^s']s$/.test(w) && !/(s|x|z|sh|ch)$/.test(w.slice(0, -1))) withBase(w.slice(0, -1), (p) => [...p, "s"], [S]);

  const cvc = (base: string) => {
    const a = analyzeInner(base, false);
    return a.parses.some((p) => p.kind === "syllable" && p.reqs.some((r) => V_RUNG[r.key]) && /[aeiou][bdgmnprt]$/.test(base) && !/(ee|ea|ai|oa|oo|ou|oi)[a-z]$/.test(base));
  };
  for (const [suf, R] of [["ed", ED], ["ing", ING]] as const) {
    if (!w.endsWith(suf) || w.length < suf.length + 2) continue;
    const stem = w.slice(0, -suf.length);
    // jumped, landed, playing (not hoped from hop: that needs hopped)
    if (!cvc(stem)) withBase(stem, (p) => [...p, suf], [R], false);
    // hopped, sitting
    if (/([bdgmnprt])\1$/.test(stem) && cvc(stem.slice(0, -1))) withBase(stem.slice(0, -1), (p) => [...p.slice(0, -1), p[p.length - 1] + p[p.length - 1], suf], [R], false);
    // baked, hoped, freed: the base keeps its e (bake + d)
    if (suf === "ed") withBase(w.slice(0, -1), (p) => (p[p.length - 1] === "e" ? [...p.slice(0, -1), "ed"] : [...p, "d"]), [R], false);
    // baking, shining: the e drops before -ing
    if (suf === "ing" && !stem.endsWith("e")) withBase(`${stem}e`, (p) => (p[p.length - 1] === "e" ? [...p.slice(0, -1), "ing"] : [...p, "ing"]), [R], false);
  }
  return out;
}

function analyzeInner(w: string, allowSuffix: boolean): WordAnalysis {
  const key = `${allowSuffix ? 1 : 0}:${w}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const entry = lexEntry(w);
  const fails = new Set<Fail>();
  let parses: WordParse[] = [];
  if (!entry?.irregular && /^[a-z']+$/.test(w)) {
    if (!w.includes("'")) parses = wholeParses(w, entry, fails);
    if (allowSuffix) parses.push(...suffixParses(w));
  }
  parses.sort((a, b) => a.rung - b.rung || order(a.kind) - order(b.kind));
  const best = parses[0];
  const result: WordAnalysis = {
    word: w,
    rung: best ? best.rung : null,
    graphemes: best ? best.parts : fallbackParts(w),
    parses,
    reason: best ? undefined : whyNot(w, entry, fails),
  };
  cache.set(key, result);
  return result;
}

const order = (k: WordParse["kind"]) => (k === "syllable" ? 0 : k === "suffix" ? 1 : 2);

/** Full analysis of a word: every parse, the lowest rung, and the parts for sounding out. */
export function analyzeWord(raw: string): WordAnalysis {
  const w = normalizeWord(raw);
  if (!w) return { word: "", rung: null, graphemes: [], parses: [], reason: "is not a word" };
  return analyzeInner(w, true);
}

/** Lowest rung at which the word decodes, or null. */
export function decodeRung(word: string): number | null {
  return analyzeWord(word).rung;
}

export function decode(word: string, rung: number): DecodeResult {
  const a = analyzeWord(word);
  if (a.rung === null) return { ok: false, graphemes: a.graphemes, reason: a.reason };
  if (a.rung <= rung) return { ok: true, graphemes: a.graphemes };
  const best = a.parses[0];
  const top = best.reqs.reduce((m, r) => (r.rung > m.rung ? r : m), best.reqs[0]);
  return { ok: false, graphemes: a.graphemes, reason: `uses ${top.label}, taught at rung ${top.rung}` };
}

export function isDecodable(word: string, rung: number): boolean {
  return decode(word, rung).ok;
}

/* ------------------------------------------------------------------------- */
/* Reasons and fallback parts                                                 */
/* ------------------------------------------------------------------------- */

const UNTAUGHT = ["eigh", "igh", "tion", "dge", "ph", "kn", "wr", "gn", "mb", "gh", "aw", "au", "ew", "ie", "ei", "ue", "ui", "ey", "oe"];

function whyNot(w: string, entry: LexEntry | undefined, fails: Set<Fail>): string {
  if (entry?.irregular) return "is spelled irregularly, so it is learned by sight, not sounded out";
  if (w.includes("'")) return "is a contraction this ladder does not teach";
  for (const u of UNTAUGHT) if (w.includes(u)) return `uses the spelling ${u}, which this ladder does not teach`;
  if (fails.has("soft-c") || /c[eiy]/.test(w)) return "uses a soft c (c before e, i or y), which this ladder does not teach";
  if (fails.has("soft-g")) return "uses a soft g (g before e, i or y), which this ladder does not teach";
  if (fails.has("w-vowel")) return "has a vowel changed by the w before it, so it is not sounded out";
  if (fails.has("old")) return "has a long o before ld or lt, which this ladder does not teach";
  if (fails.has("are")) return "uses the are sound, which this ladder does not teach";
  if (/[^aeiou]le$/.test(w)) return "uses a -le ending, which this ladder does not teach";
  if (fails.has("y-vowel") || /[^aeiou]y$/.test(w)) return "uses y as a vowel, which this ladder does not teach";
  const groups = w.replace(/e$/, "").match(/[aeiou]+/g)?.length ?? 0;
  if (groups >= 3) return "has more than two syllables";
  if (fails.has("open") || fails.has("ere")) return "ends in a vowel that says its name, which this ladder teaches only as sight words";
  return "does not follow the spelling patterns on this ladder";
}

const MULTI = [
  "tch", "igh", "dge", "qu", "ck", "ll", "ss", "ff", "zz", "sh", "ch", "th", "wh", "ph", "ng", "nk", "kn", "wr",
  "ee", "ea", "ai", "ay", "oa", "ow", "oo", "ou", "oi", "oy", "ar", "or", "er", "ir", "ur", "aw", "au", "ew", "ie", "ue", "ey",
];

/** Greedy grapheme split for words the decoder cannot parse, keeping a final silent e apart. */
export function fallbackParts(w: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < w.length) {
    const m = MULTI.find((g) => w.startsWith(g, i));
    if (m) {
      out.push(m);
      i += m.length;
    } else {
      out.push(w[i]);
      i++;
    }
  }
  return out;
}
