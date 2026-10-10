/**
 * Permanent staff (الموظفون) from the operating document. Staff accounts are never self-created;
 * permissions are granted one by one, and field scope comes from operational files.
 * Some permissions are the management of a whole file — «إدارة الموظفين», «إدارة الإداريين», «إدارة
 * الامتحانات», «إدارة الطيران» — rather than
 * one task: whoever holds one runs that file entirely, from its summary and its management page, and the
 * director grants it and follows it (lib/systems.ts). The other permissions open one task each.
 * In the demo every account holds exactly one permission, and no two accounts the same one, so a permission
 * is seen by signing in as its holder; the season director holds all of them but the management of the
 * files, which she grants. The two accounts with none differ by their assignment: a hall, an airport.
 * Demo login: username + password "1448".
 */

export type Permission =
  | "systems.assign" // منح صلاحيات إدارة الملفات وسحبها، ومتابعة حال كل ملف وأحداثه المهمة
  | "staff.manage" // إدارة الموظفين: الملف كله، من سجل الموظفين وحساباتهم إلى مشاركتهم في الموسم
  | "admins.manage" // إدارة الإداريين: الملف كله، من قواعد الصفات إلى المجموعات وطلبات التكتلات واعتمادها وتقييمها وتصنيفها
  | "exams.manage" // إدارة الامتحانات: الملف كله، من المراكز إلى إعلان النتائج
  | "flights.manage" // إدارة الطيران: الملف كله، من الرحلات إلى الإقلاع والهبوط
  | "pilgrims.register" // التسجيل على الحج: تسجيل أي حاج في مدة التسجيل — لا يضعه في مجموعة ولا يمنح أي صلاحية في المجموعات
  | "registration.review" // مراجعة الطلبات والوثائق
  | "season.settings" // إعدادات الموسم والاعتماد
  | "lottery.import" // إدخال نتائج القرعة (سنوات الميلاد وأشهرها كما سُحبت في البث)
  | "lottery.approve" // اعتماد ونشر النتائج
  | "operations.room" // غرفة العمليات
  | "audit.read" // الاطلاع على سجل الأحداث
  | "content.manage" // إدارة محتوى الموقع
  | "medical" // الفريق الطبي
  | "transport" // المواصلات
  | "ops.files"; // الملفات التشغيلية والبيانات المرجعية

export type StaffUser = {
  id: string;
  username: string;
  name: string;
  title: string;
  travels: boolean;
  permissions: Permission[];
  initials: string;
};

/** The permissions that are the management of a whole file: each opens its summary and its management page */
export const MANAGEMENT_PERMISSIONS: Permission[] = ["staff.manage", "admins.manage", "exams.manage", "flights.manage"];

/** Every permission, in the order the portal lists them */
export const ALL_PERMISSIONS: Permission[] = [
  "systems.assign",
  "staff.manage",
  "admins.manage",
  "exams.manage",
  "flights.manage",
  "pilgrims.register",
  "registration.review",
  "season.settings",
  "lottery.import",
  "lottery.approve",
  "operations.room",
  "audit.read",
  "content.manage",
  "medical",
  "transport",
  "ops.files",
];

/** Every permission for one task: all the director holds, the management of the files being hers to grant */
export const TASK_PERMISSIONS = ALL_PERMISSIONS.filter((p) => !MANAGEMENT_PERMISSIONS.includes(p));

