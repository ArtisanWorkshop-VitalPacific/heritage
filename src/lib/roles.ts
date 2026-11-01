import type { Role } from "./types";

export type Permission =
  | "billing.manage"
  | "members.manage"
  | "roles.edit"
  | "licenses.manage"
  | "audit.view"
  | "exports.run"
  | "sso.manage"
  | "class.view"
  | "lessons.assign"
  | "packets.print"
  | "scores.enter"
  | "progress.group"
  | "progress.own"
  | "progress.history"
  | "recordings.view"
  | "child.settings"
  | "consent.manage"
  | "referrals.use"
  | "lesson.take";

export interface RoleInfo {
  id: Role;
  label: string;
  surface: "family" | "school" | "student";
  summary: string;
}

export const ROLES: RoleInfo[] = [
  { id: "parent", label: "Parent", surface: "family", summary: "Sees only their own children, prints lessons, sets screen limits, gives consent and sends referrals." },
  { id: "teacher", label: "Teacher", surface: "school", summary: "Sees the classes assigned to them, with the mastery board, class packets and score entry." },
  { id: "admin", label: "Admin", surface: "school", summary: "Manages members, roles, licenses, exports, sign-in and the audit log." },
  { id: "student", label: "Student", surface: "student", summary: "Sees the lesson and nothing else, with no settings and no sharing." },
  { id: "owner", label: "Owner", surface: "school", summary: "Can do everything an Admin can, and also manages billing and the plan." },
  { id: "aide", label: "Aide", surface: "school", summary: "Prints and scores for assigned groups, without access to progress history." },
  { id: "observer", label: "Observer", surface: "family", summary: "Can see one named child’s progress but can’t change anything." },
];

export const PRIMARY_ROLES: Role[] = ["parent", "teacher", "admin", "student"];

export const PERMISSIONS: { id: Permission; label: string }[] = [
  { id: "lesson.take", label: "Take lessons" },
  { id: "progress.own", label: "See own child's progress" },
  { id: "progress.history", label: "See full history" },
  { id: "recordings.view", label: "Hear recordings" },
  { id: "child.settings", label: "Change child settings" },
  { id: "consent.manage", label: "Manage consent" },
  { id: "referrals.use", label: "Refer friends" },
  { id: "packets.print", label: "Print lesson packets" },
  { id: "scores.enter", label: "Enter paper scores" },
  { id: "class.view", label: "See classes" },
  { id: "progress.group", label: "See class progress" },
  { id: "lessons.assign", label: "Assign lessons" },
  { id: "members.manage", label: "Manage members" },
  { id: "roles.edit", label: "Change roles" },
  { id: "licenses.manage", label: "Manage licenses" },
  { id: "audit.view", label: "View audit log" },
  { id: "exports.run", label: "Export data" },
  { id: "sso.manage", label: "Configure SSO" },
  { id: "billing.manage", label: "Manage billing" },
];

const ADMIN: Permission[] = [
  "members.manage",
  "roles.edit",
  "licenses.manage",
  "audit.view",
  "exports.run",
  "sso.manage",
  "class.view",
  "progress.group",
  "packets.print",
  "referrals.use",
];

export const MATRIX: Record<Role, Permission[]> = {
  owner: [...ADMIN, "billing.manage", "lessons.assign", "scores.enter"],
  admin: ADMIN,
  teacher: ["class.view", "progress.group", "lessons.assign", "packets.print", "scores.enter", "referrals.use"],
  aide: ["class.view", "packets.print", "scores.enter"],
  parent: [
    "progress.own",
    "progress.history",
    "recordings.view",
    "child.settings",
    "consent.manage",
    "packets.print",
    "scores.enter",
    "referrals.use",
  ],
  observer: ["progress.own"],
  student: ["lesson.take"],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export function roleLabel(role: Role): string {
  return ROLES.find((r) => r.id === role)?.label ?? role;
}

/** Routes each role may open. Anything else shows the "not for this role" screen. */
export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/app": ["owner", "admin", "teacher", "aide", "parent", "observer", "student"],
  "/app/onboarding": ["parent", "owner", "admin", "teacher", "aide", "observer"],
  "/app/student": ["student"],
  "/app/lesson": ["student"],
  "/app/drill": ["student"],
  "/app/talk": ["student"],
  "/app/placement": ["student"],
  "/app/ladder": ["student", "parent", "observer"],
  "/app/report": ["parent", "observer"],
  "/app/print": ["parent", "teacher", "aide", "admin", "owner"],
  "/app/referrals": ["parent", "teacher", "admin", "owner"],
  "/app/admin": ["admin", "owner"],
  "/app/teacher": ["teacher", "aide", "admin", "owner"],
  "/app/settings": ["parent", "admin", "owner"],
};

export function routeAllowed(pathname: string, role: Role): boolean {
  const keys = Object.keys(ROUTE_ACCESS).sort((a, b) => b.length - a.length);
  const key = keys.find((k) => pathname === k || pathname.startsWith(k + "/"));
  if (!key) return true;
  return ROUTE_ACCESS[key].includes(role);
}

/** Where each role lands when it opens the app. */
export const ROLE_HOME: Record<Role, string> = {
  parent: "/app",
  observer: "/app/report",
  teacher: "/app/teacher",
  aide: "/app/teacher",
  admin: "/app/admin",
  owner: "/app/admin",
  student: "/app/student",
};
