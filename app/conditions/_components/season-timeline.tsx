"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { Check, UserRound } from "lucide-react";
import { useRef } from "react";
import { SEASON } from "@/lib/season";
import { cn } from "@/lib/utils";

/** Index of the phase the demo scenario is in: results published 2 Sha'ban → confirmation window */
const CURRENT = Math.max(0, SEASON.dates.findIndex((d) => d.hijri.startsWith("2 – 25 شعبان")));

export function SeasonTimeline() {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <ol ref={ref} className="relative mx-auto max-w-4xl">
      {/* rail */}
      <span className="absolute bottom-0 right-[20px] top-0 w-1 rounded-full bg-gold-light md:right-[calc(50%-2px)]" aria-hidden />
      <motion.span
        className="absolute bottom-0 right-[20px] top-0 w-1 origin-top rounded-full bg-gradient-to-b from-green-light via-green to-gold-dark md:right-[calc(50%-2px)]"
        style={{ scaleY }}
        aria-hidden
      />

      {SEASON.dates.map((d, i) => {
        const past = i < CURRENT;
        const current = i === CURRENT;
        const even = i % 2 === 0;
        return (
          <li key={d.title} className="relative pb-8 pr-16 last:pb-0 md:grid md:grid-cols-2 md:gap-14 md:pr-0">
            {/* dot */}
            <motion.span
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className={cn(
                "absolute right-0 top-3 z-10 flex size-11 items-center justify-center rounded-full border-4 border-sand font-display text-sm font-bold md:right-[calc(50%-22px)]",
                past && "bg-green-dark text-white",
                current && "animate-pulse-ring bg-gold text-maroon-dark",
                !past && !current && "bg-white text-ink-soft ring-1 ring-gold/60",
              )}
            >
              {past ? <Check className="size-5" /> : i + 1}
            </motion.span>

            <motion.div
              initial={{ opacity: 0, x: even ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={cn(even ? "md:col-start-1" : "md:col-start-2")}
            >
              <div
                className={cn(
                  "relative rounded-3xl border p-5 transition duration-300 hover:-translate-y-1",
                  current
                    ? "border-gold-dark bg-gradient-to-br from-maroon-dark to-maroon text-white shadow-[0_24px_50px_-24px_rgba(66,0,35,.8)]"
                    : past
                      ? "border-green-light/25 bg-white/70"
                      : "border-gold/40 bg-white shadow-[0_16px_40px_-32px_rgba(0,89,79,.6)]",
                )}
              >
                {current && (
                  <span className="absolute -top-3 left-5 rounded-full bg-gold px-3 py-0.5 text-[11px] font-bold text-maroon-dark shadow">المرحلة الحالية</span>
                )}
                <p className={cn("font-display text-lg font-bold", current ? "text-gold" : past ? "text-green" : "text-green-dark")}>{d.hijri}</p>
                <p className={cn("text-xs", current ? "text-white/70" : "text-ink-soft")}>{d.gregorian}</p>
                <p className={cn("mt-2 font-bold leading-7", current ? "text-white" : past ? "text-ink/70" : "text-ink")}>{d.title}</p>
                <span
                  className={cn(
                    "mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                    current ? "bg-white/15 text-white" : "bg-sand text-ink-soft",
                  )}
                >
                  <UserRound className="size-3" /> {d.who}
                </span>
              </div>
            </motion.div>
          </li>
        );
      })}
    </ol>
  );
}
