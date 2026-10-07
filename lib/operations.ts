"use client";

import { useMemo } from "react";
import type { Permission, StaffUser } from "./staff";
import { useStore } from "./store";
import { gregorianDate, hijriDate } from "./utils";

/**
 * The season's operations, each one a tab of its own: registering pilgrims on the Hajj, registering as an
 * administrator, the exams, forming groups, forming clusters… They are not stages of one long chain: each
 * opens and closes on its own. Each has its settings — its state, its start and end, and who controls it:
 *
 * - «تلقائي بالتواريخ»: open from its start to its end (inclusive), closed before and after. With no dates it
 *   is permanent.
 * - «فعال» / «غير فعال»: the staff who control it opened or closed it by hand, whatever its dates say.
 *
 * The holder of the controlling permission changes them, and the season director (who holds «إعدادات
 * الموسم») controls them all. Dates are days, "YYYY-MM-DD"; what "today" is comes from the demo clock below.
 */
export type OperationKey =
  | "hajj-direct"
  | "hajj-lottery"
  | "admin-registration"
  | "admin-exams"
  | "group-formation"
  | "group-joining"
  | "cluster-formation"
  | "cluster-approval"
  | "group-management"
  | "cluster-management";

export type OperationDef = {
  key: OperationKey;
  label: string;
  /** What it lets whom do, in a line */
  desc: string;
  start?: string;
  end?: string;
  control: Permission;
  /** Not announced yet by the administration: the date follows last season's pattern */
  estimate?: boolean;
};

/**
 * In the season's order, on the real calendar of season 1448 as the Hajj and Umrah administration announced
 * it (SANA, August–October 2026): registering pilgrims on the Hajj 12 August – 10 September, administrators'
 * applications 20–24 September, the lottery 26 September, the first installment 11–27 October. What it had
 * not announced yet (`estimate`) follows last season's pattern, and says so on the screens.
 */
export const OPERATIONS: OperationDef[] = [
  { key: "hajj-direct", label: "التسجيل على الحج — القبول المباشر", desc: "لمواليد 1958 فما قبل ومرافقيهم. يسجّل الحاج نفسه، أو يسجّله من يملك صلاحية التسجيل. لا يضعه في أي مجموعة.", start: "2026-08-12", end: "2026-08-25", control: "season.settings" },
  { key: "hajj-lottery", label: "التسجيل على الحج — التسجيل الأولي على القرعة", desc: "طلب مستقل بعد القبول المباشر، برسم التسجيل فقط. لا يضع أحداً في مجموعة.", start: "2026-08-26", end: "2026-09-10", control: "season.settings" },
  { key: "admin-registration", label: "التسجيل كإداري", desc: "طلب المشاركة في الموسم لصفة واحدة: رئيس مجموعة، أو معاون، أو موجّه ديني، أو منسق تقني.", start: "2026-09-20", end: "2026-09-24", control: "admins.manage" },
  { key: "admin-exams", label: "الامتحانات", desc: "امتحان التأهيل الكتابي في القاعات ثم الشفهي، قبل تشكيل المجموعات.", start: "2026-09-27", end: "2026-10-25", control: "exams.manage", estimate: true },
  { key: "group-formation", label: "تشكيل المجموعات", desc: "يطلب الناجح في التأهيل تشكيل مجموعته وحده، دون فريق، وتعتمدها إدارة الإداريين.", start: "2026-11-01", end: "2026-11-10", control: "admins.manage", estimate: true },
  { key: "group-joining", label: "إلحاق الحجاج بالمجموعات", desc: "يرفع رئيس المجموعة أو من أسنده إليها رئيس التكتل عقود الحجاج مع المجموعة، ويعتمدها المكتب. يبدأ مع تشكيل التكتلات ويستمر بعده.", start: "2026-11-12", end: "2027-01-15", control: "season.settings", estimate: true },
  { key: "cluster-formation", label: "تشكيل التكتلات", desc: "طلبات تشكيل التكتلات بالتوازي مع إلحاق الحجاج: يضم رئيس التكتل المجموعات ويختار فريقه ويسنده، حتى الموعد النهائي.", start: "2026-11-12", end: "2026-11-30", control: "admins.manage", estimate: true },
  { key: "cluster-approval", label: "اعتماد التكتلات وتوزيع المجموعات", desc: "بعد الموعد النهائي: يُعتمد التكتل المكتمل، ويُقصى الناقص وتوزَّع مجموعاته على المعتمدة.", start: "2026-12-01", end: "2026-12-05", control: "admins.manage", estimate: true },
  { key: "group-management", label: "إدارة المجموعات", desc: "المجموعة المعتمدة وحجاجها وفريقها الذي أسنده رئيس التكتل. دائمة ما دامت المجموعة قائمة.", control: "admins.manage" },
  { key: "cluster-management", label: "إدارة التكتلات", desc: "التكتل المعتمد: مجموعاته وحجاجها وفريقه وإسناده وبرنامجه. دائمة ما دام التكتل قائماً.", control: "admins.manage" },
];

