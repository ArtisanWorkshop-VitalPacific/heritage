import { generateText, type ModelMessage } from "ai";

/**
 * Shared Vercel AI Gateway access for /api/tutor and /api/passage.
 * - Tries TUTOR_MODEL (comma-separated) then the default list, remembering the first
 *   model that answers.
 * - An auth or billing refusal ends the attempt at once (no other model will fare
 *   better) and the gateway is skipped for a while, so callers fall back to the
 *   scripted tutor or the corpus in well under a second.
 */

const DEFAULT_MODELS = ["anthropic/claude-sonnet-5.5", "anthropic/claude-sonnet-5", "openai/gpt-6.1-sol"];

let workingModel: string | null = null;
let skipUntil = 0;
let lastError = "";

const FATAL = /credit card|billing|payment required|insufficient (funds|credit|balance)|quota|unauthori[sz]ed|forbidden|authentication|api key|oidc|invalid token|token (is )?(missing|expired|invalid)|permission denied|\b401\b|\b402\b|\b403\b/i;
const FATAL_PAUSE_MS = 5 * 60_000;
const ALL_FAILED_PAUSE_MS = 30_000;

export function tutorModels(): string[] {
  const env = process.env.TUTOR_MODEL?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const list = [...env, ...DEFAULT_MODELS].filter((m, i, a) => a.indexOf(m) === i);
  if (workingModel && list.includes(workingModel)) return [workingModel, ...list.filter((m) => m !== workingModel)];
  return list;
}

/** True when some gateway credential is present (local key or Vercel OIDC). */
export function gatewayConfigured(req?: Request): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || req?.headers.get("x-vercel-oidc-token"));
}

export function gatewayStatus(): { skipping: boolean; lastError: string; model: string | null } {
  return { skipping: Date.now() < skipUntil, lastError, model: workingModel };
}

function errorText(err: unknown): string {
  const e = err as { message?: string; statusCode?: number; responseBody?: string; cause?: { message?: string } };
  return [e?.statusCode ? String(e.statusCode) : "", e?.message ?? String(err), e?.responseBody ?? "", e?.cause?.message ?? ""].join(" ").slice(0, 500);
}

export interface GatewayCall {
  instructions: string;
  messages: ModelMessage[];
  maxOutputTokens: number;
  temperature: number;
  /** Per-model attempt limit. */
  attemptMs: number;
  /** Whole call limit across models. */
  budgetMs: number;
}

export async function callGateway(req: Request | undefined, call: GatewayCall): Promise<{ text: string; model: string } | null> {
  if (!gatewayConfigured(req) || Date.now() < skipUntil) return null;
  const deadline = Date.now() + call.budgetMs;
  for (const model of tutorModels()) {
    const remaining = deadline - Date.now();
    if (remaining < 600) break;
    try {
      const { text } = await generateText({
        model,
        instructions: call.instructions,
        messages: call.messages,
        maxOutputTokens: call.maxOutputTokens,
        temperature: call.temperature,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(Math.min(call.attemptMs, remaining)),
      });
      if (text && text.trim()) {
        workingModel = model;
        lastError = "";
        return { text, model };
      }
    } catch (err) {
      lastError = errorText(err);
      if (workingModel === model) workingModel = null;
      if (FATAL.test(lastError)) {
        skipUntil = Date.now() + FATAL_PAUSE_MS;
        return null;
      }
    }
  }
  skipUntil = Date.now() + ALL_FAILED_PAUSE_MS;
  return null;
}
