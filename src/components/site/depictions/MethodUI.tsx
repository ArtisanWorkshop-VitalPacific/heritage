import { IconCheck } from "@/components/icons";

/** A mastery seal: an engraved medallion carrying the phonogram. */
export function Seal({ glyph, size = 56 }: { glyph: string; size?: number }) {
  return (
    <span className="s-seal" style={{ ["--size" as string]: `${size}px` }} aria-hidden="true">
      <span>{glyph}</span>
    </span>
  );
}

/** How a rung is mastered: two clean reads, the seven-day read, then the seal. */
export function MasteryTimeline() {
  const steps: { day: string; title: string; detail: string; state: "clean" | "seal" | "review" }[] = [
    { day: "Monday", title: "First clean read", detail: "96% accuracy", state: "clean" },
    { day: "Wednesday", title: "Second clean read", detail: "97% accuracy", state: "clean" },
    { day: "Seven days later", title: "The seven-day read", detail: "96% accuracy", state: "review" },
    { day: "Then", title: "Rung 10 mastered", detail: "The next rung opens.", state: "seal" },
  ];
  return (
    <figure className="s-timeline" aria-label="How a rung is mastered">
      <p className="s-card-kicker">Rung 10 · The letter h</p>
      <ol>
        {steps.map((s, i) => (
          <li key={i} data-state={s.state}>
            <span className="s-timeline-mark" aria-hidden="true">
              {s.state !== "seal" && <IconCheck size={16} />}
              {s.state === "seal" && <Seal glyph="h" size={34} />}
            </span>
            <span className="s-timeline-body">
              <small>{s.day}</small>
              <b>{s.title}</b>
              <span>{s.detail}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="s-timeline-note">If a reading falls below 90 percent, your child stays on the rung for another day.</p>
    </figure>
  );
}

type Tag = "word" | "sight" | "name" | "no";
const DRAFT_1: [string, Tag][] = [
  ["The", "sight"],
  ["hungry", "no"],
  ["hen", "word"],
  ["hid", "word"],
  ["in", "word"],
  ["a", "sight"],
  ["big", "word"],
  ["hat.", "word"],
];
const DRAFT_2: [string, Tag][] = [
  ["The", "sight"],
  ["hen", "word"],
  ["hid", "word"],
  ["in", "word"],
  ["a", "sight"],
  ["big", "word"],
  ["hat.", "word"],
];

function Draft({ words }: { words: [string, Tag][] }) {
  return (
    <p className="s-draft">
      {words.map(([w, t], i) => (
        <span key={i} className="s-token" data-tag={t}>
          {w}
          {t === "sight" && <small>sight</small>}
          {t === "no" && <small>not taught</small>}
        </span>
      ))}
    </p>
  );
}

/** The validator at work: a model draft with one word beyond rung 10 is rejected; the second draft passes. */
export function ValidatorCard() {
  return (
    <figure className="s-validator" aria-label="The validator checking two drafts of a passage at rung 10">
      <div className="s-validator-head">
        <p className="s-card-kicker">Validator</p>
        <span className="s-tag">Rung 10 · h</span>
      </div>
      <div className="s-validator-row">
        <p className="s-validator-label">Draft 1</p>
        <Draft words={DRAFT_1} />
        <p className="s-verdict" data-ok="false">
          Rejected. “hungry” is not decodable at rung 10.
        </p>
      </div>
      <div className="s-validator-row">
        <p className="s-validator-label">Draft 2</p>
        <Draft words={DRAFT_2} />
        <p className="s-verdict" data-ok="true">
          <IconCheck size={16} /> Approved. Every word is decodable at rung 10 or a taught sight word.
        </p>
      </div>
    </figure>
  );
}
