"use client";

import { useMemo } from "react";
import { fullName, getPerson } from "./registry";
import { useStore, type AdminProfile } from "./store";

/**
 * أداء المناسك: once a rite is done — the Umrah of tamattu', the standing at Arafat, the night at Muzdalifah, the
 * throwing of the Jamarat, Mina's nights — whoever does the group's operations (its coordinator, its head or its
 * assistant) records it from «الميدان»: when it was done (the date, the day and the hour), who of the group did
 * it, what each did where a rite has degrees, and why whoever did not. Nothing is asked of the pilgrims before:
 * each record reaches them done, in «أداء المناسك» of their portal.
 *
 * The records are kept in AdminProfile.musters (the name they had as gatherings), on whoever recorded them.
 */

export type Muster = AdminProfile["musters"][number];
export type GroupMuster = Muster & { by: string; byId: string };

/** How a rite is recorded for each pilgrim: done or not; Muzdalifah's night by its degree; the Jamarat thrown; Mina's nights */
export type RiteMode = "done" | "muzdalifa" | "jamarat" | "mina";

export const RITES: { key: string; label: string; mode: RiteMode; place: string; note?: string }[] = [
  { key: "umrah", label: "عمرة التمتّع", mode: "done", place: "المسجد الحرام", note: "أول عمرة بعد الوصول إلى مكة، وما بعدها عمرات يختارها الحاج" },
  { key: "tarwiya", label: "يوم التروية في منى", mode: "done", place: "مخيم المجموعة في منى" },
  { key: "arafat", label: "الوقوف بعرفة", mode: "done", place: "مخيم المجموعة في عرفات" },
  { key: "muzdalifa", label: "المبيت في مزدلفة", mode: "muzdalifa", place: "نقطة المجموعة في مزدلفة", note: "لكل حاج: لم يحقق المبيت، أو حققه حتى منتصف الليل، أو حتى صلاة الفجر" },
  { key: "jamarat", label: "رمي الجمرات", mode: "jamarat", place: "منشأة الجمرات", note: "لكل حاج الجمرات التي رماها في ذلك اليوم" },
  { key: "ifada", label: "طواف الإفاضة والسعي", mode: "done", place: "المسجد الحرام" },
  { key: "halq", label: "الحلق أو التقصير", mode: "done", place: "مخيم المجموعة في منى" },
  { key: "mina", label: "المبيت في منى أيام التشريق", mode: "mina", place: "مخيم المجموعة في منى", note: "لكل حاج الليالي التي بات فيها" },
  { key: "farewell", label: "طواف الوداع", mode: "done", place: "المسجد الحرام" },
];
export const riteOf = (key: string | undefined) => RITES.find((r) => r.key === key);

/** The Umrahs in order: the first is the Umrah of tamattu', the ones after it the pilgrims' choice */
export const UMRAH_ORDINALS = ["عمرة التمتّع", "العمرة الثانية", "العمرة الثالثة", "العمرة الرابعة", "العمرة الخامسة"];
export const umrahLabel = (done: number) => UMRAH_ORDINALS[done] ?? `العمرة رقم ${done + 1}`;

export const MUZDALIFA_LEVELS = [
  { key: "none", label: "لم يحقق المبيت" },
  { key: "midnight", label: "حقق المبيت حتى منتصف الليل" },
  { key: "fajr", label: "حقق المبيت حتى صلاة الفجر" },
] as const;

export const JAMARAT = [
  { key: "sughra", label: "الصغرى" },
  { key: "wusta", label: "الوسطى" },
  { key: "aqaba", label: "العقبة" },
] as const;
/** The days of throwing: on the day of sacrifice only the Aqaba, on the days of tashreeq the three */
export const JAMARAT_DAYS = [
  { key: "10", label: "يوم النحر — 10 ذو الحجة", only: ["aqaba"] },
  { key: "11", label: "11 ذو الحجة — أول أيام التشريق" },
  { key: "12", label: "12 ذو الحجة — ثاني أيام التشريق" },
  { key: "13", label: "13 ذو الحجة — ثالث أيام التشريق" },
] as { key: string; label: string; only?: string[] }[];

export const MINA_NIGHTS = [
  { key: "11", label: "ليلة 11" },
  { key: "12", label: "ليلة 12" },
  { key: "13", label: "ليلة 13" },
] as const;

/** Did he do it: a degree past «none» at Muzdalifah, a stone thrown, a night at Mina, or ticked */
export function performed(m: Pick<Muster, "kind" | "present" | "detail">, id: string) {
  const mode = riteOf(m.kind)?.mode ?? "done";
  if (mode === "done") return m.present.includes(id);
  const d = m.detail?.[id] ?? [];
  return mode === "muzdalifa" ? d.some((x) => x !== "none") : d.length > 0;
}

/** What he did, in words: «حقق المبيت حتى صلاة الفجر»، «ليلة 11، ليلة 12»، «الصغرى، الوسطى، العقبة» */
export function performedText(m: Pick<Muster, "kind" | "present" | "detail">, id: string): string {
  const mode = riteOf(m.kind)?.mode ?? "done";
  const d = m.detail?.[id] ?? [];
  if (mode === "muzdalifa") return MUZDALIFA_LEVELS.find((x) => x.key === d[0])?.label ?? "لم يحقق المبيت";
  if (mode === "mina") return d.length ? `بات ${MINA_NIGHTS.filter((x) => d.includes(x.key)).map((x) => x.label).join("، ")}` : "لم يبت في منى";
  if (mode === "jamarat") return d.length ? `رمى ${JAMARAT.filter((x) => d.includes(x.key)).map((x) => `${x.label === "العقبة" ? "جمرة " : "الجمرة "}${x.label}`).join("، ")}` : "لم يرمِ";
  return m.present.includes(id) ? "أدّاه" : "لم يؤدِّه";
}

/** When it was done: the day, the date and the hour */
export const doneWhen = (at: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(at);

/** Every record of a group, from whoever made it, the latest done first */
export function useGroupMusters(groupNumber: number | undefined): GroupMuster[] {
  const admins = useStore((s) => s.admins);
  return useMemo(() => {
    if (groupNumber === undefined) return [];
    return Object.entries(admins)
      .flatMap(([id, a]) => (a.musters ?? []).filter((m) => (m.groupNumber ?? a.group?.number) === groupNumber).map((m) => { const who = getPerson(id); return { ...m, byId: id, by: who ? fullName(who) : id }; }))
      .sort((a, b) => (b.doneAt ?? b.at) - (a.doneAt ?? a.at));
  }, [admins, groupNumber]);
}

/** A group's rites done: the records made after the event (one left open from the gatherings is not one) */
export function useGroupRites(groupNumber: number | undefined) {
  const all = useGroupMusters(groupNumber);
  return useMemo(() => all.filter((m) => m.closedAt), [all]);
}
