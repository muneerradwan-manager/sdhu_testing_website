import type { Lang } from "@/lib/i18n";
import { CITIES, PRAYERS, prayerTimes, type City, type PrayerKey } from "@/lib/prayer";

/**
 * All supported cities are UTC+3 year-round. `prayerTimes()` builds its Dates in the *browser's*
 * local zone, so we shift in and out of a "+3 wall clock" to stay correct for visitors anywhere.
 * Asia/Riyadh is used for formatting because it is a fixed +3 zone in every ICU build.
 */
export const ZONE = "Asia/Riyadh";
export const DAY = 86_400_000;

const shift = (d: Date) => (d.getTimezoneOffset() + 180) * 60_000;

/** A Date whose *local* fields read like the +3 wall clock of the given real instant */
export function wallDate(real: Date) {
  return new Date(real.getTime() + shift(real));
}

export function dayTimes(city: City, real: Date): Record<PrayerKey, Date> {
  const t = prayerTimes(city, wallDate(real));
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, new Date(v.getTime() - shift(v))])) as Record<PrayerKey, Date>;
}

export function cityBySlug(slug: string | null | undefined) {
  return CITIES.find((c) => c.slug === slug) ?? CITIES[0];
}

export type Slot = { key: PrayerKey; name: string; time: Date; day: -1 | 0 | 1 };

export function schedule(city: City, nowMs: number) {
  const now = new Date(nowMs);
  const today = dayTimes(city, now);
  const yesterday = dayTimes(city, new Date(nowMs - DAY));
  const tomorrow = dayTimes(city, new Date(nowMs + DAY));
  const salah = PRAYERS.filter((p) => p.key !== "sunrise");

  const events: Slot[] = [
    { key: "isha", name: "العشاء", time: yesterday.isha, day: -1 },
    ...salah.map((p) => ({ key: p.key, name: p.name, time: today[p.key], day: 0 as const })),
    { key: "fajr", name: "الفجر", time: tomorrow.fajr, day: 1 },
  ];

  let i = events.findIndex((e) => e.time.getTime() > nowMs);
  if (i < 1) i = 1;
  const next = events[i];
  const prev = events[i - 1];
  const span = next.time.getTime() - prev.time.getTime();
  const progress = Math.min(1, Math.max(0, (nowMs - prev.time.getTime()) / span));

  return { today, next, prev, progress, remaining: Math.max(0, next.time.getTime() - nowMs) };
}

const LOCALE: Record<Lang, string> = { ar: "ar-SY-u-nu-latn", en: "en-GB" };

const timeFmt = {
  ar: new Intl.DateTimeFormat(LOCALE.ar, { hour: "numeric", minute: "2-digit", hour12: true, timeZone: ZONE }),
  en: new Intl.DateTimeFormat(LOCALE.en, { hour: "numeric", minute: "2-digit", hour12: true, timeZone: ZONE }),
};
const clockOptions: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true, timeZone: ZONE };
const clockFmt = { ar: new Intl.DateTimeFormat(LOCALE.ar, clockOptions), en: new Intl.DateTimeFormat(LOCALE.en, clockOptions) };

export function fmtTime(d: Date, lang: Lang = "ar") {
  return timeFmt[lang].format(d);
}

/** "4:32" + "م" (or "pm") split, so the period can be styled smaller */
export function timeParts(d: Date, seconds = false, lang: Lang = "ar") {
  const parts = (seconds ? clockFmt : timeFmt)[lang].formatToParts(d);
  const period = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
  const time = parts
    .filter((p) => p.type !== "dayPeriod")
    .map((p) => p.value)
    .join("")
    .trim();
  return { time, period };
}

export function countdown(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function humanRemaining(ms: number, lang: Lang = "ar") {
  const mins = Math.ceil(ms / 60_000);
  if (mins < 1) return lang === "en" ? "now" : "الآن";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (lang === "en") {
    const hours = h === 0 ? "" : h === 1 ? "1 hour" : `${h} hours`;
    const minutes = m === 0 ? "" : m === 1 ? "1 minute" : `${m} minutes`;
    return [hours, minutes].filter(Boolean).join(" and ");
  }
  const hs = h === 0 ? "" : h === 1 ? "ساعة" : h === 2 ? "ساعتين" : h <= 10 ? `${h} ساعات` : `${h} ساعة`;
  const ms_ = m === 0 ? "" : m === 1 ? "دقيقة" : m === 2 ? "دقيقتين" : m <= 10 ? `${m} دقائق` : `${m} دقيقة`;
  return [hs, ms_].filter(Boolean).join(" و");
}

const HIJRI_MONTHS_EN = [
  "Muharram",
  "Safar",
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  "Jumada al-Ula",
  "Jumada al-Akhirah",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qa'dah",
  "Dhu al-Hijjah",
];

const hijriParts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric", year: "numeric", timeZone: ZONE });

/** A Hijri date in English with the usual month names: "12 Dhu al-Hijjah 1447 AH" */
function hijriEn(d: Date, withYear: boolean) {
  const parts = hijriParts.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const month = HIJRI_MONTHS_EN[Number(get("month")) - 1] ?? get("month");
  return withYear ? `${get("day")} ${month} ${get("year")} AH` : `${get("day")} ${month}`;
}

type DateFmt = { format: (d: Date) => string };

const enFmt = {
  hijri: { format: (d: Date) => hijriEn(d, true) },
  hijriShort: { format: (d: Date) => hijriEn(d, false) },
  gregorian: new Intl.DateTimeFormat(LOCALE.en, { day: "numeric", month: "long", year: "numeric", timeZone: ZONE }),
  gregorianShort: new Intl.DateTimeFormat(LOCALE.en, { day: "numeric", month: "short", timeZone: ZONE }),
  weekday: new Intl.DateTimeFormat(LOCALE.en, { weekday: "long", timeZone: ZONE }),
};

/** The page's date formats in its language */
export function datesIn(lang: Lang): Record<"hijri" | "hijriShort" | "gregorian" | "gregorianShort" | "weekday", DateFmt> {
  return lang === "en" ? enFmt : dateFmt;
}

export const dateFmt = {
  hijri: new Intl.DateTimeFormat("ar-SY-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: ZONE }),
  hijriShort: new Intl.DateTimeFormat("ar-SY-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long", timeZone: ZONE }),
  gregorian: new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: ZONE }),
  gregorianShort: new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "short", timeZone: ZONE }),
  weekday: new Intl.DateTimeFormat("ar-SY", { weekday: "long", timeZone: ZONE }),
  dayKey: new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: ZONE }),
};

/** Wall-clock hour/min/sec in the +3 zone, for analog clocks */
export function wallHMS(nowMs: number) {
  const w = wallDate(new Date(nowMs));
  return { h: w.getHours(), m: w.getMinutes(), s: w.getSeconds() };
}
