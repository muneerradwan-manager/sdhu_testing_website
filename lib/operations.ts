"use client";

import { useMemo, useSyncExternalStore } from "react";
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
 * الموسم») controls them all. Dates are days, "YYYY-MM-DD", each end with an optional hour ("HH:MM", as the
 * administration's platform sets its reception windows: it opens at its hour on its first day and closes at its
 * hour on its last); what "today" and "now" are comes from the demo clock below.
 */
export type OperationKey =
  | "hajj-direct"
  | "hajj-lottery"
  | "admin-registration"
  | "admin-exams"
  | "admin-oral"
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
  /** The hour it opens on its first day and closes on its last (else the whole day) */
  startTime?: string;
  endTime?: string;
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
  { key: "admin-registration", label: "التسجيل كإداري", desc: "طلب المشاركة في الموسم لصفة واحدة من الصفات المفتوحة للتقدم: رئيس مجموعة، أو موجّه ديني بدرجته (أ، ب، ج)، أو معاون، أو منسق تقني، أو موجّهة دينية بدرجتها…", start: "2026-09-20", end: "2026-09-24", control: "admins.manage" },
  { key: "admin-exams", label: "الامتحانات", desc: "امتحان التأهيل الكتابي في القاعات ثم الشفهي، قبل تشكيل المجموعات.", start: "2026-09-27", end: "2026-10-25", control: "exams.manage", estimate: true },
  { key: "admin-oral", label: "الامتحان الشفهي", desc: "أيام الامتحان الشفهي أمام اللجان. من اجتاز الكتابي يحجز منها يوماً بنفسه حتى اليوم الذي يسبقه، وتُدخل اللجنة نتيجته على المنصة.", start: "2026-10-12", end: "2026-10-21", control: "exams.manage", estimate: true },
  { key: "group-formation", label: "تشكيل المجموعات", desc: "يراجع الناجح في التأهيل المكتب باسم مجموعته ورسمها، فيشكّلها موظف إدارة الإداريين بفئته: عدد حجاجها ومقاعد فريقها. دون فريق: مقاعدها يملؤها رئيس التكتل.", start: "2026-11-01", end: "2026-11-10", control: "admins.manage", estimate: true },
  { key: "group-joining", label: "إلحاق الحجاج بالمجموعات", desc: "يتفق الحاج مع مجموعة ويوقّع عقده معها في المكتب، فيلحقه موظف المكتب بها، والطلب العائلي كاملاً. يرى رئيس المجموعة ومنسقها حجاجها. يبدأ مع تشكيل التكتلات ويستمر بعده.", start: "2026-11-12", end: "2027-01-15", control: "season.settings", estimate: true },
  { key: "cluster-formation", label: "تشكيل التكتلات", desc: "طلبات تشكيل التكتلات بالتوازي مع إلحاق الحجاج: من يحمل صفة «رئيس تكتل» أساسيةً أو موسمية يملأ الطلب بترتيبه ويرسله، من ساعة البدء حتى ساعة الموعد النهائي. الموعد الأول لشارة الالتزام في «طلبات التكتلات».", start: "2026-11-12", startTime: "09:00", end: "2026-11-30", endTime: "23:59", control: "admins.manage", estimate: true },
  { key: "cluster-approval", label: "مراجعة طلبات التكتلات واعتمادها", desc: "يراجع موظف إدارة الإداريين كل طلب يُرسل: يعتمده، أو يعيده بملاحظات يصلحها رئيسه قبل الموعد النهائي. وما بقي خارج التكتلات يُضاف بتعديل استثنائي.", start: "2026-11-12", end: "2026-12-05", control: "admins.manage", estimate: true },
  { key: "group-management", label: "إدارة المجموعات", desc: "المجموعة المعتمدة وحجاجها والفريق في مقاعدها. دائمة ما دامت المجموعة قائمة.", control: "admins.manage" },
  { key: "cluster-management", label: "إدارة التكتل", desc: "التكتل المعتمد: مجموعاته وحجاجها وكادره وتوزيع منسقيه وموجّهاته على مجموعاته وبرنامجه. دائمة ما دام التكتل قائماً.", control: "admins.manage" },
];

export const OPERATION_KEYS = OPERATIONS.map((o) => o.key);

export type OperationMode = "auto" | "on" | "off";

