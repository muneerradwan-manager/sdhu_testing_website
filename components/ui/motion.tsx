"use client";

import { animate, motion, useInView, useMotionValue, useTransform, type HTMLMotionProps } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn, formatNumber } from "@/lib/utils";

/** Fades and lifts its children into view once, when scrolled to */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  ...props
}: { children: ReactNode; delay?: number; y?: number; className?: string } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Staggers direct <StaggerItem> children */
export function Stagger({ children, className, gap = 0.08 }: { children: ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...props }: { children: ReactNode; className?: string } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 26, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Counts up from 0 when it enters the viewport */
export function Counter({ to, duration = 2, className, suffix = "" }: { to: number; duration?: number; className?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const value = useMotionValue(0);
  const text = useTransform(value, (v) => formatNumber(Math.round(v)) + suffix);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(value, to, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, to, duration, value]);

  return (
    <motion.span ref={ref} className={cn("tabular-nums", className)}>
      {text}
    </motion.span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  light = false,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "start";
  light?: boolean;
  className?: string;
}) {
  return (
    <Reveal className={cn("mb-12 flex flex-col gap-3", align === "center" ? "items-center text-center" : "items-start", className)}>
      {eyebrow && (
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold tracking-wide",
            light ? "bg-white/10 text-gold" : "bg-gold/30 text-maroon",
          )}
        >
          <span className="size-1.5 rotate-45 bg-current" />
          {eyebrow}
        </span>
      )}
      <h2 className={cn("font-display text-3xl font-bold text-balance md:text-4xl", light ? "text-white" : "text-green-dark")}>{title}</h2>
      {description && (
        <p className={cn("max-w-2xl text-base leading-8 md:text-lg", light ? "text-white/75" : "text-ink-soft")}>{description}</p>
      )}
      <Ornament className={cn("mt-1", align === "center" ? "" : "")} light={light} />
    </Reveal>
  );
}

export function Ornament({ className, light }: { className?: string; light?: boolean }) {
  return (
    <svg viewBox="0 0 120 12" className={cn("h-3 w-28", className)} aria-hidden>
      <path d="M0 6h46M74 6h46" stroke={light ? "#D9C89E" : "#AD9E6E"} strokeWidth="1.2" />
      <path d="M60 0l6 6-6 6-6-6z" fill={light ? "#D9C89E" : "#AD9E6E"} />
      <path d="M50 6l4-3 0 6zM70 6l-4-3 0 6z" fill={light ? "#D9C89E" : "#AD9E6E"} opacity=".6" />
    </svg>
  );
}
