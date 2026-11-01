"use client";

import Link from "next/link";
import { Illustration } from "@/components/Illustration";

const STORE_KEY = "hr:demo:v1";

/** Clears the demo data in this browser and reloads the app with the starting families. */
export function resetDemoStorage() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    // Storage can be unavailable (private mode). A reload still recovers.
  }
  window.location.assign("/app");
}

interface RecoveryPanelProps {
  title: string;
  body: string;
  /** Shown for runtime errors: try the segment again. */
  onRetry?: () => void;
  /** Offer to clear demo data (runtime errors inside the app). */
  offerReset?: boolean;
  illustrationId?: string;
}

/** Quiet full-page panel for errors and missing pages. Light, centered, one engraving. */
export function RecoveryPanel({ title, body, onRetry, offerReset, illustrationId = "wren" }: RecoveryPanelProps) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "var(--parchment)",
        color: "var(--ink)",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center", display: "grid", gap: 20, justifyItems: "center" }}>
        <Illustration id={illustrationId} alt="" style={{ width: 168 }} priority />
        <h1 className="display" style={{ fontSize: "var(--text-3xl)", margin: 0 }}>
          {title}
        </h1>
        <p className="lede" style={{ margin: 0, color: "var(--ink-2)" }}>
          {body}
        </p>
        <div className="cluster" style={{ justifyContent: "center", gap: 12, marginTop: 8 }}>
          {onRetry ? (
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              Try again
            </button>
          ) : (
            <Link className="btn btn-primary" href="/">
              Home
            </Link>
          )}
          {offerReset ? (
            <button type="button" className="btn btn-secondary" onClick={resetDemoStorage}>
              Reset demo
            </button>
          ) : (
            <Link className="btn btn-secondary" href="/app">
              Open the app
            </Link>
          )}
        </div>
        {offerReset ? (
          <p className="muted" style={{ fontSize: "var(--text-sm)", margin: 0 }}>
            Reset restores the starting families and clears changes made in this browser.
          </p>
        ) : null}
      </div>
    </main>
  );
}
