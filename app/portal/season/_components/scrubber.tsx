"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DAYS, LAST_DAY, SEGMENTS, WHERE, type SeasonDay } from "../_data";

const MARKS = [
  { i: 0, label: "السفر" },
  { i: 13, label: "التروية" },
  { i: 14, label: "عرفة" },
  { i: 15, label: "العيد" },
  { i: 21, label: "المدينة" },
  { i: 28, label: "العودة" },
];

/** Presenter's time machine: drag through the season and the whole home screen follows */
export function DayScrubber({ day, momentIdx, onDay, onMoment }: { day: SeasonDay; momentIdx: number; onDay: (i: number) => void; onMoment: (m: number) => void }) {
  const [playing, setPlaying] = useState(false);
  const pct = (day.i / LAST_DAY) * 100;

  const dayIdx = day.i;
  const momentCount = day.moments.length;
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (momentCount > momentIdx + 1) onMoment(momentIdx + 1);
      else if (dayIdx < LAST_DAY) onDay(dayIdx + 1);
      else setPlaying(false);
    }, 2600);
    return () => clearTimeout(t);
  }, [playing, dayIdx, momentCount, momentIdx, onDay, onMoment]);

  return (
    <div className="rounded-[2rem] border border-gold/30 bg-white p-5 shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)] md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => onDay(day.i - 1)} disabled={day.i === 0} className="grid size-14 place-items-center rounded-2xl bg-sand text-green-dark transition hover:bg-gold-light disabled:opacity-30" aria-label="اليوم السابق">
            <ChevronRight className="size-7" />
          </button>
          <div className="min-w-44 text-center">
            <AnimatePresence mode="popLayout">
              <motion.p key={day.i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="font-display text-3xl font-bold text-green-dark md:text-4xl">
                {day.hijri}
              </motion.p>
            </AnimatePresence>
            <p className="text-ink-soft">
              {day.weekday} {day.gregorian} — <b className="text-gold-dark">{day.title}</b>
            </p>
          </div>
          <button type="button" onClick={() => onDay(day.i + 1)} disabled={day.i === LAST_DAY} className="grid size-14 place-items-center rounded-2xl bg-sand text-green-dark transition hover:bg-gold-light disabled:opacity-30" aria-label="اليوم التالي">
            <ChevronLeft className="size-7" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gold/30 px-3 py-1 text-xs font-bold text-maroon">محاكاة الموسم — للعرض</span>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className={cn("flex items-center gap-2 rounded-full px-4 py-2 font-bold transition", playing ? "bg-maroon text-white" : "bg-green-dark text-white hover:bg-green")}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            {playing ? "إيقاف" : "تشغيل الموسم"}
          </button>
        </div>
      </div>

      {/* Track */}
      <div className="relative mx-4 mt-8" dir="rtl">
        <div className="relative h-4 overflow-hidden rounded-full bg-gold-light">
          {SEGMENTS.map((s) => (
            <span key={s.from} className={cn("absolute inset-y-0 opacity-35", s.cls)} style={{ right: `${(s.from / (LAST_DAY + 1)) * 100}%`, width: `${((s.to - s.from + 1) / (LAST_DAY + 1)) * 100}%` }} />
          ))}
          <motion.span className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-green-light to-green-dark" animate={{ width: `${pct}%` }} transition={{ type: "spring", damping: 26, stiffness: 220 }} />
        </div>
        <motion.span
          className="pointer-events-none absolute top-1/2 grid size-10 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full border-4 border-white bg-gold text-sm font-bold text-ink shadow-xl"
          initial={false}
          animate={{ right: `${pct}%` }}
          transition={{ type: "spring", damping: 24, stiffness: 240 }}
        >
          {day.i + 1}
        </motion.span>
        <input
          type="range"
          min={0}
          max={LAST_DAY}
          step={1}
          value={day.i}
          onChange={(e) => onDay(Number(e.target.value))}
          aria-label="اختر اليوم في الموسم"
          aria-valuetext={day.hijri}
          className="absolute inset-x-0 -top-3 h-10 w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="relative mx-4 mt-3 h-10" dir="rtl">
        {MARKS.map((m) => (
          <button
            key={m.i}
            type="button"
            onClick={() => onDay(m.i)}
            className={cn("absolute whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold transition md:text-sm", day.i === m.i ? "bg-green-dark text-white" : "text-ink-soft hover:text-green-dark")}
            style={{ right: `${(m.i / LAST_DAY) * 100}%`, transform: `translateX(${m.i === 0 ? 20 : m.i === LAST_DAY ? 80 : 50}%)` }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Moments within the day */}
      {day.moments.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-hint">خلال اليوم:</span>
          {day.moments.map((m, i) => (
            <button
              key={m.time}
              type="button"
              onClick={() => onMoment(i)}
              className={cn("relative rounded-2xl px-4 py-2.5 text-right font-bold transition", i === momentIdx ? "text-white" : "bg-sand text-ink-soft hover:bg-gold-light")}
            >
              {i === momentIdx && <motion.span layoutId="moment-pill" className="absolute inset-0 -z-0 rounded-2xl bg-green-dark" />}
              <span className="relative">
                <span className="font-mono">{m.time}</span> — {WHERE[m.where].short}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="sr-only">{DAYS.length} يوماً في الموسم</p>
    </div>
  );
}
