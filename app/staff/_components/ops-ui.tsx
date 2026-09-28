"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Employee } from "@/lib/ops";
import { cn } from "@/lib/utils";

/** Shared bits of the employees, reference-data and operational-files pages (dark staff theme) */

export const inputBase =
  "h-11 w-full rounded-2xl border-2 border-white/15 bg-white/10 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-gold";
export const selectClass = cn(inputBase, "px-3 [&>option]:text-ink");
export const fieldClass = cn(inputBase, "px-3");

const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/40",
  gold: "bg-gold/20 text-gold ring-gold/40",
  maroon: "bg-maroon/40 text-white ring-maroon/60",
  muted: "bg-white/10 text-white/80 ring-white/15",
} as const;
export type ChipTone = keyof typeof CHIP;

export function Chip({ tone = "muted", children, className }: { tone?: ChipTone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ring-1", CHIP[tone], className)}>{children}</span>;
}

export function SearchBox({ value, onChange, placeholder, label, className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; label: string; className?: string; autoFocus?: boolean }) {
  return (
    <label className={cn("relative block", className)}>
      <Search className="pointer-events-none absolute right-3.5 top-1/2 size-5 -translate-y-1/2 text-gold" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(inputBase, "h-12 pr-11 pl-10 text-base [&::-webkit-search-cancel-button]:hidden")}
      />
      {value && (
        <button type="button" onClick={() => onChange("")} className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label="مسح البحث">
          <X className="size-4" />
        </button>
      )}
    </label>
  );
}

export function FilterSelect({ value, onChange, label, all, options }: { value: string; onChange: (v: string) => void; label: string; all: string; options: readonly (string | { value: string; label: string })[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={cn(selectClass, value && "border-gold/60 bg-gold/10")}>
      <option value="">{all}</option>
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        return (
          <option key={v} value={v}>
            {typeof o === "string" ? o : o.label}
          </option>
        );
      })}
    </select>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-bold text-gold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-5 text-white/55">{hint}</span>}
    </label>
  );
}

export function Avatar({ e, size = "md" }: { e: Pick<Employee, "firstName" | "surname" | "gender" | "suspended">; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "size-8 text-sm", md: "size-10 text-base", lg: "size-14 text-2xl" }[size];
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl font-display font-bold",
        s,
        e.suspended ? "bg-white/10 text-white/40" : e.gender === "female" ? "bg-gradient-to-br from-maroon/80 to-maroon text-gold-light" : "bg-gradient-to-br from-gold to-gold-dark text-ink",
      )}
      aria-hidden
    >
      {e.firstName[0]}
    </span>
  );
}

/** Rows of label → value inside a drawer */
export function InfoGrid({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11px] font-bold text-gold/90">{k}</dt>
          <dd className="mt-0.5 break-words text-sm text-white">{v || <span className="text-white/40">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between gap-2 border-b border-white/10 pb-2 first:mt-0">
      <h3 className="font-display text-base font-bold text-gold">{children}</h3>
      {action}
    </div>
  );
}
