import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STRETCH_VERSION } from "@/lib/stretch-version";
import { GET } from "./route";

const sent: { url: string; body: { text: string; model_id: string } }[] = [];
const MP3 = new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3]);

const get = (query: string, site = "same-origin") =>
  GET(new Request(`https://heritage.test/api/tts/word?${query}`, { headers: { "sec-fetch-site": site } }));

beforeEach(() => {
  sent.length = 0;
  vi.stubEnv("ELEVENLABS_API_KEY", "test-only");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      sent.push({ url, body: JSON.parse(String(init.body)) });
      return new Response(MP3.slice(), { headers: { "content-type": "audio/mpeg" } });
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/tts/word", () => {
  it("asks Eleven v4 for the held vowel in IPA, then the word", async () => {
    const res = await get(`w=nut&n=american&v=${STRETCH_VERSION}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(res.headers.get("x-tts-model")).toBe("eleven_v4");
    expect(res.headers.get("cdn-cache-control")).toContain("s-maxage");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(MP3);
    expect(sent).toHaveLength(1);
    expect(sent[0].body.model_id).toBe("eleven_v4");
    expect(sent[0].body.text).toBe("[slowly] /nʌ/, /ʌːː/, /ʌt/... [warmly] nut.");
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
