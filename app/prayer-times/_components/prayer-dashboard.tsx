"use client";

import { motion } from "motion/react";
import { Info, LoaderCircle, LocateFixed, MapPin } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useLang, useT } from "@/lib/i18n";
import { CITIES, locatedCity, type City } from "@/lib/prayer";
import { useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";
import { SectionHeading, Reveal } from "@/components/ui/motion";
import { CityClocks } from "./city-clocks";
import { MonthlyTable } from "./monthly-table";
import { NextPrayerHero } from "./next-prayer";
import { PrayerCards } from "./prayer-cards";
import { QiblaCompass } from "./qibla-compass";
import { cityName } from "./names";
import { cityBySlug, dateFmt, datesIn, schedule } from "./time";
import { useNow } from "./use-now";
import { DashboardSkeleton } from "./dashboard-skeleton";

const GROUPS = [
  { label: "المدن السورية", labelEn: "Syrian cities", cities: CITIES.filter((c) => c.country === "سوريا") },
  { label: "الحرمان الشريفان", labelEn: "The Two Holy Mosques", cities: CITIES.filter((c) => c.country === "السعودية") },
];

type Located = { lat: number; lng: number; place?: string; country?: string; countryCode?: string };

/**
 * The visitor's own place: the browser asks his permission, gives his coordinates, and the times are computed for
 * them. The name of his city and country comes from a reverse lookup (BigDataCloud's free browser service); without
 * it the times still come, under «موقعك الحالي».
 */
function LocateButton({ active, onLocated }: { active: boolean; onLocated: (at: Located) => void }) {
  const t = useT();
  const lang = useLang();
  const [state, setState] = useState<"idle" | "busy" | "denied" | "none">("idle");
  const locate = () => {
    if (!("geolocation" in navigator)) return setState("none");
    setState("busy");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 1e4) / 1e4;
        const lng = Math.round(pos.coords.longitude * 1e4) / 1e4;
        let named: Partial<Located> = {};
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=${lang === "en" ? "en" : "ar"}`);
          const d = (await res.json()) as { city?: string; locality?: string; principalSubdivision?: string; countryName?: string; countryCode?: string };
          named = { place: d.city || d.locality || d.principalSubdivision || undefined, country: d.countryName, countryCode: d.countryCode };
        } catch {
          // No name: the times are computed all the same
        }
        setState("idle");
        onLocated({ lat, lng, ...named });
      },
      () => setState("denied"),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60_000 },
    );
  };
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={locate}
        disabled={state === "busy"}
        aria-pressed={active}
        className={cn("inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold transition", active ? "bg-gold-dark text-white shadow-md" : "bg-gold/15 text-green-dark ring-1 ring-gold/50 hover:bg-gold/25")}
      >
        {state === "busy" ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
        {state === "busy" ? t("نحدد موقعك…", "Finding you…") : t("مواقيت موقعي", "Times where I am")}
      </button>
      {state === "denied" && <p className="text-xs text-maroon">{t("لم يُسمح بالموقع. اسمح به من إعدادات المتصفح، أو اختر مدينة.", "Location was not allowed. Allow it in your browser's settings, or choose a city.")}</p>}
      {state === "none" && <p className="text-xs text-maroon">{t("المتصفح لا يعطي الموقع. اختر مدينة.", "This browser does not give a location. Choose a city.")}</p>}
    </div>
  );
}

function CityPicker({ city, onPick, onLocated, pending }: { city: City; onPick: (slug: string) => void; onLocated: (at: Located) => void; pending: boolean }) {
  const t = useT();
  const lang = useLang();
  return (
    <div
      className={cn(
        "relative z-10 -mt-10 rounded-3xl border border-gold/35 bg-white/95 p-4 shadow-[0_24px_60px_-35px_rgba(2,21,38,.55)] backdrop-blur md:-mt-14 md:p-5 print:hidden",
        pending && "opacity-90",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <p className="flex shrink-0 items-center gap-2 text-sm font-bold text-green-dark">
          <span className="grid size-8 place-items-center rounded-xl bg-green-dark text-gold">
            <MapPin className="size-4" />
          </span>
          {t("اختر مدينتك", "Choose your city")}
        </p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
          <LocateButton active={city.slug === "here"} onLocated={onLocated} />
          {GROUPS.map((g) => (
            <div key={g.label} role="radiogroup" aria-label={t(g.label, g.labelEn)} className="flex flex-wrap gap-2">
              {g.cities.map((c) => {
                const active = c.slug === city.slug;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onPick(c.slug)}
                    className={cn(
                      "relative rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                      active ? "text-white" : "text-ink-soft hover:bg-green-dark/5 hover:text-green-dark",
                      c.country === "السعودية" && !active && "ring-1 ring-gold/50",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="city-pill"
                        className={cn("absolute inset-0 rounded-full shadow-md", c.country === "السعودية" ? "bg-maroon" : "bg-green-dark")}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative">{cityName(c, lang)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PrayerDashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();
  const nowMs = useNow();
  // «?lat=…&lng=…» is the visitor's own place, located with his permission; else one of the listed cities
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const here = params.has("lat") && params.has("lng") && Number.isFinite(lat) && Number.isFinite(lng);
  const city = here ? locatedCity({ lat, lng, place: params.get("place") ?? undefined, country: params.get("country") ?? undefined, countryCode: params.get("cc") ?? undefined }) : cityBySlug(params.get("city"));
  const t = useT();
  const lang = useLang();
  const dates = datesIn(lang);
  const name = cityName(city, lang);

  const pick = (slug: string) => {
    startTransition(() => {
      router.replace(slug === CITIES[0].slug ? pathname : `${pathname}?city=${slug}`, { scroll: false });
    });
  };

  const located = (at: Located) => {
    const q = new URLSearchParams({ lat: String(at.lat), lng: String(at.lng) });
    if (at.place) q.set("place", at.place);
    if (at.country) q.set("country", at.country);
    if (at.countryCode) q.set("cc", at.countryCode);
    startTransition(() => router.replace(`${pathname}?${q}`, { scroll: false }));
  };

  if (!hydrated || nowMs === 0) {
    return (
      <>
        <CityPicker city={city} onPick={pick} onLocated={located} pending={pending} />
        <DashboardSkeleton />
      </>
    );
  }

  const sched = schedule(city, nowMs);
  const dayKey = dateFmt.dayKey.format(new Date(nowMs));

  return (
    <>
      <CityPicker city={city} onPick={pick} onLocated={located} pending={pending} />
      {here && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-gold/10 px-4 py-2 text-sm text-ink-soft print:hidden">
          <LocateFixed className="size-4 shrink-0 text-gold-dark" />
          {t(
            `مواقيت موقعك الحالي${city.country ? ` في ${city.country}` : ""} بتوقيت جهازك، ${city.method === "ummalqura" ? "بتقويم أم القرى" : "بطريقة رابطة العالم الإسلامي"}.`,
            `Times for where you are${city.country ? ` in ${city.country}` : ""}, in your device's time zone, ${city.method === "ummalqura" ? "by the Umm al-Qura calendar" : "by the Muslim World League method"}.`,
          )}
        </p>
      )}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem] print:hidden" aria-label={t("الصلاة القادمة واتجاه القبلة", "Next prayer and Qibla direction")}>
        <motion.div data-tour-target key={city.slug} className="h-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          <NextPrayerHero city={city} nowMs={nowMs} sched={sched} />
        </motion.div>
        <QiblaCompass city={city} />
      </section>

      <section className="mt-10 print:hidden" aria-labelledby="today-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="today-heading" className="font-display text-2xl font-bold text-green-dark md:text-3xl">
              {t(`مواقيت اليوم في ${name}`, `Today's prayer times in ${name}`)}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {dates.weekday.format(new Date(nowMs))} {dates.hijri.format(new Date(nowMs))} — {dates.gregorian.format(new Date(nowMs))}
            </p>
          </div>
        </div>
        <PrayerCards key={city.slug} nowMs={nowMs} sched={sched} />
      </section>

      <section className="mt-16 print:hidden">
        <SectionHeading
          eyebrow={t("ساعات حية", "Live clocks")}
          title={t("بين دمشق والحرمين", "Between Damascus and the Two Holy Mosques")}
          description={t(
            "الوقت الآن والصلاة القادمة في دمشق ومكة المكرمة والمدينة المنورة، لتبقى قريباً من حجاجك.",
            "The time now and the next prayer in Damascus, Makkah and Madinah, so you stay close to your pilgrims.",
          )}
        />
        <CityClocks nowMs={nowMs} activeSlug={city.slug} />
      </section>

      <section className="mt-16">
        <MonthlyTable city={city} dayKey={dayKey} />
        <Reveal className="mt-6 print:hidden">
          <aside className="relative overflow-hidden rounded-3xl bg-maroon-dark p-6 text-white md:p-7">
            <div className="bg-pattern absolute inset-0 opacity-15" />
            <div className="relative">
              <p className="flex items-center gap-2 font-display text-xl font-bold text-gold">
                <Info className="size-5" /> {t("طريقة الحساب", "Calculation method")}
              </p>
              <ul className="mt-5 grid gap-3 text-sm leading-7 md:grid-cols-3">
                <li className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="font-bold text-gold">{t("المدن السورية", "Syrian cities")}</p>
                  <p className="text-white/75">{t("رابطة العالم الإسلامي: الفجر 18° والعشاء 17°.", "Muslim World League: Fajr 18° and Isha 17°.")}</p>
                </li>
                <li className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="font-bold text-gold">{t("مكة المكرمة والمدينة المنورة", "Makkah and Madinah")}</p>
                  <p className="text-white/75">{t("تقويم أم القرى: الفجر 18.5° والعشاء بعد المغرب بتسعين دقيقة.", "Umm al-Qura calendar: Fajr 18.5°, and Isha ninety minutes after Maghrib.")}</p>
                </li>
                <li className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="font-bold text-gold">{t("العصر", "Asr")}</p>
                  <p className="text-white/75">{t("مذهب الجمهور: حين يصير ظل الشيء مثله.", "The majority view: when an object's shadow equals its length.")}</p>
                </li>
              </ul>
              <p className="mt-5 text-xs leading-6 text-white/55">
                {t(
                  "المواقيت محسوبة فلكياً بتوقيت +3 للمدن المذكورة، وبتوقيت جهازك لموقعك الحالي (بطريقة أم القرى في السعودية، ورابطة العالم الإسلامي في غيرها). وقد تختلف دقيقة أو دقيقتين عن التقويم المحلي. يُرجى الاحتياط في الصيام والإمساك.",
                  "Times are calculated astronomically for UTC+3 for the listed cities, and in your device's time zone for where you are (Umm al-Qura in Saudi Arabia, the Muslim World League elsewhere). They may differ by a minute or two from the local calendar. Please allow a margin when fasting and stopping eating before Fajr.",
                )}
              </p>
            </div>
          </aside>
        </Reveal>
      </section>
    </>
  );
}
