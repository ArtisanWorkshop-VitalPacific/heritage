import { IconPrint } from "@/components/icons";
import { getRung } from "@/lib/ladder";
import { PRIMER_CLASS, SAMPLE, SAMPLE_RUNG, splitToken } from "./sample";

/** Class packets grouped by rung: one print per group, each child gets the page for their rung. */
export function PacketList() {
  const groups = [...PRIMER_CLASS].sort((a, b) => a.rung - b.rung);
  return (
    <figure className="s-packets" aria-label="Class packets for the Primer Class, grouped by rung">
      <div className="s-validator-head">
        <p className="s-card-kicker">Class packets · Primer Class</p>
        <span className="s-tag">This week</span>
      </div>
      <ul>
        {groups.map((c) => {
          const r = getRung(c.rung);
          return (
            <li key={c.name}>
              <span className="s-packets-rung num">{c.rung}</span>
              <span className="s-packets-main">
                <b>{r.title}</b>
                <small>{c.name}</small>
              </span>
              <span className="s-packets-print" aria-hidden="true">
                <IconPrint size={16} /> Print
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

/** Entering a paper score: tap the words that were missed. */
export function ScoreEntry() {
  const words = (SAMPLE_RUNG.passage?.sentences ?? []).join(" ").split(/\s+/).map((t) => splitToken(t).word);
  const correct = words.length - 1;
  return (
    <figure className="s-entry" aria-label="Entering a paper score by tapping the missed word">
      <div className="s-validator-head">
        <p className="s-card-kicker">
          Score · {SAMPLE.child} · {SAMPLE_RUNG.passage?.title}
        </p>
        <span className="s-tag">From paper</span>
      </div>
      <p className="s-entry-words">
        {words.map((w, i) => (
          <span key={i} className="s-entry-word" data-missed={w === SAMPLE.review || undefined}>
            {w}
          </span>
        ))}
      </p>
      <div className="s-entry-foot">
        <span>
          <b className="num">
            {correct} of {words.length}
          </b>{" "}
          correct · <b className="num">{Math.round((correct / words.length) * 100)}%</b>
        </span>
        <span className="s-entry-save">Save score</span>
      </div>
    </figure>
  );
}
