"use client";

import { CmsImage } from "@/components/cms/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, GraduationCap, MapPin, Moon } from "lucide-react";
import { useState } from "react";
import { MapEmbed, SpeakButton } from "@/components/ui/widgets";
import type { GuideDay } from "@/lib/data/guide";
import { cn } from "@/lib/utils";

export function DayStepper({ days }: { days: GuideDay[] }) {
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const day = days[active];

  const go = (i: number) => {
    const next = Math.max(0, Math.min(days.length - 1, i));
    setDir(next > active ? 1 : -1);
    setActive(next);
  };

  return (
    <div>
      {/* stepper */}
      <div className="scrollbar-none -mx-4 overflow-x-auto px-4 pb-2">
        <div
          role="tablist"
          aria-label="أيام الحج"
          className="relative mx-auto flex min-w-[640px] max-w-4xl items-start justify-between"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") go(active + 1);
            if (e.key === "ArrowRight") go(active - 1);
          }}
        >
          <span className="absolute left-[10%] right-[10%] top-8 h-1 rounded-full bg-gold-light" aria-hidden />
          <motion.span
            className="absolute right-[10%] top-8 h-1 rounded-full bg-gradient-to-l from-green-dark to-green-light"
            animate={{ width: `${(active / (days.length - 1)) * 80}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden
          />
          {days.map((d, i) => {
            const isActive = i === active;
            const passed = i < active;
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => go(i)}
                className="group relative z-10 flex w-1/5 flex-col items-center gap-2 text-center"
              >
                <span className="relative grid size-16 place-items-center">
                  {isActive && (
                    <motion.span layoutId="day-ring" className="absolute inset-0 rounded-full bg-gold/35" transition={{ type: "spring", stiffness: 300, damping: 28 }} />
                  )}
                  <span
                    className={cn(
                      "relative grid size-12 place-items-center rounded-full border-2 font-display text-lg font-bold transition-all duration-300",
                      isActive
                        ? "scale-110 border-green-dark bg-green-dark text-gold shadow-lg"
                        : passed
                          ? "border-green-light bg-white text-green"
                          : "border-gold/60 bg-white text-ink-soft group-hover:border-gold-dark",
                    )}
                  >
                    {passed ? <CheckCircle2 className="size-5" /> : d.day.startsWith("ليلة") ? <Moon className="size-5" /> : <span className="text-[15px] leading-none">{d.day}</span>}
                  </span>
                </span>
                <span className={cn("text-sm font-bold transition-colors", isActive ? "text-green-dark" : "text-ink-soft")}>{d.name}</span>
                <span className="text-[11px] text-hint">{d.hijri.split(" — ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* content */}
      <div className="relative mt-8">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={day.id}
            custom={dir}
            initial={{ opacity: 0, x: dir * -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * 40 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            role="tabpanel"
            className="grid gap-5 lg:grid-cols-[1.05fr_1fr]"
          >
            <div className="relative isolate flex min-h-80 flex-col justify-end overflow-hidden rounded-3xl p-6 text-white shadow-[0_30px_70px_-40px_rgba(2,21,38,.7)] sm:p-8">
              <motion.div initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 6, ease: "easeOut" }} className="absolute inset-0 -z-20">
                <CmsImage src={day.image} alt={day.name} fill sizes="(min-width: 1024px) 50vw, 100vw" quality={70} className="object-cover" />
              </motion.div>
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-green-dark via-green-dark/70 to-transparent" />
              <span className="absolute left-5 top-5 rounded-2xl bg-white/15 px-4 py-2 text-center backdrop-blur-md">
                <span className="block font-display text-2xl font-bold leading-none text-gold">{day.day}</span>
                <span className="mt-1 block text-[10px] font-semibold">ذو الحجة</span>
              </span>
              <p className="text-sm font-semibold text-gold">{day.hijri}</p>
              <h3 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{day.name}</h3>
              <p className="mt-3 max-w-lg leading-8 text-white/85">{day.intro}</p>
              <p className="mt-4 flex items-center gap-1.5 text-sm text-white/75">
                <MapPin className="size-4 text-gold" /> {day.place.label}
              </p>
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-3xl border border-gold/35 bg-white p-5 sm:p-6">
                <h4 className="font-display text-lg font-bold text-green-dark">ماذا أفعل؟</h4>
                <ol className="mt-4 space-y-2.5">
                  {day.tasks.map((t, i) => (
                    <motion.li key={t} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.07 }} className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-green-dark text-xs font-bold text-gold">{i + 1}</span>
                      <span className="leading-7 text-ink">{t}</span>
                    </motion.li>
                  ))}
                </ol>
              </div>

              <div className="rounded-3xl border border-gold/35 bg-white p-5 sm:p-6">
                <h4 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
                  <Clock className="size-5 text-gold-dark" /> المواعيد التقريبية
                </h4>
                <ol className="relative mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {day.times.map((t, i) => (
                    <motion.li key={t.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.06 }} className="rounded-2xl bg-sand p-3 text-center">
                      <span className="block font-display text-xl font-bold tabular-nums text-maroon">{t.time}</span>
                      <span className="mt-1 block text-xs leading-5 text-ink-soft">{t.label}</span>
                    </motion.li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-hint">تتغير المواعيد حسب جدول التفويج الذي يعلنه قائد مجموعتك في التطبيق.</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-maroon p-6 text-white sm:p-8">
              <div className="bg-pattern absolute inset-0 opacity-15" />
              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-gold">{day.dua.title}</p>
                  <SpeakButton text={day.dua.text} />
                </div>
                <p className="mt-4 font-quran text-2xl leading-[2.3] sm:text-3xl sm:leading-[2.3]">{day.dua.text}</p>
                <Link
                  href={`/academy/${day.lesson.track}/${day.lesson.lesson}`}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/20 transition hover:bg-white/20"
                >
                  <GraduationCap className="size-4 text-gold" /> درس الأكاديمية: {day.lesson.title} <ChevronLeft className="size-4" />
                </Link>
              </div>
            </div>

            <MapEmbed lat={day.place.lat} lng={day.place.lng} label={day.place.label} zoom={day.place.zoom} className="min-h-72" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(active - 1)}
          disabled={active === 0}
          className="inline-flex items-center gap-2 rounded-2xl border-2 border-green-dark/15 px-4 py-2.5 font-semibold text-green-dark transition hover:border-green-dark disabled:opacity-40"
        >
          <ChevronRight className="size-5" /> اليوم السابق
        </button>
        <span className="text-sm tabular-nums text-hint">
          {active + 1} / {days.length}
        </span>
        <button
          type="button"
          onClick={() => go(active + 1)}
          disabled={active === days.length - 1}
          className="inline-flex items-center gap-2 rounded-2xl bg-green-dark px-4 py-2.5 font-semibold text-white transition hover:bg-green disabled:opacity-40"
        >
          اليوم التالي <ChevronLeft className="size-5" />
        </button>
      </div>
    </div>
  );
}
