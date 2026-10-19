"use client";

import { Star } from "lucide-react";
import { levelEn, officeEn } from "@/app/conditions/_lib/en";
import { tierOf } from "@/lib/grading";
import { useT } from "@/lib/i18n";
import { cn, countOf, type Noun } from "@/lib/utils";
import { ROLES } from "../_lib/roll";

const SEASONS: Noun = { zero: "لا مواسم", one: "موسم واحد", two: "موسمان", few: "مواسم", many: "موسماً" };

/** The roll's Arabic in the page's language: roles, offices, tiers and seasons served. The names stay Arabic */
export function useWords() {
  const t = useT();
  return {
    role: (key: string) => t(ROLES[key]?.ar ?? key, ROLES[key]?.en ?? key),
    office: (s: string) => t(s, officeEn(s)),
    tier: (n: number) => t(tierOf(n).label, `Tier ${n}`),
    service: (n: number) => t(tierOf(n).service, levelEn(tierOf(n).service)),
    seasons: (n: number) => t(countOf(n, SEASONS), n === 1 ? "1 season" : `${n} seasons`),
  };
}

/** A woman in a headscarf, in place of a female guide's initial (as app/clusters/[slug]/cluster-team shows her) */
function FemaleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M20 4.5c-6.6 0-11.5 5.1-11.5 11.6 0 3.5 1.4 6.6 3.6 8.7C7.4 26.7 4 30.9 3.4 36c-.1.8.5 1.5 1.3 1.5h30.6c.8 0 1.4-.7 1.3-1.5-.6-5.1-4-9.3-8.7-11.2 2.2-2.1 3.6-5.2 3.6-8.7C31.5 9.6 26.6 4.5 20 4.5Z"
      />
      <ellipse cx="20" cy="16.8" rx="5.6" ry="6.6" fill="#fff" opacity=".92" />
    </svg>
  );
}

const MEDAL = {
  1: "from-[#fff6dc] via-gold to-gold-dark text-ink ring-gold",
  2: "from-white via-[#e3e6ea] to-[#a9b0b8] text-ink ring-[#c9ced4]",
  3: "from-[#f6dcc4] via-[#d39b6a] to-[#9c6339] text-ink ring-[#d39b6a]",
} as const;

/**
 * A person's emblem: the first letter of the name (no photographs on the roll), or the headscarf for a woman,
 * in a medal of the place won — gold, silver, bronze — or plain green beyond the three.
 */
export function Medallion({ name, female, place, size = "md", className }: { name: string; female?: boolean; place?: number; size?: "xs" | "sm" | "md" | "lg" | "xl"; className?: string }) {
  const box = { xs: "size-8 text-sm", sm: "size-10 text-lg", md: "size-12 text-xl", lg: "size-16 text-3xl sm:size-20 sm:text-4xl", xl: "size-20 text-4xl sm:size-28 sm:text-5xl" }[size];
  const medal = place === 1 || place === 2 || place === 3 ? MEDAL[place] : null;
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full font-display font-bold ring-2 ring-offset-2 ring-offset-transparent",
        medal ? cn("on-light bg-gradient-to-br shadow-[0_10px_30px_-12px_rgba(173,158,110,.9)]", medal) : "bg-green-dark text-gold ring-gold/40",
        box,
        className,
      )}
      aria-hidden
    >
      {female ? <FemaleIcon className="size-[78%] translate-y-[10%] opacity-80" /> : name.replace(/^الشيخ\s+/, "")[0]}
    </span>
  );
}

/** Five stars filled to the rating, and the rating itself */
export function Stars({ rating, light, className }: { rating: number; light?: boolean; className?: string }) {
  const t = useT();
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} aria-label={t(`التقييم ${rating.toFixed(1)} من 5`, `Rated ${rating.toFixed(1)} out of 5`)} role="img">
      <span className="relative inline-flex" aria-hidden>
        <span className={cn("flex", light ? "text-white/25" : "text-gold-light")}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className="size-3.5 fill-current" />
          ))}
        </span>
        <span className="absolute inset-y-0 start-0 flex overflow-hidden text-gold-dark" style={{ width: `${(rating / 5) * 100}%` }}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={cn("size-3.5 shrink-0 fill-current", light && "text-gold")} />
          ))}
        </span>
      </span>
      <span className={cn("text-sm font-bold tabular-nums", light ? "text-gold" : "text-ink")}>{rating.toFixed(1)}</span>
    </span>
  );
}

/** Two laurel branches meeting under the champion */
export function Laurel({ className }: { className?: string }) {
  const leaves = Array.from({ length: 7 }, (_, i) => i);
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden fill="currentColor">
      {[1, -1].map((side) => (
        <g key={side} transform={side === -1 ? "translate(120 0) scale(-1 1)" : undefined}>
          <path d="M60 112C30 104 12 80 12 46" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {leaves.map((i) => {
            const a = (Math.PI / 2) * (i / 6) + 0.15;
            const x = 60 - 48 * Math.sin(a);
            const y = 112 - 66 * (1 - Math.cos(a)) - 6;
            return <ellipse key={i} cx={x} cy={y} rx="4" ry="9" transform={`rotate(${-30 - i * 12} ${x} ${y})`} opacity={0.55 + i * 0.06} />;
          })}
        </g>
      ))}
    </svg>
  );
}