export const OPERATION_KEYS = OPERATIONS.map((o) => o.key);

export type OperationMode = "auto" | "on" | "off";

/** What the controlling staff changed: the mode, the dates, and who did it */
export type OperationOverride = { mode?: OperationMode; start?: string; end?: string; by?: string; at?: number };

export type OperationStatus = "open" | "upcoming" | "closed" | "on" | "off" | "always";

export type OperationState = OperationDef & {
  mode: OperationMode;
  status: OperationStatus;
  open: boolean;
  by?: string;
  at?: number;
};

/** The season's first day: the opening of the Hajj registration */
export const DEMO_START = "2026-08-12";

/** Today as a day, local time */
export function dayOf(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dateOf(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function shiftDay(day: string, days: number) {
  const d = dateOf(day);
  d.setDate(d.getDate() + days);
  return dayOf(d);
}

/** «20 كانون الثاني» — the year only when asked */
export function dayLabel(day: string | undefined, withYear = false) {
  if (!day) return "";
  return gregorianDate(dateOf(day), withYear ? undefined : { year: undefined });
}

export function dayHijri(day: string) {
  return hijriDate(dateOf(day));
}

/** «من 20 إلى 25 كانون الثاني» */
export function rangeLabel(start?: string, end?: string) {
  if (!start && !end) return "دائمة";
  if (!end) return `من ${dayLabel(start)}`;
  if (!start) return `حتى ${dayLabel(end)}`;
  return `${dayLabel(start)} – ${dayLabel(end)}`;
}

export function stateOf(def: OperationDef, o: OperationOverride | undefined, today: string): OperationState {
  const mode = o?.mode ?? "auto";
  const start = o?.start ?? def.start;
  const end = o?.end ?? def.end;
  const status: OperationStatus =
    mode === "on" ? "on" : mode === "off" ? "off" : !start && !end ? "always" : start && today < start ? "upcoming" : end && today > end ? "closed" : "open";
  return { ...def, start, end, mode, status, open: status === "open" || status === "on" || status === "always", by: o?.by, at: o?.at };
}

/** «مفتوحة حتى 25 كانون الثاني»، «تفتح 20 كانون الثاني»، «أوقفتها الإدارة» */
export function statusLabel(s: OperationState) {
  switch (s.status) {
    case "open":
      return s.end ? `مفتوحة حتى ${dayLabel(s.end)}` : "مفتوحة";
    case "upcoming":
      return `تفتح ${dayLabel(s.start)}`;
    case "closed":
      return `أُغلقت ${dayLabel(s.end)}`;
    case "on":
      return "فتحتها الإدارة";
    case "off":
      return "أوقفتها الإدارة";
    default:
      return "دائمة";
  }
}

/** The demo's date: the real day, until the tester moves it */
export function useToday() {
  return useStore((s) => s.clock.today) ?? dayOf(new Date());
}

export function useOperations(): OperationState[] {
  const today = useToday();
  const overrides = useStore((s) => s.operations);
  return useMemo(() => OPERATIONS.map((d) => stateOf(d, overrides[d.key], today)), [overrides, today]);
}

export function useOperation(key: OperationKey): OperationState {
  const all = useOperations();
  return all.find((o) => o.key === key)!;
}

/** Several operations behind one tab («التسجيل على الحج» is the direct registration, then the lottery's) */
export function useAnyOperation(keys: OperationKey[]): { open: boolean; states: OperationState[] } {
  const all = useOperations();
  const states = all.filter((o) => keys.includes(o.key));
  return { open: states.some((s) => s.open), states };
}

/** The holder of the controlling permission, or the season director who controls them all */
export function controls(user: StaffUser | null, def: OperationDef) {
  return !!user && (user.permissions.includes(def.control) || user.permissions.includes("season.settings"));
}
