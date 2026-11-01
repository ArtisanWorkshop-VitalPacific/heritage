"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import type { Child } from "@/lib/types";
import { sessionsFor, useDemo } from "@/lib/store";
import { bandFor } from "@/lib/seed";
import { speak, stopSpeaking } from "@/lib/speech";
import { IconCopy, IconLock, IconPaper, IconSpeaker } from "@/components/icons";
import { Dialog, Empty, PageHead, useToast } from "@/components/adult/ui";
import { Segmented, Stepper, Switch } from "@/components/adult/controls";
import { BANDS, INTERESTS, capitalize, download, familyExport, fmtFull, ladderOf } from "@/components/adult/lib";

type Spacing = "normal" | "wide" | "wider";
interface Prefs {
  letterSpacing: Spacing;
  wordSpacing: Spacing;
}
const PREFS_KEY = "hr:prefs";
const LETTER: Record<Spacing, string> = { normal: "0em", wide: "0.04em", wider: "0.08em" };
const WORD: Record<Spacing, string> = { normal: "0em", wide: "0.16em", wider: "0.32em" };

function readPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    const p = raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
    const ok = (v: unknown): v is Spacing => v === "normal" || v === "wide" || v === "wider";
    return { letterSpacing: ok(p.letterSpacing) ? p.letterSpacing : "normal", wordSpacing: ok(p.wordSpacing) ? p.wordSpacing : "normal" };
  } catch {
    return { letterSpacing: "normal", wordSpacing: "normal" };
  }
}

function writePrefs(p: Prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* private mode: the preference lasts for this visit */
  }
}

