"use client";

import { motion } from "motion/react";
import { Info, MapPin } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CITIES, type City } from "@/lib/prayer";
import { useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";
import { SectionHeading, Reveal } from "@/components/ui/motion";
import { CityClocks } from "./city-clocks";
import { MonthlyTable } from "./monthly-table";
import { NextPrayerHero } from "./next-prayer";
import { PrayerCards } from "./prayer-cards";
import { QiblaCompass } from "./qibla-compass";
import { cityBySlug, dateFmt, schedule } from "./time";
import { useNow } from "./use-now";
import { DashboardSkeleton } from "./dashboard-skeleton";

const GROUPS = [
  { label: "المدن السورية", cities: CITIES.filter((c) => c.country === "سوريا") },
  { label: "الحرمان الشريفان", cities: CITIES.filter((c) => c.country === "السعودية") },
];

function CityPicker({ city, onPick, pending }: { city: City; onPick: (slug: string) => void; pending: boolean }) {
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
          اختر مدينتك
        </p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
          {GROUPS.map((g) => (
            <div key={g.label} role="radiogroup" aria-label={g.label} className="flex flex-wrap gap-2">
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
                    <span className="relative">{c.name}</span>
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
  const city = cityBySlug(params.get("city"));

  const pick = (slug: string) => {
    startTransition(() => {
      router.replace(slug === CITIES[0].slug ? pathname : `${pathname}?city=${slug}`, { scroll: false });
    });
  };

  if (!hydrated || nowMs === 0) {
    return (
      <>
        <CityPicker city={city} onPick={pick} pending={pending} />
        <DashboardSkeleton />
      </>
    );
  }

  const sched = schedule(city, nowMs);
  const dayKey = dateFmt.dayKey.format(new Date(nowMs));

  return (
    <>
      <CityPicker city={city} onPick={pick} pending={pending} />

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem] print:hidden" aria-label="الصلاة القادمة واتجاه القبلة">
        <motion.div data-tour-target key={city.slug} className="h-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          <NextPrayerHero city={city} nowMs={nowMs} sched={sched} />
        </motion.div>
        <QiblaCompass city={city} />
      </section>

      <section className="mt-10 print:hidden" aria-labelledby="today-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="today-heading" className="font-display text-2xl font-bold text-green-dark md:text-3xl">
              مواقيت اليوم في {city.name}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {dateFmt.weekday.format(new Date(nowMs))} {dateFmt.hijri.format(new Date(nowMs))} — {dateFmt.gregorian.format(new Date(nowMs))}
            </p>
          </div>
        </div>
        <PrayerCards key={city.slug} nowMs={nowMs} sched={sched} />
      </section>

      <section className="mt-16 print:hidden">
        <SectionHeading
          eyebrow="ساعات حية"
          title="بين دمشق والحرمين"
          description="الوقت الآن والصلاة القادمة في دمشق ومكة المكرمة والمدينة المنورة، لتبقى قريباً من حجاجك."
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
                <Info className="size-5" /> طريقة الحساب
              </p>
              <ul className="mt-5 grid gap-3 text-sm leading-7 md:grid-cols-3">
                <li className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="font-bold text-gold">المدن السورية</p>
                  <p className="text-white/75">رابطة العالم الإسلامي: الفجر 18° والعشاء 17°.</p>
                </li>
                <li className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="font-bold text-gold">مكة المكرمة والمدينة المنورة</p>
                  <p className="text-white/75">تقويم أم القرى: الفجر 18.5° والعشاء بعد المغرب بتسعين دقيقة.</p>
                </li>
                <li className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="font-bold text-gold">العصر</p>
                  <p className="text-white/75">مذهب الجمهور: حين يصير ظل الشيء مثله.</p>
                </li>
              </ul>
              <p className="mt-5 text-xs leading-6 text-white/55">
                المواقيت محسوبة فلكياً بتوقيت +3، وقد تختلف دقيقة أو دقيقتين عن التقويم المحلي. يُرجى الاحتياط في الصيام والإمساك.
              </p>
            </div>
          </aside>
        </Reveal>
      </section>
    </>
  );
}
