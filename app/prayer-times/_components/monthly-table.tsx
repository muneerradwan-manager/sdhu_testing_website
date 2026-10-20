"use client";

import { motion } from "motion/react";
import { CalendarRange, Printer } from "lucide-react";
import { useMemo } from "react";
import { PrintDocument, PrintNote, PrintTable } from "@/components/print/print-document";
import { PrintSheet } from "@/components/print/print-sheet";
import { useLang, useT } from "@/lib/i18n";
import { PRAYERS, type City, type PrayerKey } from "@/lib/prayer";
import { cn } from "@/lib/utils";
import { cityName, prayerName } from "./names";
import { PrayerIcon } from "./prayer-icon";
import { DAY, dateFmt as arDates, datesIn, dayTimes, timeParts } from "./time";

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

      <PrintSheet>
        <MonthlyPrint city={city} rows={rows} />
      </PrintSheet>
    </div>
  );
}

/**
 * The thirty days on paper, in the platform's one print template. The template is Arabic (its letterhead, its
 * direction), so the printed timetable is in Arabic whatever the page's language. Six prayer columns and three of
 * dates stay short enough for a portrait page, which keeps the month on one sheet.
 */
function MonthlyPrint({ city, rows }: { city: City; rows: { i: number; date: Date; times: Record<PrayerKey, Date>; friday: boolean }[] }) {
  const time = (d: Date) => {
    const tp = timeParts(d, false, "ar");
    return `${tp.time} ${tp.period}`;
  };
  const first = rows[0].date;
  const last = rows[rows.length - 1].date;
  return (
    <PrintDocument
      title={`إمساكية ${city.name} — 30 يوماً`}
      source={`${arDates.hijriShort.format(first)} – ${arDates.hijri.format(last)}`}
      meta={[
        { label: "المدينة", value: city.country ? `${city.name}، ${city.country}` : city.name },
        { label: "الفترة بالميلادي", value: `${arDates.gregorianShort.format(first)} – ${arDates.gregorian.format(last)}` },
        { label: "عدد الأيام", value: rows.length },
        { label: "طريقة الحساب", value: city.method === "ummalqura" ? "تقويم أم القرى" : "رابطة العالم الإسلامي" },
      ]}
    >
      <PrintTable
        head={["اليوم", "هجري", "ميلادي", ...PRAYERS.map((p) => prayerName(p.key, "ar"))]}
        rows={rows.map((r) => [
          r.i === 0 ? <b key="d">{arDates.weekday.format(r.date)} (اليوم)</b> : r.friday ? <b key="d">{arDates.weekday.format(r.date)}</b> : arDates.weekday.format(r.date),
          arDates.hijriShort.format(r.date),
          arDates.gregorianShort.format(r.date),
          ...PRAYERS.map((p) => time(r.times[p.key])),
        ])}
      />
      <PrintNote>المواقيت محسوبة فلكياً، وقد تختلف دقيقة أو دقيقتين عن التقويم المحلي. يُرجى الاحتياط في الصيام والإمساك.</PrintNote>
    </PrintDocument>
  );
}
