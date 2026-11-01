import { Illustration } from "@/components/Illustration";
import { SAMPLE, SAMPLE_RUNG, splitToken } from "./sample";

const LADDER = SAMPLE_RUNG.ladder!;
const WORDS = (SAMPLE_RUNG.passage?.sentences ?? []).join(" ").split(/\s+/).map((t) => splitToken(t).word);
const SCORED = WORDS.slice(0, 11);

/** A small QR-like block, deterministic. Decorative. */
function QrMark() {
  let s = 41;
  const rnd = () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return (s >>> 16) & 1;
  };
  const n = 11;
  const finder = (r: number, c: number) => {
    const inBox = (r0: number, c0: number) => r >= r0 && r < r0 + 3 && c >= c0 && c < c0 + 3;
    return inBox(0, 0) || inBox(0, n - 3) || inBox(n - 3, 0);
  };
  return (
    <span className="s-qr" aria-hidden="true">
      {Array.from({ length: n * n }, (_, k) => {
        const r = Math.floor(k / n);
        const c = k % n;
        const on = finder(r, c) || rnd() === 1;
        return <i key={k} data-on={on || undefined} />;
      })}
    </span>
  );
}

function SheetHead({ left, right }: { left: string; right: string }) {
  return (
    <div className="s-sheet-head">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

export function TeacherSheet() {
  return (
    <article className="s-sheet s-sheet-teacher" aria-label="Teacher page">
      <SheetHead left="Heritage Readers" right="Teacher page" />
      <p className="s-sheet-kicker">Lesson {SAMPLE.rung}</p>
      <p className="s-sheet-title">{SAMPLE_RUNG.title}</p>
      <dl className="s-script">
        <div>
          <dt>Say</dt>
          <dd>This is h. It says /h/, the first sound in hen.</dd>
        </div>
        <div>
          <dt>Do</dt>
          <dd>Start at the blue dot. Your child reads up the ladder: {LADDER.left.filter(Boolean).join(", ")}.</dd>
        </div>
        <div>
          <dt>Then</dt>
          <dd>Read across: {LADDER.right.filter(Boolean).join(", ")}.</dd>
        </div>
        <div>
          <dt>If a word is missed</dt>
          <dd>Say the word. Read it together. Ask for it once more.</dd>
        </div>
        <div>
          <dt>Passage</dt>
          <dd>{SAMPLE_RUNG.passage?.title}. Mark each word on the score sheet.</dd>
        </div>
        <div>
          <dt>Narration</dt>
          <dd>Ask: What did the hen do?</dd>
        </div>
      </dl>
    </article>
  );
}

export function StudentSheet() {
  return (
    <article className="s-sheet s-sheet-student" aria-label="Student page">
      <SheetHead left={`Lesson ${SAMPLE.rung}`} right="Student page" />
      <div className="s-sheet-letter">
        <span className="s-sheet-glyph">h H</span>
        <Illustration id="spot-hen" alt="" className="s-sheet-spot" />
      </div>
      <div className="s-sheet-rows lit">
        <p>{LADDER.left.filter(Boolean).join("   ")}</p>
        <p>{LADDER.right.filter(Boolean).join("   ")}</p>
      </div>
      <div className="s-sheet-passage lit">
        {(SAMPLE_RUNG.passage?.sentences ?? []).slice(0, 2).map((s) => (
          <p key={s}>{s}</p>
        ))}
      </div>
    </article>
  );
}

export function ScoreSheet() {
  const cols = ["Correct", "Sub.", "Omit", "Ins.", "Hes."];
  return (
    <article className="s-sheet s-sheet-score" aria-label="Score sheet">
      <SheetHead left={`Score sheet · ${SAMPLE.child}`} right={`Lesson ${SAMPLE.rung}`} />
      <table className="s-score">
        <thead>
          <tr>
            <th scope="col">Word</th>
            {cols.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SCORED.map((w, i) => {
            const missed = w === SAMPLE.review;
            return (
              <tr key={i}>
                <td>{w}</td>
                <td>{missed ? "" : "✓"}</td>
                <td>{missed ? "had" : ""}</td>
                <td />
                <td />
                <td />
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="s-sheet-foot">
        <span>
          Accuracy <b>{SAMPLE.accuracy}%</b>
        </span>
        <span>
          Time <b>0:35</b>
        </span>
        <QrMark />
      </div>
    </article>
  );
}

/** Teacher page, student page and score sheet, all from the same lesson. */
export function PrintPacket() {
  return (
    <div className="s-packet" role="group" aria-label="A printed lesson: teacher page, student page and score sheet">
      <TeacherSheet />
      <StudentSheet />
      <ScoreSheet />
    </div>
  );
}
