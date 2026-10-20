import { cn } from "@/lib/utils";
import { EAGLE, MARK, STARS } from "./emblem-paths";
import { BrandLockup } from "./lockup";

/** The seal's radius around the mark, and its inner gold ring (units of the logo's pixels) */
const SEAL = 84;
const RING = 78;

/**
 * The official emblem: the administration's gold eagle under three stars (./emblem-paths), in a green seal with a
 * thin gold ring. `gradientId` gives a second emblem its own gold, for when the first one on the page is hidden
 * (a printed sheet's header). `animated` (the loading screens) makes the three stars twinkle in turn
 */
export function Emblem({ className, animated = false, gradientId = "emblem-gold" }: { className?: string; animated?: boolean; gradientId?: string }) {
  const { cx, cy } = MARK;
  const gold = `url(#${gradientId})`;
  return (
    // width/height keep it logo-sized in the instant before the stylesheet arrives (an SVG without them
    // fills the whole width); the size classes override them as soon as CSS is applied
    <svg viewBox={`${cx - SEAL} ${cy - SEAL} ${SEAL * 2} ${SEAL * 2}`} width="44" height="44" className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#DCCDA2" />
          <stop offset=".55" stopColor="#C1B07E" />
          <stop offset="1" stopColor="#A39364" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={SEAL - 0.5} fill="#00594F" />
      <circle cx={cx} cy={cy} r={RING} fill="none" stroke={gold} strokeWidth="1.8" />
      <g fill={gold}>
        <path d={EAGLE} />
        {STARS.map((d, i) => (
          <path key={i} d={d}>
            {animated && <animate attributeName="opacity" values="1;.25;1" dur="1.8s" begin={`${i * 0.3}s`} repeatCount="indefinite" />}
          </path>
        ))}
      </g>
    </svg>
  );
}

/** The platform's name and authority beside the emblem; the header passes them in the page's language */
/** The lockup's two lines: the administration's name large, and «السورية» small beneath it, as wide as the name (./lockup) */
export const BRAND = { name: "إدارة الحج والعمرة", country: "السورية" } as const;

export function Logo({
  className,
  light = false,
  name = BRAND.name,
  authority = BRAND.country,
}: {
  className?: string;
  light?: boolean;
  name?: string;
  authority?: string;
}) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <Emblem className="size-10 sm:size-11" />
      <BrandLockup
        name={name}
        country={authority}
        nameClass={cn("font-display text-base font-bold sm:text-lg", light ? "text-white" : "text-green-dark")}
        countryClass={cn("hidden text-xs font-semibold min-[360px]:block", light ? "text-gold" : "text-gold-dark")}
      />
    </span>
  );
}
