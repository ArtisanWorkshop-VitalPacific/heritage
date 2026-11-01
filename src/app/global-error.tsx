"use client";

// Replaces the root layout when it fails, so it carries its own document and styles.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  const reset = () => {
    try {
      localStorage.removeItem("hr:demo:v1");
    } catch {
      // ignore
    }
    window.location.assign("/app");
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#efe6d2",
          color: "#1a1714",
          fontFamily: 'Georgia, "Times New Roman", serif',
          padding: 24,
          textAlign: "center",
        }}
      >
        <title>Heritage Readers</title>
        <div style={{ maxWidth: 480, display: "grid", gap: 16 }}>
          <h1 style={{ fontWeight: 400, fontSize: 36, margin: 0 }}>Heritage Readers did not load.</h1>
          <p style={{ fontSize: 18, lineHeight: 1.5, margin: 0, color: "#3a342d" }}>Try again. If it happens twice, reset the demo.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>
            <button
              type="button"
              onClick={retry}
              style={{ font: "600 16px -apple-system, system-ui, sans-serif", padding: "12px 22px", borderRadius: 999, border: 0, background: "#1f3a5f", color: "#fff", cursor: "pointer" }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={reset}
              style={{ font: "600 16px -apple-system, system-ui, sans-serif", padding: "12px 22px", borderRadius: 999, border: "1px solid #d8cbb2", background: "#f7f1e4", color: "#1a1714", cursor: "pointer" }}
            >
              Reset demo
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
