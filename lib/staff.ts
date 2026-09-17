/**
 * Permanent staff (الموظفون) from the operating document. Staff accounts are never self-created;
 * permissions are granted one by one, and field scope comes from operational files.
 * Demo login: username + password "1448".
 */

export type Permission =
  | "registration.review" // مراجعة الطلبات والوثائق
  | "season.settings" // إعدادات الموسم والاعتماد
  | "lottery.import" // استيراد نتائج القرعة
  | "lottery.approve" // اعتماد ونشر النتائج
  | "administrators.manage" // لجان الامتحانات ونتائج الشفهي
  | "groups.approve" // اعتماد التكتلات والمجموعات
  | "operations.room" // غرفة العمليات
  | "audit.read" // الاطلاع على سجل الأحداث
  | "medical" // الفريق الطبي
  | "transport" // المواصلات
  | "staff.create"; // إنشاء حسابات الموظفين

export type StaffUser = {
  id: string;
  username: string;
  name: string;
  title: string;
  travels: boolean;
  permissions: Permission[];
  initials: string;
};

export const STAFF: StaffUser[] = [
  { id: "suha", username: "suha", name: "سهى مراد", title: "مديرة الموسم", travels: false, initials: "س", permissions: ["season.settings", "lottery.approve", "registration.review", "audit.read"] },
  { id: "rana", username: "rana", name: "رنا حداد", title: "إدارة التسجيل", travels: false, initials: "ر", permissions: ["registration.review", "lottery.import"] },
  { id: "maher", username: "maher", name: "ماهر عيسى", title: "شؤون الإداريين", travels: false, initials: "م", permissions: ["administrators.manage"] },
  { id: "mazen", username: "mazen", name: "مازن الحلبي", title: "مدير المكتب", travels: false, initials: "م", permissions: ["groups.approve", "administrators.manage"] },
  { id: "fadi", username: "fadi", name: "فادي سلوم", title: "غرفة العمليات — مكة", travels: true, initials: "ف", permissions: ["operations.room"] },
  { id: "layla", username: "layla", name: "د. ليلى شمس", title: "الفريق الطبي", travels: true, initials: "ل", permissions: ["medical", "operations.room"] },
  { id: "haitham", username: "haitham", name: "هيثم زيدان", title: "فريق المواصلات", travels: true, initials: "ه", permissions: ["transport", "operations.room"] },
  { id: "tarek", username: "tarek", name: "طارق مصطفى", title: "التدقيق", travels: false, initials: "ط", permissions: ["audit.read"] },
  { id: "abusami", username: "abusami", name: "سامي حلاق (أبو سامي)", title: "الموارد البشرية", travels: false, initials: "س", permissions: ["staff.create"] },
];

export const STAFF_PASSWORD = "1448";

export const PERMISSION_LABELS: Record<Permission, string> = {
  "registration.review": "مراجعة الطلبات والوثائق",
  "season.settings": "إعدادات الموسم",
  "lottery.import": "استيراد نتائج القرعة",
  "lottery.approve": "اعتماد ونشر النتائج",
  "administrators.manage": "شؤون الإداريين والامتحانات",
  "groups.approve": "اعتماد التكتلات والمجموعات",
  "operations.room": "غرفة العمليات",
  "audit.read": "سجل الأحداث",
  medical: "الفريق الطبي",
  transport: "المواصلات",
  "staff.create": "إنشاء حسابات الموظفين",
};

export function getStaff(id: string | null | undefined) {
  return STAFF.find((s) => s.id === id) ?? null;
}

export function can(user: StaffUser | null, p: Permission) {
  return !!user?.permissions.includes(p);
}
