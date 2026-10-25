"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import type { SectionResult } from "@/lib/data/admin-exam";
import type { Attempt, AttemptStatus } from "@/lib/store";
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
/**
 * A list's filters as light links with their counts («الكل (12) | مؤرشفة (3)»), or — `tabs` — a page's sections as
 * tabs over a line, the way the administrators' pages show theirs. A count marked `maroon` waits for someone: it stands out.
 */
export function Segments<T extends string>({ value, onChange, items, label, tabs = false }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number; tone?: "maroon" }[]; label: string; tabs?: boolean }) {
  const count = (it: (typeof items)[number], on: boolean) =>
    it.count === undefined ? null : it.tone === "maroon" && it.count > 0 ? (
      <span className="ms-1.5 rounded-full bg-maroon px-1.5 text-[11px] font-bold tabular-nums text-white">{it.count}</span>
    ) : (
      <span className={cn("ms-1 text-xs font-normal tabular-nums", on ? "text-white/70" : "text-white/50")}>({it.count})</span>
    );
  if (tabs)
    return (
      <div role="tablist" aria-label={label} className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto border-b border-white/15 px-1">
        {items.map((it) => {
          const on = it.value === value;
          return (
            <button
              key={it.value}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(it.value)}
              className={cn("-mb-px flex shrink-0 items-center rounded-t-xl border px-3.5 py-2 text-sm font-bold transition", on ? "border-white/15 border-b-transparent bg-white/[.08] text-white" : "border-transparent text-white/65 hover:text-gold")}
            >
              {it.label}
              {count(it, on)}
            </button>
          );
        })}
      </div>
    );
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
      {items.map((it, i) => {
        const on = it.value === value;
        return (
          <span key={it.value} className="flex items-center gap-1">
            {i > 0 && <span className="text-white/25">|</span>}
            <button type="button" role="radio" aria-checked={on} onClick={() => onChange(it.value)} className={cn("flex items-center rounded-md px-1 font-bold", on ? "text-white" : "text-gold hover:underline")}>
              {it.label}
              {count(it, on)}
            </button>
          </span>
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

/** «86%», «72.5%» — a share as read, one decimal at most; «—» when there is none */
export const pct = (n: number | undefined) => (n === undefined || !Number.isFinite(n) ? "—" : `${Math.round(n * 10) / 10}%`);

/** The share `part` is of `whole`, as a percentage with one decimal (0 when there is nothing to share) */
export const share = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

/** How each attempt status reads on the dark cards */
export const ATTEMPT_TONE: Record<AttemptStatus, ChipTone> = { ready: "muted", active: "gold", submitted: "gold", confirmed: "green", unconfirmed: "maroon", voided: "maroon" };

/**
 * What the device noticed during an attempt, each signal with its count. Signals that support the supervisor's
 * decision, not proof: a dropped network or a switched app raises them too.
 */
export function alertParts(a: Pick<Attempt, "alerts" | "autoSubmitted"> | undefined): string[] {
  const x = a?.alerts ?? {};
  return [
    x.focusLost ? `فقدان تركيز ×${x.focusLost}` : "",
    x.reentries ? `استئناف ×${x.reentries}` : "",
    x.screenshots ? `لقطة شاشة ×${x.screenshots}` : "",
    x.ipChanged ? "تغيّر IP" : "",
    x.deviceChanged ? "تغيّر جهاز" : "",
    x.disconnected ? "انقطاع اتصال" : "",
    a?.autoSubmitted ? "تسليم تلقائي" : "",
  ].filter(Boolean);
}

/** Each section of a marked attempt: the share he got against the share it asks — green passed, maroon not */
export function SectionChips({ sections, empty = "بلا أقسام — ورقة من قبل الأقسام" }: { sections: SectionResult[]; empty?: string }) {
  if (!sections.length) return <span className="text-xs text-white/55">{empty}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {sections.map((s) => (
        <Chip key={s.id} tone={s.passed ? "green" : "maroon"}>
          {s.name} {pct(s.percent)} / {s.pass}%
        </Chip>
      ))}
    </span>
  );
}

/** A figure in a small box: a value that may carry decimals or a unit, under its label */
export function Figure({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "gold" | "maroon" | "green" }) {
  return (
    <div className={cn("rounded-2xl p-3 ring-1", tone === "maroon" ? "bg-maroon/20 ring-maroon/40" : tone === "gold" ? "bg-gold/10 ring-gold/40" : tone === "green" ? "bg-green-light/15 ring-green-light/30" : "bg-black/15 ring-white/10")}>
      <p className="text-[11px] text-white/65">{label}</p>
      <p className={cn("font-display text-2xl font-bold tabular-nums", tone === "gold" ? "text-gold" : "text-white")}>{value}</p>
      {hint && <p className="text-[11px] leading-4 text-white/55">{hint}</p>}
    </div>
  );
}
