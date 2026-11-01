import { getRung } from "@/lib/ladder";
import { NEXT_RUNG, SAMPLE, SAMPLE_RUNG } from "./sample";

/** Deterministic waveform bars. `gaps` adds the pauses of a slower reader. */
function Wave({ bars, seed, gaps }: { bars: number; seed: number; gaps: number[] }) {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return (
    <span className="s-wave" aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => {
        const pause = gaps.some((g) => Math.abs(i - g) <= 1);
        const h = pause ? 0.08 : 0.25 + rnd() * 0.75;
        return <i key={i} style={{ ["--h" as string]: h.toFixed(2) }} />;
      })}
    </span>
  );
}

/** Weekly words-correct-per-minute line, drawn in SVG. */
function FluencyChart() {
  const data = SAMPLE.weekly;
  const W = 320;
  const H = 112;
  const padX = 8;
  const padY = 14;
  const lo = 24;
  const hi = 50;
  const x = (i: number) => padX + (i * (W - padX * 2)) / (data.length - 1);
  const y = (v: number) => padY + ((hi - v) * (H - padY * 2)) / (hi - lo);
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`;
  const last = data.length - 1;
  return (
    <svg className="s-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Words correct per minute by week, from ${data[0]} in week 1 to ${data[last]} in week 8`}>
      {[30, 40].map((g) => (
        <line key={g} x1={0} x2={W} y1={y(g)} y2={y(g)} className="s-chart-grid" />
      ))}
      <path d={area} className="s-chart-area" />
      <path d={line} className="s-chart-line" />
      {data.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === last ? 4.5 : 2.4} className={i === last ? "s-chart-dot-now" : "s-chart-dot"} />
      ))}
    </svg>
  );
}

/** The parent report: three numbers, the fluency line, the same passage in week 1 and week 8. */
export function ParentReport() {
  const bench = getRung(6).passage;
  return (
    <figure className="s-report glass glass-strong glass-lg" aria-label="Sample parent report for Nora, age 6, week 8">
      <div className="s-report-head">
        <div>
          <p className="s-card-kicker">Weekly report</p>
          <p className="s-report-name">
            {SAMPLE.child}, age {SAMPLE.age}
          </p>
        </div>
        <span className="s-tag">Week 8</span>
      </div>

      <dl className="s-report-stats">
        <div>
          <dt>Rungs mastered</dt>
          <dd className="num">
            {SAMPLE.mastered}
            <small> of 40</small>
          </dd>
        </div>
        <div>
          <dt>Instructional level</dt>
          <dd>
            <span className="num">Rung {SAMPLE.rung}</span>
            <small className="s-report-sub">{SAMPLE_RUNG.title}</small>
          </dd>
        </div>
        <div>
          <dt>Words correct per minute</dt>
          <dd className="num">
            {SAMPLE.wcpm}
            <small className="s-up"> +{SAMPLE.wcpm - SAMPLE.wcpmWeek1}</small>
          </dd>
        </div>
      </dl>

      <div className="s-report-block">
        <p className="s-report-label">
          <span>Words correct per minute</span>
          <span className="s-report-axis">Weeks 1 to 8</span>
        </p>
        <FluencyChart />
      </div>

      <div className="s-report-block">
        <p className="s-report-label">
          <span>Recordings</span>
          <span className="s-report-axis">{bench?.title ?? "Benchmark passage"}</span>
        </p>
        <div className="s-rec">
          <span className="s-rec-when">Week 1</span>
          <span className="s-rec-track" style={{ ["--w" as string]: "100%" }}>
            <Wave bars={44} seed={7} gaps={[9, 21, 33]} />
          </span>
          <span className="s-rec-time num">0:21</span>
        </div>
        <div className="s-rec">
          <span className="s-rec-when">Week 8</span>
          <span className="s-rec-track" style={{ ["--w" as string]: "71%" }}>
            <Wave bars={31} seed={19} gaps={[]} />
          </span>
          <span className="s-rec-time num">0:15</span>
        </div>
      </div>

      <div className="s-report-foot">
        <span>
          <b className="num">{SAMPLE.paperMinutes}</b> min on paper
        </span>
        <span>
          <b className="num">{SAMPLE.screenMinutes}</b> min on screen
        </span>
        <span className="s-report-next">Next: {NEXT_RUNG.title}</span>
      </div>
    </figure>
  );
}
