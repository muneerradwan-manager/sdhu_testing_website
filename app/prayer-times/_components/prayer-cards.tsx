"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { PRAYERS } from "@/lib/prayer";
import { cn } from "@/lib/utils";
import { PrayerIcon } from "./prayer-icon";
import { timeParts, type schedule } from "./time";

const TINTS = {
  fajr: "from-[#1d3557]/10 to-transparent",
  sunrise: "from-gold/35 to-transparent",
  dhuhr: "from-gold/25 to-transparent",
  asr: "from-gold-dark/20 to-transparent",
  maghrib: "from-maroon/15 to-transparent",
  isha: "from-ink/15 to-transparent",
} as const;

export function PrayerCards({ nowMs, sched }: { nowMs: number; sched: ReturnType<typeof schedule> }) {
  const { today, next, prev } = sched;
  // Fajr's time ends at sunrise, so nothing is "current" between sunrise and Dhuhr
  const fajrOver = prev.key === "fajr" && nowMs >= today.sunrise.getTime();

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-6">
      {PRAYERS.map((p, i) => {
        const time = today[p.key];
        const isNext = next.day === 0 && next.key === p.key;
        const isCurrent = prev.day === 0 && prev.key === p.key && !fajrOver;
        const passed = time.getTime() <= nowMs && !isCurrent;
        const t = timeParts(time);

        return (
          <motion.li
            key={p.key}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.05 * i, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4 }}
            className={cn(
              "group relative isolate overflow-hidden rounded-3xl border p-4 transition-shadow md:p-5",
              isCurrent
                ? "border-gold bg-green-dark text-white shadow-[0_20px_50px_-20px_rgba(0,89,79,.9)]"
                : isNext
                  ? "border-green-light/50 bg-white shadow-[0_16px_40px_-24px_rgba(0,89,79,.6)]"
                  : "border-gold/30 bg-white hover:shadow-[0_16px_40px_-28px_rgba(2,21,38,.4)]",
            )}
            aria-current={isCurrent ? "time" : undefined}
          >
            {!isCurrent && <div className={cn("absolute inset-0 -z-10 bg-gradient-to-b opacity-70", TINTS[p.key])} />}
            {isCurrent && (
              <>
                <div className="bg-pattern absolute inset-0 -z-10 opacity-20" />
                <motion.div
                  layoutId="current-prayer-glow"
                  className="absolute -top-10 left-1/2 -z-10 size-32 -translate-x-1/2 rounded-full bg-gold/40 blur-2xl"
                />
              </>
            )}

            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-2xl transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110",
                  isCurrent ? "bg-gold text-green-dark" : "bg-green-dark/[.06] text-green-dark",
                )}
              >
                <PrayerIcon prayer={p.key} className="size-5" />
              </span>
              {isCurrent && (
                <span className="relative flex items-center gap-1.5 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold text-gold">
                  <span className="relative flex size-2">
                    <span className="absolute inset-0 animate-ping rounded-full bg-gold" />
                    <span className="relative size-2 rounded-full bg-gold" />
                  </span>
                  وقتها الآن
                </span>
              )}
              {isNext && <span className="rounded-full bg-green-light/15 px-2 py-0.5 text-[11px] font-bold text-green">القادمة</span>}
              {passed && !isNext && (
                <span className="grid size-5 place-items-center rounded-full bg-green-light/15 text-green" title="مضى وقتها">
                  <Check className="size-3" />
                </span>
              )}
            </div>

            <p className={cn("mt-4 font-display text-lg font-bold", isCurrent ? "text-gold" : "text-green-dark")}>{p.name}</p>
            <p className={cn("mt-1 flex items-baseline gap-1.5", passed && "opacity-60")}>
              <span className={cn("text-3xl font-bold tabular-nums tracking-tight", isCurrent ? "text-white" : "text-ink")}>{t.time}</span>
              <span className={cn("text-sm font-semibold", isCurrent ? "text-white/70" : "text-hint")}>{t.period}</span>
            </p>
            {isNext && (
              <motion.span
                className="absolute inset-x-4 bottom-0 h-1 origin-right rounded-full bg-gradient-to-l from-green-light to-gold"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: sched.progress }}
                transition={{ duration: 1 }}
              />
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}
