"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import type { Rung } from "@/lib/types";
import { getRung } from "@/lib/ladder";
import { Illustration } from "@/components/Illustration";
import { PrintLadder } from "./PrintLadder";
import {
  LINE_LABEL,
  copyModel,
  emphasize,
  patternSegs,
  pointAndSay,
  practiceWords,
  scoreRows,
  splitVowel,
  teacherScript,
  vowelsThrough,
  warmupWords,
  type Seg,
} from "./content";

export interface PacketProps {
  rung: number;
  /** Printed on the student page and the score sheet. Omit for class packets (a name line prints instead). */
  childName?: string;
  /** Who the packet is for, on the teacher page: "Nora" or "Primer Class: Nora and Lucy". */
  forLine: string;
  origin: string;
  /** The child's id, so the score sheet's code opens this lesson for this child. */
  childId?: string;
}

const SHEETS = 3;

/** The three sheets of one lesson, rendered as US Letter paper. */
export function Packet(props: PacketProps) {
  const r = getRung(props.rung);
  return (
    <>
      <TeacherSheet r={r} {...props} />
      <StudentSheet r={r} {...props} />
      <ScoreSheet r={r} {...props} />
    </>
  );
}

/* ---------- Sheet frame ---------- */

/** Shrinks type in steps until the sheet's body fits one page. Runs after fonts load. */
function useFit(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    let cancelled = false;
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      if (cancelled) return;
      let f = 1;
      el.style.setProperty("--pr-fit", "1");
      for (let i = 0; i < 10 && el.scrollHeight > el.clientHeight + 1; i++) {
        f = Math.round((f - 0.04) * 100) / 100;
        el.style.setProperty("--pr-fit", String(f));
      }
    };
    fit();
    void document.fonts?.ready.then(fit);
    return () => {
      cancelled = true;
    };
  }, [dep]);
  return ref;
}

function Sheet({
  r,
  page,
  kind,
  children,
  fitKey,
}: {
  r: Rung;
  page: number;
  kind: string;
  children: ReactNode;
  fitKey: unknown;
}) {
  const body = useFit(fitKey);
  return (
    <article className="pr-sheet" aria-label={`${kind}, page ${page} of ${SHEETS}`}>
      <header className="pr-run">
        <span className="pr-run-brand">Heritage Readers</span>
        <span className="pr-run-mid">
          Rung {r.n} · {r.title}
        </span>
        <span className="pr-run-page">
          {kind} · {page} of {SHEETS}
        </span>
      </header>
      <div ref={body} className="pr-body">
        {children}
      </div>
    </article>
  );
}

