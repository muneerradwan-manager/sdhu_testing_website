"use client";

import { useMemo } from "react";
import { getStaff, MANAGEMENT_PERMISSIONS, STAFF, type Permission, type StaffUser } from "./staff";
import { actions, setState, useStore } from "./store";

/**
 * The management of a whole file is one permission — «إدارة التسجيل على الحج», «إدارة الإداريين», «إدارة
 * الامتحانات», «إدارة الطيران», and the housing next — not dozens of small ones. Whoever holds it runs the file entirely, and his menu shows
 * the file in detail, nothing generic: its summary (his dashboard for it), then each of its operations as an
 * entry of its own, in the order the work is done — never one entry opening a long page of tabs. Every
 * operation's page holds its own records. The director grants the permission, takes it back, and follows each
 * file's state and important events. The code calls such a file a "system".
 */
export type SystemKey = "staff" | "registration" | "admins" | "exams" | "flights";

/** One operation of a file: its own entry in the menu, its own page; `area` is the desk's part that counts what waits in it */
export type SystemOperation = { href: string; label: string; area: string; desc: string };

/** `manage`: where the file's work starts (its first operation) */
export type SystemDef = { label: string; permission: Permission; desc: string; summary: { href: string; label: string }; manage: { href: string; label: string }; operations: SystemOperation[] };

