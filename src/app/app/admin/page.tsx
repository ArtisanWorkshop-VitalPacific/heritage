"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import type { AuditEvent, Member } from "@/lib/types";
import { useDemo } from "@/lib/store";
import { roleLabel } from "@/lib/roles";
import { Illustration } from "@/components/Illustration";
import { IconCheck, IconLock, IconPaper, IconPlus, IconRefresh, IconShield, IconUsers } from "@/components/icons";
import { Meter, Section, Tile, useToast } from "@/components/adult/ui";
import { RolesMatrix } from "@/components/adult/RolesMatrix";
import { DAY, auditLine, download, fmtFull, fmtTime, lastNightlySync, masteryCsv, plural, relTime } from "@/components/adult/lib";

const PRICE_PER_SEAT = 180;

function article(word: string) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

export default function AdminPage() {
  const { state, tenant, role, actor, visibleChildren, actions, can } = useDemo();
  const { show, node: toast } = useToast();
  const now = Date.now();

  // Store order (owner first in the seed, new members last) keeps a row in place when its role changes.
  const members = useMemo(() => state.members.filter((m) => m.tenantId === tenant?.id), [state.members, tenant?.id]);
  const classes = state.classes.filter((k) => k.tenantId === tenant?.id);
  const audit = useMemo(
    () => state.audit.filter((a) => a.tenantId === tenant?.id).sort((a, b) => b.date.localeCompare(a.date)),
    [state.audit, tenant?.id],
  );
  const seats = tenant?.seats ?? 40;
  const used = visibleChildren.length;
  const linked = visibleChildren.filter((c) => c.tenantId !== tenant?.id).length;
  const ssoEvent = [...audit].reverse().find((a) => a.action === "sso.configure");
  const dpaEvent = [...audit].reverse().find((a) => a.action === "dpa.sign");
  const syncEvent = audit.find((a) => a.action === "rostering.sync");
  const nightly = lastNightlySync(now);
  const lastSync = syncEvent && new Date(syncEvent.date).getTime() > nightly.getTime() ? new Date(syncEvent.date) : nightly;
  const enrolled = visibleChildren.length - linked;
  const rostered = new Set(classes.flatMap((k) => k.studentIds)).size;

  const exportCsv = () => {
    const csv = masteryCsv(state, visibleChildren, now);
    download(`${(tenant?.name ?? "organization").toLowerCase().replace(/[^a-z]+/g, "-")}-mastery.csv`, csv, "text/csv");
    actions.logAudit("export.run", `Mastery CSV, all classes, ${plural(visibleChildren.length, "student")}`);
    show(`Exported mastery for ${plural(visibleChildren.length, "student")}. The export is in the audit log.`);
  };

  const syncNow = () => {
    actions.logAudit("rostering.sync", `Clever sync: ${rostered} students, ${classes.length} classes. No changes.`);
    show(`Roster synced. ${rostered} students, ${classes.length} classes. No changes.`);
  };

  return (
    <div className="container ap-page">
      <section className="ap-hero ap-hero-org" aria-labelledby="org-title">
        <div className="ap-hero-art" aria-hidden>
          <Illustration id="schoolroom" alt="" priority />
        </div>
        <div className="ap-hero-body">
          <div className="ap-hero-text">
            <p className="eyebrow">Organization</p>
            <h1 className="ap-title" id="org-title">
              {tenant?.name ?? "Organization"}
            </h1>
            <p className="ap-sub">
              School plan · {plural(members.length, "member")} · Created {tenant ? fmtFull(tenant.createdAt) : ""}
            </p>
          </div>
          <div className="ap-hero-tiles ap-hero-tiles-4">
            <Tile className="glass" label="Seats in use" value={used} unit={`of ${seats}`} note={`${seats - used} open`}>
              <Meter value={used} max={seats} label={`${used} of ${seats} seats in use`} size="sm" />
            </Tile>
            <Tile className="glass" label="Students" value={used} note={linked ? `${enrolled} enrolled, ${linked} linked by a parent` : "All enrolled"} />
            <Tile className="glass" label="Classes" value={classes.length} note={classes.map((k) => k.name).join(", ")} />
            <Tile className="glass" label="Members" value={members.length} note={`${members.filter((m) => m.role === "teacher").length} teachers, ${members.filter((m) => m.role === "aide").length} aide`} />
          </div>
        </div>
      </section>

      <div className="ap-cols">
        <div className="ap-svc card">
          <span className="ap-svc-icon" aria-hidden>
            <IconShield size={22} />
          </span>
          <div className="min-0">
            <p className="ap-svc-label">Sign-in</p>
            <p className="ap-svc-name">
              Google Workspace <span className="ap-status">
                <IconCheck size={14} /> Configured
              </span>
            </p>
            <p className="ap-svc-note">
              Staff sign in with their school Google accounts. Students sign in with a class code. {ssoEvent ? `Set up ${fmtFull(ssoEvent.date)} by ${ssoEvent.actorName}.` : ""}
            </p>
          </div>
        </div>
        <div className="ap-svc card">
          <span className="ap-svc-icon" aria-hidden>
            <IconUsers size={22} />
          </span>
          <div className="min-0">
            <p className="ap-svc-label">Rostering</p>
            <p className="ap-svc-name">
              Clever <span className="ap-status">
                <IconCheck size={14} /> Syncing nightly
              </span>
            </p>
            <p className="ap-svc-note">
              Last sync {relTime(lastSync.toISOString(), now).toLowerCase() === "just now" ? "just now" : `${calendarWord(lastSync, now)} at ${fmtTime(lastSync)}`}. {rostered} students, {classes.length} classes.
            </p>
            {can("sso.manage") && (
              <button type="button" className="btn btn-sm btn-quiet ap-svc-btn" onClick={syncNow}>
                <IconRefresh size={16} /> Sync now
              </button>
            )}
          </div>
        </div>
      </div>

      <Members members={members} onToast={show} />

      <Section
        id="roles"
        title="Roles and permissions"
        sub="Every person has one role. The role decides what they can see and change, in the app and in the data. Select a role to read its summary."
      >
        <div className="card ap-matrix-card">
          <RolesMatrix current={role} />
        </div>
      </Section>

      {can("audit.view") && <AuditLog audit={audit} />}

      <Section id="privacy" title="Privacy and data">
        <div className="ap-cols">
          <ul className="ap-facts card">
            <li>
              <p className="ap-fact-label">Data privacy agreement</p>
              <p className="ap-fact-value">
                Signed{dpaEvent ? ` ${fmtFull(dpaEvent.date)} by ${dpaEvent.actorName}` : ""}.
              </p>
            </li>
            <li>
              <p className="ap-fact-label">Student Privacy Pledge</p>
              <p className="ap-fact-value">We keep its commitments. No sale of student data, no advertising, no profiles beyond school use.</p>
            </li>
            <li>
              <p className="ap-fact-label">Audio</p>
              <p className="ap-fact-value">Raw audio is not stored by default. Speech is scored in the browser. Parents choose whether recordings are kept.</p>
            </li>
            <li>
              <p className="ap-fact-label">Retention</p>
              <p className="ap-fact-value">Reading records stay while a student is enrolled. They are deleted 30 days after a student leaves.</p>
            </li>
          </ul>
          <div className="ap-card-section ap-export">
            <h3 className="ap-h3">Export</h3>
            <p className="muted">
              One row per student: class, rung, rungs mastered, reviews due, last reading, accuracy and words correct per minute. Every export is
              recorded in the audit log.
            </p>
            {can("exports.run") ? (
              <button type="button" className="btn btn-primary" onClick={exportCsv}>
                <IconPaper size={18} /> Export mastery CSV
              </button>
            ) : (
              <p className="ap-locked">
                <IconLock size={16} /> Exports are for Admins and Owners.
              </p>
            )}
          </div>
        </div>
      </Section>

      {can("billing.manage") && (
        <Section id="billing" title="Billing" sub="Visible to the Owner only.">
          <dl className="ap-billing card">
            <div>
              <dt>Plan</dt>
              <dd>School, billed annually</dd>
            </div>
            <div>
              <dt>Seats</dt>
              <dd>
                {seats} at ${PRICE_PER_SEAT} per student per year
              </dd>
            </div>
            <div>
              <dt>Next invoice</dt>
              <dd>
                ${(seats * PRICE_PER_SEAT).toLocaleString("en-US")} on {fmtFull(nextAnniversary(tenant?.createdAt, now))}
              </dd>
            </div>
            <div>
              <dt>Invoices to</dt>
              <dd>{actor?.email}</dd>
            </div>
          </dl>
          <p className="ap-section-sub">Demo billing. No payment details are stored in this browser.</p>
        </Section>
      )}
      {toast}
    </div>
  );
}

