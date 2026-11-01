"use client";

import type { LadderState } from "@/lib/types";
import { RUNG_GROUPS, getRung } from "@/lib/ladder";
import { dueWord, rungState, type RungState } from "./lib";

const STATE_WORD: Record<RungState, string> = {
  mastered: "mastered",
  current: "current",
  review: "review scheduled",
  upcoming: "ahead",
};

/** Every rung as a chip, grouped as the board groups them. State is encoded in fill and outline. */
export function MasteryChips({ ladder }: { ladder: LadderState }) {
  return (
    <div className="ap-mastery">
      <div className="ap-legend" aria-hidden>
        <span className="ap-legend-item">
          <span className="ap-key ap-key-mastered" /> Mastered
        </span>
        <span className="ap-legend-item">
          <span className="ap-key ap-key-current" /> Current
        </span>
        <span className="ap-legend-item">
          <span className="ap-key ap-key-review" /> Review scheduled
        </span>
        <span className="ap-legend-item">
          <span className="ap-key ap-key-ahead" /> Ahead
        </span>
      </div>
      <div className="ap-mgroups">
        {RUNG_GROUPS.map((g, gi) => (
          <div key={gi} className="ap-mgroup">
            <p className="ap-mgroup-label">{g.label}</p>
            <ul className="ap-mchips">
              {Array.from({ length: g.to - g.from + 1 }, (_, i) => g.from + i).map((n) => {
                const st = rungState(ladder, n);
                const r = getRung(n);
                const review = ladder.review.find((x) => x.rung === n);
                const label = `Rung ${n}, ${r.title}: ${STATE_WORD[st]}${review ? `, ${dueWord(review.due).toLowerCase()}` : ""}.`;
                return (
                  <li key={n} className="ap-mchip" data-state={st} title={label}>
                    <span className="visually-hidden">{label}</span>
                    <span className="ap-mchip-n" aria-hidden>
                      {n}
                    </span>
                    <span className="ap-mchip-s" aria-hidden>
                      {r.short}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
