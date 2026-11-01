"use client";

import Link from "next/link";
import type { Child, ClassGroup } from "@/lib/types";
import { useDemo } from "@/lib/store";
import { getRung } from "@/lib/ladder";
import { IconPrint } from "@/components/icons";
import { Section } from "./ui";
import { ladderOf, lessonName, listNames, packetHref, plural, reviewsDue } from "./lib";

/** One class's packets: one row per rung in use, then the reviews due today. */
export function ClassGroupPackets({ k, title, sub }: { k: ClassGroup; title?: string; sub?: string }) {
  const { state } = useDemo();
  const now = Date.now();
  const kids = state.children.filter((c) => k.studentIds.includes(c.id));
  const byRung = new Map<number, Child[]>();
  for (const c of kids) {
    const n = ladderOf(state, c.id).rung;
    byRung.set(n, [...(byRung.get(n) ?? []), c]);
  }
  const groups = [...byRung.entries()].sort((a, b) => a[0] - b[0]);
  const reviews = new Map<number, Child[]>();
  for (const c of kids) {
    for (const r of reviewsDue(ladderOf(state, c.id), now)) reviews.set(r.rung, [...(reviews.get(r.rung) ?? []), c]);
  }
  const reviewGroups = [...reviews.entries()].sort((a, b) => a[0] - b[0]);
  const teacher = state.members.find((m) => m.id === k.teacherId);

  return (
    <Section
      title={title ?? k.name}
      sub={sub ?? `${teacher ? `${teacher.name} · ` : ""}${plural(kids.length, "student")} on ${plural(groups.length, "rung")}.`}
    >
      <ul className="ap-packets card">
        {groups.map(([n, list]) => (
          <PacketRow key={n} classId={k.id} rung={n} kids={list} kind="current" />
        ))}
        {reviewGroups.map(([n, list]) => (
          <PacketRow key={`r${n}`} classId={k.id} rung={n} kids={list} kind="review" />
        ))}
      </ul>
    </Section>
  );
}

function PacketRow({ classId, rung, kids, kind }: { classId: string; rung: number; kids: Child[]; kind: "current" | "review" }) {
  const r = getRung(rung);
  return (
    <li className="ap-packet">
      <span className={`ap-packet-n num ${kind === "review" ? "ap-packet-n-review" : ""}`}>{rung}</span>
      <div className="ap-packet-main min-0">
        <p className="ap-packet-title">
          {r.title}
          {kind === "review" && <span className="pill pill-review ap-packet-pill">Review due</span>}
        </p>
        <p className="ap-packet-meta">
          {lessonName(rung) !== r.title ? `${lessonName(rung)} · ` : ""}
          {listNames(kids.map((c) => c.name))}
        </p>
      </div>
      <span className="ap-packet-copies">
        <strong className="num">{kids.length}</strong> {kids.length === 1 ? "copy" : "copies"}
      </span>
      <Link
        href={packetHref({ kind: "class", classId, rung })}
        className="btn btn-quiet"
        aria-label={`Print rung ${rung} packet for ${listNames(kids.map((c) => c.name))}`}
      >
        <IconPrint size={18} /> Print
      </Link>
    </li>
  );
}
