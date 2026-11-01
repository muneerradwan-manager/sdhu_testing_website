/**
 * Permanent staff (الموظفون) from the operating document. Staff accounts are never self-created, and nobody is
 * assigned a whole system: each permission — viewing a resource, adding to it, changing it, deleting from it, or a
 * named act on it (lib/permissions.ts) — is granted to an employee directly, some for a scope only (a hall, an
 * airport, an operation…). The holder of «صلاحيات الموظفين» grants and takes them back at /staff/access, and
 * every grant is in the audit log.
 * The accounts (testdata/staff/accounts.json) open with the permissions that let each one do the work its title
 * says, so a permission is seen by signing in as its holder. Demo login: username + password "1448".
 */
import ACCOUNTS from "@/testdata/staff/accounts.json";
import EMPLOYEES from "@/testdata/staff/employees.json";
import { CATALOG, can as canKey, expand, mergeGrants, WINDOWS_OF, type PermGrant } from "./permissions";

export type StaffUser = {
  id: string;
  username: string;
  name: string;
  title: string;
  travels: boolean;
  initials: string;
  /** His permissions as they stand now (the store's when the director changed them, else these) */
  grants: PermGrant[];
};

const OPENED = new Date(2026, 8, 1, 9, 0).getTime();

/**
 * To view every system, to change none: the season director reads each page his dashboard links to («الموسم الآن»). Every
 * resource's «عرض» but the sensitive ones (personal data, answers, contacts — each worth granting on its own), and none of the
 * systems that belong to a post — a hall, an airport, a posting.
 */
const VIEW_ALL = CATALOG.filter((sys) => !["hall", "airport", "evaluate", "executive", "access"].includes(sys.key)).flatMap((sys) => sys.resources.filter((r) => !r.sensitive && r.verbs.includes("GET")).map((r) => `${sys.key}.${r.key}.GET`));

/** Who granted the accounts their permissions as the season opened: the season director, by his employee record */
const grantor = () => {
  const e = (EMPLOYEES as EmployeeRecord[]).find((x) => x.handle === "nour.a")!;
  return `${e.firstName} ${e.surname}`;
};

/** Grants as the season opened, from patterns like `flights.*` or `season.windows.PUT@hajj-direct,hajj-lottery` */
function seed(...patterns: string[]): PermGrant[] {
  return mergeGrants(
    ...patterns.map((p) => {
      const [pattern, scope] = p.split("@");
      return expand(pattern, scope ? scope.split(",") : undefined, { by: grantor(), at: OPENED });
    }),
  );
}
const windows = (ops: string[]) => [`season.windows.GET@${ops.join(",")}`, `season.windows.PUT@${ops.join(",")}`];

/**
 * A grant pattern as testdata/staff/accounts.json writes it: a permission or a wildcard (`flights.*`), with a scope
 * after «@» (`airport.*@ap-dam`), or one of two computed sets — `VIEW_ALL`, and `WINDOWS:<system>` for the windows of
 * that system's operations (`season.windows.GET`/`PUT` scoped to them).
 */
function patterns(p: string): string[] {
  if (p === "VIEW_ALL") return VIEW_ALL;
  if (p.startsWith("WINDOWS:")) return windows(WINDOWS_OF[p.slice("WINDOWS:".length) as keyof typeof WINDOWS_OF]);
  return [p];
}

type AccountRecord = { id: string; title: string; travels: boolean; grants: string[] };
/** `honorific` «د.» before his name, `nickname` «أبو سامي» after it, as the portal shows him */
type EmployeeRecord = { handle?: string; firstName: string; surname: string; honorific?: string; nickname?: string };

/**
 * The accounts (testdata/staff/accounts.json), each under its holder's handle in the employees' register
 * (testdata/staff/employees.json), which gives his name, its honorific and by-name, and his initial. The season director reads every system and changes none;
 * every system's work is one employee's — data entry at the office, the registration's configuration and windows,
 * the lottery's results and their approval, the exams, the administrators, the operations room (reading the
 * operational files), an airport's take-offs and landings, the medical team, flights, transport, audit, HR,
 * content, the operational files, the reference lists, the season's settings, a tower supervisor who rates the
 * administrators after the season, and the Damascus hall's supervisor.
 */
const EMPLOYEE_BY_HANDLE = new Map((EMPLOYEES as EmployeeRecord[]).filter((e) => e.handle).map((e) => [e.handle!, e]));

export const STAFF: StaffUser[] = (ACCOUNTS as AccountRecord[]).map((a) => {
  const e = EMPLOYEE_BY_HANDLE.get(a.id)!;
  return {
    id: a.id,
    username: a.id,
    name: `${e.honorific ? `${e.honorific} ` : ""}${e.firstName} ${e.surname}${e.nickname ? ` (${e.nickname})` : ""}`,
    title: a.title,
    travels: a.travels,
    initials: [...e.firstName][0],
    grants: seed(...a.grants.flatMap(patterns)),
  };
});

/** A staff member's name by account id («mazen» → «مازن الحلبي»), from the employees' register */
export const staffName = (id: string) => STAFF.find((u) => u.id === id)?.name ?? id;

/**
 * The test data writes who did something on the staff's side as the account («@mazen»), never the name: this puts the
 * name back, anywhere in the data it is given (lib/data/*, app/administrator/_lib/* read their JSON through it).
 */
export function withStaffNames<T>(data: T): T {
  const walk = (x: unknown): unknown => {
    if (typeof x === "string") return x.startsWith("@") && STAFF.some((u) => u.id === x.slice(1)) ? staffName(x.slice(1)) : x;
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, walk(v)]));
    return x;
  };
  return walk(data) as T;
}

export const STAFF_PASSWORD = "1448";

export function getStaff(id: string | null | undefined) {
  return STAFF.find((s) => s.id === id) ?? null;
}

/** An account with the permissions the director left it (the store's), else those it opened with */
export function withPermissions(user: StaffUser, stored: Record<string, PermGrant[]> | undefined): StaffUser {
  const g = stored?.[user.id];
  return g ? { ...user, grants: g } : user;
}

/** May this employee do it (lib/permissions.ts) */
export const can = (user: StaffUser | null | undefined, key: string, scopeId?: string) => canKey(user, key, scopeId);

/** The one who grants permissions: the season director, or whoever was given that */
export const isGrantor = (user: StaffUser | null | undefined) => can(user, "access.permissions.PUT");
