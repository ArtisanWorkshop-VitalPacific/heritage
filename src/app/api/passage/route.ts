import { passageFor } from "@/lib/ladder";

export const dynamic = "force-dynamic";

/** Stub: the engine agent replaces this with constrained generation plus validation. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { rung?: number };
  const p = passageFor(Number(body.rung) || 10);
  return Response.json({ passage: p, source: "corpus", violations: [] });
}
