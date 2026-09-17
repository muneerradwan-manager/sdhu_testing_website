"use client";

import { AnimatePresence, motion } from "motion/react";
import { BellRing, CalendarDays, MapPin } from "lucide-react";
import type { City } from "@/lib/prayer";
import { cn } from "@/lib/utils";
import { PrayerIcon } from "./prayer-icon";
import { countdown, dateFmt, humanRemaining, timeParts, type schedule } from "./time";

const R = 118;
const C = 2 * Math.PI * R;

function FlipDigit({ char }: { char: string }) {
  if (char === ":") return <span className="-mt-2 px-0.5 text-gold/70 md:px-1">:</span>;
  return (
    <span className="relative inline-flex h-[1.1em] w-[0.62em] justify-center overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={char}
          initial={{ y: "-100%", opacity: 0, filter: "blur(4px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "100%", opacity: 0, filter: "blur(4px)" }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function NextPrayerHero({ city, nowMs, sched }: { city: City; nowMs: number; sched: ReturnType<typeof schedule> }) {
  const { next, prev, progress, remaining } = sched;
  const soon = remaining < 15 * 60_000;
  const nt = timeParts(next.time);
  const pt = timeParts(prev.time);
  const clock = timeParts(new Date(nowMs), true);
  const now = new Date(nowMs);

  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-green-dark via-green-dark to-ink p-6 text-white shadow-[0_30px_80px_-30px_rgba(0,89,79,.8)] ring-1 ring-gold/25 md:p-10">
      <div className="bg-pattern absolute inset-0 -z-10 opacity-20 [mask-image:radial-gradient(circle_at_30%_40%,black,transparent_75%)]" />
      <div className="absolute -left-24 -top-24 -z-10 size-72 rounded-full bg-gold/15 blur-3xl" />
      <div className="absolute -bottom-32 right-10 -z-10 size-80 rounded-full bg-green-light/20 blur-3xl" />

      <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between">
        {/* Text side */}
        <div className="order-2 w-full text-center lg:order-1 lg:text-start">
          <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gold ring-1 ring-white/15">
              <MapPin className="size-3.5" /> {city.name}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/15">
              <CalendarDays className="size-3.5" /> {dateFmt.weekday.format(now)}
            </span>
            <AnimatePresence>
              {soon && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="animate-pulse-ring inline-flex items-center gap-1.5 rounded-full bg-maroon px-3 py-1 text-xs font-bold text-white"
                >
                  <BellRing className="size-3.5" /> اقترب موعد الأذان
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-6 text-sm font-semibold text-white/60">الصلاة القادمة</p>
          <AnimatePresence mode="wait">
            <motion.h2
              key={next.key + next.day}
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-6xl font-bold leading-tight md:text-7xl"
            >
              <span className="text-gold-shine">{next.name}</span>
            </motion.h2>
          </AnimatePresence>
          <p className="mt-2 text-lg text-white/80">
            {next.day === 1 ? "غداً " : ""}الساعة <span className="font-bold tabular-nums text-white">{nt.time}</span> {nt.period === "ص" ? "صباحاً" : "مساءً"}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/[.07] p-4 ring-1 ring-white/10 backdrop-blur">
              <p className="text-xs text-white/55">التاريخ الهجري</p>
              <p className="mt-1 font-display text-lg text-gold">{dateFmt.hijri.format(now)}</p>
            </div>
            <div className="rounded-2xl bg-white/[.07] p-4 ring-1 ring-white/10 backdrop-blur">
              <p className="text-xs text-white/55">التاريخ الميلادي</p>
              <p className="mt-1 font-display text-lg">{dateFmt.gregorian.format(now)}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/60">
            الوقت الآن في {city.name}:{" "}
            <span dir="ltr" className="font-semibold tabular-nums text-white/90">
              {clock.time}
            </span>{" "}
            {clock.period}
          </p>
        </div>

        {/* Ring */}
        <div className="relative order-1 aspect-square w-full max-w-[19rem] shrink-0 lg:order-2 lg:max-w-[22rem]">
          <svg viewBox="0 0 280 280" className="size-full -rotate-90" aria-hidden>
            <defs>
              <linearGradient id="ring-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFF6DC" />
                <stop offset="50%" stopColor="#D9C89E" />
                <stop offset="100%" stopColor="#AD9E6E" />
              </linearGradient>
            </defs>
            <circle cx="140" cy="140" r={R + 14} fill="none" stroke="rgba(217,200,158,.15)" strokeDasharray="1 7" strokeWidth="6" />
            <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="12" />
            <motion.circle
              cx="140"
              cy="140"
              r={R}
              fill="none"
              stroke="url(#ring-gold)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C * (1 - progress) }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ filter: "drop-shadow(0 0 8px rgba(217,200,158,.55))" }}
            />
          </svg>
          {/* Moving dot at the progress tip */}
          <motion.div
            className="absolute inset-0"
            initial={{ rotate: 0 }}
            animate={{ rotate: progress * 360 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden
          >
            <span
              className="absolute left-1/2 size-5 -translate-x-1/2 rounded-full border-4 border-green-dark bg-gold shadow-[0_0_20px_rgba(217,200,158,.9)]"
              style={{ top: `${((140 - R) / 280) * 100}%`, marginTop: "-10px" }}
            />
          </motion.div>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <PrayerIcon prayer={next.key} className="mb-2 size-8 text-gold" />
            <p className="text-xs font-semibold text-white/60">يتبقى على الأذان</p>
            <p
              dir="ltr"
              className="mt-1 flex font-display text-4xl font-bold tabular-nums tracking-tight md:text-5xl"
              role="timer"
              aria-live="off"
              aria-label={`يتبقى ${humanRemaining(remaining)}`}
            >
              {countdown(remaining)
                .split("")
                .map((ch, i) => (
                  <FlipDigit key={i} char={ch} />
                ))}
            </p>
            <p className="mt-2 text-xs text-white/60">{humanRemaining(remaining)}</p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-white/55">
              <span>
                {prev.name} {pt.time}
              </span>
              <span className="h-px w-5 bg-gold/50" />
              <span className={cn("font-bold text-gold")}>{Math.round(progress * 100)}%</span>
              <span className="h-px w-5 bg-gold/50" />
              <span>
                {next.name} {nt.time}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
