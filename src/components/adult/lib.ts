/**
 * Pure helpers for the grown-up surfaces: dates, norms, pace, plans, audit text, exports.
 * No React here, so every page computes the same numbers the same way.
 */

import type { AgeBand, AuditEvent, Child, ClassGroup, DemoState, LadderState, Member, Session } from "@/lib/types";
import { MAX_RUNG, RUNGS, RUNG_GROUPS, getRung, passageFor, startingState } from "@/lib/ladder";
import { PERMISSIONS, roleLabel } from "@/lib/roles";
import { placementFor, sessionsFor } from "@/lib/store";

export const DAY = 86_400_000;

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "Nora", "Nora and Eli", "Nora, Eli and Ada". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/* ---------- Dates ---------- */

const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const MONTH_DAY_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const WEEKDAY_SHORT = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const TIME = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const LONG = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

export function startOfDay(t: number | Date): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(t: number | Date): number {
  return startOfDay(t) + DAY - 1;
}

/** Whole calendar days from a to b (local time). */
export function calendarDays(a: number, b: number): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY);
}

export function fmtDay(d: string | number | Date, now = Date.now()): string {
  const date = new Date(d);
  return date.getFullYear() === new Date(now).getFullYear() ? MONTH_DAY.format(date) : MONTH_DAY_YEAR.format(date);
}

export function fmtFull(d: string | number | Date): string {
  return MONTH_DAY_YEAR.format(new Date(d));
}

export function fmtWeekday(d: string | number | Date, short = false): string {
  return (short ? WEEKDAY_SHORT : WEEKDAY).format(new Date(d));
}

export function fmtLong(d: string | number | Date): string {
  return LONG.format(new Date(d));
}

export function fmtTime(d: string | number | Date): string {
  return TIME.format(new Date(d));
}

