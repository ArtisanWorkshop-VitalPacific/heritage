"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { sessionsFor, useDemo } from "@/lib/store";
import { CLEAN_READS_TO_MASTER, PASSAGES, RUNG_GROUPS, dueReviews, getRung } from "@/lib/ladder";
import { speak, stopSpeaking } from "@/lib/speech";
import type { Child, LadderState, Narrator, Passage, Rung } from "@/lib/types";
import { IconArrowRight, IconSpeaker } from "@/components/icons";
import { BackToToday } from "./Chrome";
import { PatternCards, VowelWord } from "./Drills";
import { PassageView } from "./ReadingCheck";
import { Seal } from "./Seal";
import { CleanReads } from "./StudentHome";
import { WrenAvatar } from "./Wren";
import { bandClass, cx, reviewWhen, scrollBehavior, useReadingComfort, useSpeechReady } from "./util";

type RungState = "mastered" | "current" | "review" | "upcoming";

const SPINES = ["#1f3a5f", "#2a5234", "#7a5612", "#5b6470", "#3a342d", "#2f4f57", "#5a3d22", "#33456b"];

export function LadderPage() {
  const { state, child, ladder, role } = useDemo();
  useSpeechReady();
  useEffect(() => () => stopSpeaking(), []);
  const student = role === "student";
  if (!child || !ladder) {
    return (
      <div className="st-page st-empty">
        <WrenAvatar size={88} />
        <h1 className="st-h1">No reader yet.</h1>
        <p className="st-lede">Add a reader to see the ladder.</p>
      </div>
    );
  }
  const readRungs = new Set([...sessionsFor(state, child.id).map((s) => s.rung), ...ladder.mastered]);
  return <LadderView key={child.id} child={child} ladder={ladder} student={student} readRungs={readRungs} />;
}

