"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useDemo } from "@/lib/store";
import type { Role } from "@/lib/types";
import { IconChevronRight, IconX } from "@/components/icons";

interface Stop {
  title: string;
  detail: string;
  href: string;
  role?: Role;
  childId?: string;
  family?: string;
}

/** The presenter's route through the demo. Each stop sets the role and child, then opens the page. */
const STOPS: Stop[] = [
  { title: "The website", detail: "Scroll the film. Then Method, Schools, Pricing, Susan.", href: "/" },
  { title: "A new family", detail: "A parent, a child, an age band, a voice.", href: "/app/onboarding", role: "parent" },
  { title: "Placement", detail: "Sounds, words, a short passage. One rung.", href: "/app/placement", role: "parent" },
  { title: "Nora's lesson", detail: "Rung 10, the letter h. One clean read from mastery.", href: "/app/lesson", role: "student", childId: "c_nora", family: "fam_harper" },
  { title: "Talk with Mrs. Wren", detail: "Hold the microphone. Ask her anything.", href: "/app/talk", role: "student", childId: "c_nora", family: "fam_harper" },
  { title: "The parent's report", detail: "Mastery, fluency, recordings, minutes on paper.", href: "/app/report", role: "parent", childId: "c_nora", family: "fam_harper" },
  { title: "Print the week", detail: "Teacher script, student page, score sheet.", href: "/app/print", role: "parent", family: "fam_harper" },
  { title: "Give a month", detail: "Invite a family. Both families get a month.", href: "/app/referrals", role: "parent", family: "fam_harper" },
  { title: "A teacher's class", detail: "Mastery board, paper scores, packets by rung.", href: "/app/teacher", role: "teacher" },
  { title: "The organization", detail: "Members, roles, permissions, audit log.", href: "/app/admin", role: "admin" },
];

export function Walkthrough({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actions, role } = useDemo();
  const router = useRouter();
  const pathname = usePathname() ?? "/app";
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = panel.current;
    el?.querySelector<HTMLElement>("[data-current='true'], .ap-tour-stop")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const go = (s: Stop) => {
    if (s.role) actions.stage({ role: s.role, familyTenantId: s.family, childId: s.childId });
    onClose();
    router.push(s.href);
  };

  return (
    <div className="ap-tour" role="dialog" aria-modal="true" aria-labelledby="ap-tour-title">
      <button type="button" className="ap-tour-scrim" aria-label="Close walkthrough" onClick={onClose} />
      <div ref={panel} className="ap-tour-panel">
        <div className="ap-tour-head">
          <div>
            <p className="eyebrow">Presenter</p>
            <h2 id="ap-tour-title">Walkthrough</h2>
            <p className="muted">Ten stops. About twenty minutes.</p>
          </div>
          <button type="button" className="btn btn-icon btn-ghost" aria-label="Close" onClick={onClose}>
            <IconX size={20} />
          </button>
        </div>
        <ol className="ap-tour-list">
          {STOPS.map((s, i) => {
            const current = pathname === s.href && (!s.role || s.role === role);
            return (
              <li key={s.title}>
                <button type="button" className="ap-tour-stop" data-current={current || undefined} onClick={() => go(s)}>
                  <span className="ap-tour-n" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="ap-tour-text">
                    <strong>{s.title}</strong>
                    <span>{s.detail}</span>
                  </span>
                  <IconChevronRight size={18} />
                </button>
              </li>
            );
          })}
        </ol>
        <p className="ap-tour-foot muted">Press ? on a keyboard to open this list. Reset demo, at the foot of each grown-up page, restores the starting families.</p>
      </div>
    </div>
  );
}