export default function SettingsPage() {
  const { state, child, role, visibleChildren, actions, can } = useDemo();
  const { show, node: toast } = useToast();
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>({ letterSpacing: "normal", wordSpacing: "normal" });
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const pickId = useId();

  useEffect(() => setPrefs(readPrefs()), []);
  useEffect(() => () => stopSpeaking(), []);

  if (!child) {
    return (
      <div className="container ap-page">
        <PageHead eyebrow="Settings" title="No child yet" />
        <Empty
          title="Settings belong to a child profile."
          action={
            <Link href="/app/onboarding" className="btn btn-primary">
              Add a child
            </Link>
          }
        />
      </div>
    );
  }

  const editable = can("child.settings");
  const band = BANDS[bandFor(child.age)];
  const ladder = ladderOf(state, child.id);
  const parent = state.members.find((m) => m.tenantId === child.tenantId && m.role === "parent");
  const family = state.tenants.find((t) => t.id === child.tenantId);
  const isFamily = family?.kind === "family";

  const update = (patch: Partial<Omit<Child, "id" | "tenantId">>, said: string) => {
    const res = actions.updateChild(child.id, patch);
    if (!res.ok) {
      setError(res.error ?? "The change did not save.");
      return;
    }
    setError(null);
    show(said);
  };

  const setPref = (p: Partial<Prefs>) => {
    const next = { ...prefs, ...p };
    setPrefs(next);
    writePrefs(next);
  };

  const exportData = isFamily
    ? familyExport(state, child.tenantId)
    : { exportedAt: new Date().toISOString(), student: child, ladder, sessions: sessionsFor(state, child.id), audio: "None. The demo never records or stores audio." };
  const exportJson = JSON.stringify(exportData, null, 2);
  const exportName = `${(isFamily ? family?.name ?? "family" : child.name).toLowerCase().replace(/[^a-z]+/g, "-")}-data.json`;

  return (
    <div className="container ap-page ap-settings">
      <PageHead
        eyebrow="Settings"
        title={child.name}
        sub={
          <>
            Age {child.age} · Rung {ladder.rung} · {editable ? "Changes save as you make them." : "Read only for your role."}
          </>
        }
        actions={
          role === "admin" || role === "owner" ? (
            <div className="field ap-settings-pick">
              <label htmlFor={pickId}>Student</label>
              <select id={pickId} className="select" value={child.id} onChange={(e) => actions.selectChild(e.target.value)}>
                {visibleChildren.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : undefined
        }
      />

      {!editable && (
        <p className="ap-note" role="note">
          <IconLock size={14} /> {role === "admin" || role === "owner" ? "Admins and Owners can view a student's settings. Parents change them." : "Your role can view these settings. Parents change them."}
        </p>
      )}
      {error && (
        <p className="field-error ap-settings-error" role="alert">
          {error}
        </p>
      )}

      <Group title="Reading" sub={`What ${child.name} reads and hears.`}>
        <Row label="Age" hint={`${band.label}: ${band.type}. ${band.sentences}.`}>
          <Stepper
            value={child.age}
            min={4}
            max={12}
            disabled={!editable}
            label="Age"
            onChange={(age) => update({ age }, `Age set to ${age}. ${BANDS[bandFor(age)].label}.`)}
          />
        </Row>
        <Row label="Interests" hint="Mrs. Wren picks stories and examples from these. Choose 1 to 5." stack>
          <div className="ap-chips" role="group" aria-label="Interests">
            {INTERESTS.map((i) => {
              const on = child.interests.includes(i);
              const full = !on && child.interests.length >= 5;
              return (
                <button
                  key={i}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  disabled={!editable || full || (on && child.interests.length === 1)}
                  onClick={() => update({ interests: on ? child.interests.filter((x) => x !== i) : [...child.interests, i] }, on ? `${capitalize(i)} removed.` : `${capitalize(i)} added.`)}
                >
                  {capitalize(i)}
                </button>
              );
            })}
          </div>
        </Row>
        <Row label="Narrator" hint="Mrs. Wren's voice for words and stories.">
          <div className="ap-row-inline">
            <Segmented
              label="Narrator"
              value={child.narrator}
              disabled={!editable}
              options={[
                ["american", "American"],
                ["british", "British"],
              ]}
              onChange={(v) => update({ narrator: v }, `Narrator set to ${v === "british" ? "British" : "American"}.`)}
            />
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              onClick={() => void speak(`Hello, ${child.name}. I am Mrs. Wren. Let us read together.`, { narrator: child.narrator, kind: "talk" })}
            >
              <IconSpeaker size={16} /> Hear it
            </button>
          </div>
        </Row>
        <Row label="Faith track" hint="Adds psalms, prayers and Bible stories to the readings.">
          <Switch on={child.faithTrack} disabled={!editable} label="Faith track" onChange={(v) => update({ faithTrack: v }, v ? "Faith track on." : "Faith track off.")} />
        </Row>
        <Row label="Modern comparisons" hint="Mrs. Wren may link an old word to a modern thing: a slate is like a tablet.">
          <Switch
            on={child.modernComparisons}
            disabled={!editable}
            label="Modern comparisons"
            onChange={(v) => update({ modernComparisons: v }, v ? "Modern comparisons on." : "Modern comparisons off.")}
          />
        </Row>
      </Group>

      <Group title="Lessons" sub="Paper first. The screen holds the three-minute reading check.">
        <Row label="Lesson mode" hint={child.mode === "paper" ? "Print each lesson. Teach at the table. The screen is for the reading check." : "Lessons and the reading check on screen, inside the daily cap."}>
          <Segmented
            label="Lesson mode"
            value={child.mode}
            disabled={!editable}
            options={[
              ["paper", "Paper first"],
              ["screen", "Screen"],
            ]}
            onChange={(v) => update({ mode: v }, v === "paper" ? "Paper first." : "Screen lessons.")}
          />
        </Row>
        <Row label="Daily screen cap" hint="The app closes the lesson when the cap is reached.">
          <Segmented
            label="Daily screen cap"
            value={String(child.screenCapMinutes)}
            disabled={!editable}
            options={[
              ["10", "10 min"],
              ["15", "15 min"],
              ["20", "20 min"],
              ["30", "30 min"],
            ]}
            onChange={(v) => update({ screenCapMinutes: Number(v) }, `Screen cap set to ${v} minutes a day.`)}
          />
        </Row>
      </Group>

      <Group title="Reading comfort" sub="Saved on this device only. It applies to reading screens opened here.">
        <Row label="Letter spacing">
          <Segmented
            label="Letter spacing"
            value={prefs.letterSpacing}
            options={[
              ["normal", "Normal"],
              ["wide", "Wide"],
              ["wider", "Wider"],
            ]}
            onChange={(v) => setPref({ letterSpacing: v })}
          />
        </Row>
        <Row label="Word spacing">
          <Segmented
            label="Word spacing"
            value={prefs.wordSpacing}
            options={[
              ["normal", "Normal"],
              ["wide", "Wide"],
              ["wider", "Wider"],
            ]}
            onChange={(v) => setPref({ wordSpacing: v })}
          />
        </Row>
        <div className="ap-comfort">
          <p className="ap-comfort-label">Preview, {band.label.toLowerCase()}</p>
          <p
            className="ap-comfort-text surface-drill"
            style={{ fontFamily: band.font, fontSize: band.size, letterSpacing: LETTER[prefs.letterSpacing], wordSpacing: WORD[prefs.wordSpacing] }}
          >
            {band.sample}
          </p>
        </div>
      </Group>

      <Group title="Consent" sub="What happens to a child's voice.">
        <Fact label="Voice">
          Processed in this browser during reading checks. Only the words heard are scored.
          {isFamily && parent ? ` Consent given by ${parent.name} on ${fmtFull(child.createdAt)}.` : ""}
        </Fact>
        <Fact label="Recordings">Not kept in the demo. In production, parents choose to keep recordings for 90 days or to keep none.</Fact>
        <Fact label="Who can see progress">
          {isFamily ? "Parents, and the Observers a parent names." : "Parents, and the school staff with this class."} Roles decide the rest.
        </Fact>
      </Group>

      <Group title="Data" sub="Everything the demo holds lives in this browser.">
        <div className="ap-datarow">
          <div className="min-0">
            <p className="ap-row-label">{isFamily ? `Export ${(family?.name ?? "this family").replace(/^The /, "the ")}'s data` : `Export ${child.name}'s data`}</p>
            <p className="ap-row-hint">Profiles, ladders, readings, referrals and credits as JSON.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setExportOpen(true)}>
            <IconPaper size={18} /> Export
          </button>
        </div>
        <div className="ap-datarow">
          <div className="min-0">
            <p className="ap-row-label">Reset the demo</p>
            <p className="ap-row-hint">Erases every change in this browser and restores the Harper family and Oak Hill.</p>
          </div>
          {confirmReset ? (
            <div className="ap-confirm" role="group" aria-label="Confirm reset">
              <span className="ap-small">Erase all demo changes?</span>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  actions.reset();
                  setConfirmReset(false);
                  router.push("/app");
                }}
              >
                Erase and reset
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
                Keep
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}>
              Reset demo
            </button>
          )}
        </div>
      </Group>

      <Dialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title={isFamily ? `${family?.name ?? "Family"} data` : `${child.name}'s data`}
        sub={`${(exportJson.length / 1024).toFixed(1)} KB of JSON. No audio is stored.`}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(exportJson);
                  show("JSON copied.");
                } catch {
                  show("Copy did not work here. Use Download.");
                }
              }}
            >
              <IconCopy size={18} /> Copy
            </button>
            <button type="button" className="btn btn-primary" onClick={() => download(exportName, exportJson, "application/json")}>
              Download {exportName}
            </button>
          </>
        }
      >
        <pre className="ap-json" tabIndex={0} aria-label="Exported data">
          {exportJson}
        </pre>
      </Dialog>
      {toast}
    </div>
  );
}

/* ---------- Grouped rows ---------- */

function Group({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="ap-group" aria-labelledby={id}>
      <div className="ap-group-head">
        <h2 id={id} className="ap-h2">
          {title}
        </h2>
        {sub && <p className="ap-section-sub">{sub}</p>}
      </div>
      <div className="ap-group-body card">{children}</div>
    </section>
  );
}

function Row({ label, hint, children, stack }: { label: string; hint?: string; children: ReactNode; stack?: boolean }) {
  return (
    <div className={`ap-row ${stack ? "ap-row-stack" : ""}`}>
      <div className="ap-row-text min-0">
        <p className="ap-row-label">{label}</p>
        {hint && <p className="ap-row-hint">{hint}</p>}
      </div>
      <div className="ap-row-control">{children}</div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ap-row ap-row-stack">
      <div className="ap-row-text">
        <p className="ap-row-label">{label}</p>
        <p className="ap-row-hint">{children}</p>
      </div>
    </div>
  );
}
