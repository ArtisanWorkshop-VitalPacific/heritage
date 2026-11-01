import Link from "next/link";
import { Illustration } from "@/components/Illustration";

/** Stub: the site agent replaces this page. */
export default function Home() {
  return (
    <main className="container" style={{ paddingBlock: "72px", display: "grid", gap: 24, justifyItems: "center", textAlign: "center" }}>
      <Illustration id="hero" priority style={{ width: "min(900px, 100%)" }} />
      <h1 className="display" style={{ fontSize: "var(--text-5xl)" }}>Heritage Readers</h1>
      <p className="lede">The classical primer. Now it listens.</p>
      <Link href="/app" className="btn btn-primary btn-lg">Open the app</Link>
    </main>
  );
}
