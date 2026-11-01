"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { placementFor, useDemo } from "@/lib/store";
import { CLEAN_READS_TO_MASTER, MAX_RUNG, getRung } from "@/lib/ladder";
import type { Child, LadderState } from "@/lib/types";
import { Illustration } from "@/components/Illustration";
import { IconArrowRight, IconClock } from "@/components/icons";
import { GlyphPlate, VowelWord } from "./Drills";
import { Seal } from "./Seal";
import { WrenAvatar } from "./Wren";
import { bandClass, cx, daySeed, greetingFor, rungVisual, sameLocalDay, screenMinutesToday, useSpeechReady } from "./util";

/** The child's home: one lesson, three quiet doors, and the screen time left. */
export function StudentHome() {
  const { state, child, ladder } = useDemo();
  useSpeechReady();

  if (!child || !ladder) return <NoReader />;

  const placed = Boolean(placementFor(state, child.id));
  const needsPlacement = !placed && ladder.rung === 1 && ladder.mastered.length === 0;
  const used = screenMinutesToday(state, child.id);
  const left = Math.max(0, child.screenCapMinutes - used);
  const sessionsToday = state.sessions.filter((x) => x.childId === child.id && x.source === "screen" && sameLocalDay(new Date(x.date), new Date())).length;

  return (
    <div className={cx("st-page st-home", bandClass(child.band))}>
      <header className="st-home-head">
        <h1 className="st-greeting">
          {greetingFor()}, {child.name}.
        </h1>
      </header>

      {needsPlacement ? <PlacementCard child={child} /> : <LessonCard child={child} ladder={ladder} left={left} sessionsToday={sessionsToday} />}

      <nav className="st-tiles" aria-label="More to do">
        <Tile href="/app/drill" title="Practice the ladder" sub="Hear it. Say it. Climb it." art={<LadderArt ladder={ladder} />} />
        <Tile href="/app/talk" title="Talk with Mrs. Wren" sub="Ask her anything." art={<WrenAvatar size={68} />} />
        <Tile
          href="/app/ladder"
          title="My ladder"
          sub={ladder.mastered.length ? `${ladder.mastered.length} ${ladder.mastered.length === 1 ? "seal" : "seals"} so far.` : "Seals come with each rung mastered."}
          art={<SealArt ladder={ladder} />}
        />
      </nav>

      <ScreenTime used={used} cap={child.screenCapMinutes} />
    </div>
  );
}

function NoReader() {
  return (
    <div className="st-page st-empty">
      <WrenAvatar size={88} />
      <h1 className="st-h1">No reader yet.</h1>
      <p className="st-lede">Ask a grown-up to add a reader. Then come back to Mrs. Wren.</p>
    </div>
  );
}

/* ---------- Today's lesson ---------- */

/**
 * A grown-up may allow one more screen lesson after the cap. The allowance is spent
 * when the next screen session is recorded.
 */
function useMoreAllowed(childId: string, sessionsToday: number): [boolean, () => void] {
  const key = `hr:st:more:${childId}:${daySeed()}`;
  const [grantedAt, setGrantedAt] = useState<number | null>(null);
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      setGrantedAt(raw === null ? null : Number(raw));
    } catch {
      /* private mode: the choice lasts for this view */
    }
  }, [key]);
  return [
    grantedAt !== null && sessionsToday <= grantedAt,
    () => {
      setGrantedAt(sessionsToday);
      try {
        window.sessionStorage.setItem(key, String(sessionsToday));
      } catch {
        /* ignore */
      }
    },
  ];
}

