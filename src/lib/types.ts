/**
 * Shared contracts for the Heritage Readers demo.
 * Every surface (site, student, grown-up, engine) codes against these types.
 * Change them only in the foundation; agents extend with local types in their own folders.
 */

export type AgeBand = "A" | "B" | "C"; // A: ages 4-6, B: 7-8, C: 9+

export type Role = "owner" | "admin" | "teacher" | "aide" | "parent" | "observer" | "student";

export type Narrator = "american" | "british";

export type LessonMode = "paper" | "screen";

export type TenantKind = "family" | "organization";

export interface Tenant {
  id: string;
  kind: TenantKind;
  name: string;
  plan: "family-annual" | "family-monthly" | "esa" | "school";
  seats?: number; // organizations only
  ssoProvider?: "google" | "microsoft" | null;
  rostering?: "clever" | "classlink" | "oneroster" | null;
  createdAt: string;
}

export interface Member {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Exclude<Role, "student">;
  childIds?: string[]; // parents and observers: which children they may see
  classIds?: string[]; // teachers and aides: which classes they teach
  lastActive: string;
}

export interface Child {
  id: string;
  tenantId: string;
  name: string;
  age: number;
  band: AgeBand;
  sex: "girl" | "boy";
  interests: string[];
  faithTrack: boolean;
  modernComparisons: boolean;
  screenCapMinutes: number;
  narrator: Narrator;
  mode: LessonMode;
  classId?: string;
  linkedTenantIds?: string[]; // e.g. a co-op that may also see this child
  createdAt: string;
  /** When and by whom parent consent was recorded. Absent: no consent on file. */
  consentAt?: string;
  consentBy?: string;
}

export interface ClassGroup {
  id: string;
  tenantId: string;
  name: string;
  teacherId: string;
  studentIds: string[];
}

/** One child's position on the ladder. Mirrors docs/poc-state-machine.md. */
export interface LadderState {
  childId: string;
  rung: number; // current rung, 1..40
  mastered: number[]; // rungs mastered
  cleanReads: Record<number, number>; // rung -> clean reads so far
  review: { rung: number; due: string }[]; // scheduled reviews (ISO dates)
}

export type WordStatus = "correct" | "substitution" | "omission" | "insertion" | "hesitation";

export interface WordOutcome {
  word: string; // the target word as printed (or the inserted word for insertions)
  index: number; // position in the passage, -1 for insertions
  status: WordStatus;
  heard?: string;
}

export interface Session {
  id: string;
  childId: string;
  date: string; // ISO
  rung: number;
  passageId?: string;
  accuracy: number; // 0..1
  wcpm: number;
  outcomes: WordOutcome[];
  screenMinutes: number;
  paperMinutes: number;
  source: "screen" | "paper" | "teacher";
  clean: boolean; // accuracy >= 0.95 and no error on the target pattern
  masteredRung?: number; // set when this session earned a seal
}

export interface PlacementResult {
  childId: string;
  date: string;
  soundsKnown: number;
  soundsTotal: number;
  wordsRead: number;
  wordsTried: number;
  ceilingRung: number;
  passageAccuracy: number; // 0..1
  wcpm: number;
  rung: number; // placed rung
}

export interface ReferralInvite {
  email: string;
  status: "sent" | "joined" | "paid";
  sentAt: string;
  paidAt?: string;
  /** School invites: the school's name, and the staff member who sent it. */
  school?: string;
  invitedBy?: string;
}

export interface Referral {
  code: string;
  ownerMemberId: string;
  /** Set on an organization's shared code, which any staff member with referrals.use may send. */
  tenantId?: string;
  invites: ReferralInvite[];
  monthsEarned: number;
  cap: number; // 12 per year
}

export interface LedgerEntry {
  id: string;
  memberId: string;
  date: string;
  months: number; // positive = credit
  reason: string;
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  actorId: string;
  actorName: string;
  action: string; // e.g. "role.change", "export.run", "permission.denied"
  target: string;
  date: string;
}

export interface DemoUi {
  role: Role;
  actorId: string; // member acting (for student role: the parent who handed over the device)
  tenantId: string;
  childId: string; // selected child
  familyTenantId: string; // the family the Parent and Student roles act for
}

export interface DemoState {
  version: number;
  tenants: Tenant[];
  members: Member[];
  children: Child[];
  classes: ClassGroup[];
  ladders: Record<string, LadderState>;
  placements: PlacementResult[];
  sessions: Session[];
  referrals: Referral[];
  ledger: LedgerEntry[];
  audit: AuditEvent[];
  ui: DemoUi;
}

/* ---------- Curriculum ---------- */

export type RungGroup =
  | "vowels"
  | "consonants"
  | "doubles"
  | "ending-blends"
  | "onset-blends"
  | "digraphs"
  | "silent-e"
  | "vowel-teams"
  | "r-controlled"
  | "endings"
  | "syllables";

export interface LetterPage {
  glyphs: string; // e.g. "h H" or "qu Qu"
  keyword: string; // e.g. "hen"
  spot: string; // illustration id, e.g. "spot-hen"
  say: string; // what the tutor says, e.g. "h says the first sound in hen."
}

/**
 * The Hay and Wingo vowel ladder. Index 0 = a, 1 = e, 2 = i, 3 = o, 4 = u.
 * Displayed with u at the top and a at the bottom; the child climbs from a.
 * null leaves a rung empty, as the book does when no word fits.
 */
export interface VowelLadderData {
  onset: string; // e.g. "h" or "bl"
  left: (string | null)[]; // e.g. ["ha","he","hi","ho","hu"]
  right: (string | null)[]; // e.g. ["hat","hen","him","hot","hum"]
}

export interface Passage {
  id: string;
  rung: number;
  title: string;
  sentences: string[];
  illustration?: string; // illustration id
  cast: string[]; // proper names allowed in this passage
}

export interface Rung {
  n: number; // 1..40
  title: string; // "The letter h"
  short: string; // "h"
  group: RungGroup;
  graphemes: string[]; // graphemes introduced at this rung
  letterPages?: LetterPage[];
  ladder?: VowelLadderData;
  pattern?: { from: string; to: string }[]; // e.g. ten -> tent, cap -> cape
  families?: string[][]; // word families shown as columns
  pairs: [string, string][]; // minimal pairs (vowel or pattern contrast)
  words: string[]; // practice words, decodable at this rung
  passage?: Passage;
  sight: string[]; // sight words introduced at this rung
  classicalWord?: { word: string; gloss: string };
}

/* ---------- Tutor ---------- */

export interface TutorChild {
  name: string;
  age: number;
  band: AgeBand;
  sex: "girl" | "boy";
  interests: string[];
  faithTrack: boolean;
  modernComparisons: boolean;
}

export interface TutorTurn {
  role: "child" | "tutor";
  text: string;
}

export interface TutorRequest {
  messages: TutorTurn[];
  child: TutorChild;
  rung: number;
  context: "lesson" | "talk" | "placement";
  passage?: { title: string; sentences: string[] };
}

export interface TutorReply {
  text: string;
  source: "gateway" | "script";
  model?: string;
}
