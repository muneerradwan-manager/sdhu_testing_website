/**
 * Permanent staff (الموظفون) from the operating document. Staff accounts are never self-created;
 * permissions are granted one by one, and field scope comes from operational files.
 * In the demo every account holds exactly one permission, so a permission is seen by signing in as its
 * holder; the season director alone holds them all, for the whole picture.
 * Demo login: username + password "1448".
 */

export type Permission =
  | "registration.review" // مراجعة الطلبات والوثائق
  | "season.settings" // إعدادات الموسم والاعتماد
  | "lottery.import" // إدخال نتائج القرعة (سنوات الميلاد وأشهرها كما سُحبت في البث)
  | "lottery.approve" // اعتماد ونشر النتائج
  | "administrators.manage" // لجان الامتحانات ونتائج الشفهي
  | "administrators.catalog" // قوائم ملف الإداري: الشهادات والمهارات واللغات التي يُسأل عنها
  | "groups.approve" // اعتماد التكتلات والمجموعات
  | "operations.room" // غرفة العمليات
  | "audit.read" // الاطلاع على سجل الأحداث
  | "content.manage" // إدارة محتوى الموقع
  | "medical" // الفريق الطبي
  | "transport" // المواصلات
  | "staff.create" // إدارة الموظفين وحساباتهم
  | "ops.files" // الملفات التشغيلية والبيانات المرجعية
  | "flights.manage" // ملف الطيران: الرحلات والمقاعد وإسناد الموظفين
  | "flights.view"; // الاطلاع على الرحلات وتسجيل الإقلاع والهبوط

export type StaffUser = {
  id: string;
  username: string;
  name: string;
  title: string;
  travels: boolean;
  permissions: Permission[];
  initials: string;
};

/** Every permission, in the order the portal lists them */
export const ALL_PERMISSIONS: Permission[] = [
  "registration.review",
  "season.settings",
  "lottery.import",
  "lottery.approve",
  "administrators.manage",
  "administrators.catalog",
  "groups.approve",
  "operations.room",
  "audit.read",
  "content.manage",
  "medical",
  "transport",
  "staff.create",
  "ops.files",
  "flights.manage",
  "flights.view",
];

