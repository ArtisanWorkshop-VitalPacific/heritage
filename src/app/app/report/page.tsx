"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { placementFor, sessionsFor, useDemo, weekMinutes } from "@/lib/store";
import { MAX_RUNG, getRung } from "@/lib/ladder";
import { IconArrowRight, IconGift, IconPrint } from "@/components/icons";
import { Empty, Meter, PageHead, Section, Tile } from "@/components/adult/ui";
import { FluencyChart } from "@/components/adult/FluencyChart";
import { HearDifference } from "@/components/adult/HearDifference";
import { MasteryChips } from "@/components/adult/MasteryChips";
import { practiceWords } from "@/components/adult/packet/content";
import {
  classOf,
  dayWord,
  fmtDay,
  fmtFull,
  ladderOf,
  normFor,
  paceWords,
  pct,
  plural,
  projectionFor,
  timed,
} from "@/components/adult/lib";

/** "Today" and "Yesterday" read lowercase mid-sentence; weekday names keep their capital. */
function lastWord(w: string): string {
  return w === "Today" || w === "Yesterday" ? w.toLowerCase() : w;
}

const SOURCE: Record<string, string> = { screen: "Screen check", paper: "Paper, parent", teacher: "Paper, teacher" };

export default function ReportPage() {
  const { state, child, role, can } = useDemo();
  const [showAll, setShowAll] = useState(false);
  const now = Date.now();

  const data = useMemo(() => {
    if (!child) return null;
    const ladder = ladderOf(state, child.id);
    const sessions = sessionsFor(state, child.id);
    const timedSessions = timed(sessions);
    const norm = normFor(child.age);
    const first = timedSessions[0];
    const last = timedSessions[timedSessions.length - 1];
    return {
      ladder,
      sessions,
      timedSessions,
      norm,
      first,
      last,
      week: weekMinutes(state, child.id, now),
      projection: projectionFor(state, child.id, now),
      placement: placementFor(state, child.id),
    };
    // now changes every render; the report reads it once per state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, child]);

  if (!child || !data) {
    return (
      <div className="container ap-page">
        <PageHead eyebrow="Report" title="No child yet" />
        <Empty
          title="Reports start with a child profile."
          body="Add a child, run placement, and the first report appears after the first reading check."
          action={
            <Link href="/app/onboarding" className="btn btn-primary">
              Add a child
            </Link>
          }
        />
      </div>
    );
  }

  const { ladder, sessions, timedSessions, norm, first, last, week, projection } = data;
  const readOnly = role === "observer";
  const rung = getRung(ladder.rung);
  const klass = classOf(state, child);
  const lastAny = sessions[sessions.length - 1];
  const delta = first && last ? last.wcpm - first.wcpm : 0;
  const next3 = [ladder.rung, ladder.rung + 1, ladder.rung + 2].filter((n) => n <= MAX_RUNG);
  const rows = [...sessions].reverse();
  const shownRows = showAll ? rows : rows.slice(0, 8);
  const canHear = can("recordings.view");
  const canHistory = can("progress.history");

  const actions = (
    <>
      {can("packets.print") && (
        <Link href="/app/print" className="btn btn-primary">
          <IconPrint size={18} /> Print next week
        </Link>
      )}
      {can("referrals.use") && (
        <Link href="/app/referrals" className="btn btn-secondary">
          <IconGift size={18} /> Give a friend a month
        </Link>
      )}
    </>
  );

  return (
    <div className="container ap-page ap-report">
      <PageHead
        eyebrow={readOnly ? "Report · Read only" : "Report"}
        title={child.name}
        sub={
          <>
            Age {child.age}
            {klass ? ` · ${klass.name}` : ""} · {lastAny ? `Last reading ${lastWord(dayWord(lastAny.date, now))}` : "No readings yet"}
            {data.placement ? ` · Placed ${fmtFull(data.placement.date)} at rung ${data.placement.rung}` : ""}
          </>
        }
        actions={readOnly ? undefined : actions}
      />

      {readOnly && (
        <p className="ap-note" role="note">
          You see {child.name}&apos;s progress as an Observer. Parents change settings, print lessons and hear recordings.
        </p>
      )}

      <div className="ap-tiles ap-tiles-3">
        <Tile label="Rungs mastered" value={ladder.mastered.length} unit={`of ${MAX_RUNG}`} note={`${pct(ladder.mastered.length / MAX_RUNG)} of the ladder`}>
          <Meter value={ladder.mastered.length} max={MAX_RUNG} tone="mastered" label={`${ladder.mastered.length} of ${MAX_RUNG} rungs mastered`} />
        </Tile>
        <Tile
          label="Instructional level"
          value={<>Rung {ladder.rung}</>}
          note={
            <>
              <strong>{rung.title}</strong>.{" "}
              {(ladder.cleanReads[ladder.rung] ?? 0) > 0 ? `${plural(ladder.cleanReads[ladder.rung], "clean read")} of 2.` : "Two clean reads master it."}
            </>
          }
        />
        <Tile
          label="Fluency"
          value={last ? last.wcpm : "None"}
          unit={last ? "words a minute" : undefined}
          note={
            first && last && first !== last ? (
              <>
                <strong>
                  {delta >= 0 ? "+" : ""}
                  {delta}
                </strong>{" "}
                since {fmtDay(first.date)}. {norm.label}: {norm.wcpm}.
              </>
            ) : (
              "Fluency appears after the first timed reading."
            )
          }
        />
      </div>

      <div className="ap-report-main">
        <Section
          className="ap-card-section"
          title="Words correct per minute"
          sub={`${plural(timedSessions.length, "timed reading")}. The gray line marks the ${norm.label} (Hasbrouck and Tindal, 2017).`}
        >
          {timedSessions.length >= 2 ? (
            <FluencyChart sessions={timedSessions} norm={norm} childName={child.name} />
          ) : (
            <Empty title="The chart starts after two timed readings." body="Each three-minute reading check adds a point." />
          )}
        </Section>

        <Section className="ap-card-section" title="Next three skills">
          <ol className="ap-skills">
            {next3.map((n, i) => {
              const r = getRung(n);
              return (
                <li key={n} className="ap-skill" data-current={i === 0 || undefined}>
                  <span className="ap-skill-n num">{n}</span>
                  <div className="min-0">
                    <p className="ap-skill-title">{r.title}</p>
                    <p className="ap-skill-words book">{practiceWords(r).slice(0, 4).join("  ")}</p>
                  </div>
                  <span className={`pill ${i === 0 ? "pill-current" : "pill-outline"}`}>{i === 0 ? "Now" : i === 1 ? "Next" : "Then"}</span>
                </li>
              );
            })}
          </ol>
          <div className="ap-project">
            {projection.kind === "date" ? (
              <>
                <p className="ap-project-label">Projected</p>
                <p className="ap-project-value">
                  {projection.group.label} by {fmtDay(projection.date, now)}
                </p>
                <p className="ap-project-note">
                  At {paceWords(projection.perWeek)}. {plural(projection.toGo, "rung")} to go to rung {projection.group.from}.
                </p>
              </>
            ) : projection.kind === "unknown" ? (
              <>
                <p className="ap-project-label">Projected</p>
                <p className="ap-project-value">{projection.group.label} next</p>
                <p className="ap-project-note">A projected date appears after two weeks of lessons.</p>
              </>
            ) : (
              <>
                <p className="ap-project-label">Last group</p>
                <p className="ap-project-value">Two-syllable words</p>
                <p className="ap-project-note">{child.name} is on the final rung of the ladder.</p>
              </>
            )}
          </div>
        </Section>
      </div>

      <div className="ap-cols">
        {canHear ? (
          <Section
            className="ap-card-section"
            title="Hear the difference"
            sub={`The same lines at ${child.name}'s week 1 pace and this week's pace.`}
            actions={<span className="pill pill-outline">Sample audio</span>}
          >
            <HearDifference child={child} sessions={timedSessions} rung={ladder.rung} />
          </Section>
        ) : (
          <Section className="ap-card-section" title="Recordings">
            <p className="muted">Recordings are for parents. Observers see progress only.</p>
          </Section>
        )}

        <Section className="ap-card-section" title="This week" sub="Last 7 days.">
          <div className="ap-minutes">
            <div className="ap-minutes-item">
              <span className="ap-minutes-label">
                <span className="ap-key ap-key-paper" aria-hidden /> On paper
              </span>
              <span className="ap-minutes-value">
                {week.paper}
                <span className="ap-tile-unit">min</span>
              </span>
            </div>
            <div className="ap-minutes-item">
              <span className="ap-minutes-label">
                <span className="ap-key ap-key-screen" aria-hidden /> On screen
              </span>
              <span className="ap-minutes-value">
                {week.screen}
                <span className="ap-tile-unit">min</span>
              </span>
            </div>
            <div className="ap-minutes-item">
              <span className="ap-minutes-label">Lessons</span>
              <span className="ap-minutes-value">{week.lessons}</span>
            </div>
          </div>
          <div className="ap-split ap-split-lg" role="img" aria-label={`${week.paper} minutes on paper, ${week.screen} minutes on screen.`}>
            <div className="ap-split-bar" style={{ width: "100%" }}>
              {week.paper > 0 && <span className="ap-split-paper" style={{ flexGrow: week.paper }} />}
              {week.screen > 0 && <span className="ap-split-screen" style={{ flexGrow: week.screen }} />}
              {week.paper + week.screen === 0 && <span className="ap-split-none" />}
            </div>
          </div>
          <p className="ap-section-sub">
            Screen cap: {child.screenCapMinutes} minutes a day. The screen holds the three-minute reading check. The rest is on paper.
          </p>
        </Section>
      </div>

      <Section
        title="Mastery"
        sub={`${ladder.mastered.length} of ${MAX_RUNG} rungs. Two clean reads at 95% or better master a rung.`}
        actions={
          <Link href="/app/ladder" className="ap-textlink">
            See the ladder <IconArrowRight size={16} />
          </Link>
        }
      >
        <div className="card">
          <MasteryChips ladder={ladder} />
        </div>
      </Section>

      {canHistory ? (
        <Section
          title="Recent readings"
          sub={`${plural(sessions.length, "reading")} since ${sessions[0] ? fmtFull(sessions[0].date) : "placement"}.`}
          actions={
            rows.length > 8 ? (
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                {showAll ? "Show recent" : `Show all ${rows.length}`}
              </button>
            ) : undefined
          }
        >
          {rows.length ? (
            <div className="ap-scroll card ap-table-card">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Rung</th>
                    <th scope="col" className="ap-num">
                      Accuracy
                    </th>
                    <th scope="col">Read</th>
                    <th scope="col" className="ap-num">
                      Words a minute
                    </th>
                    <th scope="col">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {shownRows.map((s) => (
                    <tr key={s.id}>
                      <td>{fmtDay(s.date, now)}</td>
                      <td>
                        <span className="num">{s.rung}</span> <span className="muted">{getRung(s.rung).short}</span>
                      </td>
                      <td className="ap-num">{pct(s.accuracy)}</td>
                      <td>{s.clean ? <span className="ap-clean">Clean</span> : <span className="muted">Practice</span>}</td>
                      <td className="ap-num">{s.wcpm > 0 ? s.wcpm : <span className="muted">Not timed</span>}</td>
                      <td className="muted">{SOURCE[s.source] ?? s.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No readings yet." body="The first reading check fills this in." />
          )}
        </Section>
      ) : (
        <p className="ap-note" role="note">
          Session history is for parents. Observers see the summary above.
        </p>
      )}

      {!readOnly && (
        <div className="ap-report-foot">
          <p className="muted">Paper first. Print next week, teach at the table, and use the screen for the three-minute check.</p>
          <div className="cluster">{actions}</div>
        </div>
      )}

    </div>
  );
}
