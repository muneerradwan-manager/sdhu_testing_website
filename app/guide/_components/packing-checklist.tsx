"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Luggage, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import type { PACKING } from "@/lib/data/guide";
import { cn } from "@/lib/utils";

export function PackingChecklist({ groups }: { groups: typeof PACKING }) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const pct = checked.size / total;
  const complete = checked.size === total;

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="overflow-hidden rounded-3xl border border-gold/40 bg-white shadow-[0_24px_60px_-40px_rgba(2,21,38,.45)]">
      <div className="relative overflow-hidden bg-green-dark p-5 text-white sm:p-6">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.span animate={complete ? { rotate: [0, -12, 12, 0] } : {}} transition={{ duration: 0.6 }} className="grid size-12 place-items-center rounded-2xl bg-gold text-ink">
              <Luggage className="size-6" />
            </motion.span>
            <div>
              <p className="font-display text-xl font-bold">حقيبة الحاج</p>
              <p className="text-sm text-white/70">
                جهّزت <span className="font-bold tabular-nums text-gold">{checked.size}</span> من {total}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setChecked(new Set())}
            disabled={checked.size === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" /> إعادة
          </button>
        </div>
        <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} aria-label="نسبة تجهيز الحقيبة">
          <motion.div className={cn("h-full rounded-full", complete ? "bg-green-light" : "bg-gradient-to-l from-gold to-gold-dark")} animate={{ width: `${pct * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
        <AnimatePresence>
          {complete && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="relative mt-3 flex items-center gap-2 text-sm font-bold text-gold">
              <Sparkles className="size-4" /> حقيبتك جاهزة! رحلة موفقة وحج مبرور بإذن الله
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="grid gap-px bg-gold/25 sm:grid-cols-2">
        {groups.map((g) => {
          const groupDone = g.items.filter((i) => checked.has(i.id)).length;
          return (
            <fieldset key={g.group} className="bg-white p-4 sm:p-5">
              <legend className="sr-only">{g.group}</legend>
              <p className="mb-2 flex items-center justify-between text-sm font-bold text-maroon">
                {g.group}
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] tabular-nums", groupDone === g.items.length ? "bg-green-light/15 text-green" : "bg-sand text-hint")}>
                  {groupDone}/{g.items.length}
                </span>
              </p>
              <ul className="space-y-1">
                {g.items.map((item) => {
                  const on = checked.has(item.id);
                  return (
                    <li key={item.id}>
                      <label className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-sand", on && "bg-green-light/5")}>
                        <input type="checkbox" className="peer sr-only" checked={on} onChange={() => toggle(item.id)} />
                        <span
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-lg border-2 transition peer-focus-visible:ring-4 peer-focus-visible:ring-green-light/30",
                            on ? "border-green-light bg-green-light text-white" : "border-gold/60 bg-white",
                          )}
                        >
                          <AnimatePresence>
                            {on && (
                              <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                                <Check className="size-4" strokeWidth={3} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("relative inline-block text-sm font-semibold transition-colors", on ? "text-ink-soft" : "text-ink")}>
                            {item.label}
                            <motion.span className="absolute right-0 top-1/2 h-px bg-ink-soft/60" initial={false} animate={{ width: on ? "100%" : "0%" }} transition={{ duration: 0.3 }} />
                          </span>
                          {item.note && <span className="block text-[11px] text-hint">{item.note}</span>}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