function LadderView({ child, ladder, student, readRungs }: { child: Child; ladder: LadderState; student: boolean; readRungs: Set<number> }) {
  const mastered = useMemo(() => new Set(ladder.mastered), [ladder.mastered]);
  const due = useMemo(() => new Set(dueReviews(ladder)), [ladder]);
  const reviewOn = useMemo(() => new Map(ladder.review.map((r) => [r.rung, r.due])), [ladder.review]);
  const comfort = useReadingComfort();
  const [sel, setSel] = useState(ladder.rung);
  const [book, setBook] = useState<string | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);

  const stateOf = (n: number): RungState =>
    mastered.has(n) ? (due.has(n) ? "review" : "mastered") : n === ladder.rung ? "current" : "upcoming";

  // Centre the current rung inside the ladder window; the page itself does not move.
  useLayoutEffect(() => {
    const win = windowRef.current;
    const el = currentRef.current;
    if (!win || !el) return;
    win.scrollTop = Math.max(0, el.offsetTop - win.clientHeight / 2 + el.offsetHeight / 2);
  }, []);

  const books = PASSAGES.filter((p) => readRungs.has(p.rung));
  const openBook = books.find((b) => b.id === book);
  const seals = [...ladder.mastered].sort((a, b) => a - b);

  const pick = (n: number, reveal?: boolean) => {
    setSel(n);
    if (reveal) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: "nearest", behavior: scrollBehavior() }));
  };

  return (
    <div className={cx("st-page st-ladderpage", student && "st-ladderpage-student", student && bandClass(child.band))} style={comfort}>
      {student && (
        <div className="st-topline">
          <BackToToday />
        </div>
      )}
      <header className="st-pagehead st-ladder-head">
        <h1 className="st-h1">{student ? "My ladder" : `${child.name}’s ladder`}</h1>
        <ul className="st-ladder-sum">
          <li>
            <strong className="num">{ladder.rung}</strong> <span>of 40</span>
            <em>Rung</em>
          </li>
          <li>
            <strong className="num">{seals.length}</strong>
            <em>{seals.length === 1 ? "Seal" : "Seals"}</em>
          </li>
          <li>
            <strong className="num">{books.length}</strong>
            <em>{books.length === 1 ? "Story read" : "Stories read"}</em>
          </li>
        </ul>
      </header>

      <div className="st-ladder-layout">
        <section className="st-cl-panel" aria-label="The forty rungs">
          <div className="st-cl-legend" aria-hidden>
            <span data-k="mastered">Mastered</span>
            <span data-k="current">Now</span>
            <span data-k="review">Review</span>
            <span data-k="upcoming">Coming</span>
          </div>
          <div className="st-cl-window" ref={windowRef}>
            <div className="st-cl">
              {[...RUNG_GROUPS].reverse().map((g) => (
                <div key={g.from} className="st-cl-group" role="group" aria-label={`${g.label}, rung ${g.from === g.to ? g.from : `${g.from} to ${g.to}`}`}>
                  <p className="st-cl-glabel">
                    <span>{g.label}</span>
                  </p>
                  <ol className="st-cl-rungs">
                    {Array.from({ length: g.to - g.from + 1 }, (_, k) => g.to - k).map((n) => {
                      const r = getRung(n);
                      const st = stateOf(n);
                      const when = reviewOn.get(n);
                      return (
                        <li key={n}>
                          <button
                            type="button"
                            ref={n === ladder.rung ? currentRef : undefined}
                            className="st-cl-rung"
                            data-state={st}
                            aria-pressed={sel === n}
                            onClick={() => pick(n, true)}
                            aria-label={`Rung ${n}, ${r.title}. ${st === "upcoming" ? "Coming up" : st === "current" ? "Current rung" : st === "review" ? "Review due" : "Mastered"}.`}
                          >
                            <span className="st-cl-num num">{n}</span>
                            <span className="st-cl-short">{r.short}</span>
                            <span className="st-cl-title">{r.title}</span>
                            <span className="st-cl-mark" aria-hidden>
                              {st === "current" && <span className="st-cl-tag st-cl-tag-now">Now</span>}
                              {st === "review" && <span className="st-cl-tag st-cl-tag-review">Review</span>}
                              {(st === "mastered" || st === "review") && <Seal n={n} short={r.short} size={30} mini />}
                              {st === "mastered" && when && <span className="st-cl-due" title={reviewWhen(when)} />}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="st-ladder-side">
          <div ref={detailRef} className="st-detail-wrap">
            <RungDetail
              rung={getRung(sel)}
              state={stateOf(sel)}
              reviewIso={reviewOn.get(sel)}
              cleanReads={ladder.cleanReads[sel] ?? 0}
              narrator={child.narrator}
              student={student}
            />
          </div>

          <section className="st-seals-panel" aria-labelledby="st-seals-h">
            <h2 id="st-seals-h" className="st-h3">
              Seals
            </h2>
            {seals.length ? (
              <ul className="st-seals">
                {seals.map((n) => {
                  const r = getRung(n);
                  return (
                    <li key={n}>
                      <button type="button" className="st-seal-btn" aria-pressed={sel === n} onClick={() => pick(n, true)}>
                        <Seal n={n} short={r.short} size={84} />
                        <span className="st-seal-cap num">Rung {n}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="st-muted">The first seal comes with the first mastered rung.</p>
            )}
          </section>

          <section className="st-shelf-panel" aria-labelledby="st-shelf-h">
            <h2 id="st-shelf-h" className="st-h3">
              Stories read
            </h2>
            {books.length ? (
              <div className="st-shelf">
                <ul className="st-shelf-row">
                  {books.map((p, i) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="st-spine"
                        aria-pressed={book === p.id}
                        style={spineStyle(p, i)}
                        onClick={() => {
                          setBook(book === p.id ? null : p.id);
                          requestAnimationFrame(() => storyRef.current?.scrollIntoView({ block: "nearest", behavior: scrollBehavior() }));
                        }}
                        aria-label={`${p.title}, rung ${p.rung}`}
                      >
                        <span className="st-spine-title">{p.title}</span>
                        <span className="st-spine-n num" aria-hidden>
                          {p.rung}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="st-muted">Stories appear here once they are read.</p>
            )}
            <div ref={storyRef}>{openBook && <StoryCard passage={openBook} child={child} />}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

function spineStyle(p: Passage, i: number): CSSProperties {
  // Tall enough for the title, with a little natural variation along the shelf.
  const h = Math.min(202, Math.max(150, 58 + p.title.length * 7.4 + ((p.rung * 5) % 3) * 6));
  const w = 52 + ((p.title.length + i) % 3) * 5;
  return { "--h": `${h}px`, "--w": `${w}px`, "--c": SPINES[(p.rung + i) % SPINES.length] } as CSSProperties;
}

/* ---------- Rung detail ---------- */

const STATE_COPY: Record<RungState, { label: string; cls: string }> = {
  mastered: { label: "Mastered", cls: "pill pill-mastered" },
  current: { label: "Now", cls: "pill pill-current" },
  review: { label: "Review due", cls: "pill pill-review" },
  upcoming: { label: "Coming up", cls: "pill pill-outline" },
};

function RungDetail({
  rung,
  state,
  reviewIso,
  cleanReads,
  narrator,
  student,
}: {
  rung: Rung;
  state: RungState;
  reviewIso?: string;
  cleanReads: number;
  narrator: Narrator;
  student: boolean;
}) {
  const group = RUNG_GROUPS.find((g) => rung.n >= g.from && rung.n <= g.to);
  const copy = STATE_COPY[state];
  return (
    <section className="st-detail surface-drill" aria-live="polite" aria-label={`Rung ${rung.n}`}>
      <div className="st-detail-head">
        <div className="min-0">
          <p className="st-eyebrow">
            Rung {rung.n}
            {group ? ` · ${group.label}` : ""}
          </p>
          <h2 className="st-detail-title">{rung.title}</h2>
        </div>
        {state === "mastered" || state === "review" ? <Seal n={rung.n} short={rung.short} size={64} /> : null}
      </div>
      <p className="st-detail-pills">
        <span className={copy.cls}>{copy.label}</span>
        {reviewIso && state !== "review" && <span className="pill pill-review">{reviewWhen(reviewIso)}</span>}
      </p>
      <PatternPreview rung={rung} narrator={narrator} />
      {rung.passage && (
        <p className="st-detail-story">
          <span className="st-detail-story-label">Story</span>
          {rung.passage.title}
        </p>
      )}
      {state === "current" && <CleanReads reads={Math.min(cleanReads, CLEAN_READS_TO_MASTER)} />}
      {student && state !== "upcoming" && (
        <Link href={`/app/drill?rung=${rung.n}`} className="btn btn-secondary st-btn st-detail-go">
          Practice this rung
          <IconArrowRight size={20} />
        </Link>
      )}
    </section>
  );
}

function PatternPreview({ rung, narrator }: { rung: Rung; narrator: Narrator }) {
  if (rung.ladder) {
    const left = rung.ladder.left.filter(Boolean) as string[];
    const right = rung.ladder.right.filter(Boolean) as string[];
    return (
      <div className="st-preview">
        <p className="st-preview-row st-preview-syl">
          {left.map((s) => (
            <span key={s} className="vowel">
              {s}
            </span>
          ))}
        </p>
        <p className="st-preview-row">
          {right.map((w) => (
            <span key={w}>
              <VowelWord word={w} />
            </span>
          ))}
        </p>
      </div>
    );
  }
  if (rung.letterPages?.length) {
    return (
      <p className="st-preview-row st-preview-letters">
        {rung.letterPages.map((lp) => (
          <span key={lp.glyphs}>
            <strong className={/^[aeiou]/i.test(lp.glyphs) ? "vowel" : undefined}>{lp.glyphs.split(" ")[0]}</strong> as in {lp.keyword}
          </span>
        ))}
      </p>
    );
  }
  if (rung.pattern?.length) return <PatternCards pattern={rung.pattern} narrator={narrator} limit={3} />;
  if (rung.families?.length) {
    return (
      <p className="st-preview-row">
        {rung.families.map((f) => (
          <span key={f[0]}>
            <VowelWord word={f[0]} />
          </span>
        ))}
      </p>
    );
  }
  return null;
}

/* ---------- A story from the shelf ---------- */

function StoryCard({ passage, child }: { passage: Passage; child: Child }) {
  return (
    <div className="st-story">
      <PassageView passage={passage} band={child.band} narrator={child.narrator} phase="done" />
      <div className="st-story-actions">
        <button
          type="button"
          className="btn btn-quiet st-btn"
          onClick={() => void speak(passage.sentences.join(" "), { narrator: child.narrator, kind: "story" })}
        >
          <IconSpeaker size={20} />
          Hear the story
        </button>
      </div>
    </div>
  );
}
