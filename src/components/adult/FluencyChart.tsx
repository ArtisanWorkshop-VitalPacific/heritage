"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Session } from "@/lib/types";
import { DAY, fmtDay, pct } from "./lib";

interface Props {
  sessions: Session[]; // timed sessions, oldest first
  norm: { wcpm: number; label: string };
  childName: string;
}

/**
 * Words correct per minute over time. One series (navy), a faint grid, a labeled norm line,
 * the last reading emphasized. Hover, touch or arrow keys read any point.
 */
export function FluencyChart({ sessions, norm, childName }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  const [active, setActive] = useState<number | null>(null);
  const descId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width;
      if (cw) setW(Math.max(260, Math.round(cw)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = w < 520;
  const h = narrow ? 220 : 270;
  const pad = { l: 34, r: narrow ? 30 : 40, t: 22, b: 30 };

  const geo = useMemo(() => {
    const pts = sessions.map((s) => ({ t: new Date(s.date).getTime(), v: s.wcpm, s }));
    const t0 = pts[0]?.t ?? 0;
    const t1 = pts[pts.length - 1]?.t ?? 1;
    const maxV = Math.max(norm.wcpm, ...pts.map((p) => p.v));
    const step = maxV > 90 ? 20 : 10;
    const yMax = Math.ceil((maxV * 1.1) / step) * step;
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;
    const x = (t: number) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * iw;
    const y = (v: number) => pad.t + (1 - v / yMax) * ih;
    const yTicks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);
    // Week ticks: every week on wide charts, every other week on narrow ones.
    const span = Math.max(1, Math.round((t1 - t0) / (7 * DAY)));
    const every = narrow ? (span > 6 ? 3 : 2) : span > 10 ? 2 : 1;
    const xTicks: number[] = [];
    for (let k = 0; k <= span; k += every) if (t0 + k * 7 * DAY <= t1 + DAY / 2) xTicks.push(t0 + k * 7 * DAY);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
    const area = pts.length
      ? `${line} L${x(pts[pts.length - 1].t).toFixed(1)},${y(0).toFixed(1)} L${x(pts[0].t).toFixed(1)},${y(0).toFixed(1)} Z`
      : "";
    return { pts, x, y, yTicks, xTicks, line, area, yMax };
  }, [sessions, norm.wcpm, w, h, pad.l, pad.r, pad.t, pad.b, narrow]);

  const { pts, x, y } = geo;
  const last = pts[pts.length - 1];
  const first = pts[0];
  const shown = active !== null ? pts[active] : null;

  const nearest = (clientX: number) => {
    const el = wrapRef.current;
    if (!el || !pts.length) return null;
    const rx = clientX - el.getBoundingClientRect().left;
    let best = 0;
    let bestD = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(x(p.t) - rx);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  const onMove = (e: PointerEvent) => setActive(nearest(e.clientX));
  const onKey = (e: KeyboardEvent) => {
    if (!pts.length) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setActive((a) => {
        const cur = a ?? pts.length - 1;
        return Math.max(0, Math.min(pts.length - 1, cur + (e.key === "ArrowRight" ? 1 : -1)));
      });
    } else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(pts.length - 1);
    else if (e.key === "Escape") setActive(null);
  };

  const normY = y(norm.wcpm);
  // Put the norm label at the end where the series is farthest from the line, on the far side of the data.
  const normSide = (() => {
    if (!first || !last) return { x: pad.l + 6, anchor: "start" as const, dy: -7 };
    const gapL = Math.abs(y(first.v) - normY);
    const gapR = Math.abs(y(last.v) - normY);
    const useRight = gapR >= gapL;
    const v = useRight ? last.v : first.v;
    return {
      x: useRight ? w - pad.r - 4 : pad.l + 6,
      anchor: useRight ? ("end" as const) : ("start" as const),
      dy: v > norm.wcpm ? 16 : -7,
    };
  })();
  const lastLabelAbove = last ? Math.abs(y(last.v) - normY) > 18 || y(last.v) < normY : true;
  const tipLeft = shown ? Math.min(Math.max(x(shown.t), 70), w - 70) : 0;

  return (
    <div
      ref={wrapRef}
      className="ap-chart"
      tabIndex={0}
      role="group"
      aria-roledescription="chart"
      aria-label={`Words correct per minute for ${childName}. Use the arrow keys to read each reading.`}
      aria-describedby={descId}
      onKeyDown={onKey}
      onFocus={() => setActive((a) => a ?? pts.length - 1)}
      onBlur={() => setActive(null)}
    >
      <p id={descId} className="visually-hidden">
        {first && last
          ? `${pts.length} timed readings from ${fmtDay(first.s.date)} to ${fmtDay(last.s.date)}. Fluency went from ${first.v} to ${last.v} words correct per minute. The ${norm.label} is ${norm.wcpm}.`
          : "No timed readings yet."}
      </p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        aria-hidden
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setActive(null)}
        style={{ touchAction: "pan-y" }}
      >
        {/* Grid and y ticks */}
        {geo.yTicks.map((v) => (
          <g key={v}>
            <line className="ap-chart-grid" x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} />
            <text className="ap-chart-tick" x={pad.l - 8} y={y(v)} dy="0.32em" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {/* X ticks */}
        {geo.xTicks.map((t) => (
          <text key={t} className="ap-chart-tick" x={x(t)} y={h - 8} textAnchor="middle">
            {fmtDay(t)}
          </text>
        ))}

        {/* Norm line */}
        <line className="ap-chart-norm" x1={pad.l} x2={w - pad.r} y1={normY} y2={normY} />
        <text className="ap-chart-normlabel" x={normSide.x} y={normY + normSide.dy} textAnchor={normSide.anchor}>
          {norm.label}: {norm.wcpm}
        </text>

        {/* Series */}
        <path className="ap-chart-area" d={geo.area} />
        <path className="ap-chart-line" d={geo.line} />

        {/* Crosshair */}
        {shown && (
          <g>
            <line className="ap-chart-cross" x1={x(shown.t)} x2={x(shown.t)} y1={pad.t - 6} y2={h - pad.b} />
            <circle className="ap-chart-dot" cx={x(shown.t)} cy={y(shown.v)} r={4.5} />
          </g>
        )}

        {/* Last reading, emphasized */}
        {last && (
          <g>
            <circle className="ap-chart-end" cx={x(last.t)} cy={y(last.v)} r={5.5} />
            <text
              className="ap-chart-endlabel"
              x={x(last.t)}
              y={y(last.v) + (lastLabelAbove ? -12 : 22)}
              textAnchor="middle"
            >
              {last.v}
            </text>
          </g>
        )}
      </svg>

      {shown && (
        <div
          className="ap-chart-tip glass glass-strong"
          data-below={y(shown.v) < 84 || undefined}
          style={{ left: tipLeft, top: (y(shown.v) / h) * 100 + "%" }}
          aria-live="polite"
        >
          <strong className="num">{shown.v}</strong>
          <span> words a minute</span>
          <span className="ap-chart-tip-meta">
            {fmtDay(shown.s.date)} · rung {shown.s.rung} · {pct(shown.s.accuracy)}
          </span>
        </div>
      )}
    </div>
  );
}
