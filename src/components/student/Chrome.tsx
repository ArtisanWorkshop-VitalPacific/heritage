"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { stopSpeaking } from "@/lib/speech";
import { IconChevronLeft, IconX } from "@/components/icons";
import { cx } from "./util";

/** Back to the child's home. Every student page except home carries one. */
export function BackToToday({ label = "Today" }: { label?: string }) {
  return (
    <Link href="/app/student" className="st-back">
      <IconChevronLeft size={22} />
      <span>{label}</span>
    </Link>
  );
}

/** A floating glass bar at the foot of the screen that holds the one primary action. */
export function Dock({ children, className, tone = "glass" }: { children: ReactNode; className?: string; tone?: "glass" | "navy" }) {
  return (
    <div className={cx("st-dock", className)}>
      <div className={cx("st-dock-bar", tone === "navy" ? "glass-navy" : "glass glass-strong glass-lg")}>{children}</div>
    </div>
  );
}

export interface StepInfo {
  id: string;
  label: string;
}

/** The slim lesson progress bar: one segment per step, the current label spelled out. */
export function StepBar({ steps, current, end }: { steps: StepInfo[]; current: number; end?: ReactNode }) {
  return (
    <div className="st-stepbar glass glass-strong">
      <nav className="st-steps" aria-label="Lesson steps">
        <ol>
          {steps.map((s, i) => (
            <li key={s.id} data-state={i < current ? "done" : i === current ? "current" : "todo"} aria-current={i === current ? "step" : undefined}>
              <span className="st-steps-seg" aria-hidden />
              <span className="st-steps-label">{s.label}</span>
            </li>
          ))}
        </ol>
      </nav>
      <p className="st-steps-now" aria-hidden>
        <span className="num">
          {current + 1} of {steps.length}
        </span>
        <span className="st-steps-name">{steps[current]?.label}</span>
      </p>
      {end}
    </div>
  );
}

/** A quiet close control with a confirm, for leaving a lesson or the placement part-way. */
export function LeaveControl({ what }: { what: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  return (
    <div className="st-leave">
      {asking ? (
        <div className="st-leave-confirm" role="group" aria-label={`Leave the ${what}`}>
          <span>Leave the {what}?</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsking(false)}>
            Stay
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              stopSpeaking();
              router.push("/app/student");
            }}
          >
            Leave
          </button>
        </div>
      ) : (
        <button type="button" className="st-leave-btn" onClick={() => setAsking(true)} aria-label={`Leave the ${what}`}>
          <IconX size={22} />
        </button>
      )}
    </div>
  );
}
