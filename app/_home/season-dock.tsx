"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SeasonDate = { hijri: string; gregorian: string; title: string; who: string };

/** How far each neighbour sits from the centre, how small it is and how faint, by its distance (0 = the centre) */
const WIDE = { x: [0, 250, 450, 610], scale: [1, 0.8, 0.64, 0.5], opacity: [1, 0.9, 0.55, 0] };
const NARROW = { x: [0, 165, 280, 360], scale: [1, 0.76, 0.58, 0.45], opacity: [1, 0.85, 0.4, 0] };
const STEP_MS = 3600;

/**
 * The season's dates as the Mac's dock magnifies: the date in the middle is the largest, its neighbours smaller
 * on either side, and smaller again further out. It moves on by itself, round and round, and stops while it is
 * pointed at or focused; the arrows, the dots, a click on a date or a swipe bring any date to the middle.
 */
export function SeasonDock({ dates }: { dates: SeasonDate[] }) {
  const n = dates.length;
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false);
  const [paused, setPaused] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { amount: 0.4 });
  const still = useReducedMotion();
  const go = useCallback((i: number) => setActive(((i % n) + n) % n), [n]);

  useEffect(() => {
    const fit = () => setNarrow(window.innerWidth < 768);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // It moves on by itself while it is seen, not held, and the visitor did not ask the system for less motion
  const playing = !still && !paused && !hold && inView && n > 1;
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setActive((a) => (a + 1) % n), STEP_MS);
    return () => clearInterval(t);
  }, [playing, n]);

  // A swipe on a phone: right to left brings the next date
  const touch = useRef<number | null>(null);

  if (!n) return null;
  const k = narrow ? NARROW : WIDE;
  /** A date's place from the middle, round the ring: −2 … 0 … +2 */
  const offset = (i: number) => {
    let d = (i - active) % n;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };

  return (
    <div
      ref={box}
      role="region"
      aria-roledescription="carousel"
      aria-label="مواعيد الموسم"
      tabIndex={0}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
      onKeyDown={(e) => {
        // In Arabic the next date is to the left
        if (e.key === "ArrowLeft") go(active + 1);
        if (e.key === "ArrowRight") go(active - 1);
      }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}
      className="relative outline-none"
    >
      <div className="relative h-[19rem] md:h-[21rem]">
        {dates.map((d, i) => {
          const off = offset(i);
          const far = Math.min(Math.abs(off), 3);
          const centre = off === 0;
          return (
            <motion.button
              key={`${d.title}-${i}`}
              type="button"
              onClick={() => go(i)}
              tabIndex={far <= 1 ? 0 : -1}
              aria-hidden={far > 2}
              aria-current={centre ? "step" : undefined}
              aria-label={`${i + 1}. ${d.title} — ${d.hijri}`}
              initial={false}
              animate={{ x: `calc(-50% + ${-Math.sign(off) * k.x[far]}px)`, scale: k.scale[far], opacity: k.opacity[far] }}
              transition={still ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
              style={{ zIndex: 10 - far, pointerEvents: far > 2 ? "none" : undefined }}
              className={cn(
                "absolute left-1/2 top-1/2 w-64 -translate-y-1/2 rounded-3xl border p-6 text-right shadow-sm transition-colors md:w-72",
                centre ? "border-gold bg-white shadow-[0_30px_60px_-30px_rgba(0,89,79,.55)] ring-4 ring-gold/15" : "border-gold/30 bg-sand hover:border-gold/60",
              )}
            >
              <span className={cn("font-display text-5xl font-bold", centre ? "text-gold-dark" : "text-gold/60")}>{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-2 font-bold text-maroon">{d.hijri}</p>
              <p className="text-xs text-hint">{d.gregorian}</p>
              <p className="mt-3 line-clamp-3 font-display text-lg font-bold leading-7 text-green-dark">{d.title}</p>
              {d.who && <span className="mt-3 inline-block rounded-full bg-green-dark/8 px-2.5 py-1 text-xs font-bold text-green-dark">{d.who}</span>}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button type="button" onClick={() => go(active - 1)} aria-label="الموعد السابق" className="grid size-10 place-items-center rounded-full border border-gold/40 text-green-dark transition hover:border-gold-dark hover:bg-sand">
          <ChevronRight className="size-5" />
        </button>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="اختر موعداً">
          {dates.map((d, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={d.title}
              onClick={() => go(i)}
              className={cn("h-2 rounded-full transition-all duration-500", i === active ? "w-7 bg-gold-dark" : "w-2 bg-gold/40 hover:bg-gold/70")}
            />
          ))}
        </div>
        <button type="button" onClick={() => go(active + 1)} aria-label="الموعد التالي" className="grid size-10 place-items-center rounded-full border border-gold/40 text-green-dark transition hover:border-gold-dark hover:bg-sand">
          <ChevronLeft className="size-5" />
        </button>
        {!still && (
          <button type="button" onClick={() => setPaused((x) => !x)} aria-label={paused ? "تشغيل الحركة" : "إيقاف الحركة"} title={paused ? "تشغيل الحركة" : "إيقاف الحركة"} className="grid size-10 place-items-center rounded-full text-hint transition hover:bg-sand hover:text-green-dark">
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
