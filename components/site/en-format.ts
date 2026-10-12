import type { Lang } from "@/lib/i18n";
import { hijriDate } from "@/lib/utils";

/**
 * English names and dates for the public site's chrome (header, home page widgets): the prayers, the cities of
 * lib/prayer, and the Hijri date with the month names the site uses in English.
 */
export const PRAYER_EN: Record<string, string> = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export const CITY_EN: Record<string, string> = {
  damascus: "Damascus",
  aleppo: "Aleppo",
  homs: "Homs",
  hama: "Hama",
  latakia: "Latakia",
  idlib: "Idlib",
  daraa: "Daraa",
  "deir-ez-zor": "Deir ez-Zor",
  makkah: "Makkah",
  madinah: "Madinah",
};

export const HIJRI_MONTHS_EN = [
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

/** «Sunday, 29 Rabi' al-Thani 1448 AH» in English; the Arabic date as lib/utils writes it otherwise */
export function hijriDateIn(lang: Lang, date: Date, weekday = false) {
  if (lang !== "en") return hijriDate(date, weekday ? { weekday: "long" } : undefined);
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric", year: "numeric" }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const month = HIJRI_MONTHS_EN[Number(get("month")) - 1] ?? "";
  const day = `${get("day")} ${month} ${get("year")} AH`;
  return weekday ? `${new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date)}, ${day}` : day;
}