function LessonCard({ child, ladder, left, sessionsToday }: { child: Child; ladder: LadderState; left: number; sessionsToday: number }) {
  const rung = getRung(ladder.rung);
  const visual = rungVisual(rung);
  const reads = Math.min(CLEAN_READS_TO_MASTER, ladder.cleanReads[ladder.rung] ?? 0);
  const done = ladder.rung === MAX_RUNG && ladder.mastered.includes(MAX_RUNG);
  const [more, allowMore] = useMoreAllowed(child.id, sessionsToday);
  const [asking, setAsking] = useState(false);
  const outOfTime = left <= 0 && !more;

  return (
    <section className="st-today surface-drill" aria-labelledby="st-today-title">
      <div className="st-today-page">
        {visual.spot ? (
          <div className="st-today-lp">
            <Illustration id={visual.spot} alt="" className="st-today-spot" priority />
            <span className="st-today-glyphs" aria-hidden>
              {visual.glyphs.split(" ").map((g, i) => (
                <span key={i} className={/^[aeiou]$/i.test(g) ? "vowel-lg" : undefined}>
                  {g}
                </span>
              ))}
            </span>
          </div>
        ) : (
          <div className="st-today-lp st-today-lp-plate">
            <GlyphPlate glyphs={visual.glyphs} size="lg" />
          </div>
        )}
      </div>

      <div className="st-today-body">
        <p className="st-eyebrow">
          {done ? "The whole ladder" : "Today’s lesson"} <span aria-hidden>·</span> Rung {rung.n}
        </p>
        <h2 id="st-today-title" className="st-today-title">
          {rung.title}
        </h2>
        <p className="st-today-story">
          {rung.passage ? (
            <>
              <span className="st-today-story-label">Story</span> {rung.passage.title}
            </>
          ) : (
            <>
              <span className="st-today-story-label">Sounds</span> The letter <VowelWord word={rung.short} /> with your grown-up
            </>
          )}
        </p>
        <CleanReads reads={reads} />

        {outOfTime ? (
          <div className="st-today-rest">
            <p className="st-today-rest-text">That is all the screen time for today. Your paper lesson is ready.</p>
            {asking ? (
              <div className="st-today-ask" role="group" aria-label="For grown-ups">
                <span>For grown-ups: one more screen lesson today?</span>
                <div className="st-today-ask-row">
                  <button
                    type="button"
                    className="btn btn-secondary st-btn"
                    onClick={() => {
                      allowMore();
                      setAsking(false);
                    }}
                  >
                    Allow one more
                  </button>
                  <button type="button" className="btn btn-ghost st-btn" onClick={() => setAsking(false)}>
                    Not today
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-ghost st-btn st-today-askbtn" onClick={() => setAsking(true)}>
                Ask a grown-up
              </button>
            )}
          </div>
        ) : (
          <Link href="/app/lesson" className="btn btn-primary btn-xl st-today-go">
            {done ? "Read rung 40 again" : "Begin today’s lesson"}
            <IconArrowRight size={22} />
          </Link>
        )}
      </div>
    </section>
  );
}

export function CleanReads({ reads, total = CLEAN_READS_TO_MASTER, mastered }: { reads: number; total?: number; mastered?: boolean }) {
  return (
    <p className="st-reads" data-mastered={mastered || undefined}>
      <span className="st-reads-dots" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} data-on={i < reads || undefined} />
        ))}
      </span>
      <span>
        {Math.min(reads, total)} of {total} clean reads
      </span>
    </p>
  );
}

/* ---------- Placement first ---------- */

function PlacementCard({ child }: { child: Child }) {
  return (
    <section className="st-today st-today-place surface-drill" aria-labelledby="st-place-title">
      <div className="st-today-page">
        <div className="st-today-lp st-today-lp-wren">
          <WrenAvatar size={132} />
        </div>
      </div>
      <div className="st-today-body">
        <p className="st-eyebrow">First, a short placement</p>
        <h2 id="st-place-title" className="st-today-title">
          Let us find where you begin, {child.name}.
        </h2>
        <p className="st-today-story">About ten minutes with a grown-up: a few sounds, a few words, one short story.</p>
        <Link href="/app/placement" className="btn btn-primary btn-xl st-today-go">
          Take the placement
          <IconArrowRight size={22} />
        </Link>
      </div>
    </section>
  );
}

/* ---------- Tiles ---------- */

function Tile({ href, title, sub, art }: { href: string; title: string; sub: string; art: ReactNode }) {
  return (
    <Link href={href} className="st-tile">
      <span className="st-tile-art" aria-hidden>
        {art}
      </span>
      <span className="st-tile-text">
        <span className="st-tile-title">{title}</span>
        <span className="st-tile-sub">{sub}</span>
      </span>
      <IconArrowRight size={22} className="st-tile-go" />
    </Link>
  );
}

/** Three syllables from the child's ladder, set on a little ladder. */
function LadderArt({ ladder }: { ladder: LadderState }) {
  const r = getRung(ladder.rung);
  const left = (r.ladder?.left ?? ["a", "e", "i", "o", "u"]).filter(Boolean).slice(0, 3) as string[];
  return (
    <span className="st-ladart">
      {left
        .slice()
        .reverse()
        .map((s) => (
          <span key={s} className="st-ladart-rung">
            <span className="vowel-lg">{s}</span>
          </span>
        ))}
    </span>
  );
}

function SealArt({ ladder }: { ladder: LadderState }) {
  const last = [...ladder.mastered].sort((a, b) => b - a)[0];
  if (!last) return <Seal n={1} short="1" size={68} mini className="st-seal-faint" />;
  const r = getRung(last);
  return <Seal n={r.n} short={r.short} size={68} />;
}

/* ---------- Screen time ---------- */

function ScreenTime({ used, cap }: { used: number; cap: number }) {
  const left = Math.max(0, cap - used);
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 100;
  return (
    <section className="st-time" aria-label="Screen time today">
      <IconClock size={20} />
      <p className="st-time-text">
        {left > 0 ? (
          <>
            <strong className="num">{left}</strong> {left === 1 ? "minute" : "minutes"} of screen time left today
          </>
        ) : (
          <>Screen time is done for today</>
        )}
      </p>
      <span className="st-time-bar" aria-hidden>
        <span style={{ width: `${100 - pct}%` }} />
      </span>
    </section>
  );
}
