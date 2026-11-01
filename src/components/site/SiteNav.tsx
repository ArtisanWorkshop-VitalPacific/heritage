"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconArrowRight, IconX } from "@/components/icons";
import { NAV_LINKS } from "./site-config";
import { Wordmark } from "./Wordmark";

/**
 * The marketing nav. Fixed to the top: transparent over the home hero and at the top of a page,
 * frosted glass once the page scrolls. Below 760px the links move into a full-screen sheet.
 */
export function SiteNav() {
  const pathname = usePathname();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Next.js turns off smooth scrolling for route changes only when <html> carries this attribute.
  // Without it, a click deep in a long page would glide to the top of the next one.
  useEffect(() => {
    document.documentElement.dataset.scrollBehavior = "smooth";
  }, []);

  useEffect(() => {
    let raf = 0;
    const hero = document.querySelector<HTMLElement>("[data-s-hero]");
    const update = () => {
      raf = 0;
      if (hero) setSolid(hero.getBoundingClientRect().bottom <= 72);
      else setSolid(window.scrollY > 4);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  // Any navigation closes the sheet.
  useEffect(() => setOpen(false), [pathname]);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => menuButton.current?.focus());
  }, []);

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <header className="s-nav" data-solid={solid || undefined}>
        <div className="s-nav-inner">
          <Link href="/" className="s-nav-brand" aria-label="Heritage Readers, home">
            <Wordmark />
          </Link>
          <nav className="s-nav-links" aria-label="Main">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="s-nav-link" aria-current={isCurrent(l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="s-nav-actions">
            <Link href="/app" className="btn btn-primary s-nav-cta">
              Open the app
            </Link>
            <button
              ref={menuButton}
              type="button"
              className="s-nav-menu"
              aria-expanded={open}
              aria-controls="s-menu"
              aria-label="Menu"
              onClick={() => setOpen(true)}
            >
              <span aria-hidden className="s-nav-menu-icon" />
            </button>
          </div>
        </div>
      </header>
      {open && <MenuSheet onClose={close} isCurrent={isCurrent} />}
    </>
  );
}

function MenuSheet({ onClose, isCurrent }: { onClose: () => void; isCurrent: (href: string) => boolean }) {
  const sheet = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const el = sheet.current;
    if (!el) return;
    const focusables = () =>
      Array.from(el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const outside = [document.getElementById("s-main"), document.getElementById("s-footer"), document.querySelector(".s-nav")];
    outside.forEach((n) => n?.setAttribute("inert", ""));

    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = prevOverflow;
      outside.forEach((n) => n?.removeAttribute("inert"));
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div ref={sheet} id="s-menu" className="s-menu glass glass-strong" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="s-menu-top">
        <Link href="/" className="s-nav-brand" aria-label="Heritage Readers, home" onClick={onClose}>
          <Wordmark />
        </Link>
        <button type="button" className="s-nav-menu" aria-label="Close menu" onClick={onClose}>
          <IconX size={22} />
        </button>
      </div>
      <nav className="s-menu-links" aria-label="Main">
        <Link href="/" className="s-menu-link" aria-current={isCurrent("/") && !isCurrent("/app") ? "page" : undefined} onClick={onClose}>
          Home
        </Link>
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="s-menu-link" aria-current={isCurrent(l.href) ? "page" : undefined} onClick={onClose}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="s-menu-actions">
        <Link href="/app/onboarding" className="btn btn-primary btn-lg" onClick={onClose}>
          Begin placement
        </Link>
        <Link href="/app" className="btn btn-secondary btn-lg" onClick={onClose}>
          Open the app <IconArrowRight size={18} />
        </Link>
      </div>
    </div>,
    document.body,
  );
}
