"use client";

import { useMemo } from "react";
import { getStaff, MANAGEMENT_PERMISSIONS, STAFF, type Permission, type StaffUser } from "./staff";
import { actions, setState, useStore } from "./store";

/**
 * The management of a whole file is one permission — «إدارة الامتحانات», «إدارة الطيران», and the housing
 * next — not dozens of small ones. Whoever holds it runs the file entirely and sees it as two entries in his
 * menu, nothing generic: its summary (his dashboard for it) and its management, where every part is worked
 * on with its own records beside it. The director grants it, takes it back, and follows each file's state
 * and important events. The code calls such a file a "system".
 */
export type SystemKey = "staff" | "admins" | "exams" | "flights";

export type SystemDef = { label: string; permission: Permission; desc: string; summary: { href: string; label: string }; manage: { href: string; label: string } };

/** In the season's order: the employees first, then the administrators, their exam, and the flights */
export const SYSTEMS: Record<SystemKey, SystemDef> = {
  staff: {
    label: "إدارة الموظفين",
    permission: "staff.manage",
    desc: "موظفو البعثة كلهم: سجلهم الدائم والمنتدبون، وحساباتهم في البوابة، ومشاركتهم في الموسم وأين أُسندوا وعلى أي رحلة.",
    summary: { href: "/staff/employees", label: "ملخص الموظفين" },
    manage: { href: "/staff/employees/manage", label: "إدارة الموظفين" },
  },
  admins: {
    label: "إدارة الإداريين",
    permission: "admins.manage",
    desc: "الإداريون الموسميون كلهم: قواعد الصفات وشروطها، والمتقدمون وملفاتهم، وتشكيل المجموعات واعتمادها، وطلبات تشكيل التكتلات واعتمادها وتوزيع المجموعات وبرامجها، والتقييم والتصنيف.",
    summary: { href: "/staff/admins", label: "ملخص الإداريين" },
    manage: { href: "/staff/admins/manage", label: "إدارة الإداريين" },
  },
  exams: {
    label: "إدارة الامتحانات",
    permission: "exams.manage",
    desc: "امتحان تأهيل الإداريين كله: المراكز ومشرفو قاعاتها، والمتقدمون ومراكزهم، والامتحانات ومواعيدها، وبنك الأسئلة، والتصحيح والنتائج.",
    summary: { href: "/staff/exam", label: "ملخص الامتحانات" },
    manage: { href: "/staff/exam/manage", label: "إدارة الامتحانات" },
  },
  flights: {
    label: "إدارة الطيران",
    permission: "flights.manage",
    desc: "رحلات الموسم ذهاباً وعودة للحجاج والموظفين: إنشاؤها ونشرها، ووضع المجموعات والموظفين عليها، وإقفالها وكشوف ركابها، ومندوبو المطارات الذين يسجلون الإقلاع والهبوط.",
    summary: { href: "/staff/flights", label: "ملخص الطيران" },
    manage: { href: "/staff/flights/manage", label: "إدارة الطيران" },
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
