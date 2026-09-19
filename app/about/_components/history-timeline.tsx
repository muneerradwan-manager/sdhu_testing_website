"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import { HISTORY } from "@/lib/data/about";
import { cn } from "@/lib/utils";

export function HistoryTimeline() {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });

  return (
    <ol ref={ref} className="relative mx-auto max-w-4xl overflow-x-clip" /* cards slide in from ±40px; keep them from widening the page */>
      {/* Rail */}
      <span className="absolute inset-y-0 right-5 w-0.5 bg-gold/30 md:right-1/2 md:translate-x-1/2" aria-hidden />
      <motion.span
        style={{ scaleY }}
        className="absolute inset-y-0 right-5 w-0.5 origin-top bg-gradient-to-b from-gold via-gold-dark to-green-dark md:right-1/2 md:translate-x-1/2"
        aria-hidden
      />

      {HISTORY.map((h, i) => {
        const last = i === HISTORY.length - 1;
        const side = i % 2 === 0;
        return (
          <li key={h.year} className="relative grid pb-10 pr-14 last:pb-0 md:grid-cols-2 md:pr-0">
            <motion.span
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, margin: "-35% 0px" }}
              transition={{ type: "spring", stiffness: 300, damping: 16 }}
              className={cn(
                "absolute right-5 top-1 z-10 grid translate-x-1/2 place-items-center rounded-full md:right-1/2",
                last ? "size-9 bg-maroon text-gold ring-8 ring-maroon/15" : "size-5 bg-green-dark ring-4 ring-gold/40",
              )}
              aria-hidden
            >
              {last && <span className="size-2.5 rotate-45 bg-gold" />}
            </motion.span>

            <motion.div
              initial={{ opacity: 0, x: side ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className={cn(side ? "md:col-start-1 md:pl-14" : "md:col-start-2 md:pr-14")}
            >
              <div
                className={cn(
                  "group rounded-3xl border p-5 transition-all duration-500 hover:-translate-y-1",
                  last
                    ? "border-maroon/30 bg-gradient-to-br from-maroon to-maroon-dark text-white shadow-[0_24px_60px_-30px_rgba(103,33,70,.9)]"
                    : "border-gold/35 bg-white hover:shadow-[0_20px_50px_-35px_rgba(0,89,79,.6)]",
                )}
              >
                <div className="flex items-baseline gap-3">
                  <span className={cn("font-display text-4xl font-bold tabular-nums", last ? "text-gold" : "text-gold-dark")}>{h.year}</span>
                  <span className={cn("text-sm", last ? "text-white/60" : "text-hint")}>{h.hijri}</span>
                </div>
                <p className={cn("mt-2 font-display text-xl font-bold", last ? "text-white" : "text-green-dark")}>{h.title}</p>
                <p className={cn("mt-1 text-sm leading-7", last ? "text-white/80" : "text-ink-soft")}>{h.text}</p>
              </div>
            </motion.div>
          </li>
        );
      })}
    </ol>
  );
}
