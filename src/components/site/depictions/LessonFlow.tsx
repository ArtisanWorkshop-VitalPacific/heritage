import { Illustration } from "@/components/Illustration";
import { Woodcut } from "../Wordmark";
import { MicPill, PassageText } from "./ReadingCheck";
import { NEXT_RUNG, SAMPLE, SAMPLE_RUNG, lowerFirst } from "./sample";

/** Step 1: the printed script, at the table. */
export function MiniPaper() {
  const ladder = SAMPLE_RUNG.ladder!;
  return (
    <div className="s-mini s-mini-paper" aria-hidden="true">
      <div className="s-mini-sheet">
        <p className="s-mini-sheet-kicker">Lesson {SAMPLE.rung} · Teacher page</p>
        <p className="s-mini-sheet-title">{SAMPLE_RUNG.title}</p>
        <p>
          <b>Say</b> This is h. It says /h/, the first sound in hen.
        </p>
        <p>
          <b>Do</b> Read up the ladder: {ladder.left.filter(Boolean).join(", ")}.
        </p>
        <p>
          <b>If missed</b> Say the word. Read it together. Ask once more.
        </p>
        <span className="s-mini-check">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}

/** Step 2: the reading check, on screen. */
export function MiniScreen() {
  return (
    <div className="s-mini s-mini-screen" aria-hidden="true">
      <div className="s-mini-device surface-drill">
        <PassageText upTo={11} current={9} />
        <MicPill />
      </div>
    </div>
  );
}

/** Step 3: one line to the parent. */
export function MiniLine() {
  return (
    <div className="s-mini s-mini-line" aria-hidden="true">
      <div className="s-mini-art">
        <Illustration id="village-lane" alt="" sizes="480px" />
      </div>
      <div className="s-notice glass glass-lg">
        <Woodcut size={240} className="s-notice-icon" />
        <div className="s-notice-body">
          <p className="s-notice-top">
            <b>Heritage Readers</b>
            <span>now</span>
          </p>
          <p>
            {SAMPLE.child} read {SAMPLE_RUNG.passage?.title} at {SAMPLE.accuracy}% accuracy, {SAMPLE.wcpm} words a minute. Next: {lowerFirst(NEXT_RUNG.title)}.
          </p>
        </div>
      </div>
    </div>
  );
}
