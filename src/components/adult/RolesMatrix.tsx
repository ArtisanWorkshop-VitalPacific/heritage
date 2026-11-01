"use client";

import { useState } from "react";
import type { Role } from "@/lib/types";
import { MATRIX, PERMISSIONS, ROLES, type Permission } from "@/lib/roles";
import { Allowed } from "./ui";

/** Columns in order of reach: the school roles, then the family roles, then the student. */
const ORDER: Role[] = ["owner", "admin", "teacher", "aide", "parent", "observer", "student"];

const SURFACE: Record<string, string> = { school: "School", family: "Family", student: "Student" };

const GROUPS: { label: string; ids: Permission[] }[] = [
  { label: "Learning", ids: ["lesson.take"] },
  { label: "Family", ids: ["progress.own", "progress.history", "recordings.view", "child.settings", "consent.manage", "referrals.use"] },
  { label: "Classroom", ids: ["packets.print", "scores.enter", "class.view", "progress.group", "lessons.assign"] },
  { label: "Organization", ids: ["members.manage", "roles.edit", "licenses.manage", "audit.view", "exports.run", "sso.manage", "billing.manage"] },
];

const LABEL = Object.fromEntries(PERMISSIONS.map((p) => [p.id, p.label])) as Record<Permission, string>;

/**
 * Roles as columns, permissions as rows, grouped by where they apply.
 * On a phone the table becomes one role at a time, chosen from a segmented control.
 */
export function RolesMatrix({ current }: { current: Role }) {
  const [focus, setFocus] = useState<Role>(current);
  const roles = ORDER.map((id) => ROLES.find((r) => r.id === id)!).filter(Boolean);
  const focused = roles.find((r) => r.id === focus) ?? roles[0];
  const count = (r: Role) => MATRIX[r].length;

  return (
    <div className="ap-matrix">
      {/* Wide screens: the full matrix */}
      <div className="ap-matrix-wide ap-scroll">
        <table className="ap-matrix-table">
          <caption className="visually-hidden">What each role can do. Roles are columns; permissions are rows.</caption>
          <thead>
            <tr>
              <th scope="col" className="ap-matrix-corner">
                <span className="visually-hidden">Permission</span>
              </th>
              {roles.map((r) => (
                <th
                  key={r.id}
                  scope="col"
                  className="ap-matrix-role"
                  data-current={r.id === current || undefined}
                  data-focus={r.id === focus || undefined}
                >
                  <button type="button" className="ap-matrix-rolebtn" onClick={() => setFocus(r.id)} aria-pressed={r.id === focus}>
                    <span className="ap-matrix-surface">{SURFACE[r.surface]}</span>
                    <span className="ap-matrix-name">{r.label}</span>
                    <span className="ap-matrix-count num">{count(r.id)}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          {GROUPS.map((g) => (
            <tbody key={g.label}>
              <tr className="ap-matrix-group">
                <th scope="rowgroup" colSpan={roles.length + 1}>
                  {g.label}
                </th>
              </tr>
              {g.ids.map((p) => (
                <tr key={p}>
                  <th scope="row" className="ap-matrix-perm">
                    {LABEL[p]}
                  </th>
                  {roles.map((r) => {
                    const yes = MATRIX[r.id].includes(p);
                    return (
                      <td key={r.id} data-current={r.id === current || undefined} data-focus={r.id === focus || undefined}>
                        <Allowed yes={yes} label={`${r.label}: ${yes ? "can" : "cannot"} ${LABEL[p].toLowerCase()}`} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {/* Phones: one role at a time */}
      <div className="ap-matrix-narrow">
        <div className="ap-matrix-picker" role="group" aria-label="Choose a role">
          {roles.map((r) => (
            <button key={r.id} type="button" className="chip" aria-pressed={r.id === focus} onClick={() => setFocus(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <ul className="ap-matrix-list" aria-label={`${focused.label} permissions`}>
          {GROUPS.map((g) => (
            <li key={g.label} className="ap-matrix-listgroup">
              <p className="ap-matrix-listlabel">{g.label}</p>
              <ul>
                {g.ids.map((p) => {
                  const yes = MATRIX[focused.id].includes(p);
                  return (
                    <li key={p} className="ap-matrix-item" data-yes={yes || undefined}>
                      <Allowed yes={yes} label={yes ? "Can" : "Cannot"} />
                      <span>{LABEL[p]}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <div className="ap-matrix-summary" aria-live="polite">
        <span className="ap-matrix-summary-role">
          {focused.label}
          {focused.id === current && <span className="pill pill-current ap-matrix-you">You</span>}
        </span>
        <span className="ap-matrix-summary-text">{focused.summary}</span>
        <span className="ap-matrix-summary-count muted num">
          {count(focused.id)} of {PERMISSIONS.length} permissions
        </span>
      </div>
    </div>
  );
}
