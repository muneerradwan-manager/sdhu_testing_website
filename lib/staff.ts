/**
 * Permanent staff (الموظفون) from the operating document. Staff accounts are never self-created, and nobody is
 * assigned a whole system: each permission — viewing a resource, adding to it, changing it, deleting from it, or a
 * named act on it (lib/permissions.ts) — is granted to an employee directly, some for a scope only (a hall, an
 * airport, an operation…). The holder of «صلاحيات الموظفين» grants and takes them back at /staff/access, and
 * every grant is in the audit log.
 * The accounts below open with the permissions that let each one do the work its title says, so a permission is
 * seen by signing in as its holder. Demo login: username + password "1448".
 */
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

/** Grants as the season opened, from patterns like `flights.*` or `season.windows.PUT@hajj-direct,hajj-lottery` */
function seed(...patterns: string[]): PermGrant[] {
  return mergeGrants(
    ...patterns.map((p) => {
      const [pattern, scope] = p.split("@");
      return expand(pattern, scope ? scope.split(",") : undefined, { by: "نور الأعرج", at: OPENED });
    }),
  );
}
const windows = (ops: string[]) => [`season.windows.GET@${ops.join(",")}`, `season.windows.PUT@${ops.join(",")}`];

const LOTTERY_IMPORT = ["lottery.stats.GET", "lottery.ages.GET", "lottery.ages.issue", "lottery.pool.GET", "lottery.pool.export", "lottery.draw.GET", "lottery.draw.POST", "lottery.draw.PUT", "lottery.draw.submit"];
const LOTTERY_APPROVE = ["lottery.stats.GET", "lottery.ages.GET", "lottery.ages.approve", "lottery.pool.GET", "lottery.draw.GET", "lottery.draw.publish"];
const OPFILES_READ = ["opfiles.files.GET", "opfiles.nodes.GET", "opfiles.assignments.GET", "opfiles.staff-contact.GET"];

export const STAFF: StaffUser[] = [
  // The season director: who may do what (the staff's permissions), the whole season's numbers (the executive dashboard),
  // and the right to view every system's pages. Every system's work is one employee's below; none of it is his to change
  { id: "nour.a", username: "nour.a", name: "نور الأعرج", title: "مدير الموسم", travels: false, initials: "ن", grants: seed("access.*", "executive.*", ...VIEW_ALL) },
  { id: "rana", username: "rana", name: "رنا حداد", title: "إدارة التسجيل", travels: false, initials: "ر", grants: seed("reviews.*", "evaluate.committee.*") },
  // Data entry: registering citizens at the office and nothing else — no group, no cluster, no administrator
  { id: "razan", username: "razan", name: "رزان الحسن", title: "إدخال بيانات — التسجيل على الحج", travels: false, initials: "ر", grants: seed("office.*") },
  // The registration as configuration: its pages, questions, rules, installments and steps, published per season, and its two windows
  { id: "hiba", username: "hiba", name: "هبة القدسي", title: "مسؤولة إدارة التسجيل على الحج", travels: false, initials: "ه", grants: seed("registration.*", ...windows(WINDOWS_OF.registration)) },
  { id: "kinan", username: "kinan", name: "كنان الأحمد", title: "إدارة التسجيل — إدخال نتائج القرعة", travels: false, initials: "ك", grants: seed(...LOTTERY_IMPORT) },
  { id: "yousef", username: "yousef", name: "يوسف الزعبي", title: "لجنة اعتماد ونشر نتائج القرعة", travels: false, initials: "ي", grants: seed(...LOTTERY_APPROVE, "evaluate.committee.*") },
  { id: "munir", username: "munir", name: "منير السيد", title: "مسؤول الامتحانات", travels: false, initials: "م", grants: seed("exams.*", ...windows(WINDOWS_OF.exams)) },
  { id: "mazen", username: "mazen", name: "مازن الحلبي", title: "مدير المكتب", travels: false, initials: "م", grants: seed("admins.*", ...windows(WINDOWS_OF.admins)) },
  // The operations room reads the operational files without changing them
  { id: "fadi", username: "fadi", name: "فادي سلوم", title: "غرفة العمليات — مكة", travels: true, initials: "ف", grants: seed("operations.*", ...OPFILES_READ) },
  // Damascus airport's representative: take-offs and landings there, nothing else
  { id: "omar", username: "omar", name: "عمر الشامي", title: "مندوب مطار دمشق — الإقلاع والهبوط", travels: false, initials: "ع", grants: seed("airport.*@ap-dam", "evaluate.evaluations.*") },
  { id: "layla", username: "layla", name: "د. ليلى شمس", title: "الفريق الطبي", travels: true, initials: "ل", grants: seed("medical.*", "evaluate.evaluations.*") },
  { id: "haitham", username: "haitham", name: "هيثم زيدان", title: "مسؤول الطيران", travels: true, initials: "ه", grants: seed("flights.*", "evaluate.evaluations.*") },
  { id: "bassel", username: "bassel", name: "باسل النوري", title: "فريق المواصلات", travels: true, initials: "ب", grants: seed("transport.*", "evaluate.evaluations.*") },
  { id: "tarek", username: "tarek", name: "طارق مصطفى", title: "التدقيق", travels: false, initials: "ط", grants: seed("audit.*", "executive.*", "evaluate.committee.*") },
  { id: "abusami", username: "abusami", name: "سامي حلاق (أبو سامي)", title: "الموارد البشرية", travels: false, initials: "س", grants: seed("staff.*") },
  { id: "nour", username: "nour", name: "نور العابد", title: "محرّرة محتوى المنصة", travels: false, initials: "ن", grants: seed("content.*") },
  { id: "ghassan", username: "ghassan", name: "غسان العمر", title: "مدير شؤون البعثة — الملفات التشغيلية", travels: true, initials: "غ", grants: seed("opfiles.*") },
  // The reference lists (hotels, sectors, centres, camps) that the operational files choose their places from
  { id: "rima", username: "rima", name: "ريما الجندي", title: "مسؤولة البيانات المرجعية", travels: false, initials: "ر", grants: seed("reference.*") },
  { id: "lubna", username: "lubna", name: "لبنى الشهابي", title: "مسؤولة إعدادات الموسم", travels: false, initials: "ل", grants: seed("season.*") },
  // Posted as the supervisor of فندق أبراج النور, where تكتل النور lived: after the season he rates its administrators
  { id: "wissam", username: "wissam", name: "وسام خوري", title: "مشرف برج — فندق أبراج النور", travels: true, initials: "و", grants: seed("evaluate.evaluations.*") },
  // Damascus centre's hall supervisor: its sittings, attendance, devices and submissions, nothing else
  { id: "nisreen", username: "nisreen", name: "نسرين الحكيم", title: "مشرفة قاعة امتحانية — مركز دمشق", travels: false, initials: "ن", grants: seed("hall.*@damascus") },
];

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
