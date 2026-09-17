/**
 * Astronomical prayer-time calculation (PrayTimes.org method, simplified single pass).
 * Makkah & Madinah use Umm al-Qura; Syrian cities use Muslim World League angles. Asr: Shafi'i.
 */

export type City = {
  slug: string;
  name: string;
  country: "سوريا" | "السعودية";
  lat: number;
  lng: number;
  tz: number;
  method: "mwl" | "ummalqura";
};

export const CITIES: City[] = [
  { slug: "damascus", name: "دمشق", country: "سوريا", lat: 33.5138, lng: 36.2765, tz: 3, method: "mwl" },
  { slug: "aleppo", name: "حلب", country: "سوريا", lat: 36.2021, lng: 37.1343, tz: 3, method: "mwl" },
  { slug: "homs", name: "حمص", country: "سوريا", lat: 34.7324, lng: 36.7137, tz: 3, method: "mwl" },
  { slug: "hama", name: "حماة", country: "سوريا", lat: 35.1318, lng: 36.7578, tz: 3, method: "mwl" },
  { slug: "latakia", name: "اللاذقية", country: "سوريا", lat: 35.5317, lng: 35.7901, tz: 3, method: "mwl" },
  { slug: "idlib", name: "إدلب", country: "سوريا", lat: 35.9306, lng: 36.6339, tz: 3, method: "mwl" },
  { slug: "daraa", name: "درعا", country: "سوريا", lat: 32.6189, lng: 36.1021, tz: 3, method: "mwl" },
  { slug: "deir-ez-zor", name: "دير الزور", country: "سوريا", lat: 35.3359, lng: 40.1408, tz: 3, method: "mwl" },
  { slug: "makkah", name: "مكة المكرمة", country: "السعودية", lat: 21.4225, lng: 39.8262, tz: 3, method: "ummalqura" },
  { slug: "madinah", name: "المدينة المنورة", country: "السعودية", lat: 24.4672, lng: 39.6112, tz: 3, method: "ummalqura" },
];

export const PRAYERS = [
  { key: "fajr", name: "الفجر" },
  { key: "sunrise", name: "الشروق" },
  { key: "dhuhr", name: "الظهر" },
  { key: "asr", name: "العصر" },
  { key: "maghrib", name: "المغرب" },
  { key: "isha", name: "العشاء" },
] as const;

export type PrayerKey = (typeof PRAYERS)[number]["key"];

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const fix = (a: number, b: number) => {
  const r = a - b * Math.floor(a / b);
  return r < 0 ? r + b : r;
};

function julian(year: number, month: number, day: number) {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function sunPosition(jd: number) {
  const D = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * D, 360);
  const q = fix(280.459 + 0.98564736 * D, 360);
  const L = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360);
  const e = 23.439 - 0.00000036 * D;
  const RA = fix(deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15, 24);
  return {
    declination: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))),
    equation: q / 15 - RA,
  };
}

export function prayerTimes(city: City, date: Date = new Date()) {
  const jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - city.lng / (15 * 24);
  const fajrAngle = city.method === "ummalqura" ? 18.5 : 18;
  const ishaAngle = 17;

  const midDay = (t: number) => {
    const eqt = sunPosition(jd + t).equation;
    return fix(12 - eqt, 24);
  };
  const sunAngleTime = (angle: number, t: number, ccw: boolean) => {
    const decl = sunPosition(jd + t).declination;
    const noon = midDay(t);
    const x = (-Math.sin(rad(angle)) - Math.sin(rad(decl)) * Math.sin(rad(city.lat))) / (Math.cos(rad(decl)) * Math.cos(rad(city.lat)));
    const T = deg(Math.acos(Math.max(-1, Math.min(1, x)))) / 15;
    return noon + (ccw ? -T : T);
  };
  const asrTime = (factor: number, t: number) => {
    const decl = sunPosition(jd + t).declination;
    const angle = -deg(Math.atan(1 / (factor + Math.tan(rad(Math.abs(city.lat - decl))))));
    return sunAngleTime(angle, t, false);
  };

  // Seed with rough day fractions, then compute
  const fajr = sunAngleTime(fajrAngle, 5 / 24, true);
  const sunrise = sunAngleTime(0.833, 6 / 24, true);
  const dhuhr = midDay(12 / 24);
  const asr = asrTime(1, 13 / 24);
  const maghrib = sunAngleTime(0.833, 18 / 24, false);
  const isha = city.method === "ummalqura" ? maghrib + 1.5 : sunAngleTime(ishaAngle, 18 / 24, false);

  const adjust = (h: number) => h + city.tz - city.lng / 15;
  const raw: Record<PrayerKey, number> = {
    fajr: adjust(fajr),
    sunrise: adjust(sunrise),
    dhuhr: adjust(dhuhr) + 2 / 60,
    asr: adjust(asr),
    maghrib: adjust(maghrib) + 1 / 60,
    isha: adjust(isha),
  };

  const toDate = (h: number) => {
    const d = new Date(date);
    const mins = Math.round(fix(h, 24) * 60);
    d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    return d;
  };

  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, toDate(v)])) as Record<PrayerKey, Date>;
}

export function formatTime(d: Date) {
  return new Intl.DateTimeFormat("ar-SY-u-nu-latn", { hour: "2-digit", minute: "2-digit", hour12: true }).format(d);
}

/** Next upcoming prayer (skips sunrise), rolling over to tomorrow's Fajr after Isha */
export function nextPrayer(city: City, now: Date = new Date()) {
  const today = prayerTimes(city, now);
  for (const p of PRAYERS) {
    if (p.key === "sunrise") continue;
    if (today[p.key] > now) return { ...p, time: today[p.key] };
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return { ...PRAYERS[0], time: prayerTimes(city, tomorrow).fajr };
}

/** Great-circle bearing from a city to the Kaaba, degrees clockwise from north */
export function qiblaBearing(city: City) {
  const k = { lat: rad(21.4225), lng: rad(39.8262) };
  const lat = rad(city.lat);
  const dLng = k.lng - rad(city.lng);
  return fix(deg(Math.atan2(Math.sin(dLng), Math.cos(lat) * Math.tan(k.lat) - Math.sin(lat) * Math.cos(dLng))), 360);
}

export function distanceToKaaba(city: City) {
  const R = 6371;
  const dLat = rad(21.4225 - city.lat);
  const dLng = rad(39.8262 - city.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(city.lat)) * Math.cos(rad(21.4225)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}
