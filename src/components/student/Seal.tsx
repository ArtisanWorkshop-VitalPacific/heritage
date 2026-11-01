"use client";

import { useId } from "react";
import { cx } from "./util";

/** Splits a long label into two balanced lines: "v y z qu x" -> ["v y z", "qu x"]. */
function labelLines(label: string): string[] {
  if (label.length <= 6) return [label];
  const words = label.split(/\s+/);
  if (words.length < 2) return [label];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ").length;
    const b = words.slice(i).join(" ").length;
    if (Math.abs(a - b) < bestDiff) {
      bestDiff = Math.abs(a - b);
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

function labelSize(lines: string[]): number {
  const longest = Math.max(...lines.map((l) => l.length));
  if (lines.length > 1) return longest <= 5 ? 14 : longest <= 7 ? 12 : 10.5;
  if (longest <= 1) return 30;
  if (longest <= 3) return 24;
  if (longest <= 5) return 18;
  return 14;
}

const SUN = Array.from({ length: 60 }, (_, i) => {
  const a = (i * 6 * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x1: 60 + 29.5 * c, y1: 60 + 29.5 * s, x2: 60 + 36.5 * c, y2: 60 + 36.5 * s };
});

export interface SealProps {
  n: number;
  short: string;
  size?: number;
  /** Plays the mastery moment: the ring draws in and the label settles. Used once in the product. */
  animate?: boolean;
  /** A small version for lists: rings and label only. */
  mini?: boolean;
  className?: string;
  title?: string;
}

/**
 * An engraved seal for a mastered rung: hunter-green line work on page cream,
 * a beaded border, the words around the band, a sunburst field and the rung's label in the book serif.
 */
export function Seal({ n, short, size = 96, animate, mini, className, title }: SealProps) {
  const uid = useId().replace(/:/g, "");
  const lines = labelLines(short);
  const fs = labelSize(lines);
  const label = title ?? `Seal for rung ${n}, ${short}`;

  if (mini) {
    const tiny = short.length <= 2 ? short : String(n);
    return (
      <svg viewBox="0 0 40 40" width={size} height={size} className={cx("st-seal st-seal-mini", className)} role="img" aria-label={label}>
        <circle cx="20" cy="20" r="18.5" className="st-seal-fill" />
        <circle cx="20" cy="20" r="18.5" fill="none" strokeWidth="1.4" />
        <circle cx="20" cy="20" r="15.6" fill="none" strokeWidth="1.6" strokeDasharray="0.01 2.6" strokeLinecap="round" />
        <circle cx="20" cy="20" r="12.8" fill="none" strokeWidth="0.8" />
        <text x="20" y="20" textAnchor="middle" dominantBaseline="central" className="st-seal-label" fontSize={tiny.length <= 1 ? 14 : 11}>
          {tiny}
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={cx("st-seal", animate && "st-seal-animate", className)}
      role="img"
      aria-label={label}
    >
      <defs>
        <path id={`${uid}-band`} d="M 15.5 60 a 44.5 44.5 0 1 1 89 0 a 44.5 44.5 0 1 1 -89 0" />
      </defs>
      <g className="st-seal-body">
        <circle cx="60" cy="60" r="57.5" className="st-seal-fill" />
        <circle cx="60" cy="60" r="57" fill="none" strokeWidth="1.6" className="st-seal-ring" pathLength={100} />
        <circle cx="60" cy="60" r="53.6" fill="none" strokeWidth="2.6" strokeDasharray="0.01 4.15" strokeLinecap="round" className="st-seal-beads" />
        <circle cx="60" cy="60" r="50.4" fill="none" strokeWidth="0.8" className="st-seal-fine" />
        <text className="st-seal-band" fontSize="7.1" letterSpacing="1.1">
          <textPath href={`#${uid}-band`} startOffset="0" textLength="276" lengthAdjust="spacing">
            {`HERITAGE READERS · RUNG ${n} · MASTERED · `}
          </textPath>
        </text>
        <circle cx="60" cy="60" r="38.6" fill="none" strokeWidth="1.2" className="st-seal-fine" />
        <g className="st-seal-sun" strokeWidth="0.55">
          {SUN.map((l, i) => (
            <line key={i} {...l} />
          ))}
        </g>
        <circle cx="60" cy="60" r="28.4" fill="none" strokeWidth="1" className="st-seal-fine" />
      </g>
      <text x="60" y="60" textAnchor="middle" className="st-seal-label" fontSize={fs}>
        {lines.length === 1 ? (
          <tspan x="60" dy="0.34em">
            {lines[0]}
          </tspan>
        ) : (
          <>
            <tspan x="60" dy="-0.22em">
              {lines[0]}
            </tspan>
            <tspan x="60" dy="1.08em">
              {lines[1]}
            </tspan>
          </>
        )}
      </text>
    </svg>
  );
}

/** The one mastery moment in the product: the seal is struck, then "Rung N mastered". */
export function MasteryMoment({ n, short, next }: { n: number; short: string; next?: string }) {
  return (
    <div className="st-mastery" role="status" aria-live="polite">
      <div className="st-mastery-seal">
        <Seal n={n} short={short} size={220} animate title={`Seal for rung ${n}`} />
      </div>
      <h2 className="st-mastery-title">Rung {n} mastered</h2>
      {next && <p className="st-mastery-next">{next}</p>}
    </div>
  );
}
