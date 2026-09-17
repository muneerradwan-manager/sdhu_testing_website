"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, CalendarClock, CheckCircle2, FileCheck2, Radio, ScanSearch, Sparkles, Ticket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ageOf, fullName } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { SEASON } from "@/lib/season";
import type { Application } from "@/lib/store";
import { cn, formatNumber, seeded } from "@/lib/utils";

export function StageSubmitted({ app }: { app: Application }) {
  return (
    <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
      <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12 }} className="mx-auto grid size-28 place-items-center rounded-full bg-green-light/15 text-green-light">
        <FileCheck2 className="size-14" />
      </motion.div>
      <div>
        <p className="font-display text-3xl font-bold text-green-dark">استلمنا طلبك رقم {app.number}</p>
        <p className="mt-2 text-lg leading-8 text-ink-soft">
          {app.members.length} أفراد — الإيصال <span className="font-mono font-bold" dir="ltr">{app.receipt}</span> — مكتب {app.office}
        </p>
        <p className="mt-3 flex items-center gap-2 font-semibold text-gold-dark">
          <CalendarClock className="size-5" /> الخطوة التالية: تدقيق البيانات والتحقق من الأهلية
        </p>
      </div>
    </div>
  );
}

export function StageChecking({ members }: { members: Member[] }) {
  const rules = ["مطابقة الشؤون المدنية", "تكرار الأرقام الوطنية", "الأوراق الأساسية", "شروط الموسم بسنة الميلاد", "الشروط الثابتة"];
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 140);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <p className="flex items-center gap-3 font-display text-2xl font-bold text-green-dark">
        <ScanSearch className="size-8 animate-pulse text-gold-dark" /> ندقق بيانات كل فرد في الطلب...
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {members.map((m, i) => (
          <div key={m.person.id} className="relative overflow-hidden rounded-2xl border border-gold/40 bg-white p-4">
            <motion.div className="absolute inset-y-0 w-16 bg-gradient-to-l from-transparent via-green-light/15 to-transparent" animate={{ right: ["-20%", "120%"] }} transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.2 }} />
            <p className="font-bold">{fullName(m.person)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {rules.map((r, j) => {
                const ok = tick > i * 3 + j * 2;
                return (
                  <span key={r} className={cn("rounded-full px-2 py-0.5 text-xs font-semibold transition", ok ? "bg-green-light/15 text-green" : "bg-sand text-hint")}>
                    {ok ? "✓ " : ""}
                    {r}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StageEligible({ app }: { app: Application }) {
  return (
    <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10 }} className="mx-auto grid size-28 place-items-center rounded-full bg-green-light text-white shadow-2xl shadow-green-light/40">
        <BadgeCheck className="size-14" />
      </motion.div>
      <div>
        <p className="font-display text-3xl font-bold text-green-dark">جميع أفراد الطلب مؤهلون</p>
        <p className="mt-2 text-lg leading-8 text-ink-soft">
          يدخل طلبك أولاً في التسجيل المباشر (بعمر صاحب الطلب: {ageOf(app.members[0].person)})، فإن لم يُقبل دخل القرعة تلقائياً.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-gold/30 px-3 py-1.5 font-bold text-maroon">إعلان الأعمار المقبولة: 15 رجب</span>
          <span className="rounded-full bg-gold/30 px-3 py-1.5 font-bold text-maroon">القرعة: 1 شعبان 20:00 — بث مباشر</span>
        </div>
      </div>
    </div>
  );
}

/** Oldest-first cut: a distribution of eligible applicants with the 66+ threshold line */
export function StageDirect({ age }: { age: number }) {
  const bars = useMemo(() => {
    const rnd = seeded("ages");
    return Array.from({ length: 50 }, (_, i) => {
      const a = 30 + i; // 30 → 79
      const peak = Math.exp(-((a - 55) ** 2) / 220);
      return { age: a, h: 12 + peak * 80 + rnd() * 8 };
    });
  }, []);
  const accepted = age >= SEASON.acceptedDirectAge;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold text-green-dark">القبول المباشر وفق الأكبر سناً</p>
          <p className="text-ink-soft">
            {formatNumber(SEASON.directSeats)} مقعداً (35%) — الأعمار المقبولة: <b className="text-maroon">{SEASON.acceptedDirectAge} عاماً فأكثر</b>
          </p>
        </div>
        <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }} className={cn("rounded-2xl px-4 py-2 font-bold", accepted ? "bg-green-light text-white" : "bg-gold/30 text-maroon")}>
          {accepted ? "✓ طلبك ضمن القبول المباشر" : `عمر صاحب الطلب ${age} — ينتقل طلبك إلى القرعة`}
        </motion.span>
      </div>
      <div className="relative mt-8 flex h-44 items-end gap-[3px]" dir="ltr">
        {bars.map((b, i) => {
          const isCut = b.age >= SEASON.acceptedDirectAge;
          const mine = b.age === Math.min(79, Math.max(30, age));
          return (
            <motion.div
              key={b.age}
              initial={{ height: 0 }}
              animate={{ height: `${b.h}%` }}
              transition={{ delay: i * 0.015, duration: 0.5 }}
              className={cn("relative flex-1 rounded-t", mine ? "bg-maroon" : isCut ? "bg-green-light" : "bg-gold-light")}
            >
              {mine && (
                <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-maroon px-2 py-0.5 text-xs font-bold text-white">
                  طلبك
                </motion.span>
              )}
            </motion.div>
          );
        })}
        <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.8 }} className="absolute bottom-0 top-0 w-0.5 origin-bottom bg-green-dark" style={{ left: `${((SEASON.acceptedDirectAge - 30) / 50) * 100}%` }}>
          <span className="absolute -top-6 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-green-dark">{SEASON.acceptedDirectAge}+</span>
        </motion.div>
      </div>
      <div className="mt-2 flex justify-between text-xs text-hint" dir="ltr">
        <span>30</span>
        <span>العمر</span>
        <span>79</span>
      </div>
    </div>
  );
}