/** In the season's order: the employees first, then the pilgrims' registration, the administrators, their exam, and the flights */
export const SYSTEMS: Record<SystemKey, SystemDef> = {
  staff: {
    label: "إدارة الموظفين",
    permission: "staff.manage",
    desc: "موظفو البعثة كلهم: سجلهم الدائم والمنتدبون، وحساباتهم في البوابة، ومشاركتهم في الموسم وأين أُسندوا وعلى أي رحلة.",
    summary: { href: "/staff/employees", label: "لوحة التحكم" },
    manage: { href: "/staff/employees/manage", label: "إدارة الموظفين" },
    operations: [
      { href: "/staff/employees/manage", label: "سجل الموظفين", area: "register", desc: "سجل موظفي البعثة الدائم والمنتدبين: تحفظه وتستكمل بيانات كل موظف، وفي ملف كل موظف سجلّه." },
      { href: "/staff/employees/manage/edit", label: "إضافة موظف", area: "add", desc: "موظف جديد في السجل: بياناته، ونوعه، ومشاركته في الموسم." },
      { href: "/staff/employees/manage/accounts", label: "حسابات البوابة", area: "accounts", desc: "حسابات بوابة الموظفين وصلاحياتها، كل حساب مربوط بسجل صاحبه." },
      { href: "/staff/employees/manage/season", label: "المشاركون في الموسم", area: "season", desc: "من يشارك في الموسم، وأين أُسند في الملفات التشغيلية، وعلى أي رحلة." },
    ],
  },
  registration: {
    label: "إدارة التسجيل على الحج",
    permission: "registration.manage",
    desc: "صفحات التسجيل على الحج وأسئلتها، والخطوات بعد القبول، وشروط الأهلية، والدفعات — تُعدَّل ثم تُعايَن ثم تُنشر، ولا تغيّر طلباً بدأه حاج قبلها. ومتابعة الطلبات.",
    summary: { href: "/staff/hajj", label: "لوحة التحكم" },
    manage: { href: "/staff/hajj/manage", label: "صفحات التسجيل" },
    // As a site's admin menu: the pages first and adding one, then the rest; the numbers live on the dashboard alone
    operations: [
      { href: "/staff/hajj/manage", label: "صفحات التسجيل", area: "stages", desc: "الصفحات التي يمر بها الحاج حين يقدّم طلبه، بترتيبها. افتح أي صفحة لتعديلها، أو أضف صفحة جديدة." },
      { href: "/staff/hajj/manage/edit", label: "إضافة صفحة", area: "add", desc: "صفحة جديدة في التسجيل: عنوانها ونصها وأسئلتها، ولمن تظهر." },
      { href: "/staff/hajj/manage/steps", label: "الخطوات بعد القبول", area: "steps", desc: "ما يفعله الحاج بعد قبوله، خطوة بعد خطوة حتى التأشيرة والرحلة." },
      { href: "/staff/hajj/manage/rules", label: "شروط الأهلية", area: "rules", desc: "شروط تضيفها الإدارة لهذا الموسم فوق شروط المنصة الثابتة." },
      { href: "/staff/hajj/manage/payments", label: "الدفعات والمسارات", area: "payments", desc: "كم دفعة تُدفع تكلفة الحج، وكم كل دفعة ومتى، وطرق الدفع، ومسارا التسجيل ومواعيدهما." },
      { href: "/staff/hajj/manage/applications", label: "الطلبات", area: "applications", desc: "كل الطلبات: المقدَّمة، وما زال أصحابها يعبّئونها. للاطلاع فقط." },
      { href: "/staff/hajj/manage/history", label: "الإصدارات والمواسم", area: "seasons", desc: "كل ما نُشر من قبل، ومن نشره ومتى، مع إمكانية الرجوع إلى إصدار سابق. ومواسم التسجيل." },
    ],
  },
  admins: {
    label: "إدارة الإداريين",
    permission: "admins.manage",
    desc: "الإداريون كلهم عبر المواسم: قواعد الصفات وشروطها ومراجعها، والكادر الدائم وأحداث ملف كل فرد، والمتقدمون وملفاتهم، وتشكيل المجموعات، وطلبات تشكيل التكتلات واعتمادها، ودليل التكتلات والمجموعات وأرشيفه، والمراسلات، والتقييم والتصنيف.",
    summary: { href: "/staff/admins", label: "لوحة التحكم" },
    manage: { href: "/staff/admins/manage", label: "إدارة الإداريين" },
    operations: [
      { href: "/staff/admins/manage", label: "قواعد الإداريين", area: "rules", desc: "ما يطلبه الموسم من إدارييه قبل أن يتقدم أحد، قسماً قسماً." },
      { href: "/staff/admins/manage/reference", label: "القوائم المرجعية", area: "reference", desc: "الصفات، والفئات وأعدادها، والفروع، والتسميات الموسمية." },
      { href: "/staff/admins/manage/references", label: "المراجع الإدارية", area: "references", desc: "ما يُنشر للكادر، والخطط التشغيلية التي يقدّمها رؤساء التكتلات." },
      { href: "/staff/admins/manage/cadre", label: "الكادر الإداري", area: "cadre", desc: "كل فرد في الكادر عبر المواسم: افتحه لتعديل بياناته وصفته وحسابه." },
      { href: "/staff/admins/manage/applicants", label: "المتقدمون", area: "applicants", desc: "ملفات من تقدّم هذا الموسم ووثائقها." },
      { href: "/staff/admins/manage/groups", label: "تشكيل المجموعات", area: "groups", desc: "مجموعات الموسم: تشكّلها في المكتب وتقرّر في طلباتها." },
      { href: "/staff/admins/manage/clusters", label: "التكتلات", area: "clusters", desc: "تشكّل كل تكتل في المكتب بحضور رئيسه وكادره، وترفع عقده الموقّع." },
      { href: "/staff/admins/manage/directory", label: "التكتلات والمجموعات", area: "directory", desc: "ما نتج عن التشكيلات المعتمدة، وملاحظات الإدارة عليها." },
      { href: "/staff/admins/manage/letters", label: "المراسلات", area: "letters", desc: "رسائل الإداريين إلى الإدارة: تقرؤها وتردّ عليها." },
      { href: "/staff/admins/manage/evaluation", label: "التقييم", area: "evaluation", desc: "تقييم من عمل هذا الموسم مرحلةً مرحلة." },
      { href: "/staff/admins/manage/grading", label: "التصنيف", area: "grading", desc: "تصنيف المجموعات والتكتلات في نهاية الموسم ونشره." },
    ],
  },
  exams: {
    label: "إدارة الامتحانات",
    permission: "exams.manage",
    desc: "تأهيل الإداريين: الاختبار المؤتمت كما تديره منصة الاختبارات المعتمدة (القاعات والمحافظات ومشرفوها، والاختبارات وأقسامها، وبنك الأسئلة، والمتقدمون، وجلسات الاختبار ومتابعتها، والمراجعة والنتائج والإحصائيات)، ثم الامتحان الشفهي أمام لجنة كل صفة.",
    summary: { href: "/staff/exam", label: "لوحة التحكم" },
    manage: { href: "/staff/exam/manage", label: "إدارة الامتحانات" },
    operations: [
      { href: "/staff/exam/manage", label: "القاعات والمحافظات", area: "centers", desc: "القاعات التي يُجلس فيها للاختبار. افتح أي قاعة لتعديلها، أو أضف قاعة جديدة." },
      { href: "/staff/exam/manage/edit", label: "إضافة قاعة", area: "add-center", desc: "قاعة جديدة: مكانها ومحافظاتها ومشرفها وشاشتها." },
      { href: "/staff/exam/manage/exams", label: "الاختبارات", area: "exams", desc: "اختبار كل صفة واختبارات الاستدراك. افتح أي اختبار لتعديل أقسامه وموعده، أو انشره." },
      { href: "/staff/exam/manage/bank", label: "بنك الأسئلة", area: "bank", desc: "الأسئلة التي تُسحب منها الأوراق. افتح أي سؤال لتعديله، أو أضف سؤالاً." },
      { href: "/staff/exam/manage/people", label: "المتقدمون", area: "people", desc: "من يختبر وفي أي قاعة. حدّد متقدمين لنقلهم إلى قاعة أخرى." },
      { href: "/staff/exam/manage/sittings", label: "جلسات الاختبار", area: "sittings", desc: "كل اختبار في كل قاعة بموعده: متقدموها ومشرفها وحالتها." },
      { href: "/staff/exam/manage/live", label: "الجلسات الفعالة", area: "live", desc: "الجلسات المفتوحة الآن، للمتابعة فقط. يديرها المشرف من لوحته." },
      { href: "/staff/exam/manage/review", label: "المراجعة والتقارير", area: "review", desc: "المحاولات التي تحتاج قراراً، والحضور والغياب، والحالات المشتبه بها." },
      { href: "/staff/exam/manage/results", label: "النتائج", area: "results", desc: "نتيجة كل متقدم قسماً قسماً، ومراجعة إجاباته وتصديرها." },
      { href: "/staff/exam/manage/oral", label: "الامتحان الشفهي", area: "oral", desc: "بعد الاختبار المؤتمت: موعد كل ناجح أمام لجنة صفته في مركزه، ونتيجته. لا يتأهل إلا من نجح فيهما." },
      { href: "/staff/exam/manage/stats", label: "الإحصائيات", area: "stats", desc: "أرقام كل اختبار حسب القسم والجلسة والمحافظة والسؤال." },
    ],
  },
  flights: {
    label: "إدارة الطيران",
    permission: "flights.manage",
    desc: "رحلات الموسم ذهاباً وعودة للحجاج والموظفين: إنشاؤها ونشرها، وإعطاء كل تكتل أيام رحلاته ومقاعده عليها، ووضع الموظفين عليها، وإقفالها وكشوف ركابها، ومندوبو المطارات الذين يسجلون الإقلاع والهبوط.",
    summary: { href: "/staff/flights", label: "لوحة التحكم" },
    manage: { href: "/staff/flights/manage", label: "إدارة الطيران" },
    operations: [
      { href: "/staff/flights/manage", label: "المطارات ومندوبوها", area: "refs", desc: "المطارات التي تقلع منها الرحلات وتهبط فيها، ومندوب كل مطار يسجّل الإقلاع والهبوط." },
      { href: "/staff/flights/manage/carriers", label: "الناقلون الجويون", area: "carriers", desc: "شركات الطيران التي تُختار منها الرحلات، وهاتف التنسيق مع كل منها." },
      { href: "/staff/flights/manage/flights", label: "الرحلات", area: "flights", desc: "رحلات الذهاب والعودة: تنشئها وتنشرها وتقفلها، ولكل رحلة صفحتها وركابها وكشفها." },
      { href: "/staff/flights/manage/allotments", label: "أيام التكتلات", area: "allotments", desc: "تعطي كل تكتل أيام رحلاته ذهاباً وعودة ومقاعده على كل رحلة، فيضع رئيسه مجموعاته وحجاجه عليها." },
      { href: "/staff/flights/manage/dispatch", label: "التفويج", area: "dispatch", desc: "من يسافر على أي رحلة: المجموعات والموظفون، ومن فقد مقعده." },
    ],
  },
};

