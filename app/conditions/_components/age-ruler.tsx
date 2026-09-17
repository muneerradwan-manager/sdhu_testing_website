"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, CircleX, Info, Mars, Venus } from "lucide-react";
import { useState } from "react";
import { SEASON } from "@/lib/season";
import { cn } from "@/lib/utils";

const MIN = 1930;
const MAX = 2012;
const R = SEASON.rules;
const pct = (y: number) => ((y - MIN) / (MAX - MIN)) * 100;

const ZONES = [
  { from: MIN, to: R.elderlyNeedsCompanionMaxBirthYear + 0.5, label: "يحتاج مرافقاً", color: "bg-maroon" },
  { from: R.elderlyNeedsCompanionMaxBirthYear + 0.5, to: R.applicantMaxBirthYear + 0.5, label: "صاحب طلب أو مرافق", color: "bg-green-dark" },
  { from: R.applicantMaxBirthYear + 0.5, to: R.companionMaxBirthYear + 0.5, label: "مرافق فقط", color: "bg-gold-dark" },
  { from: R.companionMaxBirthYear + 0.5, to: MAX, label: "غير مسموح", color: "bg-ink/25" },
];

const PRESETS: { year: number; gender: "M" | "F"; label: string }[] = [
  { year: 1990, gender: "F", label: "مواليد 1990 · امرأة" },
  { year: 1950, gender: "M", label: "مواليد 1950" },
  { year: 2010, gender: "M", label: "مواليد 2010" },
  { year: 1968, gender: "M", label: "مواليد 1968 · رجل" },
  { year: 2002, gender: "F", label: "مواليد 2002 · امرأة" },
];

type Rule = { key: string; state: "ok" | "no" | "need"; text: string };

function evaluate(year: number, gender: "M" | "F"): { verdict: string; tone: "green" | "gold" | "maroon"; rules: Rule[] } {
  const f = gender === "F";
  const rules: Rule[] = [
    year <= R.applicantMaxBirthYear
      ? { key: "applicant", state: "ok", text: `${f ? "يمكنها" : "يمكنه"} أن ${f ? "تكون صاحبة" : "يكون صاحب"} طلب` }
      : { key: "applicant", state: "no", text: `لا ${f ? "يمكنها" : "يمكنه"} أن ${f ? "تكون صاحبة" : "يكون صاحب"} طلب — صاحب الطلب من مواليد ${R.applicantMaxBirthYear} فما قبل` },
    year <= R.companionMaxBirthYear
      ? { key: "companion", state: "ok", text: `${f ? "يمكنها" : "يمكنه"} أن ${f ? "تكون مرافقة" : "يكون مرافقاً"} في طلب` }
      : { key: "companion", state: "no", text: `لا ${f ? "يمكنها" : "يمكنه"} أن ${f ? "تكون مرافقة" : "يكون مرافقاً"} — المرافق من مواليد ${R.companionMaxBirthYear} فما قبل` },
  ];
  if (f && year >= R.womanNeedsMahramMinBirthYear) {
    rules.push({ key: "mahram", state: "need", text: `تحتاج محرماً في الطلب نفسه (مواليد ${R.womanNeedsMahramMinBirthYear} فما بعد)` });
  }
  if (year <= R.elderlyNeedsCompanionMaxBirthYear) {
    rules.push({ key: "elderly", state: "need", text: `${f ? "تحتاج" : "يحتاج"} مرافقاً حصراً مسمّى في الطلب (مواليد ${R.elderlyNeedsCompanionMaxBirthYear} فما قبل)` });
  }

  let verdict: string;
  let tone: "green" | "gold" | "maroon" = "green";
  if (year > R.companionMaxBirthYear) {
    verdict = `لا ${f ? "يمكنها" : "يمكن"} أن ${f ? "تكون مرافقة" : "يكون مرافقاً"}`;
    tone = "maroon";
  } else if (year <= R.elderlyNeedsCompanionMaxBirthYear) {
    verdict = `${f ? "تحتاج" : "يحتاج"} مرافقاً حصراً`;
    tone = "gold";
  } else if (f && year >= R.womanNeedsMahramMinBirthYear) {
    verdict = year > R.applicantMaxBirthYear ? "مرافقة فقط، وتحتاج محرماً" : "تحتاج محرماً";
    tone = "gold";
  } else if (year > R.applicantMaxBirthYear) {
    verdict = "يمكن أن يكون مرافقاً فقط";
    tone = "gold";
  } else {
    verdict = f ? "تستوفي شروط العمر كاملة" : "يستوفي شروط العمر كاملة";
  }
  return { verdict, tone, rules };
}