function calendarWord(d: Date, now: number): string {
  const days = Math.round((new Date(now).setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / DAY);
  return days === 0 ? "today" : days === 1 ? "yesterday" : fmtFull(d);
}

function nextAnniversary(createdAt: string | undefined, now: number): Date {
  const d = new Date(createdAt ?? now);
  while (d.getTime() <= now) d.setFullYear(d.getFullYear() + 1);
  return d;
}

/* ---------- Members ---------- */

function Members({ members, onToast }: { members: Member[]; onToast: (m: string) => void }) {
  const { state, role, actor, actions, can } = useDemo();
  const [rowMsg, setRowMsg] = useState<{ id: string; prev?: Member["role"]; error?: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const now = Date.now();

  useEffect(() => {
    if (!rowMsg || rowMsg.error) return;
    const t = window.setTimeout(() => setRowMsg(null), 10_000);
    return () => window.clearTimeout(t);
  }, [rowMsg]);

  const options: Member["role"][] = role === "owner" ? ["owner", "admin", "teacher", "aide"] : ["admin", "teacher", "aide"];

  const change = (m: Member, next: Member["role"]) => {
    const prev = m.role;
    const res = actions.changeRole(m.id, next);
    if (!res.ok) {
      setRowMsg({ id: m.id, error: res.error ?? "The role did not change." });
      return;
    }
    setRowMsg({ id: m.id, prev });
    onToast(`${m.name} is now ${article(roleLabel(next))} ${roleLabel(next)}.`);
  };

  const undo = (m: Member, prev: Member["role"]) => {
    const res = actions.changeRole(m.id, prev);
    if (res.ok) {
      setRowMsg(null);
      onToast(`${m.name} is ${article(roleLabel(prev))} ${roleLabel(prev)} again.`);
    } else setRowMsg({ id: m.id, error: res.error });
  };

  const classNames = (m: Member) =>
    m.role === "owner" || m.role === "admin"
      ? "All classes"
      : (m.classIds ?? [])
          .map((id) => state.classes.find((k) => k.id === id)?.name)
          .filter(Boolean)
          .join(", ") || "None yet";

  return (
    <Section
      id="members"
      title="Members"
      sub={can("roles.edit") ? "Change a role and it takes effect at once. Every change is recorded in the audit log." : "Roles are set by an Admin or the Owner."}
      actions={
        can("members.manage") ? (
          <button type="button" className="btn btn-secondary" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
            <IconPlus size={18} /> Add member
          </button>
        ) : undefined
      }
    >
      {adding && can("members.manage") && <AddMember onDone={(name) => { setAdding(false); onToast(`${name} was added.`); }} onCancel={() => setAdding(false)} />}

      <div className="card ap-table-card">
        <table className="ap-table ap-members">
          <thead>
            <tr>
              <th scope="col">Member</th>
              <th scope="col">Role</th>
              <th scope="col">Classes</th>
              <th scope="col">Last active</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const self = m.id === actor?.id;
              const ownerLocked = m.role === "owner" && role !== "owner";
              const editable = can("roles.edit") && !self && !ownerLocked;
              const msg = rowMsg?.id === m.id ? rowMsg : null;
              return (
                <tr key={m.id} data-self={self || undefined}>
                  <td data-label="Member">
                    <div className="ap-member">
                      <span className="ap-member-mono" aria-hidden>
                        {m.name
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div className="min-0">
                        <p className="ap-member-name">
                          {m.name}
                          {self && <span className="pill pill-outline ap-member-you">You</span>}
                        </p>
                        <p className="ap-member-email">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td data-label="Role">
                    {editable ? (
                      <select
                        className="select ap-roleselect"
                        value={m.role}
                        onChange={(e) => change(m, e.target.value as Member["role"])}
                        aria-label={`Role for ${m.name}`}
                      >
                        {(options.includes(m.role) ? options : [m.role, ...options]).map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="ap-rolefixed">
                        {roleLabel(m.role)}
                        <IconLock size={14} />
                        <span className="ap-rolefixed-why">
                          {self ? "You cannot change your own role." : ownerLocked ? "Only the Owner changes this role." : "Admins and the Owner change roles."}
                        </span>
                      </span>
                    )}
                    {msg?.error && (
                      <p className="field-error" role="alert">
                        {msg.error}
                      </p>
                    )}
                    {msg?.prev && (
                      <p className="ap-rowmsg" role="status">
                        Changed from {roleLabel(msg.prev)}.{" "}
                        <button type="button" className="ap-linkbtn" onClick={() => undo(m, msg.prev!)}>
                          Undo
                        </button>
                      </p>
                    )}
                  </td>
                  <td data-label="Classes" className="ap-member-classes">
                    {classNames(m)}
                  </td>
                  <td data-label="Last active" className="muted">
                    {relTime(m.lastActive, now)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function AddMember({ onDone, onCancel }: { onDone: (name: string) => void; onCancel: () => void }) {
  const { actions } = useDemo();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [r, setR] = useState<Member["role"]>("teacher");
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Enter the member's full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter an email address like name@school.org.");
    const res = actions.addMember({ name, email, role: r });
    if (!res.ok) return setError(res.error ?? "The member was not added.");
    onDone(name.trim());
  };

  return (
    <form className="ap-addmember card" onSubmit={submit} noValidate aria-labelledby={`${id}-t`}>
      <h3 className="ap-h3" id={`${id}-t`}>
        Add a member
      </h3>
      <div className="ap-addmember-fields">
        <div className="field">
          <label htmlFor={`${id}-n`}>Full name</label>
          <input id={`${id}-n`} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Margaret Lane" autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor={`${id}-e`}>Email</label>
          <input
            id={`${id}-e`}
            className="input"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="m.lane@oakhill.example"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-r`}>Role</label>
          <select id={`${id}-r`} className="select" value={r} onChange={(e) => setR(e.target.value as Member["role"])}>
            {(["admin", "teacher", "aide"] as const).map((x) => (
              <option key={x} value={x}>
                {roleLabel(x)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="cluster">
        <button type="submit" className="btn btn-primary">
          Add member
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <span className="muted ap-small">They get an email to sign in with Google Workspace.</span>
      </div>
    </form>
  );
}

/* ---------- Audit ---------- */

function AuditLog({ audit }: { audit: AuditEvent[] }) {
  const { state } = useDemo();
  const [all, setAll] = useState(false);
  const now = Date.now();
  const shown = all ? audit : audit.slice(0, 10);
  return (
    <Section
      id="audit"
      title="Audit log"
      sub="Newest first. Sign-in, roster, roles, exports, scores, and every refused action."
      actions={
        audit.length > 10 ? (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAll((v) => !v)} aria-expanded={all}>
            {all ? "Show recent" : `Show all ${audit.length}`}
          </button>
        ) : undefined
      }
    >
      <ol className="ap-audit card">
        {shown.map((ev) => {
          const line = auditLine(ev, state);
          return (
            <li key={ev.id} className="ap-audit-row" data-denied={line.denied || undefined}>
              <time className="ap-audit-time num" dateTime={ev.date}>
                {relTime(ev.date, now)}
              </time>
              <div className="min-0">
                <p className="ap-audit-what">
                  <strong>{ev.actorName}</strong> <span>{line.label.toLowerCase()}</span>
                  {line.denied && <span className="pill pill-correction ap-audit-pill">Refused</span>}
                </p>
                <p className="ap-audit-detail">{line.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
