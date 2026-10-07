"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { smallInputClass } from "../../_components/kit";

const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/50",
  gold: "bg-gold/20 text-gold ring-gold/40",
  maroon: "bg-maroon text-white ring-maroon-light",
  muted: "bg-white/10 text-white/70 ring-white/15",
} as const;

export type ChipTone = keyof typeof CHIP;

/** Status chip readable on the dark cards */
export function Chip({ tone = "green", children, className }: { tone?: ChipTone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", CHIP[tone], className)}>{children}</span>;
}

/** A toggle chip for picking a role, a category, a centre or a type */
export function Pick({ on, onClick, children, label, disabled }: { on: boolean; onClick: () => void; children: ReactNode; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-bold ring-1 transition disabled:opacity-40",
        on ? "bg-green-light/30 text-white ring-green-light/50" : "text-white/55 ring-white/15 hover:text-white/85",
      )}
    >
      {on && <Check className="-mt-0.5 me-0.5 inline size-3" />}
      {children}
    </button>
  );
}

/** A row of filter buttons, one of them on */
export function Segments<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number; tone?: "maroon" }[]; label: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(it.value)}
            className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition", on ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white/85 ring-white/15 hover:bg-white/10")}
          >
            {it.label}
            {it.count !== undefined && (
              <span className={cn("rounded-full px-1.5 tabular-nums", on ? "bg-white/40" : it.tone === "maroon" && it.count ? "bg-maroon text-white" : "bg-white/10")}>{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** A labelled field in a form */
export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-sm font-bold text-white">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs leading-5 text-white/60">{hint}</span>}
    </label>
  );
}

/** On or off, with what each means */
export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full ring-1 transition disabled:opacity-40", on ? "bg-green-light ring-green-light" : "bg-white/15 ring-white/20")}
    >
      {/* Right to left: off at the start (right), on at the end (left) */}
      <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", on ? "left-1" : "left-6")} />
    </button>
  );
}

export const selectClass = cn(smallInputClass, "[&>option]:text-ink");

export { downloadCsv } from "@/lib/csv";
