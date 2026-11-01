"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useDemo } from "@/lib/store";
import { Illustration } from "@/components/Illustration";
import { IconCheck, IconCopy, IconGift, IconLink, IconMail, IconSchool } from "@/components/icons";
import { Empty, Meter, PageHead, Section, useToast } from "@/components/adult/ui";
import { fmtDay, plural, relTime } from "@/components/adult/lib";

const SITE = "https://heritagereaders.com/r/";

export default function ReferralsPage() {
  const { role } = useDemo();
  return role === "parent" ? <FamilyReferrals /> : <SchoolReferrals />;
}

/* ---------- Clipboard and share ---------- */

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function ShareCard({
  code,
  label,
  onToast,
  shareText,
}: {
  code: string;
  label: string;
  onToast: (m: string) => void;
  shareText: string;
}) {
  const link = `${SITE}${code}`;
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);
  const copy = async (what: "link" | "code") => {
    const ok = await copyText(what === "link" ? link : code);
    onToast(ok ? (what === "link" ? "Link copied." : "Code copied.") : "Copy did not work in this browser. Select the text and copy it.");
  };
  return (
    <div className="ap-share glass glass-strong">
      <p className="ap-share-label">{label}</p>
      <div className="ap-share-link">
        <IconLink size={18} />
        <span className="ap-share-url" title={link}>
          {link.replace(/^https:\/\//, "")}
        </span>
      </div>
      <div className="ap-share-actions">
        <button type="button" className="btn btn-primary" onClick={() => void copy("link")}>
          <IconCopy size={18} /> Copy link
        </button>
        {canShare && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              navigator.share({ title: "Heritage Readers", text: shareText, url: link }).catch(() => undefined);
            }}
          >
            Share
          </button>
        )}
        <button type="button" className="btn btn-ghost ap-share-code" onClick={() => void copy("code")} aria-label={`Copy code ${code}`}>
          <span className="num">{code}</span>
          <IconCopy size={16} />
        </button>
      </div>
    </div>
  );
}

/* ---------- Families: give a month, get a month ---------- */

const STATUS: Record<string, { label: string; cls: string }> = {
  sent: { label: "Sent", cls: "pill-outline" },
  joined: { label: "Joined", cls: "" },
  paid: { label: "Paid", cls: "ap-pill-paid" },
};

