"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { DEMO_START, dayHijri, dayLabel, shiftDay, statusLabel, useOperations, useToday, type OperationState } from "@/lib/operations";
import { actions, useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";

/** The portals, where operations open and close by the date; the public pages keep their own calendar */
const PORTALS = ["/portal", "/administrator", "/staff", "/register", "/login"];

const TONE: Record<OperationState["status"], string> = {
  open: "bg-green-light/15 text-green",
  on: "bg-green-light/15 text-green",
  always: "bg-ink/5 text-ink-soft",
  upcoming: "bg-gold/30 text-maroon",
  closed: "bg-ink/5 text-hint",
  off: "bg-maroon/10 text-maroon",
};

/**
 * The demo's date. The season runs on dated operations, so the tester moves "today" to try each one as it
 * opens and closes; nothing here is part of the real platform, which runs on the real date.
 */
export function DemoClock() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const today = useToday();
  const ops = useOperations();
  const [open, setOpen] = useState(false);
  if (!hydrated || !PORTALS.some((p) => pathname.startsWith(p))) return null;
  const live = ops.filter((o) => o.open && o.status !== "always");

  return (
    <div data-demo-clock className="pointer-events-none fixed inset-x-0 bottom-4 z-[55] flex justify-center px-4 print:hidden">
      <div className="pointer-events-auto relative">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="absolute bottom-full left-1/2 mb-3 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-3xl border border-gold/40 bg-white text-ink shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 bg-maroon-dark p-4 text-white">
                <div>
                  <p className="font-display text-lg font-bold">تاريخ المحاكاة</p>
                  <p className="text-xs leading-5 text-white/70">يبدأ باليوم الفعلي. غيّره لتجرب كل عملية في وقتها: تُفتح وتُغلق وحدها بتواريخها، ما لم يفتحها الموظف المخوّل أو يوقفها بيده.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="grid size-9 shrink-0 place-items-center rounded-xl hover:bg-white/10">
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 border-b border-gold/30 p-4">
                <button type="button" onClick={() => actions.setToday(shiftDay(today, -1))} aria-label="اليوم السابق" className="grid size-11 shrink-0 place-items-center rounded-xl bg-sand hover:bg-gold/30">
                  <ChevronRight className="size-5" />
                </button>
                <input
                  type="date"
                  value={today}
                  onChange={(e) => e.target.value && actions.setToday(e.target.value)}
                  className="h-11 min-w-0 flex-1 rounded-xl border-2 border-gold/40 px-3 text-center font-bold outline-none focus:border-green-light"
                  aria-label="اليوم"
                />
                <button type="button" onClick={() => actions.setToday(shiftDay(today, 1))} aria-label="اليوم التالي" className="grid size-11 shrink-0 place-items-center rounded-xl bg-sand hover:bg-gold/30">
                  <ChevronLeft className="size-5" />
                </button>
              </div>
              <p className="px-4 pt-3 text-xs text-hint">{dayHijri(today)}</p>
              <ul className="max-h-[45vh] space-y-1.5 overflow-y-auto p-4 pt-2">
                {ops.map((o) => (
                  <li key={o.key} className="flex items-center gap-2 rounded-2xl bg-sand/60 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {o.label} {o.estimate && <span className="text-[11px] font-normal text-hint">(موعد تقديري)</span>}
                      </p>
                      <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold", TONE[o.status])}>{statusLabel(o)}</span>
                    </div>
                    {o.start && (
                      <button type="button" onClick={() => actions.setToday(o.start)} className="shrink-0 rounded-xl border border-gold/50 px-2.5 py-1.5 text-xs font-bold text-green-dark hover:bg-gold/20">
                        انتقل إلى {dayLabel(o.start)}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap justify-center gap-2 border-t border-gold/30 p-3 text-center">
                <button type="button" onClick={() => actions.setToday(undefined)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-sand">
                  <RotateCcw className="size-3.5" /> اليوم الفعلي
                </button>
                <button type="button" onClick={() => actions.setToday(DEMO_START)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-sand">
                  أول الموسم ({dayLabel(DEMO_START, true)})
                </button>
              </div>
              <p className="px-4 pb-3 text-center text-[11px] leading-5 text-hint">مواعيد موسم 1448 كما أعلنتها إدارة الحج والعمرة. ما لم تعلنه بعد موعد تقديري على نمط الموسم الماضي.</p>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-full border border-gold/50 bg-maroon-dark/95 py-2 pe-4 ps-2 text-sm font-bold text-white shadow-2xl backdrop-blur"
        >
          <span className="grid size-8 place-items-center rounded-full bg-gold text-ink">
            <CalendarClock className="size-4" />
          </span>
          <span>{dayLabel(today, true)}</span>
          <span className="hidden max-w-[26rem] truncate text-xs font-normal text-white/70 sm:inline">— {live.length ? `مفتوح الآن: ${live.map((o) => o.label.replace("التسجيل على الحج — ", "")).join("، ")}` : "لا عملية موسمية مفتوحة اليوم"}</span>
        </button>
      </div>
    </div>
  );
}