export const STAFF: StaffUser[] = [
  { id: "suha", username: "suha", name: "سهى مراد", title: "مديرة الموسم", travels: false, initials: "س", permissions: TASK_PERMISSIONS },
  { id: "rana", username: "rana", name: "رنا حداد", title: "إدارة التسجيل", travels: false, initials: "ر", permissions: ["registration.review"] },
  // Data entry: this one permission and nothing else — no group, no cluster, no administrator
  { id: "razan", username: "razan", name: "رزان الحسن", title: "إدخال بيانات — التسجيل على الحج", travels: false, initials: "ر", permissions: ["pilgrims.register"] },
  { id: "kinan", username: "kinan", name: "كنان الأحمد", title: "إدارة التسجيل — إدخال نتائج القرعة", travels: false, initials: "ك", permissions: ["lottery.import"] },
  { id: "yousef", username: "yousef", name: "يوسف الزعبي", title: "لجنة اعتماد ونشر نتائج القرعة", travels: false, initials: "ي", permissions: ["lottery.approve"] },
  { id: "munir", username: "munir", name: "منير السيد", title: "مسؤول الامتحانات", travels: false, initials: "م", permissions: ["exams.manage"] },
  { id: "mazen", username: "mazen", name: "مازن الحلبي", title: "مدير المكتب", travels: false, initials: "م", permissions: ["admins.manage"] },
  { id: "fadi", username: "fadi", name: "فادي سلوم", title: "غرفة العمليات — مكة", travels: true, initials: "ف", permissions: ["operations.room"] },
  // No permission: the holder of «إدارة الطيران» made him the representative of Damascus airport (lib/flights.ts)
  { id: "omar", username: "omar", name: "عمر الشامي", title: "مندوب مطار دمشق — الإقلاع والهبوط", travels: false, initials: "ع", permissions: [] },
  { id: "layla", username: "layla", name: "د. ليلى شمس", title: "الفريق الطبي", travels: true, initials: "ل", permissions: ["medical"] },
  { id: "haitham", username: "haitham", name: "هيثم زيدان", title: "مسؤول الطيران", travels: true, initials: "ه", permissions: ["flights.manage"] },
  { id: "bassel", username: "bassel", name: "باسل النوري", title: "فريق المواصلات", travels: true, initials: "ب", permissions: ["transport"] },
  { id: "tarek", username: "tarek", name: "طارق مصطفى", title: "التدقيق", travels: false, initials: "ط", permissions: ["audit.read"] },
  { id: "abusami", username: "abusami", name: "سامي حلاق (أبو سامي)", title: "الموارد البشرية", travels: false, initials: "س", permissions: ["staff.manage"] },
  { id: "nour", username: "nour", name: "نور العابد", title: "محرّرة محتوى المنصة", travels: false, initials: "ن", permissions: ["content.manage"] },
  { id: "ghassan", username: "ghassan", name: "غسان العمر", title: "مدير شؤون البعثة — الملفات التشغيلية", travels: true, initials: "غ", permissions: ["ops.files"] },
  { id: "lubna", username: "lubna", name: "لبنى الشهابي", title: "مديرة موسم مساعدة — لا تملك صلاحية النشر", travels: false, initials: "ل", permissions: ["season.settings"] },
  // No permission: her hall comes from the holder of «إدارة الامتحانات» assigning her to a centre (app/administrator/_lib/halls.ts)
  { id: "nisreen", username: "nisreen", name: "نسرين الحكيم", title: "مشرفة قاعة امتحانية — مركز دمشق", travels: false, initials: "ن", permissions: [] },
];

export const STAFF_PASSWORD = "1448";

export const PERMISSION_LABELS: Record<Permission, string> = {
  "systems.assign": "منح صلاحيات الإدارة ومتابعتها",
  "staff.manage": "إدارة الموظفين",
  "admins.manage": "إدارة الإداريين",
  "exams.manage": "إدارة الامتحانات",
  "flights.manage": "إدارة الطيران",
  "pilgrims.register": "التسجيل على الحج",
  "registration.review": "مراجعة الطلبات والوثائق",
  "season.settings": "إعدادات الموسم",
  "lottery.import": "إدخال نتائج القرعة",
  "lottery.approve": "اعتماد ونشر النتائج",
  "operations.room": "غرفة العمليات",
  "audit.read": "سجل الأحداث",
  "content.manage": "إدارة محتوى الموقع",
  medical: "الفريق الطبي",
  transport: "المواصلات",
  "ops.files": "الملفات التشغيلية والبيانات المرجعية",
};

/** Does this account hold every task permission (the season director)? */
export function holdsAll(user: StaffUser | null) {
  return !!user && TASK_PERMISSIONS.every((p) => user.permissions.includes(p));
}

/** The task permissions an account holds — what «لوحتي» gathers; the management of a file has its own pages */
export const taskPermissions = (user: StaffUser | null) => user?.permissions.filter((p) => !MANAGEMENT_PERMISSIONS.includes(p)) ?? [];

export function getStaff(id: string | null | undefined) {
  return STAFF.find((s) => s.id === id) ?? null;
}

export function can(user: StaffUser | null, p: Permission) {
  return !!user?.permissions.includes(p);
}
