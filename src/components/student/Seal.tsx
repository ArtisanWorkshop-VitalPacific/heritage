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

/* Geometry in the 120 by 120 viewBox. The words sit in a band 6.2 units deep with about 3.9 units
   of clear space on each side, between the fine ring and the inner ring. */
const C = 60;
const R = { outer: 57.8, beads: 55, fine: 52.2, inner: 37.4, label: 27.6 };
const TOP_BASELINE = 41.8; // the top words stand on this circle, capitals rising outward to 48
const BOTTOM_BASELINE = 48; // the bottom words hang from this circle, capitals rising inward to 41.8
const BAND_MIDDLE = 44.9;
const BAND_FONT = 8.6;
// Below this size the band words cannot be read, so the seal shows its rings and label only.
const WORDS_MIN_SIZE = 72;

/** A half circle from 9 o'clock to 3 o'clock: over the top (clockwise) or under the bottom. */
const halfCircle = (r: number, over: boolean) => `M ${C - r} ${C} A ${r} ${r} 0 0 ${over ? 1 : 0} ${C + r} ${C}`;

const SUN = Array.from({ length: 60 }, (_, i) => {
  const a = (i * 6 * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x1: C + 28.8 * c, y1: C + 28.8 * s, x2: C + 34.6 * c, y2: C + 34.6 * s };
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

  const words = size >= WORDS_MIN_SIZE;
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={cx("st-seal", animate && "st-seal-animate", className)}
      role="img"
      aria-label={label}
    >
      {words && (
        <defs>
          <path id={`${uid}-top`} d={halfCircle(TOP_BASELINE, true)} />
          <path id={`${uid}-bottom`} d={halfCircle(BOTTOM_BASELINE, false)} />
        </defs>
      )}
      <g className="st-seal-body">
        <circle cx={C} cy={C} r={R.outer + 0.5} className="st-seal-fill" />
        <circle cx={C} cy={C} r={R.outer} fill="none" strokeWidth="1.4" className="st-seal-ring" pathLength={100} />
        <circle cx={C} cy={C} r={R.beads} fill="none" strokeWidth="2.2" strokeDasharray="0.01 4.05" strokeLinecap="round" className="st-seal-beads" />
        <circle cx={C} cy={C} r={R.fine} fill="none" strokeWidth="0.7" className="st-seal-fine" />
        {words && (
          <g className="st-seal-band" fontSize={BAND_FONT} letterSpacing="0.9" textAnchor="middle">
            {/* Top words read along the top; bottom words read left to right, upright. */}
            <text>
              <textPath href={`#${uid}-top`} startOffset="50%">
                HERITAGE READERS
              </textPath>
            </text>
            <text>
              <textPath href={`#${uid}-bottom`} startOffset="50%">
                {`RUNG ${n} · MASTERED`}
              </textPath>
            </text>
            <circle cx={C - BAND_MIDDLE} cy={C} r="1.15" className="st-seal-dot" />
            <circle cx={C + BAND_MIDDLE} cy={C} r="1.15" className="st-seal-dot" />
          </g>
        )}
        <circle cx={C} cy={C} r={R.inner} fill="none" strokeWidth="1.1" className="st-seal-fine" />
        <g className="st-seal-sun" strokeWidth="0.55">
          {SUN.map((l, i) => (
            <line key={i} {...l} />
          ))}
        </g>
        <circle cx={C} cy={C} r={R.label} fill="none" strokeWidth="1" className="st-seal-fine" />
      </g>
      <text x={C} y={C} textAnchor="middle" className="st-seal-label" fontSize={fs}>
        {lines.length === 1 ? (
          <tspan x={C} dy="0.34em">
            {lines[0]}
          </tspan>
        ) : (
          <>
            <tspan x={C} dy="-0.22em">
              {lines[0]}
            </tspan>
            <tspan x={C} dy="1.08em">
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