function FamilyReferrals() {
  const { state, actions, can } = useDemo();
  const { show, node: toast } = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ email: string; msg: string } | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const inputId = useId();
  const now = Date.now();

  const ref = state.referrals.find((r) => r.ownerMemberId === state.ui.actorId);
  const ledger = state.ledger.filter((l) => l.memberId === state.ui.actorId);

  if (!ref) {
    return (
      <div className="container ap-page">
        <PageHead eyebrow="Give a month" title="Give a month. Get a month." />
        <Empty title="This account has no referral code yet." body="Codes come with a family account. Start a family to get one." />
      </div>
    );
  }

  const paid = ref.invites.filter((i) => i.status === "paid").length;
  const joined = ref.invites.filter((i) => i.status === "joined").length;
  const atCap = ref.monthsEarned >= ref.cap;
  const setEarned = paid >= 3;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!can("referrals.use")) return setError("Your role does not allow referrals.");
    const res = actions.invite(email);
    if (!res.ok) return setError(res.error ?? "The invite did not send. Try again.");
    setError(null);
    show(`Invite sent to ${email.trim().toLowerCase()}.`);
    setEmail("");
  };

  const markPaid = (addr: string) => {
    const res = actions.markInvitePaid(addr);
    if (!res.ok) {
      setRowError({ email: addr, msg: res.error ?? "That did not work. Try again." });
      return;
    }
    setRowError(null);
    setFresh(addr);
    show(`Payment cleared. One month added to your account and to theirs.`);
  };

  return (
    <div className="container ap-page">
      <section className="ap-hero ap-hero-refer" aria-labelledby="refer-h">
        <div className="ap-hero-art" aria-hidden>
          <Illustration id="family-table" alt="" priority />
        </div>
        <div className="ap-hero-body">
          <div className="ap-hero-text">
            <p className="eyebrow">Give a month</p>
            <h1 className="ap-title" id="refer-h">
              Give a month. Get a month.
            </h1>
            <p className="ap-sub">
              Invite a family. When their first payment clears, both families get a month free. Up to {ref.cap} months a year.
            </p>
          </div>
          <ShareCard code={ref.code} label="Your link" onToast={show} shareText="We use Heritage Readers for reading lessons. Your first month is on us." />
        </div>
      </section>

      <div className="ap-tiles ap-tiles-3">
        <div className="ap-tile">
          <p className="ap-tile-label">Months earned this year</p>
          <p className="ap-tile-value">
            {ref.monthsEarned}
            <span className="ap-tile-unit">of {ref.cap}</span>
          </p>
          <Meter value={ref.monthsEarned} max={ref.cap} label={`${ref.monthsEarned} of ${ref.cap} months earned`} />
          <p className="ap-tile-note">{atCap ? "You reached this year's cap." : `${plural(ref.cap - ref.monthsEarned, "month")} left to earn this year.`}</p>
        </div>
        <div className="ap-tile">
          <p className="ap-tile-label">Printed reader set</p>
          <p className="ap-tile-value">
            {Math.min(paid, 3)}
            <span className="ap-tile-unit">of 3 paid referrals</span>
          </p>
          <div className="ap-dots" role="img" aria-label={`${Math.min(paid, 3)} of 3 paid referrals toward the reader set`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="ap-dot" data-on={i < paid || undefined}>
                {i < paid && <IconCheck size={14} />}
              </span>
            ))}
          </div>
          <p className="ap-tile-note">
            {setEarned ? <strong>Earned. The reader set ships to your address on file.</strong> : `${plural(3 - paid, "more paid referral")} and the set is yours.`}
          </p>
        </div>
        <div className="ap-tile">
          <p className="ap-tile-label">Invites</p>
          <p className="ap-tile-value">{ref.invites.length}</p>
          <p className="ap-tile-note">
            <strong>{paid}</strong> paid · <strong>{joined}</strong> joined · <strong>{ref.invites.length - paid - joined}</strong> sent
          </p>
        </div>
      </div>

      <p className="ap-note ap-note-esa" role="note">
        <strong>Paying with ESA funds?</strong> ESA accounts earn the printed reader set instead of month credit. Your referrals still count toward it.
      </p>

      {setEarned && (
        <div className="ap-earned card" role="status">
          <span className="ap-refer-icon" aria-hidden>
            <IconGift size={22} />
          </span>
          <div>
            <p className="ap-h3">Three families paid. The printed reader set is yours.</p>
            <p className="muted">It ships to your address on file within two weeks. No charge.</p>
          </div>
        </div>
      )}

      <Section title="Invite by email" sub="We send one email with your link. No reminders, no lists.">
        <form className="ap-inviteform card" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor={inputId}>Their email</label>
            <div className="ap-inline">
              <input
                id={inputId}
                className="input"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${inputId}-err` : undefined}
              />
              <button type="submit" className="btn btn-primary" disabled={!email.trim()}>
                <IconMail size={18} /> Send invite
              </button>
            </div>
            {error && (
              <p className="field-error" id={`${inputId}-err`} role="alert">
                {error}
              </p>
            )}
          </div>
        </form>
      </Section>

      <Section title="Your invites" sub="Credit posts when their first payment clears.">
        {ref.invites.length ? (
          <div className="card ap-table-card ap-scroll">
            <table className="ap-table ap-invites">
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Sent</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="visually-hidden">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ref.invites.map((inv) => (
                  <tr key={inv.email} data-fresh={fresh === inv.email || undefined}>
                    <td className="ap-invite-email">{inv.email}</td>
                    <td className="muted ap-invite-sent">
                      <span className="ap-invite-k">Sent </span>
                      {fmtDay(inv.sentAt, now)}
                    </td>
                    <td>
                      <span className={`pill ${STATUS[inv.status].cls}`}>
                        {inv.status === "paid" && <IconCheck size={12} />}
                        {STATUS[inv.status].label}
                      </span>
                      {inv.status === "paid" && inv.paidAt && <span className="ap-invite-when muted"> {fmtDay(inv.paidAt, now)}</span>}
                    </td>
                    <td className="ap-invite-act">
                      {inv.status !== "paid" ? (
                        <>
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => markPaid(inv.email)}>
                            Mark as paid (demo)
                          </button>
                          {rowError?.email === inv.email && (
                            <span className="field-error" role="alert">
                              {rowError.msg}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="ap-credit">+1 month each</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No invites yet." body="Send one above, or share your link." />
        )}
      </Section>

      <div className="ap-cols">
        <Section className="ap-card-section" title="Credits">
          {ledger.length ? (
            <ul className="ap-ledger">
              {ledger.map((l) => (
                <li key={l.id} className="ap-ledger-row">
                  <span className="ap-ledger-amt num">+{l.months}</span>
                  <div className="min-0">
                    <p>{l.reason}</p>
                    <p className="muted">{relTime(l.date, now)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No credits yet. The first one posts when an invited family pays.</p>
          )}
        </Section>

        <Section className="ap-card-section" title="The rules">
          <ul className="ap-rules">
            <li>When a family joins with your link and their first payment clears, both families get one month free.</li>
            <li>You can earn up to {ref.cap} months a year.</li>
            <li>After three paid referrals, we send you the printed reader set as a gift.</li>
            <li>Families who pay with ESA funds get the printed reader set instead of month credit.</li>
            <li>Schools refer schools. Both schools get five seats for a semester.</li>
          </ul>
        </Section>
      </div>
      {toast}
    </div>
  );
}

/* ---------- Schools: refer a school ---------- */

function SchoolReferrals() {
  const { state, tenant, actions, can, role } = useDemo();
  const { show, node: toast } = useToast();
  const [school, setSchool] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ school?: string; email?: string }>({});
  const schoolId = useId();
  const emailId = useId();
  const now = Date.now();

  const ref = state.referrals.find((r) => r.code.endsWith("-SCHOOL") && state.members.some((m) => m.id === r.ownerMemberId && m.tenantId === tenant?.id));
  const code = ref?.code ?? "OAKHILL-SCHOOL";
  const sent = state.audit
    .filter((a) => a.tenantId === tenant?.id && a.action === "referral.invite")
    .map((a) => {
      const [name, addr] = a.target.split(" · ");
      return { id: a.id, name, email: addr ?? "", by: a.actorName, date: a.date };
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: { school?: string; email?: string } = {};
    const addr = email.trim().toLowerCase();
    if (school.trim().length < 2) next.school = "Enter the school's name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) next.email = "Enter an email address like head@school.org.";
    else if (sent.some((s) => s.email === addr)) next.email = "This school already has an invite from Oak Hill.";
    setErrors(next);
    if (next.school || next.email) return;
    actions.logAudit("referral.invite", `${school.trim()} · ${addr}`);
    show(`Invite sent to ${school.trim()}.`);
    setSchool("");
    setEmail("");
  };

  return (
    <div className="container ap-page">
      <section className="ap-hero ap-hero-refer" aria-labelledby="school-h">
        <div className="ap-hero-art" aria-hidden>
          <Illustration id="schoolroom" alt="" priority />
        </div>
        <div className="ap-hero-body">
          <div className="ap-hero-text">
            <p className="eyebrow">Refer a school</p>
            <h1 className="ap-title" id="school-h">
              Refer a school. Both get five seats for a semester.
            </h1>
            <p className="ap-sub">
              Share {tenant?.name ?? "your school"}&apos;s code with a classical school or co-op. When they sign up, each school gets five student
              seats for one semester.
            </p>
          </div>
          <ShareCard code={code} label="School link" onToast={show} shareText={`${tenant?.name ?? "Our school"} uses Heritage Readers. Five seats for a semester are on us.`} />
        </div>
      </section>

      <div className="ap-cols">
        <Section className="ap-card-section" title="Invite a school" sub="One email to the person who decides. We do not add them to a list.">
          <form className="stack" onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor={schoolId}>School name</label>
              <input
                id={schoolId}
                className="input"
                placeholder="Riverside Classical School"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                aria-invalid={Boolean(errors.school)}
                aria-describedby={errors.school ? `${schoolId}-err` : undefined}
              />
              {errors.school && (
                <p className="field-error" id={`${schoolId}-err`} role="alert">
                  {errors.school}
                </p>
              )}
            </div>
            <div className="field">
              <label htmlFor={emailId}>Contact email</label>
              <input
                id={emailId}
                className="input"
                type="email"
                inputMode="email"
                placeholder="head@riverside.example"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? `${emailId}-err` : undefined}
              />
              {errors.email && (
                <p className="field-error" id={`${emailId}-err`} role="alert">
                  {errors.email}
                </p>
              )}
            </div>
            <div className="cluster">
              <button type="submit" className="btn btn-primary">
                <IconSchool size={18} /> Send school invite
              </button>
              <span className="muted ap-small">Demo: no email leaves this browser.</span>
            </div>
          </form>
        </Section>

        <Section className="ap-card-section" title="The rules">
          <ul className="ap-rules">
            <li>A school that signs up with your code gets five student seats for one semester.</li>
            <li>Your school gets five more seats for the same semester.</li>
            <li>Seats start when their first invoice is paid.</li>
            <li>{role === "teacher" ? "Teachers can refer. Admins see every referral in the audit log." : "Every referral appears in the audit log."}</li>
            {!can("billing.manage") && <li>Seat changes appear on the next invoice, which the Owner manages.</li>}
          </ul>
        </Section>
      </div>

      <Section title="Schools invited" sub={sent.length ? `${plural(sent.length, "invite")} from ${tenant?.name ?? "your school"}.` : undefined}>
        {sent.length ? (
          <ul className="ap-sent card">
            {sent.map((s) => (
              <li key={s.id} className="ap-sent-row">
                <span className="ap-sent-icon" aria-hidden>
                  <IconSchool size={18} />
                </span>
                <div className="min-0">
                  <p className="ap-sent-name">{s.name}</p>
                  <p className="muted ap-small">
                    {s.email} · sent by {s.by} · {relTime(s.date, now)}
                  </p>
                </div>
                <span className="pill pill-outline">Sent</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No schools invited yet." body="The first school you invite shows here with its status." />
        )}
      </Section>
      {toast}
    </div>
  );
}
