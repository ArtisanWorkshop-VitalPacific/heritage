"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDemo } from "@/lib/store";
import { MAX_RUNG, getRung } from "@/lib/ladder";
import { IconChevronLeft, IconChevronRight, IconPrint } from "@/components/icons";
import { Empty, PageHead, useToast } from "@/components/adult/ui";
import { Packet } from "@/components/adult/packet/Packet";
import { ladderOf, listNames, packetHref, parseLessonId, reviewsDue, type PacketRef } from "@/components/adult/lib";

const SHEET_PX = 816; // 8.5in at 96 css px per inch

export default function PacketPage() {
  const params = useParams<{ lessonId: string }>();
  const { state, role, actor, visibleChildren, actions, can } = useDemo();
  const desk = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const { show, node: toast } = useToast();
  const ref = parseLessonId(String(params?.lessonId ?? ""));

  useEffect(() => {
    const el = desk.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? SHEET_PX;
      setZoom(Math.min(1, Math.max(0.3, w / SHEET_PX)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref?.rung]);

  // Resolve who the packet is for, and whether this role may see them.
  let childName: string | undefined;
  let forLine = "";
  let title = "";
  let problem: string | null = null;
  let classLabel = "";
  let classNames: string[] = [];

  if (!ref) {
    problem = "This packet link is not valid. Packet links end in a rung number from 1 to 40.";
  } else if (ref.kind === "child") {
    const child = visibleChildren.find((c) => c.id === ref.childId);
    if (!child) {
      problem = "This packet is for a child who is not on this account. Choose a lesson from the print list.";
    } else {
      childName = child.name;
      forLine = child.name;
      title = `${child.name}, rung ${ref.rung}`;
    }
  } else {
    const k = state.classes.find((c) => c.id === ref.classId);
    const mine =
      k &&
      (role === "admin" || role === "owner"
        ? k.tenantId === actor?.tenantId
        : (actor?.classIds ?? []).includes(k.id) && (role === "teacher" || role === "aide"));
    if (!k || !mine) {
      problem = "This class packet is not available to your role. Teachers and Aides print for their own classes.";
    } else {
      const now = Date.now();
      const names = state.children
        .filter((c) => k.studentIds.includes(c.id))
        .filter((c) => {
          const l = ladderOf(state, c.id);
          return l.rung === ref.rung || reviewsDue(l, now).some((r) => r.rung === ref.rung);
        })
        .map((c) => c.name);
      classNames = names;
      classLabel = k.name;
      forLine = names.length ? `${k.name}: ${listNames(names)}` : k.name;
      title = `${k.name}, rung ${ref.rung}`;
    }
  }


  if (!can("packets.print")) {
    return (
      <div className="container ap-page">
        <PageHead eyebrow="Print" title="Printing is not part of this role." />
      </div>
    );
  }

  if (!ref || problem) {
    return (
      <div className="container ap-page">
        <PageHead eyebrow="Print" title="Packet not available" />
        <Empty
          title={problem}
          action={
            <Link href="/app/print" className="btn btn-primary">
              Open the print list
            </Link>
          }
        />
      </div>
    );
  }

  const rung = getRung(ref.rung);
  const href = (n: number): string => packetHref({ ...ref, rung: n } as PacketRef);
  const copies = ref.kind === "class" ? Math.max(1, classNames.length) : 1;

  const print = () => {
    actions.logAudit("packets.print", ref.kind === "class" ? `${classLabel}, rung ${ref.rung} packets` : `${childName}, rung ${ref.rung} packet`);
    show(ref.kind === "class" ? `Printing rung ${ref.rung}. Print ${copies} ${copies === 1 ? "copy" : "copies"}.` : `Printing rung ${ref.rung} for ${childName}.`);
    window.setTimeout(() => window.print(), 60);
  };

  return (
    <div className="container ap-page pr-page">
      <div className="pr-screen">
        <PageHead
          eyebrow={
            <Link href="/app/print" className="pr-back">
              <IconChevronLeft size={14} /> Print
            </Link>
          }
          title={
            <>
              Rung {rung.n}: {rung.title}
            </>
          }
          sub={
            <>
              For {forLine}. Three pages on US Letter: the teacher&apos;s script, the student page and the score sheet.
              {ref.kind === "class" && ` Print ${copies} ${copies === 1 ? "copy" : "copies"} of the student page and the score sheet.`}
            </>
          }
          actions={
            <button type="button" className="btn btn-primary btn-lg" onClick={print}>
              <IconPrint size={20} /> Print
            </button>
          }
        />
      </div>

      <div ref={desk} className="pr-desk">
        <div className="pr-sheets" style={{ ["--pr-zoom" as string]: zoom }}>
          <Packet rung={ref.rung} childName={childName} forLine={forLine} origin={typeof window !== "undefined" ? window.location.origin : ""} />
        </div>
      </div>

      <div className="pr-dock-wrap pr-screen">
        <div className="pr-dock glass glass-strong glass-lg" role="toolbar" aria-label="Packet">
          {ref.rung > 1 ? (
            <Link href={href(ref.rung - 1)} className="btn btn-ghost btn-icon" aria-label={`Rung ${ref.rung - 1}`}>
              <IconChevronLeft size={20} />
            </Link>
          ) : (
            <span className="btn btn-ghost btn-icon" aria-hidden />
          )}
          <div className="pr-dock-text min-0">
            <strong>Rung {ref.rung}</strong>
            <span>3 pages · US Letter</span>
          </div>
          {ref.rung < MAX_RUNG ? (
            <Link href={href(ref.rung + 1)} className="btn btn-ghost btn-icon" aria-label={`Rung ${ref.rung + 1}`}>
              <IconChevronRight size={20} />
            </Link>
          ) : (
            <span className="btn btn-ghost btn-icon" aria-hidden />
          )}
          <button type="button" className="btn btn-primary" onClick={print}>
            <IconPrint size={18} /> Print
          </button>
        </div>
      </div>
      {toast}
    </div>
  );
}