export const SYSTEM_KEYS = Object.keys(SYSTEMS) as SystemKey[];

/** Who was granted a management permission, when and by whom */
export type Grant = { staffId: string; at?: number; by?: string };
export type Holder = Grant & { staff: StaffUser };

const OPENED: Record<SystemKey, number> = {
  staff: new Date(2026, 8, 1, 9, 0).getTime(),
  registration: new Date(2026, 6, 1, 9, 0).getTime(),
  admins: new Date(2026, 8, 1, 9, 5).getTime(),
  exams: new Date(2026, 8, 5, 10, 0).getTime(),
  flights: new Date(2026, 8, 5, 10, 5).getTime(),
};

/** As the season opens: the accounts opened with each management permission, granted by the director */
const DEFAULT_GRANTS = Object.fromEntries(
  SYSTEM_KEYS.map((k) => [k, STAFF.filter((s) => s.permissions.includes(SYSTEMS[k].permission)).map<Grant>((s) => ({ staffId: s.id, at: OPENED[k], by: "سهى مراد" }))]),
) as Record<SystemKey, Grant[]>;

type Grants = Partial<Record<string, Grant[]>> | undefined;
const grantsOf = (grants: Grants, k: SystemKey) => grants?.[k] ?? DEFAULT_GRANTS[k];