function Segs({ segs }: { segs: Seg[] }) {
  return (
    <>
      {segs.map((s, i) =>
        s.em ? (
          <b key={i} className="pr-em">
            {s.text}
          </b>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

/** A word inked as the book inks it: through the first vowel on ladder rungs, the target grapheme elsewhere. */
function Word({ word, r }: { word: string; r: Rung }) {
  if (r.ladder || r.group === "consonants") {
    const [lead, rest] = splitVowel(word);
    return (
      <>
        <b className="pr-em">{lead}</b>
        {rest}
      </>
    );
  }
  return <Segs segs={emphasize(word, r.graphemes)} />;
}

/* ---------- Page 1: the teacher's script ---------- */

function TeacherSheet({ r, forLine }: PacketProps & { r: Rung }) {
  const script = teacherScript(r.n);
  const minutes = script.reduce((n, s) => n + s.minutes, 0);
  return (
    <Sheet r={r} page={1} kind="Teacher page" fitKey={r.n}>
      <div className="pr-t-head">
        <h2 className="pr-t-title">
          Rung {r.n}: {r.title}
        </h2>
        <dl className="pr-t-meta">
          <div>
            <dt>For</dt>
            <dd>{forLine}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>About {minutes} minutes</dd>
          </div>
          <div>
            <dt>Materials</dt>
            <dd>Student page, score sheet, pencil, timer</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd className="pr-blank" />
          </div>
        </dl>
        <p className="pr-t-goal">
          Goal: {r.passage ? `read ${r.passage.title} at 95% or better` : `say ${vowelsThrough(r.n).length === 1 ? "the sound" : "each vowel sound"} without help`}. Two clean reads master the rung.
        </p>
      </div>

      <ol className="pr-script">
        {script.map((sec, i) => (
          <li key={sec.title} className="pr-script-sec">
            <h3 className="pr-script-title">
              <span className="pr-script-n">{i + 1}</span>
              {sec.title}
              <span className="pr-script-min">{sec.minutes} min</span>
            </h3>
            <dl className="pr-lines">
              {sec.lines.map((ln, k) => (
                <div key={k} className={`pr-line pr-line-${ln.kind}`}>
                  <dt>{LINE_LABEL[ln.kind]}</dt>
                  <dd>{ln.text}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ol>

      <p className="pr-t-foot">
        Correction: model the answer, lead the child through it, test it again, then return to the start of the line. Praise the work in plain words: You read every word in that line.
      </p>
    </Sheet>
  );
}

/* ---------- Page 2: the student page ---------- */

function LetterBlock({ r }: { r: Rung }) {
  const pages = r.letterPages ?? [];
  if (pages.length) {
    const many = pages.length > 2;
    return (
      <div className={`pr-letters ${many ? "pr-letters-many" : ""}`} data-count={pages.length}>
        {pages.map((p) => (
          <figure key={p.glyphs} className="pr-letter">
            <span className="pr-letter-glyphs">{p.glyphs}</span>
            <span className="pr-letter-spot">
              <Illustration id={p.spot} alt="" />
            </span>
            <figcaption className="pr-letter-key">{p.keyword}</figcaption>
          </figure>
        ))}
      </div>
    );
  }
  const key = practiceWords(r)[0];
  return (
    <div className="pr-newsound">
      <span className="pr-newsound-glyphs">{r.n === 40 ? "rab | bit" : r.short}</span>
      {key && (
        <span className="pr-newsound-key">
          <Word word={key} r={r} />
        </span>
      )}
    </div>
  );
}

function PatternBlock({ r }: { r: Rung }) {
  if (r.ladder) return <PrintLadder data={r.ladder} />;
  if (r.pattern) {
    return (
      <ul className="pr-pattern">
        {r.pattern.map((p) => {
          const s = patternSegs(p.from, p.to);
          return (
            <li key={p.to}>
              <span className="pr-pattern-from">{s.from}</span>
              <span className="pr-pattern-arrow" aria-hidden>
                →
              </span>
              <span className="pr-pattern-to">
                <Segs segs={s.to} />
              </span>
            </li>
          );
        })}
      </ul>
    );
  }
  if (r.families) {
    return (
      <div className="pr-families" data-cols={r.families.length}>
        {r.families.map((col, i) => (
          <ul key={i}>
            {col.map((w) => (
              <li key={w}>
                <Word word={w} r={r} />
              </li>
            ))}
          </ul>
        ))}
      </div>
    );
  }
  // Vowel rungs: the vowels so far, each with its keyword.
  const v = vowelsThrough(r.n);
  return (
    <div className="pr-vowelrow">
      {["a", "e", "i", "o", "u"].map((x, i) => (
        <span key={x} className={i < v.length ? "pr-vowel-on" : "pr-vowel-off"}>
          {x}
        </span>
      ))}
    </div>
  );
}

function StudentSheet({ r, childName }: PacketProps & { r: Rung }) {
  const warm = warmupWords(r.n);
  const passage = r.passage;
  return (
    <Sheet r={r} page={2} kind="Student page" fitKey={r.n}>
      <div className="pr-s-head">
        {childName ? (
          <p className="pr-s-name">{childName}</p>
        ) : (
          <p className="pr-s-field">
            Name <span className="pr-blank pr-blank-lg" />
          </p>
        )}
        <p className="pr-s-field">
          Date <span className="pr-blank" />
        </p>
      </div>

      <div className={`pr-s-top ${r.families && r.families.length > 3 ? "pr-s-top-wide" : ""}`}>
        <LetterBlock r={r} />
        <div className="pr-s-pattern">
          <PatternBlock r={r} />
        </div>
      </div>

      {r.n > 1 && warm.length > 0 && (
        <div className="pr-s-row">
          <p className="pr-s-label">Warm up</p>
          <p className="pr-s-warm">
            {warm.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </p>
        </div>
      )}

      {r.pairs.length > 0 && (
        <div className="pr-s-row">
          <p className="pr-s-label">Pairs</p>
          <div className="pr-pairs" style={{ gridTemplateColumns: `repeat(${r.pairs.length}, minmax(0, 1fr))` }}>
            {r.pairs.map(([a, b]) => (
              <div key={a + b} className="pr-pair">
                <span>
                  <Word word={a} r={r} />
                </span>
                <span>
                  <Word word={b} r={r} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {passage ? (
        <div className="pr-s-story">
          {passage.illustration && (
            <span className="pr-s-art">
              <Illustration id={passage.illustration} alt="" />
            </span>
          )}
          <p className="pr-s-title">{passage.title}</p>
          {passage.sentences.map((s) => (
            <p key={s} className="pr-s-sentence">
              {s}
            </p>
          ))}
        </div>
      ) : (
        <>
          <div className="pr-s-row">
            <p className="pr-s-label">Point and say</p>
            <p className="pr-s-point">
              {pointAndSay(r.n).map((v, i) => (
                <span key={i}>{v}</span>
              ))}
            </p>
          </div>
          <div className="pr-s-row">
            <p className="pr-s-label">Trace</p>
            <p className="pr-s-trace" aria-hidden>
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i}>{i % 2 ? r.short.toUpperCase() : r.short}</span>
              ))}
            </p>
          </div>
        </>
      )}

      <div className="pr-copy">
        <p className="pr-s-label">Copy</p>
        <p className="pr-copy-model">{copyModel(r)}</p>
        <WriteLines />
        <WriteLines />
      </div>
    </Sheet>
  );
}

function WriteLines() {
  return (
    <svg className="pr-writelines" viewBox="0 0 1000 64" preserveAspectRatio="none" aria-hidden>
      <line x1="0" x2="1000" y1="2" y2="2" className="pr-wl-top" vectorEffect="non-scaling-stroke" />
      <line x1="0" x2="1000" y1="31" y2="31" className="pr-wl-mid" vectorEffect="non-scaling-stroke" />
      <line x1="0" x2="1000" y1="60" y2="60" className="pr-wl-base" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ---------- Page 3: the score sheet ---------- */

function ScoreSheet({ r, childName, childId, origin }: PacketProps & { r: Rung }) {
  const [qr, setQr] = useState<string>("");
  // Opens the lesson as the student, for this child when the packet is a child's.
  const url = `${origin}/app/lesson?as=student${childId ? `&c=${encodeURIComponent(childId)}` : ""}&r=${r.n}`;
  useEffect(() => {
    let live = true;
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } })
      .then((svg) => live && setQr(svg))
      .catch(() => live && setQr(""));
    return () => {
      live = false;
    };
  }, [url]);

  const { rows, passageWords } = scoreRows(r.n);
  const half = Math.ceil(rows.length / 2);
  // Split near the middle without leaving a section heading at the bottom of the first column.
  let cut = half;
  if (rows[cut - 1]?.kind === "head") cut -= 1;
  const cols = [rows.slice(0, cut), rows.slice(cut)];
  const target = r.graphemes.filter((g) => /^[a-z_-]+$/i.test(g)).slice(0, 3).join(", ");

  return (
    <Sheet r={r} page={3} kind="Score sheet" fitKey={r.n}>
      <div className="pr-c-head">
        <h2 className="pr-c-title">Score sheet</h2>
        <div className="pr-c-fields">
          {childName ? <p className="pr-s-field">{childName}</p> : <p className="pr-s-field">Name <span className="pr-blank pr-blank-lg" /></p>}
          <p className="pr-s-field">
            Date <span className="pr-blank" />
          </p>
        </div>
      </div>
      <p className="pr-c-how">
        Mark one box for each word. <b>C</b> correct, <b>S</b> substitution, <b>O</b> omission, <b>I</b> insertion, <b>H</b> hesitation of three
        seconds or more. Write what the child said beside an S.
      </p>

      <div className="pr-c-tables">
        {cols.map((col, ci) => (
          <table key={ci} className="pr-c-table">
            <thead>
              <tr>
                <th scope="col" className="pr-c-n">
                  #
                </th>
                <th scope="col" className="pr-c-word">
                  Word
                </th>
                {["C", "S", "O", "I", "H"].map((h) => (
                  <th key={h} scope="col" className="pr-c-box-h" title={{ C: "Correct", S: "Substitution", O: "Omission", I: "Insertion", H: "Hesitation" }[h]}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {col.map((row, i) =>
                row.kind === "head" ? (
                  <tr key={`h${i}`} className="pr-c-sec">
                    <th colSpan={7} scope="rowgroup">
                      {row.text}
                    </th>
                  </tr>
                ) : (
                  <tr key={`w${row.n}`}>
                    <td className="pr-c-n">{row.n}</td>
                    <td className="pr-c-word">{row.text}</td>
                    {[0, 1, 2, 3, 4].map((k) => (
                      <td key={k} className="pr-c-box">
                        <span />
                      </td>
                    ))}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        ))}
      </div>

      <div className="pr-c-bottom">
        <div className="pr-c-totals">
          <div className="pr-c-total">
            <span>{r.passage ? "Words in the story" : "Sounds"}</span>
            <b>{r.passage ? passageWords : pointAndSay(r.n).length}</b>
          </div>
          <div className="pr-c-total">
            <span>Errors</span>
            <i className="pr-blank" />
          </div>
          <div className="pr-c-total">
            <span>Accuracy</span>
            <i className="pr-blank pr-blank-pct" />
          </div>
          {r.passage && (
            <>
              <div className="pr-c-total">
                <span>Seconds</span>
                <i className="pr-blank" />
              </div>
              <div className="pr-c-total">
                <span>Words correct per minute</span>
                <i className="pr-blank" />
              </div>
            </>
          )}
          <p className="pr-c-rule">
            {r.passage ? (
              <>
                Accuracy = words correct ÷ {passageWords}. Words correct per minute = words correct × 60 ÷ seconds. 95% or better with no error on{" "}
                {target || "the new sound"} is a clean read. Two clean reads master the rung. Below 90%, teach the rung again tomorrow.
              </>
            ) : (
              <>Every sound correct is a clean read. Two clean reads master the rung. Missed sounds come back in tomorrow&apos;s warmup.</>
            )}
          </p>
        </div>
        <div className="pr-c-qr">
          <div className="pr-qr" aria-label={`QR code for ${url}`} role="img" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="pr-qr-text">Scan to open this lesson on screen for the three-minute reading check.</p>
          <p className="pr-qr-url">{url.replace(/^https?:\/\//, "")}</p>
        </div>
      </div>
    </Sheet>
  );
}

export { SHEETS };
