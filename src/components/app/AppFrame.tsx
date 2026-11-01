"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { DemoProvider, useDemo } from "@/lib/store";
import { PRIMARY_ROLES, ROLES, ROLE_HOME, ROUTE_ACCESS, roleLabel, routeAllowed } from "@/lib/roles";
import type { Role } from "@/lib/types";
import { Illustration } from "@/components/Illustration";
import { IconChevronDown, IconLock } from "@/components/icons";
import { Walkthrough } from "./Walkthrough";
import "./app-frame.css";

interface NavItem {
  href: string;
  label: string;
}

const NAV: Record<Role, NavItem[]> = {
  parent: [
    { href: "/app", label: "Home" },
    { href: "/app/report", label: "Report" },
    { href: "/app/ladder", label: "Ladder" },
    { href: "/app/print", label: "Print" },
    { href: "/app/referrals", label: "Give a month" },
    { href: "/app/settings", label: "Settings" },
  ],
  observer: [
    { href: "/app/report", label: "Report" },
    { href: "/app/ladder", label: "Ladder" },
  ],
  teacher: [
    { href: "/app/teacher", label: "Class" },
    { href: "/app/print", label: "Print" },
    { href: "/app/referrals", label: "Refer a school" },
  ],
  aide: [
    { href: "/app/teacher", label: "Class" },
    { href: "/app/print", label: "Print" },
  ],
  admin: [
    { href: "/app/admin", label: "Organization" },
    { href: "/app/teacher", label: "Classes" },
    { href: "/app/print", label: "Print" },
    { href: "/app/referrals", label: "Refer a school" },
  ],
  owner: [
    { href: "/app/admin", label: "Organization" },
    { href: "/app/teacher", label: "Classes" },
    { href: "/app/print", label: "Print" },
    { href: "/app/referrals", label: "Refer a school" },
  ],
  student: [],
};

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <DemoProvider>
      <Shell>{children}</Shell>
    </DemoProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { hydrated, role } = useDemo();
  const pathname = usePathname() ?? "/app";
  const [tour, setTour] = useState(false);
  const closeTour = useCallback(() => setTour(false), []);

  // "?" opens the presenter's walkthrough from anywhere in the app (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setTour((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!hydrated) return <Opening />;

  const allowed = routeAllowed(pathname, role);
  if (role === "student") {
    return (
      <div className="ap-root ap-student">
        <StudentBar />
        <main id="main" className="ap-student-main">
          {allowed ? children : <RoleGate pathname={pathname} />}
        </main>
        <Walkthrough open={tour} onClose={closeTour} />
      </div>
    );
  }

  return (
    <div className="ap-root">
      <AdultBar />
      <main id="main" className="ap-main">
        {allowed ? children : <RoleGate pathname={pathname} />}
      </main>
      <DemoFooter onTour={() => setTour(true)} />
      <Walkthrough open={tour} onClose={closeTour} />
    </div>
  );
}

function Opening() {
  return (
    <div className="ap-opening" role="status" aria-live="polite">
      <Illustration id="wren" alt="" className="ap-opening-wren" priority />
      <p className="ap-opening-text">Opening the schoolroom</p>
    </div>
  );
}

/* ---------- Grown-up bar ---------- */