/** "Just now", "12 min ago", "3 hr ago", "Yesterday", "4 days ago", "Sep 23". */
export function relTime(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  const diff = now - t;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  const days = calendarDays(t, now);
  if (days === 0) return `${Math.round(diff / 3_600_000)} hr ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return fmtDay(iso, now);
}

/** "Today", "Yesterday", "Tuesday", "Oct 12": for dates in the past week or older. */
export function dayWord(iso: string, now = Date.now()): string {
  const days = calendarDays(new Date(iso).getTime(), now);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days > 1 && days < 7) return fmtWeekday(iso);
  return fmtDay(iso, now);
}

/** Due label for a scheduled review. */
export function dueWord(iso: string, now = Date.now()): string {
  const days = calendarDays(now, new Date(iso).getTime());
  if (days < 0) return days === -1 ? "Due yesterday" : `Due ${-days} days ago`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 7) return `Due ${fmtWeekday(iso)}`;
  return `Due ${fmtDay(iso, now)}`;
}

/** The next five school days, starting today on a weekday or Monday on a weekend. */
export function nextSchoolDays(now = Date.now(), count = 5): Date[] {
  const out: Date[] = [];
  const d = new Date(startOfDay(now));
  while (out.length < count) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** The most recent 2:00 AM, for the nightly roster sync. */
export function lastNightlySync(now = Date.now()): Date {
  const d = new Date(now);
  d.setHours(2, 0, 0, 0);
  if (d.getTime() > now) d.setDate(d.getDate() - 1);
  return d;
}

/* ---------- Children and ladders ---------- */

export function ladderOf(state: DemoState, childId: string): LadderState {
  return state.ladders[childId] ?? startingState(childId, 1);
}

export function timed(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.wcpm > 0);
}

export function lastSession(state: DemoState, childId: string): Session | undefined {
  const s = sessionsFor(state, childId);
  return s[s.length - 1];
}

/** Reviews due on or before the end of today. */
export function reviewsDue(ladder: LadderState, now = Date.now()): { rung: number; due: string }[] {
  const end = endOfDay(now);
  return ladder.review.filter((r) => new Date(r.due).getTime() <= end).sort((a, b) => a.due.localeCompare(b.due));
}

export function groupIndexOf(rung: number): number {
  return RUNG_GROUPS.findIndex((g) => rung >= g.from && rung <= g.to);
}

export function classOf(state: DemoState, child: Child): ClassGroup | undefined {
  return state.classes.find((k) => k.id === child.classId || k.studentIds.includes(child.id));
}

export function orgName(state: DemoState, tenantId: string): string | undefined {
  return state.tenants.find((t) => t.id === tenantId)?.name;
}

/* ---------- Fluency norms ---------- */

/** Hasbrouck & Tindal (2017), oral reading fluency, winter, 50th percentile. */
export const WINTER_NORMS: Record<number, number> = { 1: 29, 2: 72, 3: 92, 4: 112 };

export function normFor(age: number): { grade: number; wcpm: number; label: string } {
  const grade = clamp(age - 5, 1, 4);
  const ordinal = ["", "1st", "2nd", "3rd", "4th"][grade];
  return { grade, wcpm: WINTER_NORMS[grade], label: `${ordinal} grade winter median` };
}

/* ---------- Pace and projection ---------- */

export interface Pace {
  perWeek: number;
  weeks: number;
  gained: number;
  since: string;
}

/** Rungs gained per week since placement (or since the first reading). */
export function paceFor(state: DemoState, childId: string, now = Date.now()): Pace | null {
  const ladder = state.ladders[childId];
  const placement = placementFor(state, childId);
  const first = sessionsFor(state, childId)[0];
  const start = placement ? { date: placement.date, rung: placement.rung } : first ? { date: first.date, rung: first.rung } : null;
  if (!ladder || !start) return null;
  const weeks = (now - new Date(start.date).getTime()) / (7 * DAY);
  const gained = ladder.rung - start.rung;
  if (weeks < 2 || gained <= 0) return null;
  return { perWeek: gained / weeks, weeks, gained, since: start.date };
}

export type Projection =
  | { kind: "date"; group: (typeof RUNG_GROUPS)[number]; toGo: number; perWeek: number; date: Date }
  | { kind: "unknown"; group: (typeof RUNG_GROUPS)[number]; toGo: number }
  | { kind: "last" };

export function projectionFor(state: DemoState, childId: string, now = Date.now()): Projection {
  const ladder = ladderOf(state, childId);
  const i = groupIndexOf(ladder.rung);
  const group = i >= 0 && i < RUNG_GROUPS.length - 1 ? RUNG_GROUPS[i + 1] : null;
  if (!group) return { kind: "last" };
  const toGo = group.from - ladder.rung;
  const pace = paceFor(state, childId, now);
  if (!pace) return { kind: "unknown", group, toGo };
  return { kind: "date", group, toGo, perWeek: pace.perWeek, date: new Date(now + (toGo / pace.perWeek) * 7 * DAY) };
}

/** "0.5 rungs a week" with one decimal, never a long fraction. */
export function paceWords(perWeek: number): string {
  const v = Math.round(perWeek * 10) / 10;
  return `${v} ${v === 1 ? "rung" : "rungs"} a week`;
}

/* ---------- Rung state ---------- */

export type RungState = "mastered" | "current" | "review" | "upcoming";

/** For the report: any scheduled review shows as review, with its due date in the label. */
export function rungState(ladder: LadderState, n: number): RungState {
  if (ladder.review.some((r) => r.rung === n)) return "review";
  if (n === ladder.rung) return "current";
  if (ladder.mastered.includes(n)) return "mastered";
  return "upcoming";
}

/* ---------- The week's lessons ---------- */

export interface PlanItem {
  day: Date;
  rung: number;
  kind: "new" | "second" | "review";
}

/**
 * Five lessons: the current rung, the next rungs, and any review due in the window,
 * each review placed on its due day.
 */
export function weekPlan(ladder: LadderState, now = Date.now()): PlanItem[] {
  const days = nextSchoolDays(now, 5);
  const windowEnd = endOfDay(days[days.length - 1]);
  const reviews = ladder.review
    .filter((r) => new Date(r.due).getTime() <= windowEnd)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 2);
  const slots: (PlanItem | null)[] = days.map(() => null);
  for (const r of reviews) {
    let idx = days.findIndex((d) => endOfDay(d) >= new Date(r.due).getTime());
    if (idx < 0) idx = 0;
    while (idx < slots.length - 1 && slots[idx]) idx++;
    if (!slots[idx]) slots[idx] = { day: days[idx], rung: r.rung, kind: "review" };
  }
  // Two clean reads master a rung, so each rung gets two days: a first read, then a second.
  let next = ladder.rung;
  let read = Math.min(1, ladder.cleanReads[next] ?? 0);
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] || next > MAX_RUNG) continue;
    slots[i] = { day: days[i], rung: next, kind: read >= 1 ? "second" : "new" };
    read++;
    if (read >= 2) {
      next++;
      read = 0;
    }
  }
  return slots.filter((s): s is PlanItem => s !== null);
}

/* ---------- Packets ---------- */

export type PacketRef = { kind: "child"; childId: string; rung: number } | { kind: "class"; classId: string; rung: number };

export function parseLessonId(raw: string): PacketRef | null {
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  const m = /^(.+)-r(\d{1,2})$/.exec(id);
  if (!m) return null;
  const rung = Number(m[2]);
  if (!Number.isInteger(rung) || rung < 1 || rung > MAX_RUNG) return null;
  if (m[1].startsWith("class-")) return { kind: "class", classId: m[1].slice(6), rung };
  return { kind: "child", childId: m[1], rung };
}

export function packetHref(ref: PacketRef): string {
  return ref.kind === "class" ? `/app/print/class-${ref.classId}-r${ref.rung}` : `/app/print/${ref.childId}-r${ref.rung}`;
}

export function passageTitle(rung: number): string | undefined {
  return getRung(rung).passage?.title;
}

/** A lesson's display name: the passage title, or the letter for the vowel rungs. */
export function lessonName(rung: number): string {
  const r = getRung(rung);
  return r.passage?.title ?? r.title;
}

export { passageFor };

/* ---------- Age bands ---------- */

export interface BandInfo {
  band: AgeBand;
  label: string;
  type: string;
  sentences: string;
  sample: string;
  font: string;
  size: string;
}

export const BANDS: Record<AgeBand, BandInfo> = {
  A: {
    band: "A",
    label: "Ages 4 to 6",
    type: "Andika, a literacy typeface, at 30 points",
    sentences: "Sentences of 3 to 6 words",
    sample: "Ned had a big hat.",
    font: "var(--font-lit)",
    size: "var(--band-a-size)",
  },
  B: {
    band: "B",
    label: "Ages 7 to 8",
    type: "Libre Caslon, the book serif, at 24 points",
    sentences: "Sentences up to 10 words",
    sample: "Max held a soft nest in his hand.",
    font: "var(--font-book)",
    size: "var(--band-b-size)",
  },
  C: {
    band: "C",
    label: "Ages 9 and up",
    type: "Libre Caslon at 20 points",
    sentences: "Sentences up to 16 words, short paragraphs",
    sample: "Ruth took a book to the brook and sat on a cool rock to read.",
    font: "var(--font-book)",
    size: "var(--band-c-size)",
  },
};

export const INTERESTS = [
  "horses",
  "ships",
  "birds",
  "baking",
  "knights",
  "gardens",
  "trains",
  "stars",
  "farm animals",
  "maps",
  "music",
  "insects",
];

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/* ---------- Audit ---------- */

const ACTIONS: Record<string, string> = {
  "sso.configure": "Configured sign-in",
  "rostering.sync": "Synced the roster",
  "dpa.sign": "Signed the privacy agreement",
  "member.add": "Added a member",
  "consent.link": "Linked a child",
  "packets.print": "Printed packets",
  "export.run": "Exported data",
  "scores.enter": "Entered a paper score",
  "lessons.assign": "Assigned lessons",
  "role.change": "Changed a role",
  "permission.denied": "Was refused",
  "referral.invite": "Referred a school",
};

export function auditLine(ev: AuditEvent, state: DemoState): { label: string; detail: string; denied: boolean } {
  if (ev.action === "permission.denied") {
    const [perm, ...rest] = ev.target.split(": ");
    const target = rest.join(": ");
    const permLabel = PERMISSIONS.find((p) => p.id === perm)?.label ?? perm;
    const who =
      state.members.find((m) => m.id === target)?.name ?? state.children.find((c) => c.id === target)?.name ?? target;
    return { label: "Was refused", detail: `${permLabel}${who ? `: ${who}` : ""}`, denied: true };
  }
  if (ev.action === "role.change") {
    // "Anna Price: aide to teacher" reads better with role labels.
    const m = /^(.*): (\w+) to (\w+)$/.exec(ev.target);
    if (m) {
      return {
        label: "Changed a role",
        detail: `${m[1]}: ${roleLabel(m[2] as Member["role"])} to ${roleLabel(m[3] as Member["role"])}`,
        denied: false,
      };
    }
  }
  if (ev.action === "member.add") {
    const m = /^(.*) as (\w+)$/.exec(ev.target);
    if (m) return { label: "Added a member", detail: `${m[1]} as ${roleLabel(m[2].toLowerCase() as Member["role"])}`, denied: false };
  }
  return { label: ACTIONS[ev.action] ?? capitalize(ev.action.replace(/[._]/g, " ")), detail: ev.target, denied: false };
}

/* ---------- Exports ---------- */

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function masteryCsv(state: DemoState, children: Child[], now = Date.now()): string {
  const head = ["Student", "Class", "Age", "Rung", "Skill", "Rungs mastered", "Reviews due", "Last reading", "Accuracy", "Words correct per minute"];
  const rows = children.map((c) => {
    const ladder = ladderOf(state, c.id);
    const last = lastSession(state, c.id);
    const lastTimed = timed(sessionsFor(state, c.id)).pop();
    return [
      c.name,
      classOf(state, c)?.name ?? "",
      c.age,
      ladder.rung,
      getRung(ladder.rung).title,
      ladder.mastered.length,
      reviewsDue(ladder, now).length,
      last ? new Date(last.date).toISOString().slice(0, 10) : "",
      last ? Math.round(last.accuracy * 100) : "",
      lastTimed?.wcpm ?? "",
    ];
  });
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Everything the demo holds about one family, for the settings export. */
export function familyExport(state: DemoState, familyTenantId: string) {
  const children = state.children.filter((c) => c.tenantId === familyTenantId);
  const ids = new Set(children.map((c) => c.id));
  const members = state.members.filter((m) => m.tenantId === familyTenantId);
  const memberIds = new Set(members.map((m) => m.id));
  return {
    exportedAt: new Date().toISOString(),
    family: state.tenants.find((t) => t.id === familyTenantId),
    members,
    children,
    ladders: Object.fromEntries(Object.entries(state.ladders).filter(([id]) => ids.has(id))),
    placements: state.placements.filter((p) => ids.has(p.childId)),
    sessions: state.sessions.filter((s) => ids.has(s.childId)),
    referrals: state.referrals.filter((r) => memberIds.has(r.ownerMemberId)),
    ledger: state.ledger.filter((l) => memberIds.has(l.memberId)),
    audio: "None. The demo never records or stores audio.",
  };
}

export function totalRungs(): number {
  return RUNGS.length;
}