/** Each management permission's holders as the director left them */
export function useHolders(): Record<SystemKey, Holder[]> {
  const stored = useStore((s) => s.systems?.grants);
  return useMemo(
    () =>
      Object.fromEntries(SYSTEM_KEYS.map((k) => [k, grantsOf(stored, k).flatMap((g) => (getStaff(g.staffId) ? [{ ...g, staff: getStaff(g.staffId)! }] : []))])) as Record<SystemKey, Holder[]>,
    [stored],
  );
}

/** An account with the management permissions it holds now — granted or taken back since it was opened */
export function withGrants(user: StaffUser, grants: Grants): StaffUser {
  const held = SYSTEM_KEYS.filter((k) => grantsOf(grants, k).some((g) => g.staffId === user.id)).map((k) => SYSTEMS[k].permission);
  const permissions = [...user.permissions.filter((p) => !MANAGEMENT_PERMISSIONS.includes(p)), ...held];
  return permissions.length === user.permissions.length && permissions.every((p) => user.permissions.includes(p)) ? user : { ...user, permissions };
}

/** Every account with its permissions as they stand now */
export function useStaffAccounts(): StaffUser[] {
  const grants = useStore((s) => s.systems?.grants);
  return useMemo(() => STAFF.map((u) => withGrants(u, grants)), [grants]);
}

/** The operation a page belongs to: the longest operation path it starts with */
export function operationAt(key: SystemKey, pathname: string) {
  const path = pathname.replace(/\/+$/, "");
  return [...SYSTEMS[key].operations].sort((a, b) => b.href.length - a.href.length).find((o) => path === o.href || path.startsWith(`${o.href}/`)) ?? SYSTEMS[key].operations[0];
}

/** The files this employee manages */
export function useOwnedSystems(user: StaffUser | null): SystemKey[] {
  const holders = useHolders();
  return useMemo(() => (user ? SYSTEM_KEYS.filter((k) => holders[k].some((h) => h.staffId === user.id)) : []), [holders, user]);
}

export function useOwns(user: StaffUser | null, key: SystemKey) {
  return useOwnedSystems(user).includes(key);
}

/** When the director last looked at a file's important events */
export function useSeen(key: SystemKey) {
  return useStore((s) => s.systems?.seen?.[key] ?? 0);
}

function setGrants(key: SystemKey, f: (list: Grant[]) => Grant[]) {
  setState((s) => ({ ...s, systems: { ...s.systems, grants: { ...s.systems?.grants, [key]: f(grantsOf(s.systems?.grants, key)) } } }));
}

export const systemActions = {
  /** The whole file's management to one more employee; he needs no other permission for it */
  grant(key: SystemKey, staffId: string, by: StaffUser) {
    setGrants(key, (list) => (list.some((g) => g.staffId === staffId) ? list : [...list, { staffId, at: Date.now(), by: by.name }]));
    actions.logEvent({ actor: by.name, role: by.title, action: "منح صلاحية", target: getStaff(staffId)?.name, after: SYSTEMS[key].label, system: key, important: true });
  },
  revoke(key: SystemKey, staffId: string, by: StaffUser) {
    setGrants(key, (list) => list.filter((g) => g.staffId !== staffId));
    actions.logEvent({ actor: by.name, role: by.title, action: "سحب صلاحية", target: getStaff(staffId)?.name, before: SYSTEMS[key].label, system: key, important: true });
  },
  seen(key: SystemKey) {
    setState((s) => ({ ...s, systems: { ...s.systems, seen: { ...s.systems?.seen, [key]: Date.now() } } }));
  },
};