function AdultBar() {
  const { role, actor, tenant, visibleChildren, child, actions } = useDemo();
  const pathname = usePathname() ?? "/app";
  const router = useRouter();
  const showChildSwitch = (role === "parent" || role === "observer") && visibleChildren.length > 1;

  const switchTo = (r: Role) => {
    actions.switchRole(r);
    router.push(ROLE_HOME[r]);
  };

  return (
    <header className="ap-bar">
      <div className="ap-bar-row container">
        <Link href="/" className="ap-brand" aria-label="Heritage home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ap-brand-mark" src="/brand/heritage-mark-240.webp" alt="" width={30} height={30} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ap-brand-name" src="/brand/heritage-wordmark.png" alt="Heritage" width={112} height={18} />
        </Link>

        <div className="ap-bar-context min-0">
          <span className="ap-tenant">{tenant?.name}</span>
          <span className="ap-actor muted">
            {actor?.name} · {roleLabel(role)}
          </span>
        </div>

        <RoleSwitcher role={role} onSwitch={switchTo} />
      </div>

      <nav className="ap-nav container" aria-label="App">
        <div className="ap-nav-links">
          {NAV[role].map((item) => {
            const active = item.href === "/app" ? pathname === "/app" : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className="ap-nav-link" aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="ap-nav-end">
          {showChildSwitch && (
            <div className="segmented" role="radiogroup" aria-label="Child">
              {visibleChildren.map((c) => (
                <button key={c.id} type="button" role="radio" aria-checked={child?.id === c.id} onClick={() => actions.selectChild(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
          {role === "parent" && child && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => switchTo("student")}>
              Hand the device to {child.name}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}

function RoleSwitcher({ role, onSwitch }: { role: Role; onSwitch: (r: Role) => void }) {
  const [open, setOpen] = useState(false);
  const extra = ROLES.filter((r) => !PRIMARY_ROLES.includes(r.id));

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <div className="ap-roles">
      <span className="ap-roles-label eyebrow">View as</span>
      <div className="segmented" role="radiogroup" aria-label="View as role">
        {PRIMARY_ROLES.map((r) => (
          <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => onSwitch(r)}>
            {roleLabel(r)}
          </button>
        ))}
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-checked={!PRIMARY_ROLES.includes(role)}
          onClick={() => setOpen((o) => !o)}
          className="ap-roles-more"
        >
          {PRIMARY_ROLES.includes(role) ? "More" : roleLabel(role)}
          <IconChevronDown size={14} />
        </button>
      </div>
      {open && (
        <>
          <button className="ap-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="ap-menu" role="menu">
            {extra.map((r) => (
              <button
                key={r.id}
                role="menuitemradio"
                aria-checked={role === r.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSwitch(r.id);
                }}
              >
                <strong>{r.label}</strong>
                <span>{r.summary}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Student bar ---------- */

function StudentBar() {
  const { child, actions } = useDemo();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);

  return (
    <header className="ap-sbar">
      <Link href="/app/student" className="ap-sbar-tutor" aria-label="Today's lessons">
        <span className="ap-sbar-wren">
          <Illustration id="wren" alt="" />
        </span>
        <span className="ap-sbar-name">{child?.name ?? "Reader"}</span>
      </Link>
      {confirm ? (
        <div className="ap-sbar-confirm" role="group" aria-label="Return to the grown-up view">
          <span>Grown-ups only</span>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => {
              actions.switchRole("parent");
              router.push("/app");
            }}
          >
            Return
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirm(false)}>
            Stay
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-sm btn-ghost ap-sbar-adult" onClick={() => setConfirm(true)}>
          <IconLock size={16} /> Grown-ups
        </button>
      )}
    </header>
  );
}

/* ---------- Role gate ---------- */

function RoleGate({ pathname }: { pathname: string }) {
  const { role, actions } = useDemo();
  const router = useRouter();
  const key = Object.keys(ROUTE_ACCESS)
    .sort((a, b) => b.length - a.length)
    .find((k) => pathname === k || pathname.startsWith(k + "/"));
  const allowedRoles = key ? ROUTE_ACCESS[key] : [];
  const student = role === "student";

  return (
    <section className={`ap-gate ${student ? "ap-gate-student" : ""}`}>
      <div className="ap-gate-card">
        <span className="ap-gate-icon" aria-hidden>
          <IconLock size={22} />
        </span>
        <h1>{student ? "This page is for grown-ups." : `${roleLabel(role)}s cannot open this page.`}</h1>
        <p className="muted">
          {student
            ? "Ask a grown-up to open it for you."
            : `This page is for ${allowedRoles.map((r) => roleLabel(r)).join(", ")}. Roles decide what each person can see and change.`}
        </p>
        <div className="cluster" style={{ justifyContent: "center" }}>
          {student ? (
            <Link href="/app/student" className="btn btn-primary">
              Back to my lesson
            </Link>
          ) : (
            <>
              {allowedRoles
                .filter((r) => r !== "student" || pathname !== "/app")
                .slice(0, 3)
                .map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      actions.switchRole(r);
                      router.refresh();
                    }}
                  >
                    View as {roleLabel(r)}
                  </button>
                ))}
              <Link href={ROLE_HOME[role]} className="btn btn-ghost">
                Go to my home
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- Demo footer ---------- */

function DemoFooter({ onTour }: { onTour: () => void }) {
  const { actions } = useDemo();
  const [asked, setAsked] = useState(false);
  return (
    <footer className="ap-demo container">
      <p>
        <strong>Demo mode.</strong> Profiles and progress live in this browser only. Speech uses your browser&apos;s recognizer; production uses a
        child-tuned scorer and Susan&apos;s recorded phonograms.
      </p>
      <button type="button" className="btn btn-sm btn-secondary" onClick={onTour}>
        Walkthrough
      </button>
      {asked ? (
        <span className="cluster">
          <span className="muted">Erase demo changes?</span>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => {
              actions.reset();
              setAsked(false);
            }}
          >
            Reset
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAsked(false)}>
            Cancel
          </button>
        </span>
      ) : (
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAsked(true)}>
          Reset demo
        </button>
      )}
    </footer>
  );
}
