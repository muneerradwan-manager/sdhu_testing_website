"use client";

import { motion } from "motion/react";
import { Delete } from "lucide-react";
import type { ReactNode } from "react";
import { Emblem } from "@/components/brand/logo";
import { SpeakButton } from "@/components/ui/widgets";
import { cn } from "@/lib/utils";

/** The assistant "asks" one question per screen, large and readable, with read-aloud */
export function Question({
  title,
  hint,
  speak,
  children,
  step,
}: {
  title: ReactNode;
  hint?: ReactNode;
  speak?: string;
  children?: ReactNode;
  step?: string;
}) {
  return (
    <div>
      <div className="flex items-start gap-4">
        <motion.div initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 14 }} className="relative hidden shrink-0 sm:block">
          <Emblem className="size-14" />
          <span className="absolute -bottom-1 -left-1 size-4 rounded-full border-2 border-white bg-green-light" />
        </motion.div>
        <div className="min-w-0 flex-1">
          {step && <p className="text-sm font-bold text-gold-dark">{step}</p>}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-1 font-display text-2xl font-bold leading-[1.5] text-green-dark md:text-[2rem]"
          >
            {title}
          </motion.h2>
          {hint && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-2 text-lg leading-8 text-ink-soft">
              {hint}
            </motion.p>
          )}
          {speak && <SpeakButton text={speak} className="mt-4" label="استمع إلى السؤال" />}
        </div>
      </div>
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}

export function Choice({
  icon,
  label,
  description,
  selected,
  onClick,
  tone = "default",
  disabled,
  className,
  index = 0,
}: {
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
  className?: string;
  index?: number;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
      whileHover={disabled ? undefined : { y: -3 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "relative flex min-h-24 w-full items-center gap-4 rounded-3xl border-2 p-5 text-right transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        selected
          ? "border-green-dark bg-green-dark text-white shadow-[0_20px_40px_-20px_rgba(0,89,79,.8)]"
          : tone === "primary"
            ? "border-green-dark/20 bg-green-dark/5 hover:border-green-dark"
            : tone === "danger"
              ? "border-maroon/20 bg-maroon/5 hover:border-maroon"
              : "border-gold/50 bg-white hover:border-gold-dark hover:shadow-lg",
        className,
      )}
    >
      {icon && (
        <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl text-3xl", selected ? "bg-white/15" : "bg-sand")}>{icon}</span>
      )}
      <span className="min-w-0">
        <span className="block font-display text-xl font-bold md:text-2xl">{label}</span>
        {description && <span className={cn("mt-1 block leading-7", selected ? "text-white/75" : "text-ink-soft")}>{description}</span>}
      </span>
      {selected && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute left-4 top-4 grid size-7 place-items-center rounded-full bg-gold text-sm font-bold text-ink">
          ✓
        </motion.span>
      )}
    </motion.button>
  );
}

/** Huge on-screen number pad — easier than a phone keyboard for many elderly users */
export function NumberPad({ value, onChange, maxLength }: { value: string; onChange: (v: string) => void; maxLength: number }) {
  const press = (d: string) => value.length < maxLength && onChange(value + d);
  return (
    <div className="mx-auto grid max-w-xs grid-cols-3 gap-2" dir="ltr">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <motion.button key={d} type="button" whileTap={{ scale: 0.92 }} onClick={() => press(d)} className="h-14 rounded-2xl bg-sand font-display text-2xl font-bold text-green-dark transition hover:bg-gold-light">
          {d}
        </motion.button>
      ))}
      <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={() => onChange("")} className="h-14 rounded-2xl text-sm font-bold text-maroon hover:bg-maroon/5">
        مسح
      </motion.button>
      <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={() => press("0")} className="h-14 rounded-2xl bg-sand font-display text-2xl font-bold text-green-dark transition hover:bg-gold-light">
        0
      </motion.button>
      <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={() => onChange(value.slice(0, -1))} className="grid h-14 place-items-center rounded-2xl text-ink-soft hover:bg-sand" aria-label="حذف رقم">
        <Delete className="size-6" />
      </motion.button>
    </div>
  );
}

/** Big segmented display for national / booklet numbers */
export function DigitsDisplay({ value, length, groups }: { value: string; length: number; groups: number[] }) {
  const starts = groups.map((_, i) => groups.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div className="flex flex-wrap justify-center gap-3" dir="ltr">
      {groups.map((g, gi) => {
        const start = starts[gi];
        return (
          <div key={gi} className="flex gap-1">
            {Array.from({ length: g }, (_, i) => {
              const ch = value[start + i];
              const active = start + i === value.length && value.length < length;
              return (
                <span
                  key={i}
                  className={cn(
                    "grid h-14 w-9 place-items-center rounded-xl border-2 font-display text-2xl font-bold transition md:w-10",
                    ch ? "border-green-dark bg-white text-green-dark" : active ? "border-green-light bg-green-light/5" : "border-gold/50 bg-white text-hint",
                  )}
                >
                  {ch ? (
                    <motion.span initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                      {ch}
                    </motion.span>
                  ) : active ? (
                    <span className="h-6 w-0.5 animate-pulse bg-green-light" />
                  ) : (
                    "•"
                  )}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function PersonChip({ name, sub, gender, className, children }: { name: string; sub?: ReactNode; gender: "M" | "F"; className?: string; children?: ReactNode }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl font-display text-xl font-bold", gender === "F" ? "bg-maroon/10 text-maroon" : "bg-green-dark/10 text-green-dark")}>
        {name[0]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-ink">{name}</p>
        {sub && <div className="text-sm text-ink-soft">{sub}</div>}
      </div>
      {children}
    </div>
  );
}
