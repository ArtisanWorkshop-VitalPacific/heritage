import { generateText } from "ai";
import { synthesize } from "@/lib/eleven";

export const dynamic = "force-dynamic";

/**
 * Reports which tutor and voice paths are live.
 * GET /api/health          -> configuration only
 * GET /api/health?probe=1  -> also tries a tiny gateway call and reports the model that answered
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tts = process.env.ELEVENLABS_API_KEY ? "elevenlabs" : "browser";
  const hasGatewayAuth = Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || req.headers.get("x-vercel-oidc-token"));
  const body: Record<string, unknown> = {
    ok: true,
    tts,
    tutor: hasGatewayAuth ? "gateway" : "script",
    models: tutorModels(),
    time: new Date().toISOString(),
  };

  // ?probe=1 also speaks one word with each narrator to show which voice and model answer.
  if (url.searchParams.get("probe") === "1" && process.env.ELEVENLABS_API_KEY) {
    const key = process.env.ELEVENLABS_API_KEY;
    const voice: Record<string, unknown> = {};
    for (const narrator of ["american", "british"]) {
      const started = Date.now();
      const r = await synthesize(key, "Ready.", narrator, "talk");
      if (r.ok) {
        await r.audio.cancel().catch(() => {});
        voice[narrator] = { ok: true, model: r.model, voice: r.voice, ms: Date.now() - started, skipped: r.failures.map((f) => `${f.model} ${f.voice} ${f.status}`) };
      } else {
        voice[narrator] = { ok: false, failures: r.failures.map((f) => ({ model: f.model, voice: f.voice, status: f.status, detail: f.detail.slice(0, 160) })) };
      }
    }
    body.voice = voice;
  }

  if (url.searchParams.get("probe") === "1") {
    const started = Date.now();
    for (const model of tutorModels()) {
      try {
        const { text } = await generateText({
          model,
          prompt: "Reply with the single word: ready",
          maxOutputTokens: 8,
          abortSignal: AbortSignal.timeout(8000),
        });
        body.probe = { ok: true, model, text: text.trim().slice(0, 40), ms: Date.now() - started };
        break;
      } catch (err) {
        body.probe = { ok: false, model, error: String((err as Error)?.message ?? err).slice(0, 300) };
      }
    }
    if (!(body.probe as { ok?: boolean })?.ok) body.tutor = "script";
  }

  return Response.json(body, { headers: { "cache-control": "no-store" } });
}

function tutorModels(): string[] {
  const env = process.env.TUTOR_MODEL?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  return [...env, "anthropic/claude-sonnet-5.5", "anthropic/claude-sonnet-5", "openai/gpt-6.1-sol"].filter((m, i, a) => a.indexOf(m) === i);
}
