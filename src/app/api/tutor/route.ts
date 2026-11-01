import type { TutorReply, TutorRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Stub: the engine agent replaces this with the gateway tutor and scripted fallback. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<TutorRequest>;
  const name = body.child?.name ?? "friend";
  const reply: TutorReply = { text: `Hello, ${name}. Let us read together.`, source: "script" };
  return Response.json(reply);
}
