"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Child } from "@/lib/types";
import { useDemo } from "@/lib/store";
import { bandFor } from "@/lib/seed";
import { speak, stopSpeaking } from "@/lib/speech";
import { Illustration } from "@/components/Illustration";
import { IconArrowRight, IconCheck, IconChevronLeft, IconPaper, IconSpeaker, IconUsers } from "@/components/icons";
import { Segmented, Stepper, Switch } from "@/components/adult/controls";
import { BANDS, INTERESTS, capitalize, listNames } from "@/components/adult/lib";

const STEPS = ["Your family", "Your child", "Paper or screen", "Ready"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ChildDraft {
  name: string;
  age: number;
  sex: Child["sex"];
  interests: string[];
  narrator: Child["narrator"];
  faithTrack: boolean;
  modernComparisons: boolean;
  screenCapMinutes: number;
  mode: Child["mode"];
}

export default function OnboardingPage() {
  const { state, role, familyTenant, actions } = useDemo();
  const router = useRouter();
  const headRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const hasFamily = familyTenant?.kind === "family";
  const [where, setWhere] = useState<"existing" | "new">(hasFamily ? "existing" : "new");
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [familyTouched, setFamilyTouched] = useState(false);
  const [kid, setKid] = useState<ChildDraft>({
    name: "",
    age: 6,
    sex: "girl",
    interests: [],
    narrator: "american",
    faithTrack: true,
    modernComparisons: false,
    screenCapMinutes: 15,
    mode: "paper",
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{ name: string; family: string } | null>(null);
  const ids = { p: useId(), e: useId(), f: useId(), n: useId(), c: useId() };

  const familyKids = hasFamily ? state.children.filter((c) => c.tenantId === familyTenant?.id) : [];
  const familyParent = hasFamily ? state.members.find((m) => m.tenantId === familyTenant?.id && m.role === "parent") : undefined;

  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    headRef.current?.focus({ preventScroll: true });
  }, [step]);

  const clear = (key: string) => setErrors((e) => (e[key] ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e));

  const onParentName = (v: string) => {
    setParentName(v);
    clear("parentName");
    if (!familyTouched) {
      const last = v.trim().split(/\s+/).slice(1).pop();
      setFamilyName(last ? `The ${capitalize(last)} family` : "");
    }
  };

  const validate = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 0 && where === "new") {
      if (parentName.trim().length < 2) e.parentName = "Enter your name.";
      if (!EMAIL.test(email.trim())) e.email = "Enter an email address like name@example.com.";
      if (familyName.trim().length < 2) e.familyName = "Enter a family name, like The Harper family.";
    }
    if (s === 1) {
      if (!/^[A-Za-z][A-Za-z' -]{0,29}$/.test(kid.name.trim())) e.childName = "Enter your child's first name, in letters.";
      if (kid.interests.length < 1) e.interests = "Pick at least one interest.";
    }
    if (s === 2 && !consent) e.consent = "Consent is required for the reading check. Check the box to continue.";
    return e;
  };

  const next = () => {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) {
      const first = document.querySelector<HTMLElement>("[aria-invalid='true']");
      first?.focus();
      return;
    }
    if (step === 2) {
      let familyLabel = familyTenant?.name ?? "";
      if (where === "new" || !hasFamily) {
        actions.createFamily({ parentName: parentName.trim(), email: email.trim().toLowerCase(), familyName: familyName.trim() });
        familyLabel = familyName.trim();
      } else if (role !== "parent") {
        actions.switchRole("parent");
      }
      actions.addChild({
        name: capitalize(kid.name.trim()),
        age: kid.age,
        sex: kid.sex,
        interests: kid.interests,
        faithTrack: kid.faithTrack,
        modernComparisons: kid.modernComparisons,
        screenCapMinutes: kid.screenCapMinutes,
        narrator: kid.narrator,
        mode: kid.mode,
      });
      setCreated({ name: capitalize(kid.name.trim()), family: familyLabel });
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const back = () => {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  };

  const band = BANDS[bandFor(kid.age)];
  const childName = capitalize(kid.name.trim()) || "your child";

  return (
    <div className="container ap-page ap-onb">
      <div className="ap-onb-top">
        <p className="eyebrow">New profile</p>
        <Steps step={step} />
      </div>

      <div className="ap-onb-card card">
        {step === 0 && (
          <>
            <StepHead refEl={headRef} title="Your family" sub="A family account holds every child, every report and the referral link." />
            {hasFamily && (
              <div className="ap-options" role="radiogroup" aria-label="Where this child belongs">
                <Option
                  checked={where === "existing"}
                  onSelect={() => setWhere("existing")}
                  icon={<IconUsers size={22} />}
                  title={`Add a child to ${familyTenant?.name}`}
                  body={`${familyParent ? `${familyParent.name}. ` : ""}${familyKids.length ? `Already reading: ${listNames(familyKids.map((c) => c.name))}.` : "No children yet."}`}
                />
                <Option
                  checked={where === "new"}
                  onSelect={() => setWhere("new")}
                  icon={<IconArrowRight size={22} />}
                  title="Start a new family"
                  body="A new parent account, a new family and a new referral link."
                />
              </div>
            )}
            {where === "new" && (
              <div className="ap-onb-fields">
                <Field id={ids.p} label="Your name" error={errors.parentName}>
                  <input
                    id={ids.p}
                    className="input"
                    autoComplete="name"
                    placeholder="Claire Harper"
                    value={parentName}
                    onChange={(e) => onParentName(e.target.value)}
                    aria-invalid={Boolean(errors.parentName)}
                    aria-describedby={errors.parentName ? `${ids.p}-err` : undefined}
                  />
                </Field>
                <Field id={ids.e} label="Email" error={errors.email} hint="Reports and receipts go here. Nothing else.">
                  <input
                    id={ids.e}
                    className="input"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="claire@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clear("email");
                    }}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? `${ids.e}-err` : `${ids.e}-hint`}
                  />
                </Field>
                <Field id={ids.f} label="Family name" error={errors.familyName}>
                  <input
                    id={ids.f}
                    className="input"
                    placeholder="The Harper family"
                    value={familyName}
                    onChange={(e) => {
                      setFamilyTouched(true);
                      setFamilyName(e.target.value);
                      clear("familyName");
                    }}
                    aria-invalid={Boolean(errors.familyName)}
                    aria-describedby={errors.familyName ? `${ids.f}-err` : undefined}
                  />
                </Field>
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <StepHead refEl={headRef} title="Your child" sub="Mrs. Wren adjusts the type, the sentences and the stories to fit." />
            <div className="ap-onb-fields">
              <Field id={ids.n} label="First name" error={errors.childName}>
                <input
                  id={ids.n}
                  className="input"
                  autoComplete="off"
                  placeholder="Nora"
                  value={kid.name}
                  onChange={(e) => {
                    setKid({ ...kid, name: e.target.value });
                    clear("childName");
                  }}
                  aria-invalid={Boolean(errors.childName)}
                  aria-describedby={errors.childName ? `${ids.n}-err` : undefined}
                />
              </Field>

              <div className="field">
                <span className="field-label">Age</span>
                <div className="ap-onb-age">
                  <Stepper value={kid.age} min={4} max={12} label="Age" onChange={(age) => setKid({ ...kid, age })} />
                  <div className="ap-band" aria-live="polite">
                    <p className="ap-band-label">{band.label}</p>
                    <p className="ap-band-what">
                      {band.type}. {band.sentences}.
                    </p>
                    <p className="ap-band-sample surface-drill" style={{ fontFamily: band.font, fontSize: band.size }}>
                      {band.sample}
                    </p>
                  </div>
                </div>
              </div>

              <div className="field">
                <span className="field-label">Girl or boy</span>
                <Segmented
                  label="Girl or boy"
                  value={kid.sex}
                  options={[
                    ["girl", "Girl"],
                    ["boy", "Boy"],
                  ]}
                  onChange={(sex) => setKid({ ...kid, sex })}
                />
                <p className="field-hint">Mrs. Wren uses it for stories and pronouns.</p>
              </div>

              <div className="field">
                <span className="field-label" id={`${ids.c}-l`}>
                  Interests <span className="muted">· {kid.interests.length} of 5</span>
                </span>
                <div className="ap-chips" role="group" aria-labelledby={`${ids.c}-l`} aria-invalid={Boolean(errors.interests)} aria-describedby={errors.interests ? `${ids.c}-err` : undefined}>
                  {INTERESTS.map((i) => {
                    const on = kid.interests.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        className="chip"
                        aria-pressed={on}
                        disabled={!on && kid.interests.length >= 5}
                        onClick={() => {
                          setKid({ ...kid, interests: on ? kid.interests.filter((x) => x !== i) : [...kid.interests, i] });
                          clear("interests");
                        }}
                      >
                        {on && <IconCheck size={14} />}
                        {capitalize(i)}
                      </button>
                    );
                  })}
                </div>
                {errors.interests ? (
                  <p className="field-error" id={`${ids.c}-err`} role="alert">
                    {errors.interests}
                  </p>
                ) : (
                  <p className="field-hint">Pick 1 to 5. Stories and examples come from these.</p>
                )}
              </div>

              <div className="field">
                <span className="field-label">Narrator</span>
                <div className="ap-row-inline">
                  <Segmented
                    label="Narrator"
                    value={kid.narrator}
                    options={[
                      ["american", "American"],
                      ["british", "British"],
                    ]}
                    onChange={(narrator) => setKid({ ...kid, narrator })}
                  />
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() =>
                      void speak(`Hello, ${kid.name.trim() ? capitalize(kid.name.trim()) : "there"}. I am Mrs. Wren. Let us read together.`, {
                        narrator: kid.narrator,
                        kind: "talk",
                      })
                    }
                  >
                    <IconSpeaker size={16} /> Hear it
                  </button>
                </div>
              </div>

              <div className="ap-toggles">
                <label className="ap-toggle">
                  <span className="ap-toggle-text">
                    <strong>Faith track</strong>
                    <span>Adds psalms, prayers and Bible stories to the readings.</span>
                  </span>
                  <Switch on={kid.faithTrack} label="Faith track" onChange={(faithTrack) => setKid({ ...kid, faithTrack })} />
                </label>
                <label className="ap-toggle">
                  <span className="ap-toggle-text">
                    <strong>Modern comparisons</strong>
                    <span>Mrs. Wren may link an old word to a modern thing: a slate is like a tablet.</span>
                  </span>
                  <Switch on={kid.modernComparisons} label="Modern comparisons" onChange={(modernComparisons) => setKid({ ...kid, modernComparisons })} />
                </label>
              </div>

              <div className="field">
                <span className="field-label">Daily screen cap</span>
                <Segmented
                  label="Daily screen cap"
                  value={String(kid.screenCapMinutes)}
                  options={[
                    ["10", "10 min"],
                    ["15", "15 min"],
                    ["20", "20 min"],
                    ["30", "30 min"],
                  ]}
                  onChange={(v) => setKid({ ...kid, screenCapMinutes: Number(v) })}
                />
                <p className="field-hint">The reading check takes three minutes. The app stops at the cap.</p>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <StepHead refEl={headRef} title="Paper or screen" sub={`How ${childName} takes lessons. You can change this in Settings.`} />
            <div className="ap-options ap-options-2" role="radiogroup" aria-label="Lesson mode">
              <Option
                checked={kid.mode === "paper"}
                onSelect={() => setKid({ ...kid, mode: "paper" })}
                icon={<IconPaper size={22} />}
                title={
                  <>
                    Paper first <span className="pill pill-current">Recommended</span>
                  </>
                }
                body="Print each lesson: a script for you, a page for your child, a score sheet. The screen is only for the three-minute reading check."
              />
              <Option
                checked={kid.mode === "screen"}
                onSelect={() => setKid({ ...kid, mode: "screen" })}
                icon={<IconTablet />}
                title="Screen"
                body={`Lessons and the reading check on screen, inside the ${kid.screenCapMinutes}-minute daily cap.`}
              />
            </div>

            <div className={`ap-consent ${errors.consent ? "ap-consent-error" : ""}`}>
              <label className="ap-consent-label">
                <input
                  type="checkbox"
                  className="ap-check"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (e.target.checked) clear("consent");
                  }}
                  aria-invalid={Boolean(errors.consent)}
                  aria-describedby={errors.consent ? "consent-err" : "consent-hint"}
                />
                <span>
                  <strong>I am {childName}&apos;s parent or guardian.</strong> I consent to Heritage Readers processing {childName}&apos;s voice in this
                  browser during reading checks.
                </span>
              </label>
              <p className="ap-consent-hint" id="consent-hint">
                Nothing is recorded or stored. Only the words heard are scored.
              </p>
              {errors.consent && (
                <p className="field-error" id="consent-err" role="alert">
                  {errors.consent}
                </p>
              )}
            </div>
          </>
        )}

        {step === 3 && created && (
          <>
            <div className="ap-ready">
              <div className="ap-ready-art" aria-hidden>
                <Illustration id="wren" alt="" />
              </div>
              <StepHead refEl={headRef} title={`${created.name} is ready.`} sub={`Placement comes first. About ten minutes. Mrs. Wren listens to ${created.name} read letters, words and one short passage, then sets the first rung.`} />
            </div>
            <dl className="ap-summary">
              <SumRow label="Family">{created.family}</SumRow>
              <SumRow label="Age">
                {kid.age} · {band.label}
              </SumRow>
              <SumRow label="Type">{band.type}</SumRow>
              <SumRow label="Interests">{kid.interests.map(capitalize).join(", ")}</SumRow>
              <SumRow label="Narrator">{kid.narrator === "british" ? "British" : "American"}</SumRow>
              <SumRow label="Faith track">{kid.faithTrack ? "On" : "Off"}</SumRow>
              <SumRow label="Modern comparisons">{kid.modernComparisons ? "On" : "Off"}</SumRow>
              <SumRow label="Lessons">{kid.mode === "paper" ? "Paper first" : "Screen"}</SumRow>
              <SumRow label="Screen cap">{kid.screenCapMinutes} minutes a day</SumRow>
              <SumRow label="Consent">Voice processed in the browser. Nothing stored.</SumRow>
            </dl>
            <div className="ap-ready-actions">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => {
                  actions.switchRole("student");
                  router.push("/app/placement");
                }}
              >
                Start placement <IconArrowRight size={20} />
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => router.push("/app")}>
                Go to the family home
              </button>
            </div>
          </>
        )}
      </div>

      {step < 3 && (
        <div className="ap-actionbar-wrap">
          <div className="ap-actionbar glass glass-strong glass-lg">
            {step > 0 ? (
              <button type="button" className="btn btn-ghost" onClick={back}>
                <IconChevronLeft size={18} /> Back
              </button>
            ) : (
              <span className="ap-actionbar-note">Step 1 of 4</span>
            )}
            <button type="button" className="btn btn-primary" onClick={next}>
              {step === 2 ? `Create ${childName === "your child" ? "the" : `${childName}'s`} profile` : "Continue"}
              <IconArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Pieces ---------- */

function IconTablet() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </svg>
  );
}

function Steps({ step }: { step: number }) {
  return (
    <>
      <ol className="ap-steps" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className="ap-step" data-state={i < step ? "done" : i === step ? "current" : "todo"} aria-current={i === step ? "step" : undefined}>
            <span className="ap-step-n" aria-hidden>
              {i < step ? <IconCheck size={14} /> : i + 1}
            </span>
            <span className="ap-step-label">{s}</span>
            {i < step && <span className="visually-hidden"> (done)</span>}
          </li>
        ))}
      </ol>
      <p className="ap-steps-compact" aria-hidden>
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>
      <div className="ap-steps-bar" aria-hidden>
        <i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
    </>
  );
}

function StepHead({ title, sub, refEl }: { title: string; sub: string; refEl: React.RefObject<HTMLHeadingElement | null> }) {
  return (
    <div className="ap-stephead">
      <h1 className="ap-title ap-onb-title" ref={refEl} tabIndex={-1}>
        {title}
      </h1>
      <p className="ap-sub">{sub}</p>
    </div>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="field-error" id={`${id}-err`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Option({ checked, onSelect, icon, title, body }: { checked: boolean; onSelect: () => void; icon: ReactNode; title: ReactNode; body: string }) {
  return (
    <button type="button" role="radio" aria-checked={checked} className="ap-option" onClick={onSelect}>
      <span className="ap-option-icon" aria-hidden>
        {icon}
      </span>
      <span className="ap-option-text">
        <strong>{title}</strong>
        <span>{body}</span>
      </span>
      <span className="ap-option-mark" aria-hidden>
        {checked && <IconCheck size={14} />}
      </span>
    </button>
  );
}

function SumRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ap-sumrow">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
