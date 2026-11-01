import type {
  AuditEvent,
  Child,
  ClassGroup,
  DemoState,
  LadderState,
  LedgerEntry,
  Member,
  PlacementResult,
  Referral,
  Session,
  Tenant,
} from "./types";

export const SEED_VERSION = 3;

const DAY = 86_400_000;

function iso(t: number): string {
  return new Date(t).toISOString();
}

/** Small deterministic generator so the seed looks the same on every device. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function bandFor(age: number): Child["band"] {
  if (age <= 6) return "A";
  if (age <= 8) return "B";
  return "C";
}

function ladderAt(childId: string, rung: number, now: number, cleanOnCurrent = 0): LadderState {
  const mastered = Array.from({ length: Math.max(0, rung - 1) }, (_, i) => i + 1);
  const review = rung > 2 ? [{ rung: rung - 1, due: iso(now + 2 * DAY) }] : [];
  return { childId, rung, mastered, cleanReads: cleanOnCurrent ? { [rung]: cleanOnCurrent } : {}, review };
}

/**
 * Builds a believable eight-week history: three sessions a week, fluency rising,
 * rungs advancing, mostly on paper with a short screen check.
 */
function history(opts: {
  childId: string;
  now: number;
  weeks: number;
  startRung: number;
  endRung: number;
  startWcpm: number;
  endWcpm: number;
  seed: number;
}): Session[] {
  const r = rng(opts.seed);
  const out: Session[] = [];
  const total = opts.weeks * 3;
  for (let i = 0; i < total; i++) {
    const t = opts.now - (opts.weeks * 7 - Math.round((i * 7) / 3)) * DAY - Math.round(r() * 6) * 3_600_000;
    const p = i / (total - 1);
    const rung = Math.min(opts.endRung, Math.floor(opts.startRung + (opts.endRung - opts.startRung) * p));
    const wcpm = Math.round(opts.startWcpm + (opts.endWcpm - opts.startWcpm) * p + (r() - 0.5) * 3);
    const accuracy = Math.min(1, Math.round((0.9 + r() * 0.09) * 100) / 100);
    const clean = accuracy >= 0.95;
    out.push({
      id: `${opts.childId}-s${i}`,
      childId: opts.childId,
      date: iso(t),
      rung,
      accuracy,
      wcpm,
      outcomes: [],
      screenMinutes: 3 + Math.round(r() * 2),
      paperMinutes: 10 + Math.round(r() * 4),
      source: i % 4 === 3 ? "paper" : "screen",
      clean,
    });
  }
  return out;
}

