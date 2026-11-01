"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { frameUrl } from "@/lib/illustrations";
import { chooseFrameSet, clamp, coarseOrder, drawCover, nearestLoaded, ramp, type HeroFrameSets } from "./hero-engine";

export interface HeroScrubProps {
  /** Image sequences from heroFrames(); null in local dev or when the build could not cut them. */
  frames: HeroFrameSets | null;
  still: { src: string; alt: string; width: number; height: number };
  /** The MP4 to scrub when there are no frames. */
  videoSrc: string | null;
  /** Copy shown at the start; lifts away mid-scroll. */
  intro: ReactNode;
  /** One line that appears near the end, on the turned page. */
  outro: ReactNode;
  /** Focal point for cover cropping, 0..1. */
  focusX?: number;
  focusY?: number;
}

/* Timeline, as fractions of the scroll through the section. */
const FILM_END = 0.88; // the film plays from 0 to here, then holds its last frame
const INTRO_OUT: [number, number] = [0.07, 0.3];
const OUTRO_IN: [number, number] = [0.68, 0.84];
const PUSH: [number, number] = [0, 0.58]; // oval vignette opens to full frame
const VIGNETTE_MAX = 3.2;
const MAX_DPR = 2;
const FILL_WORKERS = 4;
const BLEND_STEPS = 8; // crossfade steps between neighbouring frames

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
const PORTRAIT_QUERY = "(max-aspect-ratio: 6/5)"; // keep in step with site.css
function subscribeReduce(cb: () => void) {
  const m = window.matchMedia(REDUCE_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
const getReduce = () => window.matchMedia(REDUCE_QUERY).matches;
const getReduceServer = () => false;

/**
 * The home page hero. A tall section pins a full-viewport stage while the engraving film plays
 * frame by frame with the scroll: a slow push-in toward the boy reading under the oak.
 * Frames come from image sequences when the build made them, otherwise from the MP4.
 * Reduced motion: no pinning and no scrubbing; the still engraving with the copy.
 */
export function HeroScrub({ frames, still, videoSrc, intro, outro, focusX = 0.5, focusY = 0.5 }: HeroScrubProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pictureRef = useRef<HTMLDivElement>(null);
  const stillRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(subscribeReduce, getReduce, getReduceServer);

  // The still is server-rendered so the first paint is never blank. Mark it if it cannot load.
  useEffect(() => {
    const img = stillRef.current;
    const picture = pictureRef.current;
    if (!img || !picture) return;
    const fail = () => picture.setAttribute("data-still-failed", "");
    if (img.complete && img.naturalWidth === 0) fail();
    img.addEventListener("error", fail);
    return () => img.removeEventListener("error", fail);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const picture = pictureRef.current;
    const canvas = canvasRef.current;
    const vignette = vignetteRef.current;
    const fade = fadeRef.current;
    const introEl = introRef.current;
    const outroEl = outroRef.current;
    if (!section || !stage || !picture || !canvas || !vignette || !fade || !introEl || !outroEl) return;
    if (reduced) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let disposed = false;
    let raf = 0;
    let lastP = -1;
    let stageH = stage.offsetHeight;
    let cw = 0;
    let ch = 0;
    let dirty = true; // the canvas needs a redraw even if the frame index did not change

    const schedule = () => {
      if (!raf && !disposed) raf = requestAnimationFrame(tick);
    };

    const goLive = () => {
      if (!picture.hasAttribute("data-live")) picture.setAttribute("data-live", "");
    };

    /** Paints one source over the cleared canvas, then optionally a second one on top at `mix` opacity. */
    const paint = (src: CanvasImageSource, sw: number, sh: number, over?: { src: CanvasImageSource; sw: number; sh: number; mix: number }) => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, cw, ch);
      drawCover(ctx, src, sw, sh, cw, ch, focusX, focusY);
      if (over && over.mix > 0) {
        ctx.globalAlpha = over.mix;
        drawCover(ctx, over.src, over.sw, over.sh, cw, ch, focusX, focusY);
        ctx.globalAlpha = 1;
      }
      goLive();
    };

    // Portrait screens: the picture band rises to the middle while no copy is shown.
    const portrait = window.matchMedia(PORTRAIT_QUERY);
    let riseBy = 0;
    const measureRise = () => {
      riseBy = portrait.matches ? Math.max(0, picture.offsetTop - (stageH - picture.offsetHeight) / 2) : 0;
    };

    /* ---------- Choreography: opacity and translate only (the picture also scales) ---------- */
    const choreograph = (p: number) => {
      const lift = ramp(INTRO_OUT[0], INTRO_OUT[1], p);
      introEl.style.opacity = (1 - lift).toFixed(3);
      introEl.style.transform = lift ? `translate3d(0, ${(-lift * 72).toFixed(1)}px, 0)` : "";
      introEl.style.pointerEvents = lift > 0.4 ? "none" : "";
      const show = ramp(OUTRO_IN[0], OUTRO_IN[1], p);
      outroEl.style.opacity = show.toFixed(3);
      outroEl.style.transform = show < 1 ? `translate3d(0, ${((1 - show) * 28).toFixed(1)}px, 0)` : "";
      const push = ramp(PUSH[0], PUSH[1], p);
      vignette.style.transform = `scale(${(1 + push * (VIGNETTE_MAX - 1)).toFixed(4)})`;
      fade.style.opacity = Math.max(1 - lift, show).toFixed(3);
      const rise = riseBy ? lift * (1 - show) : 0;
      picture.style.transform = rise ? `translate3d(0, ${(-rise * riseBy).toFixed(1)}px, 0) scale(${(1 + rise * 0.16).toFixed(4)})` : "";
    };

    /* ---------- Sources ---------- */
    let setFilm: (t: number) => void = () => {};
    let draw: () => void = () => {};
    const teardown: (() => void)[] = [];

    if (frames) {
      // Image sequence. Everything (count, size, pattern) comes from heroFrames().
      const set = chooseFrameSet(frames, picture.clientWidth, picture.clientHeight);
      const count = set.count;
      const imgs: (HTMLImageElement | undefined)[] = new Array(count);
      const ready = new Uint8Array(count);
      const queued = new Uint8Array(count);
      let targetF = 0; // fractional frame index from the scroll
      let drawnKey = "";
      let drawnAt = -1; // the frame index the canvas mostly shows

      // The full set is fetched only while the hero is near the viewport.
      let near = true;
      let wake: (() => void)[] = [];
      const io = new IntersectionObserver(
        ([entry]) => {
          near = entry.isIntersecting;
          if (near) {
            const w = wake;
            wake = [];
            w.forEach((fn) => fn());
          }
        },
        { rootMargin: "75% 0px 75% 0px" },
      );
      io.observe(section);
      teardown.push(() => {
        io.disconnect();
        const w = wake;
        wake = [];
        w.forEach((fn) => fn());
      });
      const whenNear = () => (near || disposed ? Promise.resolve() : new Promise<void>((r) => wake.push(r)));

      // Readiness follows the load event; decode() only warms the frame (it can reject spuriously).
      const load = (i: number, priority: "high" | "low") =>
        new Promise<void>((resolve) => {
          queued[i] = 1;
          const img = new Image();
          img.decoding = "async";
          img.fetchPriority = priority;
          const finish = (ok: boolean) => {
            if (ok && !disposed) {
              imgs[i] = img;
              ready[i] = 1;
              // Redraw when this frame is one of the pair on screen or closer than what is drawn.
              const d = Math.abs(i - targetF);
              if (drawnAt < 0 || d <= 1 || d < Math.abs(drawnAt - targetF)) schedule();
            }
            resolve();
          };
          img.onload = () => {
            img.decode().then(
              () => finish(true),
              () => finish(img.naturalWidth > 0),
            );
          };
          img.onerror = () => finish(false);
          img.src = frameUrl(set, i);
        });

      // Fill pass: the unloaded frame nearest the scroll position goes next.
      const nextUnqueued = (): number => {
        let best = -1;
        let bestD = Infinity;
        for (let i = 0; i < count; i++) {
          if (queued[i]) continue;
          const d = Math.abs(i - targetF);
          if (d < bestD) {
            best = i;
            bestD = d;
          }
        }
        return best;
      };

      // After frame 0: every 6th frame (the coarse pass), then the rest while the hero is near.
      const run = async () => {
        const coarse = coarseOrder(count, 6);
        let k = 0;
        const coarseWorker = async () => {
          while (!disposed && k < coarse.length) {
            const i = coarse[k++];
            if (!queued[i]) await load(i, "low");
          }
        };
        await Promise.all(Array.from({ length: FILL_WORKERS }, coarseWorker));
        const fillWorker = async () => {
          while (!disposed) {
            await whenNear();
            if (disposed) return;
            const i = nextUnqueued();
            if (i < 0) return;
            await load(i, "low");
          }
        };
        await Promise.all(Array.from({ length: FILL_WORKERS }, fillWorker));
      };

      // Frame 1 immediately; the rest once the page has loaded so the still and fonts go first.
      void load(0, "high").then(() => {
        if (disposed) return;
        const rest = () => void run();
        if (document.readyState === "complete") rest();
        else window.addEventListener("load", rest, { once: true });
      });

      setFilm = (t) => {
        targetF = clamp(t) * (count - 1);
      };
      draw = () => {
        // Crossfade the two neighbouring frames by the fractional index (quantized), when both are loaded.
        const i0 = Math.floor(targetF);
        const i1 = Math.min(count - 1, i0 + 1);
        let mix = Math.round((targetF - i0) * BLEND_STEPS) / BLEND_STEPS;
        let a = i0;
        if (mix >= 1) {
          a = i1;
          mix = 0;
        }
        let key: string;
        let over: HTMLImageElement | undefined;
        if (ready[a] && (mix === 0 || ready[i1])) {
          key = `${a}:${mix}`;
          if (mix > 0) over = imgs[i1];
        } else {
          a = nearestLoaded(ready, Math.round(targetF));
          if (a < 0) return;
          mix = 0;
          key = `${a}:0`;
        }
        if (key === drawnKey && !dirty) return;
        const base = imgs[a]!;
        paint(base, base.naturalWidth, base.naturalHeight, over ? { src: over, sw: over.naturalWidth, sh: over.naturalHeight, mix } : undefined);
        drawnKey = key;
        drawnAt = mix >= 0.5 ? i1 : a;
        dirty = false;
      };
    } else if (videoSrc) {
      // Fallback: scrub a hidden muted video by seeking; the still shows until it can draw.
      const video = document.createElement("video");
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("muted", "");
      video.setAttribute("aria-hidden", "true");
      video.preload = "auto";
      video.className = "s-hero-video";
      video.src = videoSrc;
      stage.appendChild(video);

      let duration = 0;
      let want = 0;
      let seeking = false;
      let seekAt = 0;
      let videoReady = false;
      let stillImg: HTMLImageElement | null = null;

      const stillLoader = new Image();
      stillLoader.decoding = "async";
      stillLoader.onload = () => {
        if (disposed || !stillLoader.naturalWidth) return;
        stillImg = stillLoader;
        dirty = true;
        schedule();
      };
      stillLoader.src = still.src;

      const onMeta = () => {
        duration = Number.isFinite(video.duration) ? video.duration : 0;
        // iOS decodes nothing until play() is called once; muted inline play is allowed.
        const pr = video.play();
        if (pr) pr.then(() => video.pause()).catch(() => {});
        schedule();
      };
      const onData = () => {
        videoReady = true;
        dirty = true;
        schedule();
      };
      const onSeeked = () => {
        seeking = false;
        dirty = true;
        schedule();
      };
      video.addEventListener("loadedmetadata", onMeta);
      video.addEventListener("loadeddata", onData);
      video.addEventListener("seeked", onSeeked);
      teardown.push(() => {
        video.removeEventListener("loadedmetadata", onMeta);
        video.removeEventListener("loadeddata", onData);
        video.removeEventListener("seeked", onSeeked);
        video.removeAttribute("src");
        video.load();
        video.remove();
      });

      setFilm = (t) => {
        want = clamp(t) * Math.max(0, duration - 0.05);
      };
      draw = () => {
        // A seek that never reports back is abandoned after a second.
        if (seeking && performance.now() - seekAt > 1000) seeking = false;
        if (duration && videoReady && !seeking && Math.abs(video.currentTime - want) > 0.02) {
          seeking = true;
          seekAt = performance.now();
          video.currentTime = want;
        }
        if (!dirty) return;
        if (videoReady && video.readyState >= 2 && video.videoWidth) {
          paint(video, video.videoWidth, video.videoHeight);
          dirty = false;
        } else if (stillImg) {
          paint(stillImg, stillImg.naturalWidth, stillImg.naturalHeight);
          dirty = false;
        }
      };
    }

    /* ---------- Loop ---------- */
    function tick() {
      raf = 0;
      if (disposed) return;
      const rect = section!.getBoundingClientRect();
      const total = Math.max(1, rect.height - stageH);
      const p = clamp(-rect.top / total);
      if (p !== lastP) {
        lastP = p;
        choreograph(p);
        setFilm(p / FILM_END);
      }
      draw();
    }

    const resize = () => {
      stageH = stage.offsetHeight;
      measureRise();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, Math.round(picture.clientWidth * dpr));
      const h = Math.max(1, Math.round(picture.clientHeight * dpr));
      if (w !== cw || h !== ch) {
        cw = canvas.width = w;
        ch = canvas.height = h;
        dirty = true;
      }
      lastP = -1;
      schedule();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(picture);
    ro.observe(stage);
    resize();

    const onScroll = () => schedule();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Keyboard users who tab into the lifted headline get the hero back at its start.
    const onFocusIn = () => {
      if (lastP > 0.05) window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY, behavior: "auto" });
    };
    introEl.addEventListener("focusin", onFocusIn);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      introEl.removeEventListener("focusin", onFocusIn);
      teardown.forEach((fn) => fn());
      for (const el of [introEl, outroEl, vignette, fade, picture]) el.removeAttribute("style");
      picture.removeAttribute("data-live");
    };
  }, [reduced, frames, videoSrc, still.src, focusX, focusY]);

  return (
    <section ref={sectionRef} className="s-hero" data-s-hero aria-labelledby="s-hero-title">
      <div ref={stageRef} className="s-hero-stage">
        <div ref={pictureRef} className="s-hero-picture">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={stillRef}
            className="s-hero-still"
            src={still.src}
            alt={still.alt}
            width={still.width}
            height={still.height}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            draggable={false}
            style={{ objectPosition: `${focusX * 100}% ${focusY * 100}%` }}
          />
          <canvas ref={canvasRef} className="s-hero-canvas" aria-hidden="true" />
          <div ref={vignetteRef} className="s-hero-vignette" aria-hidden="true" />
        </div>
        <div className="s-hero-edges" aria-hidden="true" />
        <div ref={fadeRef} className="s-hero-fade" aria-hidden="true" />
        <div className="s-hero-copy">
          <div ref={introRef} className="s-hero-intro">
            {intro}
          </div>
          <div ref={outroRef} className="s-hero-outro">
            {outro}
          </div>
        </div>
      </div>
    </section>
  );
}