/** What the controlling staff changed: the mode, the dates, and who did it */
export type OperationOverride = { mode?: OperationMode; start?: string; end?: string; startTime?: string; endTime?: string; by?: string; at?: number };

/** `all`: open because the tester opened everything at once («كل شيء مفتوح»), whatever its dates */
export type OperationStatus = "open" | "upcoming" | "closed" | "on" | "off" | "always" | "all";

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

/** «12 تشرين الثاني، الساعة 09:00» — the hour only when it has one */
export function dayTimeLabel(day: string | undefined, time?: string, withYear = false) {
  if (!day) return "";
  return time ? `${dayLabel(day, withYear)}، الساعة ${time}` : dayLabel(day, withYear);
}

/** «من 20 إلى 25 كانون الثاني» */
export function rangeLabel(start?: string, end?: string) {
  if (!start && !end) return "دائمة";
  if (!end) return `من ${dayLabel(start)}`;
  if (!start) return `حتى ${dayLabel(end)}`;
  return `${dayLabel(start)} – ${dayLabel(end)}`;
}

/**
 * An operation's state on a day. With `allOpen` every dated operation is open whatever its dates; what the
 * staff stopped by hand stays stopped, since stopping it is itself something to try.
 */
export function stateOf(def: OperationDef, o: OperationOverride | undefined, today: string, allOpen = false, time = "12:00"): OperationState {
  const mode = o?.mode ?? "auto";
  const start = o?.start ?? def.start;
  const end = o?.end ?? def.end;
  const startTime = o?.startTime ?? def.startTime;
  const endTime = o?.endTime ?? def.endTime;
  // "YYYY-MM-DDTHH:MM" compares as text: the day first, then the hour on it
  const now = `${today}T${time}`;
  const byDate: OperationStatus = !start && !end ? "always" : start && now < `${start}T${startTime ?? "00:00"}` ? "upcoming" : end && now > `${end}T${endTime ?? "23:59"}` ? "closed" : "open";
  const status: OperationStatus = mode === "on" ? "on" : mode === "off" ? "off" : allOpen && byDate !== "always" ? "all" : byDate;
  return { ...def, start, end, startTime, endTime, mode, status, open: status === "open" || status === "on" || status === "always" || status === "all", by: o?.by, at: o?.at };
}

/** «مفتوحة حتى 25 كانون الثاني»، «تفتح 20 كانون الثاني»، «أوقفتها الإدارة» */
export function statusLabel(s: OperationState) {
  switch (s.status) {
    case "open":
      return s.end ? `مفتوحة حتى ${dayTimeLabel(s.end, s.endTime)}` : "مفتوحة";
    case "upcoming":
      return `تفتح ${dayTimeLabel(s.start, s.startTime)}`;
    case "closed":
      return `أُغلقت ${dayTimeLabel(s.end, s.endTime)}`;
    case "on":
      return "فتحتها الإدارة";
    case "off":
      return "أوقفتها الإدارة";
    case "all":
      return "مفتوحة — تجربة الكل معاً";
    default:
      return "دائمة";
  }
}

/** The demo's date: the real day, until the tester moves it */
export function useToday() {
  return useStore((s) => s.clock.today) ?? dayOf(new Date());
}

// The real hour, refreshed while anything reads it (an operation that opens at 09:00 opens at 09:00)
const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
let realTime = "";
const ticking = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
function subscribeTime(l: () => void) {
  ticking.add(l);
  timer ??= setInterval(() => {
    const t = hhmm();
    if (t !== realTime) {
      realTime = t;
      ticking.forEach((f) => f());
    }
  }, 15_000);
  return () => {
    ticking.delete(l);
    if (!ticking.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** The demo's hour: the one the tester set on its day, else the real one */
export function useClockTime() {
  const set = useStore((s) => s.clock.time);
  const real = useSyncExternalStore(subscribeTime, () => realTime || (realTime = hhmm()), () => "12:00");
  return set ?? real;
}

export function useOperations(): OperationState[] {
  const today = useToday();
  const time = useClockTime();
  const allOpen = useAllOpen();
  const overrides = useStore((s) => s.operations);
  return useMemo(() => OPERATIONS.map((d) => stateOf(d, overrides[d.key], today, allOpen, time)), [overrides, today, allOpen, time]);
}

/** Is the demo trying everything together, every operation open whatever its dates? */
export function useAllOpen() {
  return useStore((s) => !!s.clock.allOpen);
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
