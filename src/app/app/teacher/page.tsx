"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import type { Child, Member } from "@/lib/types";
import { sessionsFor, useDemo } from "@/lib/store";
import { applySession, getRung } from "@/lib/ladder";
import { roleLabel } from "@/lib/roles";
import { IconLock, IconPrint } from "@/components/icons";
import { Dialog, Empty, PageHead, Section, Tile, useToast } from "@/components/adult/ui";
import { MasteryBoard } from "@/components/adult/MasteryBoard";
import { ClassGroupPackets } from "@/components/adult/ClassPackets";
import { DAY, dayWord, dueWord, fmtDay, ladderOf, lastSession, pct, plural, reviewsDue } from "@/components/adult/lib";

export default function TeacherPage() {
  const { state, role, actor, can } = useDemo();
  const { show, node: toast } = useToast();
  const all = role === "admin" || role === "owner";
  const classes = useMemo(
    () => state.classes.filter((k) => (all ? k.tenantId === actor?.tenantId : (actor?.classIds ?? []).includes(k.id))),
    [state.classes, all, actor?.tenantId, actor?.classIds],
  );
  const [classId, setClassId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const k = classes.find((c) => c.id === classId) ?? classes[0];
  const now = Date.now();
  const limited = !can("progress.group");

  const students = useMemo(() => (k ? state.children.filter((c) => k.studentIds.includes(c.id)) : []), [k, state.children]);
  const open = students.find((c) => c.id === openId) ?? null;

  if (!k) {
    return (
      <div className="container ap-page">
        <PageHead eyebrow="Class" title="No class yet" />
        <Empty title="No classes are assigned to you." body="An Admin assigns classes to Teachers and Aides." />
      </div>
    );
  }

  const teacher = state.members.find((m) => m.id === k.teacherId);
  const weekAgo = now - 7 * DAY;
  const weekSessions = state.sessions.filter((s) => k.studentIds.includes(s.childId) && new Date(s.date).getTime() >= weekAgo);
  const avg = weekSessions.length ? weekSessions.reduce((n, s) => n + s.accuracy, 0) / weekSessions.length : 0;
  const reviewKids = students.filter((c) => reviewsDue(ladderOf(state, c.id), now).length > 0);
  const onTrack = students.filter((c) => {
    const last = lastSession(state, c.id);
    return last && new Date(last.date).getTime() >= weekAgo && last.accuracy >= 0.9 && reviewsDue(ladderOf(state, c.id), now).length === 0;
  });
  const rungsInUse = new Set(students.map((c) => ladderOf(state, c.id).rung)).size;

  return (
    <div className="container ap-page">
      <PageHead
        eyebrow={all ? "Classes" : "Class"}
        title={k.name}
        sub={`${teacher?.name ?? "Teacher"} · ${plural(students.length, "student")} · ${state.tenants.find((t) => t.id === k.tenantId)?.name ?? ""}`}
        actions={
          classes.length > 1 ? (
            <div className="segmented" role="radiogroup" aria-label="Class">
              {classes.map((c) => (
                <button key={c.id} type="button" role="radio" aria-checked={c.id === k.id} onClick={() => setClassId(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {limited ? (
        <div className="ap-tiles ap-tiles-3">
          <Tile label="Students" value={students.length} />
          <Tile label="Rungs in use" value={rungsInUse} note="One packet each" />
          <Tile label="Reviews due today" value={reviewKids.length} note={reviewKids.map((c) => c.name).join(", ") || "None"} />
        </div>
      ) : (
        <div className="ap-tiles ap-tiles-4">
          <Tile label="Students" value={students.length} note={`On ${plural(rungsInUse, "rung")}`} />
          <Tile label="On track" value={onTrack.length} unit={`of ${students.length}`} note="Read this week at 90% or better, no review overdue" />
          <Tile label="Review due" value={reviewKids.length} note={reviewKids.map((c) => c.name).join(", ") || "None today"} />
          <Tile
            label="Average accuracy"
            value={weekSessions.length ? pct(avg) : "None"}
            note={weekSessions.length ? `${plural(weekSessions.length, "reading")} this week` : "No readings this week"}
          />
        </div>
      )}

      <Section
        title="Mastery board"
        sub={
          limited
            ? "Aides see each student's current rung. Progress history is for Teachers. Select a student to print or enter a paper score."
            : "One row per student, one column per group of rungs. Select a student for detail and paper scores."
        }
        actions={
          <div className="ap-legend" aria-label="Legend">
            {!limited && (
              <span className="ap-legend-item">
                <span className="ap-cell ap-cell-key" data-state="mastered" aria-hidden /> Mastered
              </span>
            )}
            <span className="ap-legend-item">
              <span className="ap-cell ap-cell-key" data-state="current" aria-hidden /> Current
            </span>
            {!limited && (
              <span className="ap-legend-item">
                <span className="ap-cell ap-cell-key" data-state="upcoming" aria-hidden>
                  <span className="ap-cell-dot" />
                </span>{" "}
                Review due
              </span>
            )}
            {!limited && (
              <span className="ap-legend-item">
                <span className="ap-cell ap-cell-key" data-state="upcoming" aria-hidden /> Ahead
              </span>
            )}
          </div>
        }
      >
        <MasteryBoard state={state} students={students} selectedId={openId} onOpen={(c) => setOpenId(c.id)} limited={limited} />
      </Section>

      <ClassGroupPackets
        k={k}
        title="Print class packets"
        sub={`Grouped by current rung. ${plural(rungsInUse, "packet")} for ${plural(students.length, "student")}, plus reviews due.`}
      />

      <Team classId={k.id} onToast={show} />

      <Dialog
        open={Boolean(open)}
        onClose={() => setOpenId(null)}
        variant="drawer"
        title={open?.name ?? ""}
        sub={open ? `Age ${open.age} · ${k.name}` : undefined}
      >
        {open && <StudentPanel child={open} onToast={show} />}
      </Dialog>
      {toast}
    </div>
  );
}

/* ---------- The student drawer ---------- */

function StudentPanel({ child, onToast }: { child: Child; onToast: (m: string) => void }) {
  const { state, can } = useDemo();
  const now = Date.now();
  const ladder = ladderOf(state, child.id);
  const r = getRung(ladder.rung);
  const sessions = sessionsFor(state, child.id);
  const last = sessions[sessions.length - 1];
  const lastTimed = [...sessions].reverse().find((s) => s.wcpm > 0);
  const due = reviewsDue(ladder, now);
  const showProgress = can("progress.group");
  const cleanReads = ladder.cleanReads[ladder.rung] ?? 0;

  return (
    <div className="ap-panel">
      <div className="ap-panel-rung">
        <span className="ap-panel-rungn num">{ladder.rung}</span>
        <div className="min-0">
          <p className="ap-panel-rungtitle">{r.title}</p>
          <p className="muted ap-small">
            {r.passage ? `${r.passage.title} · ` : ""}
            {showProgress ? `${plural(cleanReads, "clean read")} of 2` : "Current rung"}
          </p>
        </div>
      </div>

      {showProgress && (
        <dl className="ap-panel-stats">
          <div>
            <dt>Last accuracy</dt>
            <dd className="num">{last ? pct(last.accuracy) : "None"}</dd>
          </div>
          <div>
            <dt>Words a minute</dt>
            <dd className="num">{lastTimed ? lastTimed.wcpm : "Not timed"}</dd>
          </div>
          <div>
            <dt>Last reading</dt>
            <dd>{last ? dayWord(last.date, now) : "None"}</dd>
          </div>
        </dl>
      )}

      {due.length > 0 && (
        <div className="ap-panel-review">
          <span className="pill pill-review">Review due</span>
          <span>
            {due.map((d) => `Rung ${d.rung}, ${dueWord(d.due, now).toLowerCase()}`).join(". ")}.
          </span>
        </div>
      )}

      <div className="ap-panel-actions">
        <Link href={`/app/print/${child.id}-r${ladder.rung}`} className="btn btn-secondary">
          <IconPrint size={18} /> Print packet, rung {ladder.rung}
        </Link>
        {due.map((d) => (
          <Link key={d.rung} href={`/app/print/${child.id}-r${d.rung}`} className="btn btn-ghost">
            <IconPrint size={18} /> Review packet, rung {d.rung}
          </Link>
        ))}
      </div>

      {can("scores.enter") ? (
        <ScoreForm child={child} onToast={onToast} key={child.id} />
      ) : (
        <p className="ap-note">
          <IconLock size={14} /> Admins do not enter scores. Teachers, Aides and Parents do.
        </p>
      )}

      {showProgress ? (
        <div className="ap-panel-history">
          <p className="ap-panel-label">Recent readings</p>
          {sessions.length ? (
            <ul>
              {[...sessions]
                .reverse()
                .slice(0, 4)
                .map((s) => (
                  <li key={s.id}>
                    <span className="muted">{fmtDay(s.date, now)}</span>
                    <span className="num">Rung {s.rung}</span>
                    <span className="num">{pct(s.accuracy)}</span>
                    <span className="num muted">{s.wcpm > 0 ? `${s.wcpm} wpm` : s.source === "teacher" ? "Paper" : "Not timed"}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="muted ap-small">No readings yet.</p>
          )}
        </div>
      ) : (
        <p className="ap-note">Aides enter scores and print packets. Reading history is for Teachers.</p>
      )}
    </div>
  );
}

function ScoreForm({ child, onToast }: { child: Child; onToast: (m: string) => void }) {
  const { state, actions } = useDemo();
  const ladder = ladderOf(state, child.id);
  const now = Date.now();
  const options = [ladder.rung, ...reviewsDue(ladder, now).map((r) => r.rung)];
  const [rung, setRung] = useState(ladder.rung);
  const [acc, setAcc] = useState("");
  const [min, setMin] = useState("12");
  const [errors, setErrors] = useState<{ acc?: string; min?: string; form?: string }>({});
  const [result, setResult] = useState<string | null>(null);
  const id = useId();

  useEffect(() => {
    setRung(ladderOf(state, child.id).rung);
    // reset the rung choice when the child's ladder moves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const a = Number(acc);
    const m = Number(min);
    const next: typeof errors = {};
    if (acc.trim() === "" || !Number.isFinite(a) || a < 0 || a > 100) next.acc = "Enter accuracy from 0 to 100.";
    if (!Number.isFinite(m) || m < 1 || m > 60) next.min = "Enter minutes from 1 to 60.";
    setErrors(next);
    if (next.acc || next.min) return;
    const accuracy = Math.round(a) / 100;
    const preview = applySession(ladderOf(state, child.id), { rung, accuracy, date: new Date().toISOString() });
    const res = actions.enterScore({ childId: child.id, rung, accuracy, paperMinutes: Math.round(m) });
    if (!res.ok) {
      setErrors({ form: res.error ?? "The score was not saved." });
      return;
    }
    const isReview = rung !== ladder.rung;
    const msg = preview.masteredRung
      ? `Rung ${preview.masteredRung} mastered. ${child.name} moves to rung ${preview.masteredRung + 1}.`
      : isReview
        ? preview.clean
          ? `Review of rung ${rung} cleared.`
          : `Rung ${rung} stays on the review list.`
        : preview.clean
          ? `Clean read. ${preview.cleanReads} of 2 on rung ${rung}.`
          : preview.remediate
            ? `Below 90%. Teach rung ${rung} again tomorrow.`
            : `Saved. ${Math.round(a)}% on rung ${rung}. A clean read needs 95%.`;
    setResult(msg);
    onToast(`Score saved for ${child.name}.`);
    setAcc("");
  };

  return (
    <form className="ap-scoreform" onSubmit={submit} noValidate aria-labelledby={`${id}-t`}>
      <p className="ap-panel-label" id={`${id}-t`}>
        Enter paper score
      </p>
      <div className="ap-scoreform-fields">
        <div className="field">
          <label htmlFor={`${id}-r`}>Rung</label>
          <select id={`${id}-r`} className="select" value={rung} onChange={(e) => setRung(Number(e.target.value))}>
            {options.map((n, i) => (
              <option key={n} value={n}>
                {i === 0 ? n : `${n} (review)`}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-a`}>Accuracy %</label>
          <input
            id={`${id}-a`}
            className="input num"
            inputMode="numeric"
            placeholder="96"
            value={acc}
            onChange={(e) => setAcc(e.target.value.replace(/[^0-9.]/g, ""))}
            aria-invalid={Boolean(errors.acc)}
            aria-describedby={errors.acc ? `${id}-ae` : undefined}
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-m`}>Minutes</label>
          <input
            id={`${id}-m`}
            className="input num"
            inputMode="numeric"
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/[^0-9]/g, ""))}
            aria-invalid={Boolean(errors.min)}
            aria-describedby={errors.min ? `${id}-me` : undefined}
          />
        </div>
      </div>
      {errors.acc && (
        <p className="field-error" id={`${id}-ae`} role="alert">
          {errors.acc}
        </p>
      )}
      {errors.min && (
        <p className="field-error" id={`${id}-me`} role="alert">
          {errors.min}
        </p>
      )}
      {errors.form && (
        <p className="field-error" role="alert">
          {errors.form}
        </p>
      )}
      <button type="submit" className="btn btn-primary">
        Save score
      </button>
      {result && (
        <p className="ap-scoreform-result" role="status">
          {result}
        </p>
      )}
    </form>
  );
}

/* ---------- The class team ---------- */

function Team({ classId, onToast }: { classId: string; onToast: (m: string) => void }) {
  const { state, actor, can, actions } = useDemo();
  const k = state.classes.find((c) => c.id === classId);
  const unique = state.members.filter((m) => m.tenantId === k?.tenantId && (m.id === k?.teacherId || (m.classIds ?? []).includes(classId)));
  const [editing, setEditing] = useState<string | null>(null);
  const [target, setTarget] = useState<Member["role"]>("teacher");
  const [msg, setMsg] = useState<{ id: string; text: string; refused: boolean } | null>(null);
  const editable = can("roles.edit");

  const apply = (m: Member) => {
    const res = actions.changeRole(m.id, target);
    if (!res.ok) {
      setMsg({
        id: m.id,
        refused: true,
        text: `${res.error ?? "Refused."} Only Admins and the Owner change roles. The attempt is recorded in the audit log.`,
      });
    } else {
      setMsg({ id: m.id, refused: false, text: `${m.name} is now ${roleLabel(target)}.` });
      onToast(`${m.name} is now ${roleLabel(target)}.`);
    }
    setEditing(null);
  };

  return (
    <Section
      title="Class team"
      sub={editable ? "Admins and the Owner can change roles here or on the Organization page." : "Roles are set by an Admin or the Owner."}
    >
      <ul className="ap-team card">
        {unique.map((m) => {
          const self = m.id === actor?.id;
          return (
            <li key={m.id} className="ap-team-row">
              <span className="ap-member-mono" aria-hidden>
                {m.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="min-0 ap-team-who">
                <p className="ap-member-name">
                  {m.name}
                  {self && <span className="pill pill-outline ap-member-you">You</span>}
                </p>
                <p className="ap-member-email">{roleLabel(m.role)}</p>
                {msg?.id === m.id && (
                  <p className={msg.refused ? "field-error" : "ap-rowmsg"} role={msg.refused ? "alert" : "status"}>
                    {msg.text}
                  </p>
                )}
              </div>
              {!self &&
                (editing === m.id ? (
                  <div className="ap-team-edit">
                    <label className="visually-hidden" htmlFor={`team-${m.id}`}>
                      New role for {m.name}
                    </label>
                    <select id={`team-${m.id}`} className="select" value={target} onChange={(e) => setTarget(e.target.value as Member["role"])}>
                      {(["admin", "teacher", "aide"] as const).map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => apply(m)}>
                      Apply
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setMsg(null);
                      setTarget(m.role === "aide" ? "teacher" : "aide");
                      setEditing(m.id);
                    }}
                  >
                    {!editable && <IconLock size={14} />} Change role
                  </button>
                ))}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