/** Live-broadcast lottery: rolling application numbers that land on yours */
export function StageLottery({ number, elapsed, direct }: { number: string; elapsed: number; direct: boolean }) {
  const [roll, setRoll] = useState("0000");
  const landing = elapsed > 9.3;
  useEffect(() => {
    if (landing) return;
    const t = setInterval(() => setRoll(String(1000 + Math.floor(Math.random() * 9000))), 70);
    return () => clearInterval(t);
  }, [landing]);
  const shown = landing ? number.padStart(4, "0") : roll;

  if (direct) {
    return (
      <div className="text-center">
        <Sparkles className="mx-auto size-12 text-gold-dark" />
        <p className="mt-3 font-display text-2xl font-bold text-green-dark">لا حاجة للقرعة</p>
        <p className="text-ink-soft">قُبل طلبك مباشرة وفق الأكبر سناً. ننتظر اعتماد النتائج ونشرها...</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white md:p-8">
      <div className="bg-pattern absolute inset-0 opacity-10" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 rounded-full bg-maroon px-3 py-1 text-sm font-bold">
          <span className="relative flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-white" />
            <span className="relative size-2.5 rounded-full bg-white" />
          </span>
          بث مباشر
        </span>
        <span className="flex items-center gap-2 text-sm text-white/70">
          <Radio className="size-4" /> القرعة الإلكترونية — 1 شعبان 20:00 — بإشراف لجنة تنظيم القرعة
        </span>
      </div>
      <div className="relative mt-8 flex justify-center gap-2 md:gap-3" dir="ltr">
        {shown.split("").map((d, i) => (
          <div key={i} className="relative h-24 w-16 overflow-hidden rounded-2xl bg-gradient-to-b from-white/15 to-white/5 ring-1 ring-white/20 md:h-28 md:w-20">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={d + i + (landing ? "l" : roll)}
                initial={{ y: landing ? -60 : -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                transition={landing ? { type: "spring", damping: 10, delay: i * 0.12 } : { duration: 0.06 }}
                className={cn("absolute inset-0 grid place-items-center font-display text-5xl font-bold md:text-6xl", landing ? "text-gold" : "text-white/80")}
              >
                {d}
              </motion.span>
            </AnimatePresence>
            <span className="absolute inset-x-0 top-1/2 h-px bg-black/30" />
          </div>
        ))}
      </div>
      <p className="relative mt-6 text-center text-white/70">
        {landing ? (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-gold">
            سُحب الطلب رقم {number}!
          </motion.span>
        ) : (
          `تُسحب ${formatNumber(SEASON.lotterySeats)} مقعداً من بين 53,955 طلباً مؤهلاً...`
        )}
      </p>
    </div>
  );
}

export function StageIcon({ k }: { k: string }) {
  const map: Record<string, React.ReactNode> = {
    submitted: <FileCheck2 className="size-5" />,
    checking: <ScanSearch className="size-5" />,
    eligible: <BadgeCheck className="size-5" />,
    direct: <CalendarClock className="size-5" />,
    lottery: <Ticket className="size-5" />,
    accepted: <CheckCircle2 className="size-5" />,
  };
  return <>{map[k]}</>;
}
