"use client";

import { motion, useInView } from "motion/react";
import { ArrowLeft, BadgeCheck, CalendarDays, Dices, HandHeart } from "lucide-react";
import { useRef } from "react";
import { Counter } from "@/components/ui/motion";
import { SEASON } from "@/lib/season";

const EASE = [0.16, 1, 0.3, 1] as const;

export function AcceptanceSplit() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div ref={ref} className="rounded-[2rem] border border-gold/40 bg-white p-5 shadow-[0_30px_70px_-50px_rgba(0,89,79,.6)] sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">الحصة الإجمالية للموسم</p>
          <p className="font-display text-4xl font-bold text-green-dark">
            <Counter to={SEASON.quota} /> <span className="text-lg text-ink-soft">حاج</span>
          </p>
        </div>
        <p className="rounded-full bg-gold/30 px-3 py-1.5 text-xs font-bold text-maroon">+ قائمة احتياط {SEASON.reserve.toLocaleString("en-US")}</p>
      </div>

      {/* The split bar */}
      <div className="mt-6 flex h-20 gap-1.5 overflow-hidden rounded-2xl md:h-24">
        <motion.div
          className="relative flex items-center justify-center overflow-hidden bg-green-dark text-white"
          initial={{ flexBasis: "50%" }}
          animate={{ flexBasis: inView ? "35%" : "50%" }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
        >
          <div className="bg-pattern absolute inset-0 opacity-15" />
          <span className="relative font-display text-3xl font-bold md:text-5xl">35%</span>
        </motion.div>
        <motion.div
          className="relative flex items-center justify-center overflow-hidden bg-gradient-to-l from-green-light to-green text-white"
          initial={{ flexBasis: "50%" }}
          animate={{ flexBasis: inView ? "65%" : "50%" }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
        >
          <motion.div
            className="absolute inset-y-0 w-1/3 bg-white/15 blur-xl"
            initial={{ right: "-40%" }}
            animate={inView ? { right: "140%" } : undefined}
            transition={{ duration: 1.6, delay: 1.2, ease: "easeInOut" }}
          />
          <span className="relative font-display text-3xl font-bold md:text-5xl">65%</span>
        </motion.div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[35fr_auto_65fr] md:items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: 0.6, duration: 0.6, ease: EASE }}
          className="rounded-3xl border border-green-dark/15 bg-green-dark/[.03] p-5"
        >
          <BadgeCheck className="size-7 text-green-dark" />
          <p className="mt-3 font-display text-xl font-bold text-green-dark">القبول المباشر</p>
          <p className="font-display text-3xl font-bold text-ink tabular-nums">{SEASON.directSeats.toLocaleString("en-US")} <span className="text-sm text-ink-soft">مقعداً</span></p>
          <p className="mt-2 text-sm leading-7 text-ink-soft">وفق الأكبر سناً بعمر صاحب الطلب، حتى تكتمل النسبة. في هذا الموسم: {SEASON.acceptedDirectAge} عاماً فأكثر.</p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-maroon ring-1 ring-gold/50">
            <CalendarDays className="size-3.5" /> إعلان الأعمار: 15 رجب
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={inView ? { opacity: 1, scale: 1 } : undefined}
          transition={{ delay: 0.9, type: "spring", stiffness: 300, damping: 18 }}
          className="flex items-center justify-center"
        >
          <span className="flex items-center gap-2 rounded-full bg-gold px-3 py-2 text-xs font-bold text-ink md:flex-col md:px-2 md:py-3">
            <ArrowLeft className="size-4 md:rotate-0" />
            <span className="md:[writing-mode:vertical-rl]">من لم يُقبل يدخل القرعة تلقائياً</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: 0.75, duration: 0.6, ease: EASE }}
          className="rounded-3xl border border-green-light/25 bg-green-light/[.06] p-5"
        >
          <Dices className="size-7 text-green" />
          <p className="mt-3 font-display text-xl font-bold text-green">القرعة الإلكترونية</p>
          <p className="font-display text-3xl font-bold text-ink tabular-nums">{SEASON.lotterySeats.toLocaleString("en-US")} <span className="text-sm text-ink-soft">مقعداً</span></p>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            على جميع الطلبات المؤهلة التي لم تُقبل مباشرة، ببث مباشر على التلفاز بإشراف لجنة رسمية. الطلب العائلي يُسحب كوحدة واحدة.
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-maroon ring-1 ring-gold/50">
            <CalendarDays className="size-3.5" /> 1 شعبان — الساعة 20:00
          </p>
        </motion.div>
      </div>

      <p className="mt-5 flex items-start gap-2 rounded-2xl bg-sand p-4 text-sm leading-7 text-ink-soft">
        <HandHeart className="mt-1 size-4 shrink-0 text-maroon" />
        حملة المنحة لأسر الشهداء: {SEASON.scholarshipSeats} مقعد بقبول مباشر. وحملة الاستدراك تُفتح للاحتياط أو لإعلان أعمار جديدة عند عدم اكتمال الحصة.
      </p>
    </div>
  );
}
