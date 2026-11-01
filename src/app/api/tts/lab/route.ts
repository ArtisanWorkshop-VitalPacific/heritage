import { synthesizeRaw } from "@/lib/eleven";
import { arpabet, canStretch, stretchParts, type Narrator } from "@/lib/ladder/stretch";

export const dynamic = "force-dynamic";

/* Temporary: compares ways of speaking a stretched lesson word. Lesson words and fixed templates only. */

function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  return site === "same-origin";
}

const VOWEL = /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)1$/;

function arpaParts(word: string) {
  const codes = (arpabet(word) ?? "").split(" ");
  let at = codes.findIndex((c) => VOWEL.test(c));
  if (at < 0) return null;
  let from = at;
  if (codes[at] === "UW1" && codes[at - 1] === "Y") from = at - 1;
  return { onset: codes.slice(0, from).join(" "), vowel: codes.slice(from, at + 1).join(" "), rest: codes.slice(at + 1).join(" ") };
}

function build(t: string, word: string, narrator: Narrator): { model: string; body: Record<string, unknown> } | null {
  const p = stretchParts(word, narrator);
  if (!p) return null;
  const { onset, vowel, rest } = p;
  const chunks = (v: string, mark = "") => [onset ? mark + onset + v : "", mark + v, rest ? mark + v + rest : ""].filter(Boolean);
  const v4 = (text: string) => ({ model: "eleven_v4", body: { text, voice_settings: { stability: 0.5 } } });
  switch (t) {
    case "A":
      return v4(`[slowly] ${chunks(vowel).map((c) => `/${c}/`).join(", ")}... [warmly] ${word}.`);
    case "B":
      return v4(`[slowly] ${chunks(vowel, "ˈ").map((c) => `/${c}/`).join(", ")}... [warmly] ${word}.`);
    case "C": {
      const list = [onset ? onset + vowel : "", vowel + vowel + vowel, rest ? vowel + rest : ""].filter(Boolean);
      return v4(`[slowly] ${list.map((c) => `/${c}/`).join(", ")}... [warmly] ${word}.`);
    }
    case "D": {
      const settings = { stability: 0.7, similarity_boost: 0.8, style: 0, use_speaker_boost: true, speed: 0.8 };
      if (narrator === "british") {
        const tag = (ph: string, g: string) => `<phoneme alphabet="ipa" ph="${ph}">${g}</phoneme>`;
        const list = chunks(vowel).map((c, i) => tag(c, ["ba", "ah", "ab"][i] ?? "ah"));
        return { model: "eleven_flash_v2", body: { text: `${list.join(", ")}... ${word}.`, voice_settings: settings } };
      }
      const a = arpaParts(word);
      if (!a) return null;
      const tag = (ph: string, g: string) => `<phoneme alphabet="cmu-arpabet" ph="${ph}">${g}</phoneme>`;
      const list = [a.onset ? `${a.onset} ${a.vowel}` : "", a.vowel, a.rest ? `${a.vowel} ${a.rest}` : ""].filter(Boolean);
      return { model: "eleven_flash_v2", body: { text: `${list.map((c, i) => tag(c, ["ba", "ah", "ab"][i] ?? "ah")).join(", ")}... ${word}.`, voice_settings: settings } };
    }
    case "E":
      return v4(`[slowly] /${onset}${vowel}${vowel}${vowel}${rest}/... [warmly] ${word}.`);
    case "G":
    case "H":
    case "J": {
      // G: STRUT as schwa, British LOT as ɔ. H: STRUT as ɐ, British LOT as ɔ. J: a glottal stop closes the open parts.
      const sub = (x: string) =>
        t === "G" ? x.replace(/ʌ/g, "ə").replace(/ɒ/g, "ɔ") : t === "H" ? x.replace(/ʌ/g, "ɐ").replace(/ɒ/g, "ɔ") : x;
      const v = sub(vowel);
      const o = sub(onset);
      const r = sub(rest);
      const close = t === "J" ? "ʔ" : "";
      const list = [o ? o + v + close : "", v + close, r ? v + r : ""].filter(Boolean);
      return v4(`[slowly] ${list.map((c) => `/${c}/`).join(", ")}... [warmly] ${word}.`);
    }
    default:
      return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const word = (url.searchParams.get("w") ?? "").toLowerCase();
  const narrator: Narrator = url.searchParams.get("n") === "british" ? "british" : "american";
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || !sameOrigin(req) || !/^[a-z]{1,24}$/.test(word) || !canStretch(word)) return new Response(null, { status: 404 });
  const spec = build(url.searchParams.get("t") ?? "", word, narrator);
  if (!spec) return new Response(null, { status: 404 });
  const result = await synthesizeRaw(key, narrator, spec.model, spec.body);
  if (!result.ok) return Response.json({ failures: result.failures }, { status: 502 });
  return new Response(result.audio, {
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "no-store",
      "x-tts-model": result.model,
      "x-tts-voice": result.voice,
      "x-lab-text": encodeURIComponent(String(spec.body.text)),
    },
  });
}
