"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { Crown } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Honouree } from "../_lib/roll";
import { Laurel, Medallion, Stars, useWords } from "./shared";

/** The steps under the three, by place: the first stands highest, in the middle */
const STEP = {
  1: { height: "h-36 sm:h-56", block: "from-gold via-gold to-gold-dark", order: "order-2", delay: 0.55 },
  2: { height: "h-24 sm:h-40", block: "from-[#eef0f2] via-[#cfd4d9] to-[#9aa2ab]", order: "order-1", delay: 0.3 },
  3: { height: "h-16 sm:h-32", block: "from-[#f0cfae] via-[#cf9363] to-[#9c6339]", order: "order-3", delay: 0.1 },
} as const;

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The season's three best group heads on a podium: the steps rise third, second, then first, each person
 * landing on his step after it, and a little gold falls over the first. The list stays in reading order
 * (first, second, third) for a screen reader; only the picture puts the first in the middle.
 */
export function Podium({ top }: { top: Honouree[] }) {
  const t = useT();
  const ref = useRef<HTMLOListElement>(null);
  const first = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const still = useReducedMotion();

  // A short shower of gold over the winner when the podium comes into view (canvas-confetti skips it under reduced motion)
  useEffect(() => {
    if (!inView || still) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const confetti = (await import("canvas-confetti")).default;
      if (cancelled) return;
      const rect = first.current?.getBoundingClientRect();
      const origin = rect ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: Math.max(0.05, rect.top / window.innerHeight) } : { x: 0.5, y: 0.3 };
      const base = { colors: ["#D9C89E", "#AD9E6E", "#FFF6DC", "#E4DDD3"], disableForReducedMotion: true, ticks: 200, scalar: 0.8, gravity: 0.85 };
      confetti({ ...base, particleCount: 60, spread: 70, startVelocity: 28, origin });
      setTimeout(() => !cancelled && confetti({ ...base, particleCount: 30, angle: 60, spread: 45, startVelocity: 34, origin: { x: origin.x - 0.15, y: origin.y + 0.1 } }), 200);
      setTimeout(() => !cancelled && confetti({ ...base, particleCount: 30, angle: 120, spread: 45, startVelocity: 34, origin: { x: origin.x + 0.15, y: origin.y + 0.1 } }), 340);
    }, 1100);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inView, still]);

  return (
    <div className="mx-auto max-w-4xl">
      <ol ref={ref} aria-label={t("المراكز الثلاثة الأولى", "The first three places")} className="grid grid-cols-3 items-end gap-2 px-2 sm:gap-5 sm:px-6">
        {top.slice(0, 3).map((h) => (
          <Step key={h.id} h={h} inView={inView} anchor={h.rank === 1 ? first : undefined} />
        ))}
      </ol>
      {/* The stage the steps stand on */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0, opacity: 0 }}
        animate={inView ? { scaleX: 1, opacity: 1 } : undefined}
        transition={{ duration: 0.9, ease: EASE }}
        className="h-3 rounded-full bg-gradient-to-l from-gold-dark/40 via-gold to-gold-dark/40 shadow-[0_18px_50px_-6px_rgba(217,200,158,.55)] sm:h-4"
      />
    </div>
  );
}

function Step({ h, inView, anchor }: { h: Honouree; inView: boolean; anchor?: RefObject<HTMLDivElement | null> }) {
  const t = useT();
  const w = useWords();
  const place = h.rank as 1 | 2 | 3;
  const s = STEP[place];
  const champion = place === 1;
  const still = useReducedMotion();

  return (
    <li className={cn("flex min-w-0 flex-col items-center", s.order)}>
      <span className="sr-only">{t(`المركز ${place}:`, `Place ${place}:`)}</span>
      <motion.div
        ref={anchor}
        initial={{ opacity: 0, y: -28, scale: 0.9 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : undefined}
        transition={{ duration: 0.8, delay: s.delay + 0.35, ease: EASE }}
        className="relative flex w-full min-w-0 flex-col items-center px-0.5 text-center"
      >
        {champion && (
          <>
            {/* The light on the winner */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute -top-10 left-1/2 -z-10 size-56 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(217,200,158,.45),transparent_65%)] sm:size-72"
              animate={still ? undefined : { opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              aria-hidden
              className="mb-1 text-gold"
              animate={still ? undefined : { y: [0, -5, 0], rotate: [-4, 4, -4] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Crown className="size-7 fill-gold/40 sm:size-9" />
            </motion.span>
          </>
        )}
        <span className="relative">
          {champion && <Laurel className="pointer-events-none absolute -left-5 -top-4 size-[calc(100%+2.5rem)] text-gold sm:-left-7 sm:-top-6 sm:size-[calc(100%+3.5rem)]" />}
          <Medallion name={h.name} female={h.female} place={place} size={champion ? "xl" : "lg"} />
        </span>
        <p className={cn("mt-4 line-clamp-2 font-display font-bold leading-snug text-white", champion ? "text-base sm:text-2xl" : "text-sm sm:text-xl")}>{h.name}</p>
        {h.where && <p className="mt-0.5 line-clamp-1 max-w-full text-xs text-gold sm:text-sm">{h.where}</p>}
        <p className="line-clamp-1 max-w-full text-[11px] text-white/60 sm:text-xs">{w.office(h.office)}</p>
        <span className="mt-2 hidden sm:block">
          <Stars rating={h.rating} light />
        </span>
        <span className="mt-1.5 text-xs font-bold text-gold tabular-nums sm:hidden" aria-label={t(`التقييم ${h.rating.toFixed(1)} من 5`, `Rated ${h.rating.toFixed(1)} out of 5`)}>
          ★ {h.rating.toFixed(1)}
        </span>
      </motion.div>

      <motion.div
        initial={{ scaleY: 0, opacity: 0 }}
        animate={inView ? { scaleY: 1, opacity: 1 } : undefined}
        transition={{ duration: 0.9, delay: s.delay, ease: EASE }}
        style={{ transformOrigin: "bottom" }}
        className={cn("on-light relative mt-3 flex w-full flex-col items-center justify-start overflow-hidden rounded-t-2xl bg-gradient-to-b pt-2 shadow-[0_-12px_40px_-18px_rgba(217,200,158,.8)] sm:pt-4", s.block, s.height)}
      >
        <span aria-hidden className="bg-pattern absolute inset-0 opacity-20" />
        <span aria-hidden className="relative font-display text-4xl font-black leading-none text-ink/80 sm:text-6xl">{place}</span>
        <span className="relative mt-1 hidden text-xs font-bold text-ink/70 tabular-nums sm:block">
          {t(`${h.score.toFixed(1)} من 100`, `${h.score.toFixed(1)} / 100`)}
        </span>
        {h.tier !== undefined && <span className="relative mt-1 hidden rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-bold text-ink/80 sm:block">{w.tier(h.tier)}</span>}
      </motion.div>
    </li>
  );
}
