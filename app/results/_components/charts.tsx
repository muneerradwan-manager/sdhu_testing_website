"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import { useRef, useState } from "react";
import { GOVERNORATE_STATS, RESULTS_SUMMARY as S } from "@/lib/data/public-results";
import { cn, formatNumber } from "@/lib/utils";

const SEGMENTS = [
  { key: "direct", label: "قُبلوا مباشرة (الأكبر سناً)", value: S.direct, pct: 13, color: "#00594F" },
  { key: "lottery", label: "قُبلوا بالقرعة", value: S.lottery, pct: 24, color: "#289E92" },
  { key: "reserve", label: "الاحتياط", value: S.reserve, pct: 5, color: "#AD9E6E" },
  { key: "rest", label: "لم يُقبلوا في القرعة", value: S.notAccepted, pct: 58, color: "#E4DDD3" },
] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

/** Donut + stacked bar: applications accepted directly + eligible applications registered in the lottery */
export function OutcomeDonut() {
  const [active, setActive] = useState<string | null>(null);
  const R = 80;
  const C = 2 * Math.PI * R;
  const GAP = 3;
  const total = SEGMENTS.reduce((a, s) => a + s.value, 0);
  const shown = SEGMENTS.find((s) => s.key === active);
  const starts = SEGMENTS.map((_, i) => SEGMENTS.slice(0, i).reduce((a, s) => a + (s.value / total) * C, 0));

  return (
    <div className="relative h-full overflow-hidden rounded-3xl border border-gold/40 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(0,89,79,.45)] md:p-8">
      <h3 className="font-display text-2xl font-bold text-green-dark">من بين {formatNumber(S.eligible)} طلباً مؤهلاً</h3>
      <p className="mt-1 text-sm text-ink-soft">
        المقبولون مباشرة ({formatNumber(S.direct)}) وطلبات القرعة المؤهلة ({formatNumber(S.lotteryEligible)}). مرّر المؤشر أو اضغط على أي جزء لرؤية تفاصيله.
      </p>

      <div className="mt-6 grid items-center gap-8 sm:grid-cols-[220px_1fr]">
        <div className="relative mx-auto size-56">
          <svg viewBox="0 0 200 200" className="size-full -rotate-90" role="img" aria-label="توزيع الطلبات المؤهلة حسب النتيجة">
            <circle cx="100" cy="100" r={R} fill="none" stroke="#F7F4EF" strokeWidth="26" />
            {SEGMENTS.map((s, i) => {
              const len = (s.value / total) * C - GAP;
              const dashOffset = -starts[i];
              const isActive = active === s.key;
              return (
                <motion.circle
                  key={s.key}
                  cx="100"
                  cy="100"
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeLinecap="butt"
                  strokeDashoffset={dashOffset}
                  initial={{ strokeDasharray: `0 ${C}`, strokeWidth: 22 }}
                  whileInView={{ strokeDasharray: `${len} ${C}` }}
                  animate={{ strokeWidth: isActive ? 32 : 22, opacity: active && !isActive ? 0.45 : 1 }}
                  viewport={{ once: true }}
                  transition={{ strokeDasharray: { duration: 1.2, delay: 0.2 + i * 0.25, ease: EASE }, default: { duration: 0.3 } }}
                  onMouseEnter={() => setActive(s.key)}
                  onMouseLeave={() => setActive(null)}
                  onClick={() => setActive((a) => (a === s.key ? null : s.key))}
                  className="cursor-pointer"
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={shown?.key ?? "all"}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
              >
                <p className="font-display text-3xl font-bold text-green-dark tabular-nums">{shown ? `${shown.pct}%` : formatNumber(total)}</p>
                <p className="max-w-28 text-xs leading-5 text-ink-soft">{shown ? shown.label : "طلب مؤهل"}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <ul className="space-y-2">
          {SEGMENTS.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onMouseEnter={() => setActive(s.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s.key)}
                onBlur={() => setActive(null)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition",
                  active === s.key ? "bg-sand ring-1 ring-gold/50" : "hover:bg-sand/70",
                )}
              >
                <span className="size-3.5 shrink-0 rounded-md" style={{ background: s.color }} />
                <span className="flex-1 text-sm font-semibold text-ink">{s.label}</span>
                <span className="text-sm tabular-nums text-ink-soft">{formatNumber(s.value)}</span>
                <span className="w-11 text-end font-display text-base font-bold text-green-dark tabular-nums">{s.pct}%</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Stacked bar */}
      <div className="mt-8">
        <div className="flex h-5 w-full gap-0.5 overflow-hidden rounded-full bg-sand">
          {SEGMENTS.map((s, i) => (
            <motion.div
              key={s.key}
              className="h-full first:rounded-s-full last:rounded-e-full"
              style={{ background: s.color }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(s.value / total) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.4 + i * 0.2, ease: EASE }}
              onMouseEnter={() => setActive(s.key)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-hint">
          <span>0</span>
          <span>{formatNumber(S.eligible)} طلباً</span>
        </div>
      </div>
    </div>
  );
}

const BAR_KEYS = [
  { key: "direct", label: "مباشر", color: "bg-green-dark" },
  { key: "lottery", label: "قرعة", color: "bg-green-light" },
  { key: "reserve", label: "احتياط", color: "bg-gold-dark" },
] as const;

/** Aggregated accepted numbers per governorate */
export function GovernorateChart() {
  const [mode, setMode] = useState<"accepted" | "share">("accepted");
  const [hover, setHover] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inView = useInView(listRef, { once: true, margin: "-60px" });
  const rows = GOVERNORATE_STATS.map((g) => ({ ...g, total: g.direct + g.lottery + g.reserve })).sort((a, b) => b.total - a.total);
  const max = Math.max(...rows.map((r) => (mode === "accepted" ? r.total : r.eligible)));

  return (
    <div className="h-full rounded-3xl border border-gold/40 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(0,89,79,.45)] md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-bold text-green-dark">حسب المحافظة</h3>
          <p className="mt-1 text-sm text-ink-soft">أرقام مجمّعة فقط، دون أي بيانات شخصية</p>
        </div>
        <div className="relative flex rounded-full bg-sand p-1 text-xs font-bold" role="tablist">
          {(
            [
              ["accepted", "المقبولون والاحتياط"],
              ["share", "مقارنة بالمؤهلين"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={mode === k}
              onClick={() => setMode(k)}
              className={cn("relative rounded-full px-3 py-1.5 transition", mode === k ? "text-white" : "text-ink-soft hover:text-ink")}
            >
              {mode === k && <motion.span layoutId="gov-mode" className="absolute inset-0 rounded-full bg-green-dark" transition={{ type: "spring", damping: 26, stiffness: 320 }} />}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-xs text-ink-soft">
        {BAR_KEYS.map((k) => (
          <span key={k.key} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded", k.color)} /> {k.label}
          </span>
        ))}
        {mode === "share" && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded bg-gold-light" /> مؤهل لم يُقبل
          </span>
        )}
      </div>

      <ul ref={listRef} className="mt-5 space-y-3">
        {rows.map((r, i) => {
          const base = mode === "accepted" ? r.total : r.eligible;
          const widthPct = (base / max) * 100;
          return (
            <li
              key={r.governorate}
              className="grid grid-cols-[76px_1fr_64px] items-center gap-3"
              onMouseEnter={() => setHover(r.governorate)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="truncate text-sm font-semibold text-ink">{r.governorate}</span>
              <div className="relative h-7">
                <motion.div
                  className="flex h-full overflow-hidden rounded-lg bg-gold-light/60"
                  initial={{ width: 0 }}
                  animate={{ width: inView ? `${widthPct}%` : 0 }}
                  transition={{ duration: 0.9, delay: i * 0.06, ease: EASE }}
                >
                  {BAR_KEYS.map((k) => (
                    <motion.div
                      key={k.key}
                      className={cn("h-full", k.color)}
                      animate={{ width: `${(r[k.key] / base) * 100}%` }}
                      transition={{ duration: 0.6, ease: EASE }}
                    />
                  ))}
                </motion.div>
                <AnimatePresence>
                  {hover === r.governorate && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      className="pointer-events-none absolute bottom-full start-0 z-10 mb-2 w-max rounded-xl bg-ink px-3 py-2 text-[11px] leading-5 text-white shadow-xl"
                    >
                      <p className="font-bold text-gold">{r.governorate}</p>
                      <p>مباشر {formatNumber(r.direct)} · قرعة {formatNumber(r.lottery)} · احتياط {formatNumber(r.reserve)}</p>
                      <p className="text-white/60">طلبات مؤهلة: {formatNumber(r.eligible)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className="text-end text-sm font-bold text-green-dark tabular-nums">{formatNumber(base)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
