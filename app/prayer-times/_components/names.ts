import type { Lang } from "@/lib/i18n";
import type { City, PrayerKey } from "@/lib/prayer";

/** The cities and prayers by their English names (lib/prayer keeps the Arabic) */
const CITY_EN: Record<string, string> = {
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

const PRAYER_EN: Record<PrayerKey, string> = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

const PRAYER_AR: Record<PrayerKey, string> = {
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export const cityName = (city: City, lang: Lang) => (lang === "en" ? (CITY_EN[city.slug] ?? city.name) : city.name);

export const prayerName = (key: PrayerKey, lang: Lang) => (lang === "en" ? PRAYER_EN[key] : PRAYER_AR[key]);
