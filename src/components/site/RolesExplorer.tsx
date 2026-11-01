"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { getRung } from "@/lib/ladder";
import { PRIMARY_ROLES, ROLES } from "@/lib/roles";
import type { Role } from "@/lib/types";
import { MasteryBoard } from "./depictions/MasteryBoard";
import { MicPill, PassageText } from "./depictions/ReadingCheck";

const CHILDREN = [
  { name: "Nora", age: 6, rung: 10 },
  { name: "Eli", age: 8, rung: 25 },
];

const MEMBERS = [
  { name: "David Cole", role: "Owner" },
  { name: "Ruth Adler", role: "Admin" },
  { name: "Eleanor Finch", role: "Teacher" },
  { name: "Thomas Bell", role: "Teacher" },
  { name: "Anna Price", role: "Aide" },
];

function ParentPanel() {
  return (
    <div className="s-role-ui">
      <p className="s-role-ui-title">Your children</p>
      <ul className="s-kids">
        {CHILDREN.map((c) => {
          const r = getRung(c.rung);
          return (
            <li key={c.name}>
              <span className="s-kid-avatar" aria-hidden="true">
                {c.name[0]}
              </span>
              <span className="s-kid-main">
                <b>
                  {c.name}, {c.age}
                </b>
                <small>
                  Rung {c.rung} · {r.title}
                </small>
                <span className="s-kid-bar" aria-hidden="true">
                  <i style={{ width: `${((c.rung - 1) / 40) * 100}%` }} />
                </span>
              </span>
              <span className="s-kid-action">Print lesson</span>
            </li>
          );
        })}
      </ul>
      <p className="s-role-ui-note">Screen limit: 15 minutes a day</p>
    </div>
  );
}

function AdminPanel() {
  return (
    <div className="s-role-ui">
      <p className="s-role-ui-title">Oak Hill Classical Academy</p>
      <ul className="s-members">
        {MEMBERS.map((m) => (
          <li key={m.name}>
            <span className="s-kid-avatar" aria-hidden="true">
              {m.name
                .split(" ")
                .map((p) => p[0])
                .join("")}
            </span>
            <span>{m.name}</span>
            <span className="s-member-role">{m.role}</span>
          </li>
        ))}
      </ul>
      <p className="s-role-ui-note">40 seats · Clever rostering · Google sign-in</p>
    </div>
  );
}

function StudentPanel() {
  return (
    <div className="s-role-ui s-role-student surface-drill">
      <PassageText upTo={11} current={0} review={false} />
      <div className="s-role-student-actions">
        <MicPill label="Begin reading" bars={false} />
      </div>
    </div>
  );
}

function TeacherPanel() {
  return (
    <div className="s-role-ui s-role-teacher">
      <p className="s-role-ui-title">Primer Class · Mrs. Finch</p>
      <MasteryBoard compact />
    </div>
  );
}

const PANELS: Record<string, () => React.ReactNode> = {
  parent: ParentPanel,
  teacher: TeacherPanel,
  admin: AdminPanel,
  student: StudentPanel,
};

/** Switch roles to see what each one sees. Mirrors the role switcher in the app. */
export function RolesExplorer() {
  const [role, setRole] = useState<Role>("teacher");
  const base = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const info = ROLES.find((r) => r.id === role)!;
  const Panel = PANELS[role];
  const others = ROLES.filter((r) => !PRIMARY_ROLES.includes(r.id));

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = PRIMARY_ROLES.length;
    let j = -1;
    if (e.key === "ArrowRight") j = (i + 1) % n;
    else if (e.key === "ArrowLeft") j = (i - 1 + n) % n;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = n - 1;
    if (j < 0) return;
    e.preventDefault();
    setRole(PRIMARY_ROLES[j]);
    tabs.current[j]?.focus();
  };

  return (
    <div className="s-roles">
      <div className="s-tabs" role="tablist" aria-label="Roles">
        {PRIMARY_ROLES.map((id, i) => {
          const r = ROLES.find((x) => x.id === id)!;
          const selected = id === role;
          return (
            <button
              key={id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setRole(id)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      <div className="s-role-panel" role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${role}`}>
        <div className="s-role-copy">
          <p className="s-role-name">{info.label}</p>
          <p className="s-role-summary">{info.summary}</p>
        </div>
        <div className="s-role-frame" key={role}>
          <Panel />
        </div>
      </div>
      <ul className="s-roles-more">
        {others.map((r) => (
          <li key={r.id}>
            <b>{r.label}.</b> {r.summary}
          </li>
        ))}
      </ul>
    </div>
  );
}
