"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Child } from "@/lib/types";
import { placementFor, sessionsFor, useDemo, weekMinutes } from "@/lib/store";
import { MAX_RUNG, getRung } from "@/lib/ladder";
import { Illustration } from "@/components/Illustration";
import { IconArrowRight, IconChart, IconGift, IconPlus, IconPrint } from "@/components/icons";
import { RungTrack, Tile } from "./ui";
import { classOf, dayWord, dueWord, ladderOf, lessonName, listNames, pct, plural, reviewsDue, timed } from "./lib";

/** The family's home: one card per child, the week in minutes, and the next step for each child. */
export function ParentHome() {
  const { state, familyTenant, visibleChildren, actions, can } = useDemo();
  const router = useRouter();
  const now = Date.now();
  const kids = visibleChildren;

  const weeks = kids.map((c) => ({ child: c, week: weekMinutes(state, c.id, now) }));
  const total = weeks.reduce(
    (a, w) => ({ screen: a.screen + w.week.screen, paper: a.paper + w.week.paper, lessons: a.lessons + w.week.lessons }),
    { screen: 0, paper: 0, lessons: 0 },
  );
  const readers = weeks.filter((w) => w.week.lessons > 0).map((w) => w.child.name);

  const anyHistory = kids.some((c) => sessionsFor(state, c.id).length > 0);
  const summary =
    kids.length === 0
      ? "Add a child to begin. Placement takes about ten minutes."
      : !anyHistory
        ? `${listNames(kids.map((c) => c.name))} ${kids.length === 1 ? "is" : "are"} ready for placement. It takes about ten minutes.`
        : total.lessons === 0
          ? `No lessons yet this week. ${kids.length === 1 ? `${kids[0].name} is` : "Everyone is"} ready for the next one.`
          : `${listNames(readers)} read ${plural(total.lessons, "lesson")} this week: ${total.paper} minutes on paper, ${total.screen} on screen.`;

  const ref = state.referrals.find((r) => r.ownerMemberId === state.ui.actorId);
  const milestoneChild = kids.find((c) => ladderOf(state, c.id).mastered.length >= 3);
  const paperShare = total.paper + total.screen > 0 ? total.paper / (total.paper + total.screen) : 0;

  const handTo = (c: Child, path: string) => {
    actions.selectChild(c.id);
    actions.switchRole("student");
    router.push(path);
  };

  return (
    <div className="container ap-page">
      <section className="ap-hero" aria-labelledby="home-title">
        <div className="ap-hero-art" aria-hidden>
          <Illustration id="hearth-reading" alt="" priority />
        </div>
        <div className="ap-hero-body">
          <div className="ap-hero-text">
            <p className="eyebrow">Family home</p>
            <h1 className="ap-title" id="home-title">
              {familyTenant?.name ?? "Your family"}
            </h1>
            <p className="ap-sub">{summary}</p>
          </div>
          {anyHistory && (
            <div className="ap-hero-tiles" aria-label="This week">
              <Tile className="glass" label="Lessons this week" value={total.lessons} note={`${kids.length === 1 ? kids[0].name : "All children"}, last 7 days`} />
              <Tile className="glass" label="On paper" value={total.paper} unit="min" note={total.paper + total.screen > 0 ? `${pct(paperShare)} of reading time` : "Lessons print"} />
              <Tile className="glass" label="On screen" value={total.screen} unit="min" note="Reading checks only" />
            </div>
          )}
        </div>
      </section>

      <div className="ap-kids">
        {kids.map((c) => (
          <ChildCard key={c.id} child={c} onHand={(path) => handTo(c, path)} onSelect={() => actions.selectChild(c.id)} now={now} />
        ))}

        <Link href="/app/onboarding" className="ap-addkid">
          <span className="ap-addkid-icon" aria-hidden>
            <IconPlus size={22} />
          </span>
          <span className="ap-addkid-text">
            <strong>Add a child</strong>
            <span>Set the age, interests and screen limit. Placement comes next.</span>
          </span>
        </Link>
      </div>

      {can("referrals.use") && milestoneChild && ref && (
        <aside className="ap-refer card" aria-labelledby="refer-title">
          <span className="ap-refer-icon" aria-hidden>
            <IconGift size={22} />
          </span>
          <div className="ap-refer-text min-0">
            <h2 id="refer-title" className="ap-refer-title">
              {milestoneChild.name} mastered {ladderOf(state, milestoneChild.id).mastered.length} rungs. Give a friend a month.
            </h2>
            <p className="muted">
              Invite a family. When they pay, you each get a month free. {ref.monthsEarned} of {ref.cap} months earned this year.
            </p>
          </div>
          <Link href="/app/referrals" className="btn btn-secondary ap-refer-cta">
            Invite a family <IconArrowRight size={18} />
          </Link>
        </aside>
      )}

      {anyHistory && <WeekByChild weeks={weeks} />}
    </div>
  );
}

