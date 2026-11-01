import { getRung } from "@/lib/ladder";
import { PRIMER_CLASS } from "./sample";

type CellState = "mastered" | "current" | "review" | "ahead";

const FROM = 6;
const TO = 16;
const COLS = Array.from({ length: TO - FROM + 1 }, (_, i) => FROM + i);

function stateFor(child: (typeof PRIMER_CLASS)[number], rung: number): CellState {
  if (rung === child.rung) return "current";
  if (rung < child.rung) return child.review?.includes(rung) ? "review" : "mastered";
  return "ahead";
}

const LABEL: Record<CellState, string> = {
  mastered: "Mastered",
  current: "Current rung",
  review: "Review due",
  ahead: "Ahead",
};

export function BoardLegend() {
  return (
    <ul className="s-legend" aria-label="Legend">
      {(["mastered", "current", "review", "ahead"] as CellState[]).map((s) => (
        <li key={s}>
          <i className="s-cell" data-state={s} aria-hidden="true" />
          {LABEL[s]}
        </li>
      ))}
    </ul>
  );
}

/**
 * The teacher's mastery board for one class: one row per child, one column per rung.
 * Hunter green mastered, navy current, ochre review.
 */
export function MasteryBoard({ compact = false, showLegend = true }: { compact?: boolean; showLegend?: boolean }) {
  return (
    <figure className="s-board" data-compact={compact || undefined} aria-label="Mastery board for the Primer Class, rungs 6 to 16">
      {!compact && (
        <div className="s-board-head">
          <div>
            <p className="s-card-kicker">Mastery board</p>
            <p className="s-board-title">Primer Class · Mrs. Finch</p>
          </div>
          <span className="s-tag">Rungs {FROM} to {TO}</span>
        </div>
      )}
      <div className="s-board-scroll">
        <table className="s-board-grid">
          <thead>
            <tr>
              <th scope="col" className="s-board-name">
                <span className="visually-hidden">Child</span>
              </th>
              {COLS.map((n) => (
                <th key={n} scope="col" title={getRung(n).title}>
                  <span className="num">{n}</span>
                  {!compact && <small>{getRung(n).short.split(" ").slice(0, 2).join(" ")}</small>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRIMER_CLASS.map((child) => (
              <tr key={child.name}>
                <th scope="row" className="s-board-name">
                  {child.name}
                </th>
                {COLS.map((n) => {
                  const s = stateFor(child, n);
                  return (
                    <td key={n}>
                      <i className="s-cell" data-state={s} title={`${child.name}, rung ${n}: ${LABEL[s]}`} />
                      <span className="visually-hidden">{LABEL[s]}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showLegend && <BoardLegend />}
    </figure>
  );
}
