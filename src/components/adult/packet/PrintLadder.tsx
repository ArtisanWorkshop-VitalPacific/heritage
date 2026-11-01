import type { VowelLadderData } from "@/lib/types";
import { splitVowel } from "./content";

const VOWELS = ["a", "e", "i", "o", "u"];
/** Syllables that are words with a long vowel; the book marks them with a short rule. */
const MARKED = new Set(["he", "we", "me", "be", "she", "the", "hi", "no", "go", "so", "yo", "ye", "pa", "ma", "la"]);

/**
 * The Hay & Wingo vowel ladder drawn for black ink: the a e i o u header, two ladders with
 * six rungs and round pegs, five gaps with u at the top, the start dot at the foot of the left ladder.
 * The book's pink becomes bold black so the vowel still leads the eye on a home printer.
 */
export function PrintLadder({ data, className }: { data: VowelLadderData; className?: string }) {
  const W = 168; // one ladder
  const GAP = 46;
  const TOP = 40; // header band
  const H = 228; // ladder height
  const total = W * 2 + GAP;
  const rungY = (k: number) => TOP + 8 + k * ((H - 16) / 5);
  const gapY = (row: number) => (rungY(row) + rungY(row + 1)) / 2;
  const order = [4, 3, 2, 1, 0]; // rows top to bottom: u, o, i, e, a

  const ladder = (x0: number, side: "left" | "right") => (
    <g key={side}>
      {Array.from({ length: 6 }, (_, k) => (
        <g key={k}>
          <rect x={x0 + 6} y={rungY(k) - 3.2} width={W - 12} height={6.4} rx={3.2} className="pr-lad-rung" />
          <circle cx={x0 + 4} cy={rungY(k)} r={4.6} className="pr-lad-rung" />
          <circle cx={x0 + W - 4} cy={rungY(k)} r={4.6} className="pr-lad-rung" />
        </g>
      ))}
      <rect x={x0 + 12} y={TOP} width={11} height={H} rx={5.5} className="pr-lad-post" />
      <rect x={x0 + W - 23} y={TOP} width={11} height={H} rx={5.5} className="pr-lad-post" />
      {order.map((i, row) => {
        const text = side === "left" ? data.left[i] : data.right[i];
        if (!text) return null;
        const [lead, rest] = side === "left" ? [text, ""] : splitVowel(text);
        const cy = gapY(row);
        const cx = x0 + W / 2;
        const marked = side === "left" && MARKED.has(text.toLowerCase());
        const approxW = text.length * 11.6;
        return (
          <g key={i}>
            <rect x={cx - approxW / 2 - 7} y={cy - 15} width={approxW + 14 + (marked ? 22 : 0)} height={28} rx={6} className="pr-lad-label-bg" />
            <text x={cx} y={cy} dy="0.35em" textAnchor="middle" className="pr-lad-word">
              <tspan className="pr-lad-lead">{lead}</tspan>
              {rest && <tspan>{rest}</tspan>}
            </text>
            {marked && <line x1={cx + approxW / 2 + 4} x2={cx + approxW / 2 + 19} y1={cy - 1} y2={cy - 1} className="pr-lad-mark" />}
          </g>
        );
      })}
    </g>
  );

  return (
    <svg
      className={["pr-ladder", className].filter(Boolean).join(" ")}
      viewBox={`-14 0 ${total + 20} ${TOP + H + 6}`}
      role="img"
      aria-label={`Vowel ladder for ${data.onset}: ${data.left.filter(Boolean).join(", ")}; ${data.right.filter(Boolean).join(", ")}.`}
    >
      {VOWELS.map((v, i) => (
        <text key={v} x={(total * (i + 0.5)) / 5} y={24} textAnchor="middle" className="pr-lad-vowel">
          {v}
        </text>
      ))}
      {ladder(0, "left")}
      {ladder(W + GAP, "right")}
      <circle cx={-8} cy={rungY(5) + 2} r={4.5} className="pr-lad-dot" />
    </svg>
  );
}
