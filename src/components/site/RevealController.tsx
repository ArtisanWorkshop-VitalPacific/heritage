"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * The one subtle reveal: blocks marked data-reveal fade up once as they enter the viewport.
 * Server HTML renders them visible; only blocks below the fold are hidden, after hydration.
 * Off for reduced motion.
 */
export function RevealController() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window) || !els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.dataset.reveal = "in";
          io.unobserve(el);
          // Drop the transition styles once done so nothing keeps a stacking context.
          window.setTimeout(() => {
            el.dataset.reveal = "done";
          }, 1400);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );
    const limit = window.innerHeight * 0.95;
    for (const el of els) {
      if (el.dataset.reveal === "in" || el.dataset.reveal === "done") continue;
      if (el.getBoundingClientRect().top < limit) {
        el.dataset.reveal = "done";
        continue;
      }
      el.dataset.reveal = "out";
      io.observe(el);
    }
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