export function createSeed(now = Date.now()): DemoState {
  const tenants: Tenant[] = [
    { id: "fam_harper", kind: "family", name: "The Harper family", plan: "family-annual", createdAt: iso(now - 70 * DAY) },
    {
      id: "org_oakhill",
      kind: "organization",
      name: "Oak Hill Classical Academy",
      plan: "school",
      seats: 40,
      ssoProvider: "google",
      rostering: "clever",
      createdAt: iso(now - 120 * DAY),
    },
  ];

  const members: Member[] = [
    { id: "m_claire", tenantId: "fam_harper", name: "Claire Harper", email: "claire@harperfamily.example", role: "parent", childIds: ["c_nora", "c_eli"], lastActive: iso(now - 2 * 3_600_000) },
    { id: "m_margaret", tenantId: "fam_harper", name: "Margaret Harper", email: "grandma.margaret@harperfamily.example", role: "observer", childIds: ["c_nora"], lastActive: iso(now - 3 * DAY) },
    { id: "m_cole", tenantId: "org_oakhill", name: "David Cole", email: "headmaster@oakhill.example", role: "owner", lastActive: iso(now - 1 * DAY) },
    { id: "m_adler", tenantId: "org_oakhill", name: "Ruth Adler", email: "r.adler@oakhill.example", role: "admin", lastActive: iso(now - 5 * 3_600_000) },
    { id: "m_finch", tenantId: "org_oakhill", name: "Eleanor Finch", email: "e.finch@oakhill.example", role: "teacher", classIds: ["cls_finch"], lastActive: iso(now - 20 * 3_600_000) },
    { id: "m_bell", tenantId: "org_oakhill", name: "Thomas Bell", email: "t.bell@oakhill.example", role: "teacher", classIds: ["cls_bell"], lastActive: iso(now - 26 * 3_600_000) },
    { id: "m_price", tenantId: "org_oakhill", name: "Anna Price", email: "a.price@oakhill.example", role: "aide", classIds: ["cls_finch"], lastActive: iso(now - 4 * DAY) },
  ];

  const kid = (
    id: string,
    tenantId: string,
    name: string,
    age: number,
    sex: Child["sex"],
    interests: string[],
    extra: Partial<Child> = {},
  ): Child => ({
    id,
    tenantId,
    name,
    age,
    band: bandFor(age),
    sex,
    interests,
    faithTrack: true,
    modernComparisons: false,
    screenCapMinutes: 15,
    narrator: "american",
    mode: "paper",
    createdAt: iso(now - 60 * DAY),
    ...extra,
  });

  const children: Child[] = [
    kid("c_nora", "fam_harper", "Nora", 6, "girl", ["horses", "baking", "birds"], { classId: "cls_finch", linkedTenantIds: ["org_oakhill"] }),
    kid("c_eli", "fam_harper", "Eli", 8, "boy", ["ships", "maps", "knights"], { narrator: "british", modernComparisons: true, screenCapMinutes: 20, mode: "screen" }),
    // Oak Hill, Mrs. Finch's Primer Class
    kid("c_henry", "org_oakhill", "Henry", 5, "boy", ["trains", "farm animals"], { classId: "cls_finch" }),
    kid("c_clara", "org_oakhill", "Clara", 6, "girl", ["gardens", "music"], { classId: "cls_finch" }),
    kid("c_owen", "org_oakhill", "Owen", 6, "boy", ["insects", "stars"], { classId: "cls_finch" }),
    kid("c_ada", "org_oakhill", "Ada", 7, "girl", ["birds", "maps"], { classId: "cls_finch" }),
    kid("c_silas", "org_oakhill", "Silas", 5, "boy", ["knights"], { classId: "cls_finch" }),
    kid("c_lucy", "org_oakhill", "Lucy", 6, "girl", ["baking", "horses"], { classId: "cls_finch" }),
    // Oak Hill, Mr. Bell's Second Form
    kid("c_jonah", "org_oakhill", "Jonah", 8, "boy", ["ships", "stars"], { classId: "cls_bell" }),
    kid("c_hazel", "org_oakhill", "Hazel", 8, "girl", ["gardens", "birds"], { classId: "cls_bell" }),
    kid("c_felix", "org_oakhill", "Felix", 7, "boy", ["trains"], { classId: "cls_bell" }),
    kid("c_grace", "org_oakhill", "Grace", 9, "girl", ["music", "horses"], { classId: "cls_bell" }),
    kid("c_isaac", "org_oakhill", "Isaac", 8, "boy", ["knights", "maps"], { classId: "cls_bell" }),
    kid("c_bea", "org_oakhill", "Beatrice", 7, "girl", ["insects"], { classId: "cls_bell" }),
  ];

  const classes: ClassGroup[] = [
    { id: "cls_finch", tenantId: "org_oakhill", name: "Primer Class", teacherId: "m_finch", studentIds: ["c_nora", "c_henry", "c_clara", "c_owen", "c_ada", "c_silas", "c_lucy"] },
    { id: "cls_bell", tenantId: "org_oakhill", name: "Second Form", teacherId: "m_bell", studentIds: ["c_jonah", "c_hazel", "c_felix", "c_grace", "c_isaac", "c_bea"] },
  ];

  const rungs: Record<string, number> = {
    c_nora: 10,
    c_eli: 25,
    c_henry: 7,
    c_clara: 12,
    c_owen: 9,
    c_ada: 16,
    c_silas: 6,
    c_lucy: 11,
    c_jonah: 22,
    c_hazel: 28,
    c_felix: 19,
    c_grace: 31,
    c_isaac: 24,
    c_bea: 18,
  };

  const ladders: Record<string, LadderState> = {};
  for (const [id, rung] of Object.entries(rungs)) {
    ladders[id] = ladderAt(id, rung, now, id === "c_nora" ? 1 : 0);
  }
  // A few review items due so the teacher board shows ochre cells.
  ladders.c_owen.review = [{ rung: 7, due: iso(now - DAY) }];
  ladders.c_isaac.review = [{ rung: 21, due: iso(now) }];
  ladders.c_eli.review = [
    { rung: 23, due: iso(now + DAY) },
    { rung: 24, due: iso(now + 5 * DAY) },
  ];

  const sessions: Session[] = [
    ...history({ childId: "c_nora", now, weeks: 8, startRung: 6, endRung: 10, startWcpm: 31, endWcpm: 44, seed: 7 }),
    ...history({ childId: "c_eli", now, weeks: 8, startRung: 19, endRung: 25, startWcpm: 62, endWcpm: 79, seed: 11 }),
  ];
  // Oak Hill students: two recent sessions each.
  let k = 0;
  for (const c of children.filter((c) => c.tenantId === "org_oakhill")) {
    const base = 24 + rungs[c.id] * 2;
    for (let i = 0; i < 2; i++) {
      sessions.push({
        id: `${c.id}-s${i}`,
        childId: c.id,
        date: iso(now - (i * 3 + 1 + (k % 3)) * DAY),
        rung: rungs[c.id],
        accuracy: 0.9 + ((k * 7 + i * 3) % 9) / 100,
        wcpm: base + i * 2,
        outcomes: [],
        screenMinutes: 4,
        paperMinutes: 12,
        source: i === 0 ? "teacher" : "paper",
        clean: (k + i) % 3 !== 0,
      });
    }
    k++;
  }

  const placements: PlacementResult[] = [
    { childId: "c_nora", date: iso(now - 56 * DAY), soundsKnown: 9, soundsTotal: 10, wordsRead: 2, wordsTried: 4, ceilingRung: 7, passageAccuracy: 0.92, wcpm: 31, rung: 6 },
    { childId: "c_eli", date: iso(now - 56 * DAY), soundsKnown: 10, soundsTotal: 10, wordsRead: 13, wordsTried: 15, ceilingRung: 20, passageAccuracy: 0.93, wcpm: 62, rung: 19 },
  ];

  const referrals: Referral[] = [
    {
      code: "HARPER-8K2F",
      ownerMemberId: "m_claire",
      invites: [
        { email: "the.mitchells@example.com", status: "paid", sentAt: iso(now - 20 * DAY), paidAt: iso(now - 6 * DAY) },
        { email: "sarah.okafor@example.com", status: "joined", sentAt: iso(now - 9 * DAY) },
        { email: "ben.and.ann@example.com", status: "sent", sentAt: iso(now - 2 * DAY) },
      ],
      monthsEarned: 1,
      cap: 12,
    },
    { code: "OAKHILL-SCHOOL", ownerMemberId: "m_adler", invites: [], monthsEarned: 0, cap: 12 },
  ];

  const ledger: LedgerEntry[] = [
    { id: "l1", memberId: "m_claire", date: iso(now - 6 * DAY), months: 1, reason: "The Mitchells joined and paid. One month each." },
  ];

  const ev = (i: number, actorId: string, actorName: string, action: string, target: string, daysAgo: number): AuditEvent => ({
    id: `a${i}`,
    tenantId: "org_oakhill",
    actorId,
    actorName,
    action,
    target,
    date: iso(now - daysAgo * DAY),
  });
  const audit: AuditEvent[] = [
    ev(1, "m_adler", "Ruth Adler", "sso.configure", "Google Workspace sign-in enabled", 40),
    ev(2, "m_adler", "Ruth Adler", "rostering.sync", "Clever sync: 13 students, 2 classes", 39),
    ev(3, "m_cole", "David Cole", "dpa.sign", "Student data privacy agreement signed", 38),
    ev(4, "m_adler", "Ruth Adler", "member.add", "Anna Price as Aide", 21),
    ev(5, "m_claire", "Claire Harper", "consent.link", "Nora linked to Primer Class by parent", 18),
    ev(6, "m_finch", "Eleanor Finch", "packets.print", "Primer Class, rung 9 packets", 6),
    ev(7, "m_adler", "Ruth Adler", "export.run", "Mastery CSV, Second Form", 4),
    ev(8, "m_bell", "Thomas Bell", "scores.enter", "Paper scores for 6 students", 2),
    ev(9, "m_finch", "Eleanor Finch", "lessons.assign", "Rung 10 to Nora and Lucy", 1),
  ].reverse();

  return {
    version: SEED_VERSION,
    tenants,
    members,
    children,
    classes,
    ladders,
    placements,
    sessions,
    referrals,
    ledger,
    audit,
    ui: { role: "parent", actorId: "m_claire", tenantId: "fam_harper", childId: "c_nora", familyTenantId: "fam_harper" },
  };
}

export { bandFor };
