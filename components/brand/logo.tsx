import { cn } from "@/lib/utils";

/** Original emblem: an 8-point khatam star framing the Kaaba, ringed in gold */
export function Emblem({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id="emblem-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E4DDD3" />
          <stop offset=".5" stopColor="#D9C89E" />
          <stop offset="1" stopColor="#AD9E6E" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill="#00594F" />
      <g className={animated ? "origin-center animate-spin-slow" : undefined} style={{ transformBox: "fill-box" }}>
        <path
          d="M32 5l7.6 18.4L58 31.99 39.6 39.6 32 58l-7.6-18.4L6 32l18.4-7.6z"
          fill="none"
          stroke="url(#emblem-gold)"
          strokeWidth="1.6"
        />
        <rect x="13.5" y="13.5" width="37" height="37" fill="none" stroke="url(#emblem-gold)" strokeWidth="1.6" transform="rotate(0 32 32)" />
      </g>
      <circle cx="32" cy="32" r="12.5" fill="#016D5D" stroke="url(#emblem-gold)" strokeWidth="1.2" />
      {/* Kaaba */}
      <path d="M25.5 29.2l6.5-2.7 6.5 2.7v8.3l-6.5 2.7-6.5-2.7z" fill="#021526" />
      <path d="M25.5 29.2l6.5 2.7 6.5-2.7" fill="none" stroke="#D9C89E" strokeWidth=".8" />
      <path d="M25.5 31.4l6.5 2.7 6.5-2.7" fill="none" stroke="#D9C89E" strokeWidth="1.3" />
      <path d="M32 31.9v8.3" stroke="#0a2438" strokeWidth=".6" />
    </svg>
  );
}

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <Emblem className="size-10 sm:size-11" />
      <span className="flex flex-col leading-tight">
        <span className={cn("whitespace-nowrap font-display text-base font-bold sm:text-lg", light ? "text-white" : "text-green-dark")}>
          المنصة الوطنية للحج
        </span>
        <span className={cn("hidden whitespace-nowrap text-[11px] font-medium min-[360px]:block", light ? "text-gold" : "text-gold-dark")}>
          إدارة الحج والعمرة السورية
        </span>
      </span>
    </span>
  );
}
