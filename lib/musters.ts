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
/**
 * «المزارات»: the places the group visits in Makkah and Madinah, recorded the same way after each visit — when,
 * where, who of the group went. A visit is not a rite: whoever did not go needs no reason (one may be written).
 */
export const VISITS: { key: string; label: string; mode: RiteMode; place: string; note?: string; city: "مكة" | "المدينة" }[] = [
  { key: "v-hira", label: "جبل النور وغار حراء", mode: "done", place: "جبل النور — مكة", city: "مكة" },
  { key: "v-thawr", label: "جبل ثور", mode: "done", place: "جبل ثور — مكة", city: "مكة" },
  { key: "v-rahma", label: "جبل الرحمة في عرفات", mode: "done", place: "عرفات", city: "مكة" },
  { key: "v-namira", label: "مسجد نمرة", mode: "done", place: "عرفات", city: "مكة" },
  { key: "v-khayf", label: "مسجد الخيف", mode: "done", place: "منى", city: "مكة" },
  { key: "v-mashar", label: "المشعر الحرام", mode: "done", place: "مزدلفة", city: "مكة" },
  { key: "v-tanim", label: "مسجد التنعيم (مسجد عائشة)", mode: "done", place: "التنعيم — مكة", city: "مكة", note: "ميقات من أراد العمرة من أهل مكة" },
  { key: "v-jiirana", label: "مسجد الجعرانة", mode: "done", place: "الجعرانة — مكة", city: "مكة" },
  { key: "v-mala", label: "مقبرة المعلاة", mode: "done", place: "المعلاة — مكة", city: "مكة" },
  { key: "v-kiswa", label: "مجمع كسوة الكعبة", mode: "done", place: "أم الجود — مكة", city: "مكة" },
  { key: "v-museum-makkah", label: "معرض عمارة الحرمين الشريفين", mode: "done", place: "أم الجود — مكة", city: "مكة" },
  { key: "v-salam", label: "السلام على النبي ﷺ وصاحبيه", mode: "done", place: "المسجد النبوي", city: "المدينة" },
  { key: "v-rawda", label: "الروضة الشريفة", mode: "done", place: "المسجد النبوي", city: "المدينة", note: "بموعد الروضة الذي أعطته الإدارة للمجموعة" },
  { key: "v-quba", label: "مسجد قباء", mode: "done", place: "قباء — المدينة", city: "المدينة" },
  { key: "v-uhud", label: "جبل أحد ومقبرة شهداء أحد", mode: "done", place: "أحد — المدينة", city: "المدينة" },
  { key: "v-baqi", label: "بقيع الغرقد", mode: "done", place: "البقيع — المدينة", city: "المدينة" },
  { key: "v-qiblatayn", label: "مسجد القبلتين", mode: "done", place: "المدينة", city: "المدينة" },
  { key: "v-sabaa", label: "المساجد السبعة (موقع غزوة الخندق)", mode: "done", place: "المدينة", city: "المدينة" },
  { key: "v-ghamama", label: "مسجد الغمامة", mode: "done", place: "المدينة", city: "المدينة" },
  { key: "v-miqat", label: "مسجد الميقات (ذو الحليفة)", mode: "done", place: "آبار علي — المدينة", city: "المدينة" },
  { key: "v-mushaf", label: "مجمع الملك فهد لطباعة المصحف", mode: "done", place: "المدينة", city: "المدينة" },
];

/**
 * «السفر»: each leg of the group's journey, recorded once it is made — who of the group travelled on it, and why
 * whoever did not (a pilgrim missing at a leg is the operations room's to know).
 */
export const TRAVEL: { key: string; label: string; mode: RiteMode; place: string; note?: string }[] = [
  { key: "t-gather", label: "التجمّع والانطلاق إلى مطار دمشق", mode: "done", place: "نقطة تجمّع المجموعة — دمشق" },
  { key: "t-depart", label: "الإقلاع من دمشق", mode: "done", place: "مطار دمشق الدولي" },
  { key: "t-arrive", label: "الوصول إلى مطار جدة", mode: "done", place: "مطار الملك عبد العزيز — جدة" },
  { key: "t-makkah", label: "الوصول إلى فندق مكة", mode: "done", place: "فندق المجموعة — مكة" },
  { key: "t-mashaer", label: "الانتقال إلى المشاعر", mode: "done", place: "من فندق مكة إلى منى" },
  { key: "t-back-makkah", label: "العودة من المشاعر إلى فندق مكة", mode: "done", place: "من منى إلى فندق مكة" },
  { key: "t-madinah", label: "الانتقال من مكة إلى المدينة", mode: "done", place: "الطريق إلى المدينة المنورة" },
  { key: "t-madinah-hotel", label: "الوصول إلى فندق المدينة", mode: "done", place: "فندق المجموعة — المدينة" },
  { key: "t-airport-back", label: "الانطلاق إلى مطار العودة", mode: "done", place: "مطار الأمير محمد بن عبد العزيز — المدينة" },
  { key: "t-home", label: "الوصول إلى دمشق", mode: "done", place: "مطار دمشق الدولي" },
];

/** What a record is: a rite, a visit, or a leg of the journey — each kept and shown apart */
export type FieldRecordKind = "rites" | "visits" | "travel";
export const CATALOG: Record<FieldRecordKind, { key: string; label: string; mode: RiteMode; place: string; note?: string }[]> = { rites: RITES, visits: VISITS, travel: TRAVEL };
export const categoryOf = (kind: string | undefined): FieldRecordKind => (VISITS.some((v) => v.key === kind) ? "visits" : TRAVEL.some((t) => t.key === kind) ? "travel" : "rites");
export const riteOf = (key: string | undefined) => RITES.find((r) => r.key === key) ?? VISITS.find((r) => r.key === key) ?? TRAVEL.find((r) => r.key === key);

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
  const cat = categoryOf(m.kind);
  const yes = m.present.includes(id);
  if (cat === "visits") return yes ? "زاره" : "لم يزره";
  if (cat === "travel") return yes ? "مع المجموعة" : "لم يكن مع المجموعة";
  return yes ? "أدّاه" : "لم يؤدِّه";
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

/** A group's rites done (or its visits, or its journey's legs): the records made after the event (one left open from the gatherings is not one) */
export function useGroupRites(groupNumber: number | undefined, category: FieldRecordKind = "rites") {
  const all = useGroupMusters(groupNumber);
  return useMemo(() => all.filter((m) => m.closedAt && categoryOf(m.kind) === category), [all, category]);
}
