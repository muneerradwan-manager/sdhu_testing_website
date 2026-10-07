"use client";

import { useMemo } from "react";
import { getStaff, MANAGEMENT_PERMISSIONS, STAFF, type Permission, type StaffUser } from "./staff";
import { actions, setState, useStore } from "./store";

/**
 * The management of a whole file is one permission — «إدارة الإداريين», «إدارة الامتحانات», «إدارة الطيران»,
 * and the housing next — not dozens of small ones. Whoever holds it runs the file entirely, and his menu shows
 * the file in detail, nothing generic: its summary (his dashboard for it), then each of its operations as an
 * entry of its own, in the order the work is done — never one entry opening a long page of tabs. Every
 * operation's page holds its own records. The director grants the permission, takes it back, and follows each
 * file's state and important events. The code calls such a file a "system".
 */
export type SystemKey = "staff" | "admins" | "exams" | "flights";

/** One operation of a file: its own entry in the menu, its own page; `area` is the desk's part that counts what waits in it */
export type SystemOperation = { href: string; label: string; area: string; desc: string };

/** `manage`: where the file's work starts (its first operation) */
export type SystemDef = { label: string; permission: Permission; desc: string; summary: { href: string; label: string }; manage: { href: string; label: string }; operations: SystemOperation[] };

/** In the season's order: the employees first, then the administrators, their exam, and the flights */
export const SYSTEMS: Record<SystemKey, SystemDef> = {
  staff: {
    label: "إدارة الموظفين",
    permission: "staff.manage",
    desc: "موظفو البعثة كلهم: سجلهم الدائم والمنتدبون، وحساباتهم في البوابة، ومشاركتهم في الموسم وأين أُسندوا وعلى أي رحلة.",
    summary: { href: "/staff/employees", label: "ملخص الموظفين" },
    manage: { href: "/staff/employees/manage", label: "إدارة الموظفين" },
    operations: [
      { href: "/staff/employees/manage", label: "سجل الموظفين", area: "register", desc: "سجل موظفي البعثة الدائم والمنتدبين: تحفظه وتستكمل بيانات كل موظف، وفي ملف كل موظف سجلّه." },
      { href: "/staff/employees/manage/accounts", label: "حسابات البوابة", area: "accounts", desc: "حسابات بوابة الموظفين وصلاحياتها، كل حساب مربوط بسجل صاحبه." },
      { href: "/staff/employees/manage/season", label: "المشاركون في الموسم", area: "season", desc: "من يشارك في الموسم، وأين أُسند في الملفات التشغيلية، وعلى أي رحلة." },
    ],
  },
  admins: {
    label: "إدارة الإداريين",
    permission: "admins.manage",
    desc: "الإداريون الموسميون كلهم: قواعد الصفات وشروطها، والمتقدمون وملفاتهم، وتشكيل المجموعات واعتمادها، وطلبات تشكيل التكتلات واعتمادها وتوزيع المجموعات وبرامجها، والتقييم والتصنيف.",
    summary: { href: "/staff/admins", label: "ملخص الإداريين" },
    manage: { href: "/staff/admins/manage", label: "إدارة الإداريين" },
    operations: [
      { href: "/staff/admins/manage", label: "قواعد الإداريين", area: "rules", desc: "ما يطلبه الموسم من إدارييه قبل أن يتقدم أحد: مواعيد عملياتهم، والتزاماتهم، ووثائق ملفهم ومهاراته، وشروط كل صفة، ومراحل التقييم، والرزنامة." },
      { href: "/staff/admins/manage/reference", label: "القوائم المرجعية", area: "reference", desc: "الصفات وسلوكها في التكتل، والفئات وأعدادها لكل مستوى، وتركيبة التكتل، والفروع، والتسميات الموسمية، وصفة كل شخص وفئته وفروعه." },
      { href: "/staff/admins/manage/applicants", label: "المتقدمون", area: "applicants", desc: "من تقدّم هذا الموسم صفةً صفة وإلى أين وصل، وملف كل متقدم الدائم." },
      { href: "/staff/admins/manage/groups", label: "تشكيل المجموعات", area: "groups", desc: "طلبات تشكيل المجموعات: تعتمد كل مجموعة بفئة رئيسها، أو تعيدها إليه بما يصلحه." },
      { href: "/staff/admins/manage/clusters", label: "طلبات التكتلات", area: "clusters", desc: "طلبات تشكيل التكتلات ومواعيدها: تراجع كل طلب فتعتمده أو تعيده بملاحظات، وتعدّل استثنائياً بسبب، وتعتمد برامج التكتلات." },
      { href: "/staff/admins/manage/evaluation", label: "التقييم", area: "evaluation", desc: "تقييم من عمل هذا الموسم مرحلةً مرحلة." },
      { href: "/staff/admins/manage/grading", label: "التصنيف", area: "grading", desc: "تصنيف المجموعات والتكتلات في نهاية الموسم ونشره." },
    ],
  },
  exams: {
    label: "إدارة الامتحانات",
    permission: "exams.manage",
    desc: "امتحان تأهيل الإداريين كله: المراكز ومشرفو قاعاتها، والمتقدمون ومراكزهم، والامتحانات ومواعيدها، وبنك الأسئلة، والتصحيح والنتائج.",
    summary: { href: "/staff/exam", label: "ملخص الامتحانات" },
    manage: { href: "/staff/exam/manage", label: "إدارة الامتحانات" },
    operations: [
      { href: "/staff/exam/manage", label: "المراكز الامتحانية", area: "centers", desc: "المراكز وقاعاتها ومشرفوها: تجهّزها أولاً قبل أي امتحان." },
      { href: "/staff/exam/manage/exams", label: "الامتحانات ومواعيدها", area: "exams", desc: "امتحان كل صفة: موعده في كل مركز، ومدته، وأقسامه وأوزانها." },
      { href: "/staff/exam/manage/bank", label: "بنك الأسئلة", area: "bank", desc: "الأسئلة التي تُسحب منها أوراق الامتحانات: تضيفها وتعدّلها وتسحبها." },
      { href: "/staff/exam/manage/people", label: "المتقدمون للامتحان", area: "people", desc: "من يُمتحن وأين: مركز كل متقدم وقاعته وحضوره." },
      { href: "/staff/exam/manage/results", label: "التصحيح والنتائج", area: "results", desc: "تصحيح الأسئلة التحريرية، والشفهي، وإعلان النتائج." },
    ],
  },
  flights: {
    label: "إدارة الطيران",
    permission: "flights.manage",
    desc: "رحلات الموسم ذهاباً وعودة للحجاج والموظفين: إنشاؤها ونشرها، ووضع المجموعات والموظفين عليها، وإقفالها وكشوف ركابها، ومندوبو المطارات الذين يسجلون الإقلاع والهبوط.",
    summary: { href: "/staff/flights", label: "ملخص الطيران" },
    manage: { href: "/staff/flights/manage", label: "إدارة الطيران" },
    operations: [
      { href: "/staff/flights/manage", label: "المطارات والناقلون", area: "refs", desc: "ما تُبنى منه الرحلات: المطارات والناقلون، ومندوب كل مطار. تجهّزها قبل الرحلات." },
      { href: "/staff/flights/manage/flights", label: "الرحلات", area: "flights", desc: "رحلات الذهاب والعودة: تنشئها وتنشرها وتؤجلها وتقفلها، وكشف ركاب كل رحلة." },
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