export const STAFF: StaffUser[] = [
  { id: "suha", username: "suha", name: "سهى مراد", title: "مديرة الموسم", travels: false, initials: "س", permissions: ALL_PERMISSIONS },
  { id: "rana", username: "rana", name: "رنا حداد", title: "إدارة التسجيل", travels: false, initials: "ر", permissions: ["registration.review"] },
  { id: "kinan", username: "kinan", name: "كنان الأحمد", title: "إدارة التسجيل — إدخال نتائج القرعة", travels: false, initials: "ك", permissions: ["lottery.import"] },
  { id: "yousef", username: "yousef", name: "يوسف الزعبي", title: "لجنة اعتماد ونشر نتائج القرعة", travels: false, initials: "ي", permissions: ["lottery.approve"] },
  { id: "maher", username: "maher", name: "ماهر عيسى", title: "شؤون الإداريين", travels: false, initials: "م", permissions: ["administrators.manage"] },
  { id: "rahaf", username: "rahaf", name: "رهف الخطيب", title: "شؤون الإداريين — قوائم ملف الإداري", travels: false, initials: "ر", permissions: ["administrators.catalog"] },
  { id: "mazen", username: "mazen", name: "مازن الحلبي", title: "مدير المكتب", travels: false, initials: "م", permissions: ["groups.approve"] },
  { id: "fadi", username: "fadi", name: "فادي سلوم", title: "غرفة العمليات — مكة", travels: true, initials: "ف", permissions: ["operations.room"] },
  { id: "omar", username: "omar", name: "عمر الشامي", title: "متابعة الرحلات — دمشق", travels: false, initials: "ع", permissions: ["flights.view"] },
  { id: "layla", username: "layla", name: "د. ليلى شمس", title: "الفريق الطبي", travels: true, initials: "ل", permissions: ["medical"] },
  { id: "haitham", username: "haitham", name: "هيثم زيدان", title: "مسؤول الطيران", travels: true, initials: "ه", permissions: ["flights.manage"] },
  { id: "bassel", username: "bassel", name: "باسل النوري", title: "فريق المواصلات", travels: true, initials: "ب", permissions: ["transport"] },
  { id: "tarek", username: "tarek", name: "طارق مصطفى", title: "التدقيق", travels: false, initials: "ط", permissions: ["audit.read"] },
  { id: "abusami", username: "abusami", name: "سامي حلاق (أبو سامي)", title: "الموارد البشرية", travels: false, initials: "س", permissions: ["staff.create"] },
  { id: "nour", username: "nour", name: "نور العابد", title: "محرّرة محتوى المنصة", travels: false, initials: "ن", permissions: ["content.manage"] },
  { id: "bilal", username: "bilal", name: "بلال قاسم", title: "الإعلام والمحتوى", travels: false, initials: "ب", permissions: ["content.manage"] },
  // ── موظفون إضافيون: مكاتب أخرى (داخل سوريا والخارج) وفرق الميدان ──
  { id: "hiba", username: "hiba", name: "هبة الأيوبي", title: "إدارة التسجيل — مكتب حلب", travels: false, initials: "ه", permissions: ["registration.review"] },
  { id: "osama", username: "osama", name: "أسامة الدالاتي", title: "إدارة التسجيل — مكتب تركيا", travels: false, initials: "أ", permissions: ["registration.review"] },
  { id: "dana", username: "dana", name: "دانة العظمة", title: "إدارة التسجيل — مكتب الأردن", travels: false, initials: "د", permissions: ["registration.review"] },
  { id: "rima", username: "rima", name: "ريما الجندي", title: "مديرة مكتب حمص", travels: false, initials: "ر", permissions: ["groups.approve"] },
  { id: "adnan", username: "adnan", name: "عدنان سليمان", title: "المالية — مطابقة شام كاش وإشعارات المصرف", travels: false, initials: "ع", permissions: ["registration.review"] },
  { id: "samira", username: "samira", name: "د. سميرة الخوري", title: "الفريق الطبي — المدينة المنورة", travels: true, initials: "س", permissions: ["medical"] },
  { id: "wissam", username: "wissam", name: "وسام خوري", title: "مشرف الإسكان — البرج (ب)", travels: true, initials: "و", permissions: ["operations.room"] },
  { id: "nader", username: "nader", name: "نادر قاسم", title: "الإسكان — نطاق القطاع", travels: true, initials: "ن", permissions: ["operations.room"] },
  { id: "ghassan", username: "ghassan", name: "غسان العمر", title: "مدير شؤون البعثة — الملفات التشغيلية", travels: true, initials: "غ", permissions: ["ops.files"] },
  { id: "lubna", username: "lubna", name: "لبنى الشهابي", title: "مديرة موسم مساعدة — لا تملك صلاحية النشر", travels: false, initials: "ل", permissions: ["season.settings"] },
  // No permission: her hall comes from the exam desk assigning her to a centre (app/administrator/_lib/halls.ts)
  { id: "nisreen", username: "nisreen", name: "نسرين الحكيم", title: "مشرفة قاعة امتحانية — مركز دمشق", travels: false, initials: "ن", permissions: [] },
];

export const STAFF_PASSWORD = "1448";

export const PERMISSION_LABELS: Record<Permission, string> = {
  "registration.review": "مراجعة الطلبات والوثائق",
  "season.settings": "إعدادات الموسم",
  "lottery.import": "إدخال نتائج القرعة",
  "lottery.approve": "اعتماد ونشر النتائج",
  "administrators.manage": "شؤون الإداريين والامتحانات",
  "administrators.catalog": "قوائم ملف الإداري",
  "groups.approve": "اعتماد التكتلات والمجموعات",
  "operations.room": "غرفة العمليات",
  "audit.read": "سجل الأحداث",
  "content.manage": "إدارة محتوى الموقع",
  medical: "الفريق الطبي",
  transport: "المواصلات",
  "staff.create": "إدارة الموظفين وحساباتهم",
  "ops.files": "الملفات التشغيلية والبيانات المرجعية",
  "flights.manage": "إدارة الطيران",
  "flights.view": "الاطلاع على الطيران",
};

/** Does this account hold every permission (the season director)? */
export function holdsAll(user: StaffUser | null) {
  return !!user && ALL_PERMISSIONS.every((p) => user.permissions.includes(p));
}

export function getStaff(id: string | null | undefined) {
  return STAFF.find((s) => s.id === id) ?? null;
}

export function can(user: StaffUser | null, p: Permission) {
  return !!user?.permissions.includes(p);
}
