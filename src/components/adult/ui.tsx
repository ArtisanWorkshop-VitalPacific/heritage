"use client";

/**
 * Shared pieces for the grown-up surfaces: page head, tiles, meters, the 40-rung track,
 * toast, dialog and empty state. Styles live in src/styles/app.css (ap- prefix).
 */

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { LadderState } from "@/lib/types";
import { MAX_RUNG } from "@/lib/ladder";
import { IconX } from "@/components/icons";

/* ---------- Page head ---------- */

export function PageHead({
  eyebrow,
  title,
  sub,
  actions,
  titleId,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  titleId?: string;
}) {
  return (
    <header className="ap-head">
      <div className="ap-head-text min-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="ap-title" id={titleId}>
          {title}
        </h1>
        {sub && <p className="ap-sub">{sub}</p>}
      </div>
      {actions && <div className="ap-head-actions">{actions}</div>}
    </header>
  );
}

/* ---------- Section ---------- */

export function Section({
  id,
  title,
  sub,
  actions,
  children,
  className,
}: {
  id?: string;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const autoId = useId();
  const headingId = `${id ?? autoId}-h`;
  return (
    <section id={id} className={["ap-section", className].filter(Boolean).join(" ")} aria-labelledby={headingId}>
      <div className="ap-section-head">
        <div className="min-0">
          <h2 id={headingId} className="ap-h2">
            {title}
          </h2>
          {sub && <p className="ap-section-sub">{sub}</p>}
        </div>
        {actions && <div className="ap-section-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/* ---------- Tiles and meters ---------- */

export function Tile({
  label,
  value,
  unit,
  note,
  children,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  note?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={["ap-tile", className].filter(Boolean).join(" ")}>
      <p className="ap-tile-label">{label}</p>
      <p className="ap-tile-value">
        {value}
        {unit && <span className="ap-tile-unit">{unit}</span>}
      </p>
      {children}
      {note && <p className="ap-tile-note">{note}</p>}
    </div>
  );
}

export function Meter({
  value,
  max,
  label,
  tone = "accent",
  size = "md",
}: {
  value: number;
  max: number;
  label: string;
  tone?: "accent" | "mastered" | "review" | "ink";
  size?: "sm" | "md";
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div
      className={`ap-meter ap-meter-${tone} ap-meter-${size}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <span className="ap-meter-fill" style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

/** The 40 rungs as one slim track: mastered, current, and the rungs ahead. */
export function RungTrack({ ladder, label }: { ladder: LadderState; label?: string }) {
  const mastered = new Set(ladder.mastered);
  return (
    <div
      className="ap-track"
      role="img"
      aria-label={label ?? `${ladder.mastered.length} of ${MAX_RUNG} rungs mastered. Working on rung ${ladder.rung}.`}
    >
      {Array.from({ length: MAX_RUNG }, (_, i) => {
        const n = i + 1;
        const state = n === ladder.rung ? "current" : mastered.has(n) ? "mastered" : "ahead";
        return <span key={n} className="ap-track-seg" data-state={state} />;
      })}
    </div>
  );
}

/* ---------- Toast ---------- */

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = useCallback((m: string) => {
    setMsg(m);
    setKey((k) => k + 1);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 3600);
  }, []);
  const node = (
    <>
      <div className="visually-hidden" role="status" aria-live="polite">
        {msg ?? ""}
      </div>
      {msg && (
        <div key={key} className="toast glass glass-strong glass-lg ap-toast" aria-hidden>
          {msg}
        </div>
      )}
    </>
  );
  return { show, node };
}

/* ---------- Dialog ---------- */

export function Dialog({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  variant = "center",
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "center" | "drawer";
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const autoId = useId();
  const titleId = labelledBy ?? `${autoId}-t`;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      try {
        d.showModal();
      } catch {
        d.setAttribute("open", "");
      }
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`ap-dialog ap-dialog-${variant} glass glass-strong glass-lg`}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop (the dialog box itself, outside the panel) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="ap-dialog-panel">
          <div className="ap-dialog-head">
            <div className="min-0">
              <h2 id={titleId} className="ap-dialog-title">
                {title}
              </h2>
              {sub && <p className="ap-dialog-sub">{sub}</p>}
            </div>
            <button type="button" className="btn btn-ghost btn-icon ap-dialog-close" onClick={onClose} aria-label="Close">
              <IconX size={20} />
            </button>
          </div>
          <div className="ap-dialog-body">{children}</div>
          {footer && <div className="ap-dialog-foot">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/* ---------- Empty state ---------- */

export function Empty({ title, body, action }: { title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ap-empty">
      <p className="ap-empty-title">{title}</p>
      {body && <p className="ap-empty-body">{body}</p>}
      {action && <div className="ap-empty-action">{action}</div>}
    </div>
  );
}

/* ---------- Small helpers ---------- */

/** A checkmark or an empty mark, with text for screen readers. */
export function Allowed({ yes, label }: { yes: boolean; label?: string }) {
  return yes ? (
    <span className="ap-yes" aria-label={label ?? "Allowed"} role="img">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    </span>
  ) : (
    <span className="ap-no" aria-label={label ?? "Not allowed"} role="img" />
  );
}