function ChildCard({
  child,
  onHand,
  onSelect,
  now,
}: {
  child: Child;
  onHand: (path: string) => void;
  onSelect: () => void;
  now: number;
}) {
  const { state } = useDemo();
  const ladder = ladderOf(state, child.id);
  const rung = getRung(ladder.rung);
  const sessions = sessionsFor(state, child.id);
  const last = sessions[sessions.length - 1];
  const lastTimed = timed(sessions).pop();
  const placed = Boolean(placementFor(state, child.id)) || sessions.length > 0;
  const due = reviewsDue(ladder, now)[0];
  const nextReview = [...ladder.review].sort((a, b) => a.due.localeCompare(b.due))[0];
  const klass = classOf(state, child);
  const school = child.linkedTenantIds?.length ? state.tenants.find((t) => child.linkedTenantIds?.includes(t.id))?.name : undefined;
  const cleanReads = ladder.cleanReads[ladder.rung] ?? 0;

  return (
    <article className="ap-kid card" aria-labelledby={`kid-${child.id}`}>
      <header className="ap-kid-head">
        <span className="ap-kid-mono" aria-hidden>
          {child.name.slice(0, 1)}
        </span>
        <div className="min-0">
          <h2 className="ap-kid-name" id={`kid-${child.id}`}>
            {child.name}
          </h2>
          <p className="ap-kid-meta">
            Age {child.age}
            {klass && school ? ` · ${klass.name}, ${school.replace(/ Classical Academy$/, "")}` : ""}
            {` · ${child.mode === "paper" ? "Paper first" : "Screen lessons"}`}
          </p>
        </div>
      </header>

      <div className="ap-kid-rung">
        <div className="ap-kid-rung-row">
          <p className="ap-kid-rung-num">
            Rung {ladder.rung}
            <span className="muted"> of {MAX_RUNG}</span>
          </p>
          <p className="ap-kid-rung-mastered">
            <strong>{ladder.mastered.length}</strong> mastered
          </p>
        </div>
        <p className="ap-kid-rung-title">{rung.title}</p>
        <RungTrack ladder={ladder} />
      </div>

      {placed ? (
        <dl className="ap-kid-stats">
          <div>
            <dt>Last reading</dt>
            <dd>{last ? dayWord(last.date, now) : "None yet"}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd className="num">{last ? pct(last.accuracy) : "None"}</dd>
          </div>
          <div>
            <dt>Words a minute</dt>
            <dd className="num">{lastTimed ? lastTimed.wcpm : "Not timed"}</dd>
          </div>
        </dl>
      ) : (
        <p className="ap-kid-new">
          No readings yet. Placement takes about ten minutes and finds {child.name}&apos;s first rung.
        </p>
      )}

      <div className="ap-kid-next">
        <p className="ap-kid-next-label">Next lesson</p>
        <p className="ap-kid-next-title">
          {lessonName(ladder.rung)}
          <span className="muted"> · rung {ladder.rung}</span>
        </p>
        <p className="ap-kid-next-note">
          {due ? (
            <span className="pill pill-review">Review rung {due.rung}</span>
          ) : nextReview ? (
            <span className="muted">
              Review rung {nextReview.rung}. {dueWord(nextReview.due, now)}.
            </span>
          ) : (
            <span className="muted">{cleanReads > 0 ? `${plural(cleanReads, "clean read")} of 2 on this rung.` : "Two clean reads master a rung."}</span>
          )}
        </p>
      </div>

      <div className="ap-kid-actions">
        {placed ? (
          <button type="button" className="btn btn-primary" onClick={() => onHand("/app/student")}>
            Hand the device to {child.name}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => onHand("/app/placement")}>
            Start placement with {child.name}
          </button>
        )}
        <div className="ap-kid-links">
          <Link href="/app/print" className="btn btn-quiet" onClick={onSelect}>
            <IconPrint size={18} /> Print this week
          </Link>
          <Link href="/app/report" className="btn btn-quiet" onClick={onSelect}>
            <IconChart size={18} /> Report
          </Link>
        </div>
      </div>
    </article>
  );
}

function WeekByChild({ weeks }: { weeks: { child: Child; week: { screen: number; paper: number; lessons: number } }[] }) {
  if (weeks.length === 0) return null;
  const max = Math.max(1, ...weeks.map((w) => w.week.screen + w.week.paper));
  return (
    <section className="ap-section" aria-labelledby="week-title">
      <div className="ap-section-head">
        <div>
          <h2 id="week-title" className="ap-h2">
            This week
          </h2>
          <p className="ap-section-sub">Minutes on paper next to minutes on screen, last 7 days.</p>
        </div>
        <div className="ap-legend" aria-hidden>
          <span className="ap-legend-item">
            <span className="ap-key ap-key-paper" /> Paper
          </span>
          <span className="ap-legend-item">
            <span className="ap-key ap-key-screen" /> Screen
          </span>
        </div>
      </div>
      <ul className="ap-weeklist card">
        {weeks.map(({ child, week }) => {
          const sum = week.paper + week.screen;
          return (
            <li key={child.id} className="ap-weekrow">
              <div className="ap-weekrow-name">
                <strong>{child.name}</strong>
                <span className="muted">{plural(week.lessons, "lesson")}</span>
              </div>
              <div
                className="ap-split"
                role="img"
                aria-label={`${child.name}: ${week.paper} minutes on paper, ${week.screen} minutes on screen.`}
              >
                <div className="ap-split-bar" style={{ width: `${(sum / max) * 100}%` }}>
                  {week.paper > 0 && <span className="ap-split-paper" style={{ flexGrow: week.paper }} />}
                  {week.screen > 0 && <span className="ap-split-screen" style={{ flexGrow: week.screen }} />}
                </div>
              </div>
              <div className="ap-weekrow-nums num">
                <span>
                  <strong>{week.paper}</strong> paper
                </span>
                <span>
                  <strong>{week.screen}</strong> screen
                </span>
                <span className="muted">Cap {child.screenCapMinutes} a day</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