export function AgeRuler() {
  const [year, setYear] = useState(1990);
  const [gender, setGender] = useState<"M" | "F">("F");
  const age = SEASON.referenceYear - year;
  const { verdict, tone, rules } = evaluate(year, gender);
  const toneCls = { green: "from-green-dark to-green", gold: "from-gold-dark to-[#8f8156]", maroon: "from-maroon-dark to-maroon" }[tone];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-gold/40 bg-white shadow-[0_40px_80px_-50px_rgba(0,89,79,.6)]">
      {/* Verdict banner */}
      <motion.div layout className={cn("relative overflow-hidden bg-gradient-to-l p-6 text-white transition-colors duration-500 md:p-8", toneCls)}>
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/75">المسطرة التفاعلية — حرّك المؤشر واختر الجنس</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-3 font-display text-2xl font-bold md:text-3xl">
              <span>
                مواليد <span className="tabular-nums">{year}</span> · {gender === "F" ? "امرأة" : "رجل"}
              </span>
              <span className="text-gold">←</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={verdict}
                  initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                  transition={{ duration: 0.25 }}
                  className="text-gold"
                >
                  {verdict}
                </motion.span>
              </AnimatePresence>
            </p>
          </div>
          <div className="relative flex rounded-2xl bg-white/10 p-1" role="radiogroup" aria-label="الجنس">
            {(
              [
                ["M", "رجل", Mars],
                ["F", "امرأة", Venus],
              ] as const
            ).map(([g, label, Icon]) => (
              <button
                key={g}
                role="radio"
                aria-checked={gender === g}
                onClick={() => setGender(g)}
                className={cn("relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition", gender === g ? "text-ink" : "text-white/80 hover:text-white")}
              >
                {gender === g && <motion.span layoutId="gender-pill" className="absolute inset-0 rounded-xl bg-gold" transition={{ type: "spring", damping: 24, stiffness: 320 }} />}
                <Icon className="relative size-4" />
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Ruler */}
        <div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-ink-soft">العمر في سنة الموسم ({SEASON.referenceYear})</p>
              <p className="font-display text-5xl font-bold text-green-dark tabular-nums">
                {age}
                <span className="ms-2 text-lg text-ink-soft">عاماً</span>
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setYear((y) => Math.max(MIN, y - 1))}
                className="size-10 rounded-xl bg-sand text-lg font-bold text-green-dark transition hover:bg-gold-light active:scale-90"
                aria-label="سنة أقدم"
              >
                −
              </button>
              <button
                onClick={() => setYear((y) => Math.min(MAX, y + 1))}
                className="size-10 rounded-xl bg-sand text-lg font-bold text-green-dark transition hover:bg-gold-light active:scale-90"
                aria-label="سنة أحدث"
              >
                +
              </button>
            </div>
          </div>

          <div className="relative mt-16 select-none" dir="ltr">
            {/* Woman-needs-mahram band */}
            <AnimatePresence>
              {gender === "F" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute -top-7 flex h-5 items-center justify-center rounded-md border border-dashed border-maroon/50 bg-[repeating-linear-gradient(45deg,rgba(103,33,70,.12)_0_6px,transparent_6px_12px)] text-[10px] font-bold text-maroon"
                  style={{ left: `${pct(R.womanNeedsMahramMinBirthYear - 0.5)}%`, right: 0 }}
                  dir="rtl"
                >
                  تحتاج محرماً
                </motion.div>
              )}
            </AnimatePresence>

            {/* Zones */}
            <div className="relative flex h-5 overflow-hidden rounded-full">
              {ZONES.map((z, i) => (
                <motion.div
                  key={z.label}
                  className={cn("h-full", z.color)}
                  style={{ width: `${pct(z.to) - pct(z.from)}%` }}
                  initial={{ scaleX: 0, originX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                />
              ))}
            </div>

            {/* Thumb bubble */}
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={1}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="سنة الميلاد"
              aria-valuetext={`مواليد ${year}، العمر ${age} عاماً`}
              className="peer absolute inset-x-0 -top-4 z-20 h-12 w-full cursor-grab opacity-0 active:cursor-grabbing"
            />
            <motion.div
              className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 peer-focus-visible:[&>span]:ring-4"
              animate={{ left: `${pct(year)}%` }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              style={{ left: `${pct(year)}%` }}
            >
              <span className="block size-8 rounded-full border-4 border-white bg-gold shadow-[0_6px_18px_rgba(0,0,0,.25)] ring-green-light/40" />
              <span className="absolute -top-11 left-1/2 -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-xs font-bold text-white tabular-nums">
                {year}
                <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink" />
              </span>
            </motion.div>

            {/* Ticks */}
            <div className="relative mt-3 h-10 text-[10px] text-ink-soft">
              {[1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010].map((y) => (
                <span key={y} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${pct(y)}%` }}>
                  <span className="mx-auto mb-0.5 block h-1.5 w-px bg-ink/30" />
                  {y}
                </span>
              ))}
              {[R.elderlyNeedsCompanionMaxBirthYear, R.womanNeedsMahramMinBirthYear, R.applicantMaxBirthYear, R.companionMaxBirthYear].map((y) => (
                <span key={`t${y}`} className="absolute top-5 -translate-x-1/2 font-bold text-maroon tabular-nums" style={{ left: `${pct(y)}%` }}>
                  ▲{y}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-soft">
            {ZONES.map((z) => (
              <span key={z.label} className="flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded", z.color)} /> {z.label}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const active = p.year === year && p.gender === gender;
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    setYear(p.year);
                    setGender(p.gender);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    active ? "border-green-dark bg-green-dark text-white" : "border-gold/60 bg-white text-ink hover:border-green-light",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rules */}
        <div className="rounded-3xl bg-sand/70 p-5">
          <p className="font-bold text-green-dark">ما ينطبق على هذا الشخص</p>
          <motion.ul layout className="mt-4 space-y-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {rules.map((r) => (
                <motion.li
                  layout
                  key={`${r.key}-${r.state}`}
                  initial={{ opacity: 0, x: 30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -30, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl bg-white p-3.5 text-sm leading-6 shadow-sm ring-1",
                    r.state === "ok" ? "ring-green-light/25" : r.state === "no" ? "ring-maroon/25" : "ring-gold-dark/40",
                  )}
                >
                  {r.state === "ok" ? (
                    <CircleCheck className="mt-0.5 size-5 shrink-0 text-green-light" />
                  ) : r.state === "no" ? (
                    <CircleX className="mt-0.5 size-5 shrink-0 text-maroon" />
                  ) : (
                    <Info className="mt-0.5 size-5 shrink-0 text-gold-dark" />
                  )}
                  <span className="text-ink">{r.text}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
          <p className="mt-4 text-xs leading-6 text-ink-soft">تُحسب الشروط بسنة الميلاد فقط، وتضبطها الإدارة لكل موسم.</p>
        </div>
      </div>
    </div>
  );
}
