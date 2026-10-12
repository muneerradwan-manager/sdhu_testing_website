"use client";

import { motion } from "motion/react";
import { CalendarRange, Printer } from "lucide-react";
import { useMemo } from "react";
import { useLang, useT } from "@/lib/i18n";
import { PRAYERS, type City } from "@/lib/prayer";
import { cn } from "@/lib/utils";
import { cityName, prayerName } from "./names";
import { PrayerIcon } from "./prayer-icon";
import { DAY, datesIn, dayTimes, timeParts } from "./time";

export function MonthlyTable({ city, dayKey }: { city: City; dayKey: string }) {
  const t = useT();
  const lang = useLang();
  const dateFmt = datesIn(lang);
  const name = cityName(city, lang);
  const rows = useMemo(() => {
    const [y, m, d] = dayKey.split("-").map(Number);
    // 09:00 UTC = noon in the +3 zone, safely inside the day
    const base = Date.UTC(y, m - 1, d, 9);
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date(base + i * DAY);
      return { i, date, times: dayTimes(city, date), friday: date.getUTCDay() === 5 };
    });
  }, [city, dayKey]);

  const range = `${dateFmt.hijriShort.format(rows[0].date)} – ${dateFmt.hijri.format(rows[29].date)}`;

  return (
    <div className="overflow-hidden rounded-3xl border border-gold/35 bg-white shadow-[0_20px_60px_-45px_rgba(2,21,38,.5)] print:rounded-none print:border-0 print:shadow-none">
      <div className="flex flex-col gap-4 border-b border-gold/25 bg-gradient-to-l from-sand to-white p-5 ltr:bg-gradient-to-r sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div>
          <h3 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
            <CalendarRange className="size-6 text-gold-dark print:hidden" />
            {t(`إمساكية ${name} — 30 يوماً`, `${name} timetable — 30 days`)}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">{range}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="group inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-green-dark px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-10px_rgba(0,89,79,.7)] transition hover:bg-green active:scale-[.97] sm:self-auto print:hidden"
        >
          <Printer className="size-4 transition-transform group-hover:-translate-y-0.5" />
          {t("طباعة الجدول", "Print the timetable")}
        </button>
      </div>

      <div className="max-h-[36rem] overflow-auto overscroll-contain print:max-h-none print:overflow-visible">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <caption className="sr-only">{t(`مواقيت الصلاة في ${name} لثلاثين يوماً`, `Prayer times in ${name} for thirty days`)}</caption>
          <thead className="sticky top-0 z-10 bg-green-dark text-white print:static">
            <tr>
              <th scope="col" className="px-3 py-3 text-start font-semibold">{t("اليوم", "Day")}</th>
              <th scope="col" className="px-3 py-3 text-start font-semibold">{t("هجري", "Hijri")}</th>
              <th scope="col" className="px-3 py-3 text-start font-semibold">{t("ميلادي", "Gregorian")}</th>
              {PRAYERS.map((p) => (
                <th key={p.key} scope="col" className="px-3 py-3 text-center font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <PrayerIcon prayer={p.key} className="size-3.5 text-gold print:hidden" />
                    {prayerName(p.key, lang)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const today = r.i === 0;
              return (
                <motion.tr
                  key={r.i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: Math.min(r.i, 10) * 0.02 }}
                  className={cn(
                    "border-b border-gold/15 transition-colors hover:bg-gold/15",
                    today ? "bg-gold/30 font-bold" : r.friday ? "bg-green-light/[.06]" : r.i % 2 ? "bg-sand/50" : "",
                  )}
                  aria-current={today ? "date" : undefined}
                >
                  <th scope="row" className="whitespace-nowrap px-3 py-2.5 text-start font-semibold text-green-dark">
                    <span className="inline-flex items-center gap-2">
                      {today && <span className="size-2 animate-pulse rounded-full bg-maroon print:hidden" />}
                      {dateFmt.weekday.format(r.date)}
                      {today && <span className="rounded-full bg-maroon px-2 py-0.5 text-[10px] text-white">{t("اليوم", "Today")}</span>}
                    </span>
                  </th>
                  <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{dateFmt.hijriShort.format(r.date)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{dateFmt.gregorianShort.format(r.date)}</td>
                  {PRAYERS.map((p) => {
                    const tp = timeParts(r.times[p.key], false, lang);
                    return (
                      <td key={p.key} className={cn("whitespace-nowrap px-3 py-2.5 text-center tabular-nums", p.key === "sunrise" && "text-hint")}>
                        {tp.time}
                        <span className="ms-1 text-[10px] text-hint">{tp.period}</span>
                      </td>
                    );
                  })}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
