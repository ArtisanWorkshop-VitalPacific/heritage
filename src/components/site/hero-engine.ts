/** Pure helpers for the scroll-scrubbed hero. No DOM state lives here. */

export interface FrameSet {
  count: number;
  width: number;
  height: number;
  pattern: string;
}

export interface HeroFrameSets {
  sm: FrameSet;
  lg: FrameSet;
}

export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);

/** Smoothstep between edges a and b. */
export function ramp(a: number, b: number, v: number): number {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Draws a source into the whole canvas with object-fit: cover math and a focal point. */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  cw: number,
  ch: number,
  fx = 0.5,
  fy = 0.5,
) {
  if (!sw || !sh || !cw || !ch) return;
  const s = Math.max(cw / sw, ch / sh);
  const dw = sw * s;
  const dh = sh * s;
  const dx = (cw - dw) * fx;
  const dy = (ch - dh) * fy;
  ctx.drawImage(source, dx, dy, dw, dh);
}

/**
 * Small set under 820px wide, on a slow or data-saving connection, or when the drawn image
 * needs no more pixels than the small set has. Large otherwise.
 */
export function chooseFrameSet(sets: HeroFrameSets, boxW: number, boxH: number): FrameSet {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
  const conn = nav.connection;
  const slow = Boolean(conn && (conn.saveData || /(^|-)2g$|^3g$/.test(conn.effectiveType ?? "")));
  if (slow || window.innerWidth < 820) return sets.sm;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const aspect = sets.lg.width / sets.lg.height;
  const drawnWidth = Math.max(boxW, boxH * aspect) * dpr;
  return drawnWidth <= sets.sm.width * 1.1 ? sets.sm : sets.lg;
}

/** Coarse pass: every `step`th frame plus the last, so any scroll position has a near frame early. */
export function coarseOrder(count: number, step = 6): number[] {
  const out: number[] = [];
  for (let i = step; i < count; i += step) out.push(i);
  if (count > 1 && out[out.length - 1] !== count - 1) out.push(count - 1);
  return out;
}

/** Index of the loaded frame nearest to `target`, or -1. Ties prefer the earlier frame. */
export function nearestLoaded(ready: Uint8Array, target: number): number {
  const n = ready.length;
  if (target >= 0 && target < n && ready[target]) return target;
  for (let d = 1; d < n; d++) {
    const a = target - d;
    const b = target + d;
    if (a >= 0 && ready[a]) return a;
    if (b < n && ready[b]) return b;
  }
  return -1;
}
