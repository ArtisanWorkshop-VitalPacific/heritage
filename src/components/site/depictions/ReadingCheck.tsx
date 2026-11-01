import { IconMic } from "@/components/icons";
import { SAMPLE, SAMPLE_RUNG, splitToken } from "./sample";

const TOKENS = (SAMPLE_RUNG.passage?.sentences ?? []).join(" ").split(/\s+/);
const CURRENT = TOKENS.findIndex((t, i) => i > 12 && /hop!/.test(t)); // mid-sentence, after "hid"
const REVIEW = TOKENS.findIndex((t) => splitToken(t).word === SAMPLE.review);

/** Mic level bars, fixed heights so the depiction is static. */
export function MicBars({ count = 5 }: { count?: number }) {
  const h = [0.45, 0.9, 0.62, 1, 0.5, 0.8, 0.4];
  return (
    <span className="s-mic-bars" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} style={{ ["--h" as string]: h[i % h.length] }} />
      ))}
    </span>
  );
}

export function MicPill({ label = "Listening", bars = true }: { label?: string; bars?: boolean }) {
  return (
    <span className="s-mic glass-navy">
      <IconMic size={18} />
      <span>{label}</span>
      {bars && <MicBars />}
    </span>
  );
}

/** The passage with the reading-check underline on the current word and one word marked for review. */
export function PassageText({ upTo = TOKENS.length, current = CURRENT, review = true }: { upTo?: number; current?: number; review?: boolean }) {
  return (
    <p className="s-passage lit">
      {TOKENS.slice(0, upTo).map((t, i) => {
        const { lead, word, trail } = splitToken(t);
        const state = i === current ? "current" : review && i === REVIEW ? "review" : undefined;
        return (
          <span key={i}>
            {lead}
            <span className="s-w" data-state={state}>
              {word}
            </span>
            {trail}{" "}
          </span>
        );
      })}
    </p>
  );
}

/**
 * The reading check as the child sees it, with the grown-up's numbers on a glass card.
 * Static depiction of the real screen: underline on the current word, one word in ochre for review.
 */
export function ReadingCheck() {
  return (
    <div className="s-rc">
      <figure className="s-device s-rc-device" aria-label="The reading check screen while a child reads The Hen in the Hat aloud">
        <div className="s-device-bar">
          <span className="s-chip">
            Rung {SAMPLE.rung} · {SAMPLE_RUNG.short}
          </span>
          <span className="s-device-title">{SAMPLE_RUNG.passage?.title}</span>
          <span className="s-device-step" aria-hidden="true">
            <i data-on="" />
            <i data-on="" />
            <i data-on="" />
            <i data-on="" />
            <i data-now="" />
            <i />
          </span>
        </div>
        <div className="s-rc-page surface-drill">
          <p className="s-wren-line">
            <span className="s-wren-name">Mrs. Wren</span> Read it to me, {SAMPLE.child}. Take your time.
          </p>
          <PassageText />
        </div>
        <div className="s-rc-dock">
          <MicPill />
        </div>
      </figure>
      <aside className="s-rc-card glass glass-strong glass-lg" aria-label="What the grown-up sees after the read">
        <p className="s-card-kicker">For the grown-up</p>
        <dl className="s-rc-stats">
          <div>
            <dt>Accuracy</dt>
            <dd className="num">{SAMPLE.accuracy}%</dd>
          </div>
          <div>
            <dt>Words correct per minute</dt>
            <dd className="num">{SAMPLE.wcpm}</dd>
          </div>
          <div>
            <dt>To review</dt>
            <dd>
              <span className="s-review-word">{SAMPLE.review}</span>
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
