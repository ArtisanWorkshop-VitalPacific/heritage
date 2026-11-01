"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { can as roleCan, type Permission } from "./roles";
import { bandFor, createSeed, SEED_VERSION } from "./seed";
import { applySession, startingState } from "./ladder/machine";
import type {
  AgeBand,
  AuditEvent,
  Child,
  DemoState,
  LadderState,
  Member,
  PlacementResult,
  Role,
  Session,
  Tenant,
} from "./types";

const KEY = "hr:demo:v1";

function load(): DemoState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoState;
    if (parsed.version !== SEED_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function save(state: DemoState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: the demo keeps working in memory */
  }
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export interface Result {
  ok: boolean;
  error?: string;
}

export interface SessionOutcome {
  session: Session;
  clean: boolean;
  remediate: boolean;
  cleanReads: number;
  masteredRung?: number;
}

export interface DemoActions {
  switchRole(role: Role): void;
  selectChild(childId: string): void;
  /** Presenter jump: one atomic change of family, role and child (used by the walkthrough). */
  stage(input: { role: Role; familyTenantId?: string; childId?: string }): void;
  createFamily(input: { parentName: string; email: string; familyName: string }): string;
  addChild(input: {
    name: string;
    age: number;
    sex: Child["sex"];
    interests: string[];
    faithTrack: boolean;
    modernComparisons: boolean;
    screenCapMinutes: number;
    narrator: Child["narrator"];
    mode: Child["mode"];
    band?: AgeBand;
    /** True when the parent ticked consent during onboarding. */
    consent?: boolean;
  }): string;
  updateChild(childId: string, patch: Partial<Omit<Child, "id" | "tenantId">>): Result;
  savePlacement(result: PlacementResult): void;
  recordSession(input: Omit<Session, "id" | "clean" | "masteredRung">): SessionOutcome;
  /** Sends a referral. Staff in an organization send the school's shared code; pass the school's name. */
  invite(email: string, extra?: { school?: string }): Result;
  /** Demo control: the invited family or school paid. One month each; refuses a second payment. */
  markInvitePaid(email: string): Result;
  /** Records or withdraws parent consent for a child (consent.manage). */
  setConsent(childId: string, given: boolean): Result;
  addMember(input: { name: string; email: string; role: Member["role"] }): Result;
  changeRole(memberId: string, role: Member["role"]): Result;
  enterScore(input: { childId: string; rung: number; accuracy: number; paperMinutes: number }): Result;
  logAudit(action: string, target: string): void;
  reset(): void;
}

export interface DemoContextValue {
  state: DemoState;
  hydrated: boolean;
  role: Role;
  actor: Member | undefined;
  tenant: Tenant | undefined;
  familyTenant: Tenant | undefined;
  child: Child | undefined;
  ladder: LadderState | undefined;
  /** Children the current role may see, in display order. */
  visibleChildren: Child[];
  can(permission: Permission): boolean;
  actions: DemoActions;
}

const DemoContext = createContext<DemoContextValue | null>(null);

/** The referral code the current actor sends: their own, or their organization's shared code. */
function referralFor(state: DemoState) {
  const own = state.referrals.find((r) => r.ownerMemberId === state.ui.actorId);
  if (own) return own;
  const tenant = state.tenants.find((t) => t.id === state.ui.tenantId);
  if (!tenant || tenant.kind === "family") return undefined;
  return state.referrals.find((r) => r.tenantId === tenant.id);
}

/** Which member acts for each role. Parent and observer follow the selected family. */
function actorFor(state: DemoState, role: Role): { actorId: string; tenantId: string } {
  const fam = state.ui.familyTenantId;
  const pick = (r: Member["role"], tenantId?: string) =>
    state.members.find((m) => m.role === r && (!tenantId || m.tenantId === tenantId));
  switch (role) {
    case "parent": {
      const m = pick("parent", fam) ?? pick("parent");
      return { actorId: m?.id ?? state.ui.actorId, tenantId: m?.tenantId ?? fam };
    }
    case "observer": {
      const m = pick("observer", fam) ?? pick("observer");
      return { actorId: m?.id ?? state.ui.actorId, tenantId: m?.tenantId ?? fam };
    }
    case "student": {
      const m = pick("parent", fam) ?? pick("parent");
      return { actorId: m?.id ?? state.ui.actorId, tenantId: fam };
    }
    case "teacher": {
      const m = state.members.find((x) => x.id === "m_finch") ?? pick("teacher");
      return { actorId: m?.id ?? state.ui.actorId, tenantId: m?.tenantId ?? "org_oakhill" };
    }
    case "aide": {
      const m = pick("aide");
      return { actorId: m?.id ?? state.ui.actorId, tenantId: m?.tenantId ?? "org_oakhill" };
    }
    case "admin": {
      const m = state.members.find((x) => x.id === "m_adler") ?? pick("admin");
      return { actorId: m?.id ?? state.ui.actorId, tenantId: m?.tenantId ?? "org_oakhill" };
    }
    case "owner": {
      const m = pick("owner");
      return { actorId: m?.id ?? state.ui.actorId, tenantId: m?.tenantId ?? "org_oakhill" };
    }
  }
}

function visibleChildrenFor(state: DemoState, role: Role, actor: Member | undefined): Child[] {
  const fam = state.ui.familyTenantId;
  if (role === "parent" || role === "student") return state.children.filter((c) => c.tenantId === fam);
  if (role === "observer") {
    const ids = actor?.childIds ?? [];
    return state.children.filter((c) => ids.includes(c.id));
  }
  if (role === "teacher" || role === "aide") {
    const classIds = actor?.classIds ?? [];
    const ids = new Set(state.classes.filter((k) => classIds.includes(k.id)).flatMap((k) => k.studentIds));
    return state.children.filter((c) => ids.has(c.id));
  }
  // admin, owner: everyone enrolled or linked to the organization
  const orgId = actor?.tenantId ?? "org_oakhill";
  return state.children.filter((c) => c.tenantId === orgId || c.linkedTenantIds?.includes(orgId));
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => createSeed());
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const stored = load();
    if (stored) setState(stored);
    else save(stateRef.current);
    setHydrated(true);
  }, []);

  /** Commit a new state and persist it. */
  const commit = useCallback((updater: (s: DemoState) => DemoState) => {
    setState((prev) => {
      const next = updater(prev);
      save(next);
      return next;
    });
  }, []);

  const role = state.ui.role;
  const actor = state.members.find((m) => m.id === state.ui.actorId);
  const tenant = state.tenants.find((t) => t.id === state.ui.tenantId);
  const familyTenant = state.tenants.find((t) => t.id === state.ui.familyTenantId);
  const visibleChildren = useMemo(() => visibleChildrenFor(state, role, actor), [state, role, actor]);
  const child = visibleChildren.find((c) => c.id === state.ui.childId) ?? visibleChildren[0];
  const ladder = child ? state.ladders[child.id] : undefined;

  const can = useCallback((p: Permission) => roleCan(role, p), [role]);

  const audit = useCallback(
    (s: DemoState, action: string, target: string): AuditEvent[] => {
      const a = s.members.find((m) => m.id === s.ui.actorId);
      const ev: AuditEvent = {
        id: uid("a"),
        tenantId: s.ui.tenantId,
        actorId: s.ui.actorId,
        actorName: s.ui.role === "student" ? "Student session" : a?.name ?? "Unknown",
        action,
        target,
        date: new Date().toISOString(),
      };
      return [ev, ...s.audit].slice(0, 200);
    },
    [],
  );

  /** Refuse an action the current role may not take, and record the refusal. */
  const deny = useCallback(
    (permission: Permission, target: string): Result => {
      commit((s) => ({ ...s, audit: audit(s, "permission.denied", `${permission}: ${target}`) }));
      return { ok: false, error: "Your role does not allow this." };
    },
    [audit, commit],
  );

  const actions = useMemo<DemoActions>(
    () => ({
      switchRole(nextRole) {
        commit((s) => {
          const { actorId, tenantId } = actorFor(s, nextRole);
          const ui = { ...s.ui, role: nextRole, actorId, tenantId };
          const vis = visibleChildrenFor({ ...s, ui }, nextRole, s.members.find((m) => m.id === actorId));
          const childId = vis.some((c) => c.id === s.ui.childId) ? s.ui.childId : vis[0]?.id ?? s.ui.childId;
          return { ...s, ui: { ...ui, childId } };
        });
      },

      selectChild(childId) {
        commit((s) => ({ ...s, ui: { ...s.ui, childId } }));
      },

      stage({ role: nextRole, familyTenantId, childId }) {
        commit((s) => {
          const famOk = familyTenantId && s.tenants.some((t) => t.id === familyTenantId);
          const base: DemoState = famOk ? { ...s, ui: { ...s.ui, familyTenantId: familyTenantId! } } : s;
          const { actorId, tenantId } = actorFor(base, nextRole);
          const ui = { ...base.ui, role: nextRole, actorId, tenantId };
          const vis = visibleChildrenFor({ ...base, ui }, nextRole, base.members.find((m) => m.id === actorId));
          const pick =
            childId && vis.some((c) => c.id === childId)
              ? childId
              : vis.some((c) => c.id === base.ui.childId)
                ? base.ui.childId
                : vis[0]?.id ?? base.ui.childId;
          return { ...base, ui: { ...ui, childId: pick } };
        });
      },

      createFamily({ parentName, email, familyName }) {
        const tenantId = uid("fam");
        const memberId = uid("m");
        const now = new Date().toISOString();
        commit((s) => ({
          ...s,
          tenants: [...s.tenants, { id: tenantId, kind: "family", name: familyName, plan: "family-annual", createdAt: now }],
          members: [...s.members, { id: memberId, tenantId, name: parentName, email, role: "parent", childIds: [], lastActive: now }],
          referrals: [
            ...s.referrals,
            {
              code: `${familyName.replace(/^the\s+/i, "").replace(/\s+family$/i, "").replace(/[^a-z]/gi, "").toUpperCase().slice(0, 8) || "FAMILY"}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
              ownerMemberId: memberId,
              invites: [],
              monthsEarned: 0,
              cap: 12,
            },
          ],
          ui: { ...s.ui, role: "parent", actorId: memberId, tenantId, familyTenantId: tenantId },
        }));
        return tenantId;
      },

      addChild(input) {
        const id = uid("c");
        commit((s) => {
          const tenantId = s.ui.familyTenantId;
          const child: Child = {
            id,
            tenantId,
            name: input.name.trim(),
            age: input.age,
            band: input.band ?? bandFor(input.age),
            sex: input.sex,
            interests: input.interests,
            faithTrack: input.faithTrack,
            modernComparisons: input.modernComparisons,
            screenCapMinutes: input.screenCapMinutes,
            narrator: input.narrator,
            mode: input.mode,
            createdAt: new Date().toISOString(),
            ...(input.consent ? { consentAt: new Date().toISOString(), consentBy: s.ui.actorId } : {}),
          };
          const members = s.members.map((m) =>
            m.tenantId === tenantId && (m.role === "parent" || m.role === "observer")
              ? { ...m, childIds: [...(m.childIds ?? []), id] }
              : m,
          );
          return {
            ...s,
            children: [...s.children, child],
            members,
            ladders: { ...s.ladders, [id]: startingState(id, 1) },
            ui: { ...s.ui, childId: id },
          };
        });
        return id;
      },

      updateChild(childId, patch) {
        if (!roleCan(stateRef.current.ui.role, "child.settings")) return deny("child.settings", childId);
        commit((s) => ({
          ...s,
          children: s.children.map((c) =>
            c.id === childId ? { ...c, ...patch, band: patch.age ? bandFor(patch.age) : patch.band ?? c.band } : c,
          ),
        }));
        return { ok: true };
      },

      savePlacement(result) {
        commit((s) => {
          // A child with lessons on record keeps them: a second placement may move the child up,
          // never down past mastered work. A new child starts at the placed rung.
          const existing = s.ladders[result.childId];
          const hasHistory = s.sessions.some((x) => x.childId === result.childId) || Boolean(existing?.mastered.length);
          const ladder =
            existing && hasHistory
              ? result.rung > existing.rung
                ? { ...startingState(result.childId, result.rung), mastered: Array.from(new Set([...existing.mastered, ...startingState(result.childId, result.rung).mastered])).sort((a, b) => a - b), review: existing.review }
                : existing
              : startingState(result.childId, result.rung);
          return {
            ...s,
            placements: [...s.placements.filter((p) => p.childId !== result.childId), result],
            ladders: { ...s.ladders, [result.childId]: ladder },
          };
        });
      },

      recordSession(input) {
        const s0 = stateRef.current;
        const current = s0.ladders[input.childId] ?? startingState(input.childId, input.rung);
        const res = applySession(current, input);
        const session: Session = {
          ...input,
          id: uid("s"),
          clean: res.clean,
          masteredRung: res.masteredRung,
        };
        commit((s) => ({
          ...s,
          sessions: [...s.sessions, session],
          ladders: { ...s.ladders, [input.childId]: res.ladder },
        }));
        return { session, clean: res.clean, remediate: res.remediate, cleanReads: res.cleanReads, masteredRung: res.masteredRung };
      },

      invite(email, extra) {
        if (!roleCan(stateRef.current.ui.role, "referrals.use")) return deny("referrals.use", email);
        const clean = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { ok: false, error: "Enter an email address like name@example.com." };
        const s = stateRef.current;
        const ref = referralFor(s);
        if (!ref) return { ok: false, error: "This account has no referral code yet." };
        if (ref.invites.some((i) => i.email === clean)) return { ok: false, error: "This address has already been invited." };
        const school = extra?.school?.trim();
        if (ref.tenantId && extra && !school) return { ok: false, error: "Enter the school's name." };
        commit((st) => ({
          ...st,
          referrals: st.referrals.map((r) =>
            r.code === ref.code
              ? {
                  ...r,
                  invites: [
                    { email: clean, status: "sent", sentAt: new Date().toISOString(), ...(school ? { school } : {}), invitedBy: st.ui.actorId },
                    ...r.invites,
                  ],
                }
              : r,
          ),
          audit: ref.tenantId ? audit(st, "referral.invite", school ? `${school} (${clean})` : clean) : st.audit,
        }));
        return { ok: true };
      },

      markInvitePaid(email) {
        const s = stateRef.current;
        const ref = referralFor(s);
        if (!ref) return { ok: false, error: "No referral code." };
        const clean = email.trim().toLowerCase();
        const inv = ref.invites.find((i) => i.email === clean);
        if (!inv) return { ok: false, error: "No invite for that address." };
        if (inv.status === "paid") return { ok: false, error: "This invite is already paid." };
        if (ref.monthsEarned >= ref.cap) return { ok: false, error: "You have reached this year's cap of 12 months." };
        const now = new Date().toISOString();
        const who = inv.school ?? clean;
        commit((st) => {
          // Re-check against the latest state: two clicks in one tick must credit once.
          const cur = st.referrals.find((r) => r.code === ref.code);
          const curInv = cur?.invites.find((i) => i.email === clean);
          if (!cur || !curInv || curInv.status === "paid" || cur.monthsEarned >= cur.cap) return st;
          return {
            ...st,
            referrals: st.referrals.map((r) =>
              r.code === ref.code
                ? {
                    ...r,
                    monthsEarned: r.monthsEarned + 1,
                    invites: r.invites.map((i) => (i.email === clean ? { ...i, status: "paid", paidAt: now } : i)),
                  }
                : r,
            ),
            ledger: [{ id: uid("l"), memberId: st.ui.actorId, date: now, months: 1, reason: `${who} joined and paid. One month each.` }, ...st.ledger],
          };
        });
        return { ok: true };
      },

      setConsent(childId, given) {
        if (!roleCan(stateRef.current.ui.role, "consent.manage")) return deny("consent.manage", childId);
        const s = stateRef.current;
        const c = s.children.find((x) => x.id === childId);
        if (!c) return { ok: false, error: "No such child." };
        commit((st) => ({
          ...st,
          children: st.children.map((x) =>
            x.id === childId
              ? given
                ? { ...x, consentAt: new Date().toISOString(), consentBy: st.ui.actorId }
                : { ...x, consentAt: undefined, consentBy: undefined }
              : x,
          ),
          audit: audit(st, given ? "consent.give" : "consent.withdraw", c.name),
        }));
        return { ok: true };
      },

      addMember({ name, email, role: r }) {
        if (!roleCan(stateRef.current.ui.role, "members.manage")) return deny("members.manage", email);
        if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return { ok: false, error: "Enter a name and a valid email." };
        if (stateRef.current.members.some((m) => m.email.toLowerCase() === email.trim().toLowerCase())) return { ok: false, error: "This person is already a member." };
        commit((s) => ({
          ...s,
          members: [
            ...s.members,
            { id: uid("m"), tenantId: s.ui.tenantId, name: name.trim(), email: email.trim().toLowerCase(), role: r, classIds: [], lastActive: new Date().toISOString() },
          ],
          audit: audit(s, "member.add", `${name.trim()} as ${r}`),
        }));
        return { ok: true };
      },

      changeRole(memberId, r) {
        if (!roleCan(stateRef.current.ui.role, "roles.edit")) return deny("roles.edit", memberId);
        if (memberId === stateRef.current.ui.actorId) return { ok: false, error: "You cannot change your own role." };
        commit((s) => {
          const m = s.members.find((x) => x.id === memberId);
          return {
            ...s,
            members: s.members.map((x) => (x.id === memberId ? { ...x, role: r } : x)),
            audit: audit(s, "role.change", `${m?.name ?? memberId}: ${m?.role} to ${r}`),
          };
        });
        return { ok: true };
      },

      enterScore({ childId, rung, accuracy, paperMinutes }) {
        if (!roleCan(stateRef.current.ui.role, "scores.enter")) return deny("scores.enter", childId);
        const date = new Date().toISOString();
        const s0 = stateRef.current;
        const current = s0.ladders[childId] ?? startingState(childId, rung);
        const res = applySession(current, { rung, accuracy, date });
        const session: Session = {
          id: uid("s"),
          childId,
          date,
          rung,
          accuracy,
          wcpm: 0,
          outcomes: [],
          screenMinutes: 0,
          paperMinutes,
          source: s0.ui.role === "parent" ? "paper" : "teacher",
          clean: res.clean,
          masteredRung: res.masteredRung,
        };
        const kid = s0.children.find((c) => c.id === childId);
        commit((s) => ({
          ...s,
          sessions: [...s.sessions, session],
          ladders: { ...s.ladders, [childId]: res.ladder },
          audit: audit(s, "scores.enter", `${kid?.name ?? childId}, rung ${rung}, ${Math.round(accuracy * 100)}%`),
        }));
        return { ok: true };
      },

      logAudit(action, target) {
        commit((s) => ({ ...s, audit: audit(s, action, target) }));
      },

      reset() {
        const fresh = createSeed();
        save(fresh);
        setState(fresh);
      },
    }),
    [audit, commit, deny],
  );

  const value: DemoContextValue = {
    state,
    hydrated,
    role,
    actor,
    tenant,
    familyTenant,
    child,
    ladder,
    visibleChildren,
    can,
    actions,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside <DemoProvider>.");
  return ctx;
}

/* ---------- Selectors ---------- */

export function sessionsFor(state: DemoState, childId: string): Session[] {
  return state.sessions.filter((s) => s.childId === childId).sort((a, b) => a.date.localeCompare(b.date));
}

export function placementFor(state: DemoState, childId: string): PlacementResult | undefined {
  return state.placements.find((p) => p.childId === childId);
}

/** Minutes on screen and on paper in the last seven days. */
export function weekMinutes(state: DemoState, childId: string, now = Date.now()) {
  const since = now - 7 * 86_400_000;
  const recent = state.sessions.filter((s) => s.childId === childId && new Date(s.date).getTime() >= since);
  return {
    screen: recent.reduce((n, s) => n + s.screenMinutes, 0),
    paper: recent.reduce((n, s) => n + s.paperMinutes, 0),
    lessons: recent.length,
  };
}
