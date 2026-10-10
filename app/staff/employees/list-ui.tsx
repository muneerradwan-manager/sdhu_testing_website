"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The few pieces a list page needs around its table, as a site's admin lists show them: the views of the
 * list as words with their counts («الكل (12) | موقوفون (2)») — the only numbers a management page carries —
 * the search beside them, «عرض المزيد» under a long list, and a short «كيف تعمل؟» kept closed.
 * Shared by «إدارة الموظفين», «البيانات المرجعية» and «الملفات التشغيلية».
 */

export type FilterItem<T extends string> = { value: T; label: string; count?: number; alert?: boolean };

/** The list's views: words with their counts, the current one in white */
export function FilterLinks<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: FilterItem<T>[]; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-y-1 text-sm">
      {items.map((it, i) => {
        const on = it.value === value;
        return (
          <span key={it.value} className="flex items-center">
            {i > 0 && <span className="mx-1.5 text-white/25">|</span>}
            <button type="button" aria-pressed={on} onClick={() => onChange(it.value)} className={cn("font-bold transition", on ? "text-white" : "text-gold hover:underline")}>
              {it.label}
              {it.count !== undefined && <span className={cn("ms-1 font-normal tabular-nums", it.alert && it.count > 0 && !on ? "text-[#ffb4c8]" : "text-white/55")}>({it.count})</span>}
            </button>
          </span>
        );
      })}
    </nav>
  );
}

/** The views on one side, the search (and any filter) on the other */
export function ListToolbar({ filters, children }: { filters?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">{filters}</div>
      {children && <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:w-[34rem] lg:shrink-0">{children}</div>}
    </div>
  );
}

/** «عرض المزيد» under a list cut at a page */
export function MoreRows({ left, step, onMore }: { left: number; step: number; onMore: () => void }) {
  if (left <= 0) return null;
  return (
    <div className="mt-3 text-center">
      <Button variant="glass" size="sm" onClick={onMore}>
        عرض {Math.min(step, left)} آخرين — بقي {left}
      </Button>
    </div>
  );
}

/** How the page works, in a few lines, closed until it is wanted */
export function HowTo({ children, title = "كيف تعمل؟" }: { children: ReactNode; title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-1 text-xs font-bold text-white/60 hover:text-white">
        {title} <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")} />
      </button>
      {open && <div className="mt-2 max-w-3xl space-y-1.5 rounded-2xl bg-white/[.05] p-3 text-xs leading-6 text-white/75 ring-1 ring-white/10">{children}</div>}
    </div>
  );
}
