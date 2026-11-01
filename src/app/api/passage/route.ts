import type { ModelMessage } from "ai";
import type { Passage } from "@/lib/types";
import { getRung, passageFor, sightThrough, validatePassage, type Violation } from "@/lib/ladder";
import { bankFor, namesFor, newWordsAt, topicWordsFor } from "@/lib/ladder/bank";
import { callGateway, gatewayConfigured } from "../tutor/gateway";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST {rung, childName?, interests?} -> { passage, source, violations, attempts }.
 * Generates a decodable passage on one of the child's interests through the gateway,
 * validates every word, retries up to three times with the violations fed back, and
 * falls back to the corpus passage. Nothing unvalidated is returned. Never throws.
 */

interface Body {
  rung?: number;
  childName?: string;
  interests?: string[];
}

const MAX_ATTEMPTS = 3;
const BUDGET_MS = 17_000;

export async function POST(req: Request): Promise<Response> {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    /* empty body is fine */
  }
  const rung = Math.max(1, Math.min(40, Math.round(Number(body?.rung)) || 6));
  const fallback = passageFor(rung)!;
  const corpus = (violations: Violation[], attempts: number) =>
    Response.json({ passage: fallback, source: "corpus", violations, attempts }, { headers: { "cache-control": "no-store" } });

  try {
    const childName = cleanName(body?.childName);
    const interests = Array.isArray(body?.interests)
      ? body.interests.filter((s): s is string => typeof s === "string").map((s) => s.replace(/[^\p{L} '-]/gu, "").trim().slice(0, 30)).filter(Boolean).slice(0, 6)
      : [];
    if (rung < 6 || !gatewayConfigured(req)) return corpus([], 0);

    const names = namesFor(rung).slice(-24);
    const allowedNames = childName ? [childName, ...names] : names;
    const instructions = passagePrompt(rung, childName, interests, names);
    const messages: ModelMessage[] = [{ role: "user", content: "Write the story now. Reply with the JSON only." }];
    const deadline = Date.now() + BUDGET_MS;
    let last: Violation[] = [];
    let attempts = 0;

    while (attempts < MAX_ATTEMPTS && Date.now() < deadline - 1500) {
      attempts++;
      const r = await callGateway(req, {
        instructions,
        messages,
        maxOutputTokens: 400,
        temperature: 0.8,
        attemptMs: 8000,
        budgetMs: Math.max(1000, deadline - Date.now()),
      });
      if (!r) break; // gateway refused or unreachable: fall back at once
      const parsed = parsePassage(r.text);
      if (!parsed) {
        last = [{ word: "(format)", reason: "the reply was not the requested JSON" }];
        messages.push({ role: "assistant", content: r.text.slice(0, 800) }, { role: "user", content: 'Reply with JSON only: {"title": "...", "sentences": ["...", "...", "...", "..."]}' });
        continue;
      }
      const v = validatePassage([parsed.title, ...parsed.sentences], rung, allowedNames);
      if (v.ok) {
        const text = [parsed.title, ...parsed.sentences].join(" ").toLowerCase();
        const cast = allowedNames.filter((n) => new RegExp(`\\b${n.toLowerCase()}('s)?\\b`).test(text));
        const passage: Passage = {
          id: `gen-${Date.now()}`,
          rung,
          title: parsed.title,
          sentences: parsed.sentences,
          illustration: fallback.illustration,
          cast,
        };
        return Response.json({ passage, source: "generated", violations: [], attempts }, { headers: { "cache-control": "no-store" } });
      }
      last = v.violations;
      const list = v.violations.slice(0, 12).map((x) => `"${x.word}" (${x.reason})`).join("; ");
      messages.push(
        { role: "assistant", content: JSON.stringify(parsed) },
        { role: "user", content: `These words are not allowed: ${list}. Write a new story that uses only words from the lists. Reply with the JSON only.` },
      );
    }
    return corpus(last, attempts);
  } catch {
    return corpus([], 0);
  }
}

function cleanName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const n = raw.replace(/[^\p{L}'-]/gu, "").slice(0, 20);
  return n ? n[0].toUpperCase() + n.slice(1) : "";
}

function passagePrompt(rung: number, childName: string, interests: string[], names: string[]): string {
  const r = getRung(rung);
  const bank = bankFor(rung);
  const fresh = newWordsAt(rung);
  const topic = topicWordsFor(interests, rung);
  const sight = sightThrough(rung);
  const endings =
    rung >= 39
      ? "You may add -s, -ed or -ing to a verb from the list (jump, jumps, jumped, jumping; hop, hopped, hopping) and -s to a noun."
      : "You may add -s to a noun or a verb from the list (cat, cats; sit, sits). Do not add -ed or -ing.";
  return [
    "You write very short decodable stories for a young child who is learning to read with phonics.",
    'Reply with JSON only, no other text: {"title": "...", "sentences": ["...", "...", "...", "..."]}. Use 4 or 5 sentences.',
    "",
    "Rules:",
    "- Every word, including the title, must come from the WORD LIST, the SIGHT WORDS or the NAMES below. Do not use any other word, not even a small one.",
    `- ${endings}`,
    "- No numerals, no contractions, no hyphens. A name may take 's (Ned's hat).",
    "- Each sentence has 3 to 8 words. Warm, concrete and gentle, with a small beginning and end. Nothing scary or sad.",
    `- The story is about ${interests.length ? `one of the child's interests: ${interests.join(", ")}` : "animals, home or the garden"}. If the word list cannot tell that story, write about animals or home instead.`,
    childName ? `- Use the child's name, ${childName}, and you may add up to two names from NAMES.` : "- You may use up to two names from NAMES.",
    fresh.length ? `- Use some of today's new words if you can: ${fresh.slice(0, 30).join(", ")}.` : "",
    topic.length ? `- Words that fit the topic: ${topic.join(", ")}.` : "",
    "",
    `Rung ${rung}: ${r.title}.`,
    `WORD LIST: ${bank.join(", ")}`,
    `SIGHT WORDS: ${sight.join(", ")}`,
    `NAMES: ${[childName, ...names].filter(Boolean).join(", ")}`,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
}

function parsePassage(text: string): { title: string; sentences: string[] } | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as { title?: unknown; sentences?: unknown };
    if (typeof j.title !== "string" || !Array.isArray(j.sentences)) return null;
    const sentences = j.sentences
      .map((s) => (typeof s === "string" ? s : typeof s === "object" && s && Array.isArray((s as { words?: unknown }).words) ? ((s as { words: string[] }).words.join(" ") + ".") : ""))
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (sentences.length < 4) return null;
    const title = j.title.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!title) return null;
    return { title, sentences: sentences.slice(0, 5) };
  } catch {
    return null;
  }
}
