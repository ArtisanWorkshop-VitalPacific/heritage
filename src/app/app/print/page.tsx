"use client";

import Link from "next/link";
import { useState } from "react";
import { useDemo } from "@/lib/store";
import { getRung } from "@/lib/ladder";
import { Illustration } from "@/components/Illustration";
import { IconPrint } from "@/components/icons";
import { Empty, PageHead } from "@/components/adult/ui";
import { ClassGroupPackets } from "@/components/adult/ClassPackets";
import { Section } from "@/components/adult/ui";
import { fmtDay, fmtWeekday, ladderOf, lessonName, packetHref, plural, weekPlan, type PlanItem } from "@/components/adult/lib";

const KIND: Record<PlanItem["kind"], { label: string; cls: string }> = {
  new: { label: "New rung", cls: "pill-outline" },
  second: { label: "Second read", cls: "pill-current" },
  review: { label: "Review", cls: "pill-review" },
};

export default function PrintListPage() {
  const { role } = useDemo();
  return role === "parent" ? <FamilyWeek /> : <ClassPackets />;
}

/* ---------- Parent: this week's five lessons ---------- */

function FamilyWeek() {
  const { state, child } = useDemo();
  const now = Date.now();
  if (!child) {
    return (
      <div className="container ap-page">
        <PageHead eyebrow="Print" title="This week" />
        <Empty
          title="Add a child to print lessons."
          action={
            <Link href="/app/onboarding" className="btn btn-primary">
              Add a child
            </Link>
          }
        />
      </div>
    );
  }
  const ladder = ladderOf(state, child.id);
  const plan = weekPlan(ladder, now);
  const first = plan[0]?.day;
  const last = plan[plan.length - 1]?.day;

  return (
    <div className="container ap-page">
      <PageHead
        eyebrow="Print"
        title="This week"
        sub={
          <>
            {child.name}&apos;s next {plural(plan.length, "lesson")}
            {first && last ? `, ${fmtDay(first, now)} to ${fmtDay(last, now)}` : ""}. Each lesson prints on three pages.
          </>
        }
      />

      <div className="ap-printintro card">
        <div className="ap-printintro-art" aria-hidden>
          <Illustration id="desk-primer" alt="" />
        </div>
        <div className="ap-printintro-text">
          <h2 className="ap-h3">Paper first</h2>
          <p>
            Every lesson prints as a teacher&apos;s script, a student page and a score sheet. Teach at the table. The screen holds only the
            three-minute reading check.
          </p>
          <ul className="ap-printintro-pages">
            <li>
              <strong>1</strong> Teacher&apos;s script
            </li>
            <li>
              <strong>2</strong> Student page
            </li>
            <li>
              <strong>3</strong> Score sheet with a code to scan
            </li>
          </ul>
        </div>
      </div>

      <Section title={`${child.name}, rung ${ladder.rung}`} sub="A rung moves on after two clean reads. If it needs another day, print it again.">
        <ol className="ap-plan card">
          {plan.map((item, i) => {
            const r = getRung(item.rung);
            return (
              <li key={`${item.rung}-${i}`} className="ap-plan-row">
                <div className="ap-plan-day">
                  <span className="ap-plan-wd">{fmtWeekday(item.day, true)}</span>
                  <span className="ap-plan-date num">{item.day.getDate()}</span>
                </div>
                <div className="ap-plan-main min-0">
                  <p className="ap-plan-title">
                    {lessonName(item.rung)}
                    {i === 0 && <span className="visually-hidden"> (first lesson)</span>}
                  </p>
                  <p className="ap-plan-meta">
                    Rung {item.rung} · {r.title}
                  </p>
                </div>
                <span className={`pill ${KIND[item.kind].cls} ap-plan-kind`}>{KIND[item.kind].label}</span>
                <Link
                  href={packetHref({ kind: "child", childId: child.id, rung: item.rung })}
                  className="btn btn-quiet ap-plan-btn"
                  aria-label={`Print ${fmtWeekday(item.day)}: rung ${item.rung}, ${lessonName(item.rung)}`}
                >
                  <IconPrint size={18} /> Print
                </Link>
              </li>
            );
          })}
        </ol>
      </Section>
    </div>
  );
}

/* ---------- Teacher, Aide, Admin, Owner: packets by rung ---------- */

function ClassPackets() {
  const { state, role, actor } = useDemo();
  const all = role === "admin" || role === "owner";
  const classes = state.classes.filter((k) => (all ? k.tenantId === actor?.tenantId : (actor?.classIds ?? []).includes(k.id)));
  const [pick, setPick] = useState<string>("all");
  const shown = pick === "all" ? classes : classes.filter((k) => k.id === pick);
  const total = shown.reduce((n, k) => n + k.studentIds.length, 0);

  return (
    <div className="container ap-page">
      <PageHead
        eyebrow="Print"
        title="Class packets"
        sub={
          classes.length
            ? `${shown.map((k) => k.name).join(" and ")}: ${plural(total, "student")}. One packet for each rung in use, one copy for each student on it.`
            : "No classes are assigned to you yet."
        }
        actions={
          classes.length > 1 ? (
            <div className="segmented" role="radiogroup" aria-label="Class">
              <button type="button" role="radio" aria-checked={pick === "all"} onClick={() => setPick("all")}>
                All classes
              </button>
              {classes.map((k) => (
                <button key={k.id} type="button" role="radio" aria-checked={pick === k.id} onClick={() => setPick(k.id)}>
                  {k.name}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {shown.map((k) => (
        <ClassGroupPackets key={k.id} k={k} />
      ))}

      {classes.length === 0 && <Empty title="No classes yet." body="An Admin assigns classes to Teachers and Aides." />}
    </div>
  );
}
