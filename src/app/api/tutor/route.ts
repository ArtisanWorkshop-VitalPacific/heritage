import type { ModelMessage } from "ai";
import type { TutorReply, TutorRequest, TutorTurn } from "@/lib/types";
import { buildTutorSystemPrompt, capForBand, cleanSpoken, normalizeTutorRequest } from "@/lib/persona";
import { isSafetyMessage, scriptedReply } from "@/lib/tutor-script";
import { callGateway } from "./gateway";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST TutorRequest -> TutorReply.
 * Mrs. Wren through the AI Gateway when it answers, the scripted tutor otherwise.
 * Never throws; a billing or auth refusal falls back to the script immediately.
 */
export async function POST(req: Request): Promise<Response> {
  let tr: TutorRequest;
  try {
    tr = normalizeTutorRequest(await req.json());
  } catch {
    tr = normalizeTutorRequest({});
  }

  const script = (): Response => {
    let text = "Let us read together. Put your finger under the first word.";
    try {
      text = scriptedReply(tr);
    } catch {
      /* keep the safe default */
    }
    return Response.json({ text, source: "script" } satisfies TutorReply, { headers: { "cache-control": "no-store" } });
  };

  try {
    const lastChild = [...tr.messages].reverse().find((m) => m.role === "child")?.text ?? "";
    // Hurt, scared, unsafe or sad: always the fixed, gentle reply. No model, no probing.
    if (isSafetyMessage(lastChild)) return script();

    const result = await callGateway(req, {
      instructions: buildTutorSystemPrompt(tr),
      messages: toModelMessages(tr.messages),
      maxOutputTokens: 200,
      temperature: 0.7,
      attemptMs: 7000,
      budgetMs: 8500,
    });
    if (!result) return script();

    const text = capForBand(cleanSpoken(result.text), tr.child.band);
    if (!text || /\bwrong\b/i.test(text) || /https?:|www\./i.test(text)) return script();
    return Response.json({ text, source: "gateway", model: result.model } satisfies TutorReply, { headers: { "cache-control": "no-store" } });
  } catch {
    return script();
  }
}

/** Last 12 turns as alternating user/assistant messages, starting and ending with the child. */
function toModelMessages(turns: TutorTurn[]): ModelMessage[] {
  const recent = turns.slice(-12);
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const t of recent) {
    const role = t.role === "tutor" ? "assistant" : "user";
    const text = t.text.trim();
    if (!text) continue;
    const prev = out[out.length - 1];
    if (prev && prev.role === role) prev.content = `${prev.content}\n${text}`;
    else out.push({ role, content: text });
  }
  if (!out.length || out[0].role !== "user") out.unshift({ role: "user", content: "(The child has opened the lesson and is listening.)" });
  if (out[out.length - 1].role !== "user") out.push({ role: "user", content: "(The child is listening. Say one short, helpful thing.)" });
  return out;
}
