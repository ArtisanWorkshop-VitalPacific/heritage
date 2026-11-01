import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STRETCH_VERSION } from "@/lib/stretch-version";
import { GET } from "./route";

const RATE = 24000;
const sent: { url: string; body: { text: string; model_id: string } }[] = [];

/** Stands in for ElevenLabs: a recording of the text, a voiced tone per vowel letter, with per-letter timings. */
function record(text: string) {
  const spoken = [...text.replace(/\[[^\]]*\]\s*/g, "")];
  const samples: number[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  let seed = 3;
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (const c of spoken) {
    starts.push(samples.length / RATE);
    const vowel = /[aeiou]/i.test(c);
    const letter = /[a-z]/i.test(c);
    const n = Math.round((vowel ? 0.2 : 0.06) * RATE);
    for (let i = 0; i < n; i++) samples.push(vowel ? 0.5 * Math.sin((2 * Math.PI * 200 * i) / RATE) : letter ? 0.25 * noise() : 0);
    ends.push(samples.length / RATE);
  }
  for (let i = 0; i < 0.1 * RATE; i++) samples.push(0);
  const pcm = Int16Array.from(samples, (s) => Math.round(s * 32767));
  return {
    audio_base64: Buffer.from(pcm.buffer).toString("base64"),
    alignment: { characters: spoken, character_start_times_seconds: starts, character_end_times_seconds: ends },
  };
}

const get = (query: string, site = "same-origin") =>
  GET(new Request(`https://heritage.test/api/tts/word?${query}`, { headers: { "sec-fetch-site": site } }));

beforeEach(() => {
  sent.length = 0;
  vi.stubEnv("ELEVENLABS_API_KEY", "test-only");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      sent.push({ url, body });
      return Response.json(record(body.text));
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/tts/word", () => {
  it("records the word once with timings and returns it cut into its parts", async () => {
    const res = await get(`w=nut&n=american&v=${STRETCH_VERSION}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/wav");
    expect(res.headers.get("x-tts-model")).toBe("eleven_multilingual_v2");
    expect(res.headers.get("cdn-cache-control")).toContain("s-maxage");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIFF");
    // About three seconds of 24 kHz, 16-bit audio: the three parts and the word.
    expect(bytes.length).toBeGreaterThan(2.2 * RATE * 2);
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toContain("/with-timestamps?output_format=pcm_24000");
    expect(sent[0].body.model_id).toBe("eleven_multilingual_v2");
    expect(sent[0].body.text).toBe("nut.");
  });

  it("records a word with two readings in its lesson phrase", async () => {
    expect((await get(`w=read&n=american&v=${STRETCH_VERSION}`)).status).toBe(200);
    expect(sent[0].body.text).toBe("to read.");
  });

  it("generates each word once per voice, then serves the stored audio", async () => {
    const q = `w=bun&n=british&v=${STRETCH_VERSION}`;
    expect((await get(q)).headers.get("x-tts-source")).toBe("new");
    await new Promise((r) => setTimeout(r, 10));
    const again = await get(q, "cross-site");
    expect(again.status).toBe(200);
    expect(again.headers.get("x-tts-source")).toBe("stored");
    expect(sent).toHaveLength(1);
  });

  it("spends nothing on other sites, heart words, old versions or missing keys", async () => {
    expect((await get(`w=mat&n=american&v=${STRETCH_VERSION}`, "cross-site")).status).toBe(403);
    expect((await get(`w=the&n=american&v=${STRETCH_VERSION}`)).status).toBe(404);
    expect((await get(`w=mat&n=american&v=0`)).status).toBe(404);
    expect((await get(`w=m%20at&n=american&v=${STRETCH_VERSION}`)).status).toBe(404);
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    expect((await get(`w=mat&n=american&v=${STRETCH_VERSION}`)).status).toBe(204);
    expect(sent).toHaveLength(0);
  });
});
