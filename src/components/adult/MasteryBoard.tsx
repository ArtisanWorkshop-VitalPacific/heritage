"use client";

import type { Child, DemoState } from "@/lib/types";
import { RUNG_GROUPS } from "@/lib/ladder";
import { ladderOf, reviewsDue } from "./lib";

export type CellState = "mastered" | "current" | "upcoming";

export interface Cell {
  state: CellState;
  rung?: number; // current rung, for the current group
  done: number; // rungs mastered in this group
  size: number;
  review: number[]; // rungs in this group with a review due today or earlier
}

export function cellsFor(state: DemoState, child: Child, now = Date.now()): Cell[] {
  const ladder = ladderOf(state, child.id);
  const due = reviewsDue(ladder, now).map((r) => r.rung);
  return RUNG_GROUPS.map((g) => {
    const size = g.to - g.from + 1;
    let done = 0;
    for (let n = g.from; n <= g.to; n++) if (ladder.mastered.includes(n)) done++;
    const current = ladder.rung >= g.from && ladder.rung <= g.to;
    const review = due.filter((n) => n >= g.from && n <= g.to);
    return {
      state: current ? "current" : done === size ? "mastered" : "upcoming",
      rung: current ? ladder.rung : undefined,
      done,
      size,
      review,
    };
  });
}

function cellLabel(groupLabel: string, c: Cell, limited: boolean): string {
  if (limited) return c.state === "current" ? `${groupLabel}: current, rung ${c.rung}.` : `${groupLabel}.`;
  const base =
    c.state === "mastered"
      ? `${groupLabel}: all ${c.size} mastered`
      : c.state === "current"
        ? `${groupLabel}: current, rung ${c.rung}, ${c.done} of ${c.size} mastered`
        : `${groupLabel}: ahead`;
  return `${base}${c.review.length ? `. Review due on rung ${c.review.join(" and ")}` : ""}.`;
}

/**
 * One row per student, one column per group of rungs. State is encoded in form:
 * a hunter green fill for a finished group, a navy outline with the rung number for the
 * current group, an ochre dot for a review due, and an empty cell for the groups ahead.
 * With `limited` (Aides), only the current rung shows.
 */
export function MasteryBoard({
  state,
  students,
  selectedId,
  onOpen,
  limited,
}: {
  state: DemoState;
  students: Child[];
  selectedId?: string | null;
  onOpen: (c: Child) => void;
  limited: boolean;
}) {
  const now = Date.now();
  return (
    <div className="ap-board-wrap ap-scroll" role="region" aria-label="Mastery board, scrolls sideways" tabIndex={0}>
      <table className="ap-board" data-limited={limited || undefined}>
        <thead>
          <tr>
            <th scope="col" className="ap-board-corner">
              Student
            </th>
            {RUNG_GROUPS.map((g, i) => (
              <th key={i} scope="col" className="ap-board-col">
                <span className="ap-board-col-label">{g.label}</span>
                <span className="ap-board-col-range num">{g.from === g.to ? g.from : `${g.from} to ${g.to}`}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((c) => {
            const cells = cellsFor(state, c, now);
            const rung = ladderOf(state, c.id).rung;
            return (
              <tr key={c.id} data-selected={selectedId === c.id || undefined} onClick={() => onOpen(c)}>
                <th scope="row" className="ap-board-name">
                  <button
                    type="button"
                    className="ap-board-namebtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(c);
                    }}
                    aria-haspopup="dialog"
                  >
                    <span className="ap-board-student">{c.name}</span>
                    <span className="ap-board-rung num">Rung {rung}</span>
                  </button>
                </th>
                {cells.map((cell, i) => {
                  const show = limited ? (cell.state === "current" ? "current" : "blank") : cell.state;
                  return (
                    <td key={i} className="ap-board-td">
                      <span className="ap-cell" data-state={show}>
                        <span className="visually-hidden">{cellLabel(RUNG_GROUPS[i].label, cell, limited)}</span>
                        {show === "mastered" && (
                          <svg className="ap-cell-check" width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                            <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {show === "current" && (
                          <>
                            <span className="ap-cell-n num" aria-hidden>
                              {cell.rung}
                            </span>
                            {!limited && cell.size > 1 && (
                              <span className="ap-cell-bar" aria-hidden>
                                <i style={{ width: `${(cell.done / cell.size) * 100}%` }} />
                              </span>
                            )}
                          </>
                        )}
                        {!limited && cell.review.length > 0 && <span className="ap-cell-dot" aria-hidden />}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
