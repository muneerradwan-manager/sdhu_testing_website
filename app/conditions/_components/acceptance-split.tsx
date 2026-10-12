"use client";

import { motion, useInView } from "motion/react";
import { ArrowLeft, BadgeCheck, CalendarDays, Dices, HandHeart } from "lucide-react";
import { useRef } from "react";
import { Counter } from "@/components/ui/motion";
import { useLang, useT } from "@/lib/i18n";
import { SEASON } from "@/lib/season";
import { dateEn } from "../_lib/en";

const EASE = [0.16, 1, 0.3, 1] as const;
const { direct, lottery } = SEASON.windows;

export function AcceptanceSplit() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const t = useT();
  const en = useLang() === "en";

  return (
    <div ref={ref} className="rounded-[2rem] border border-gold/40 bg-white p-5 shadow-[0_30px_70px_-50px_rgba(0,89,79,.6)] sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">{t("الحصة الإجمالية للموسم", "Total quota for the season")}</p>
          <p className="font-display text-4xl font-bold text-green-dark">
            <Counter to={SEASON.quota} /> <span className="text-lg text-ink-soft">{t("حاج", "pilgrims")}</span>
          </p>
        </div>
        <p className="rounded-full bg-gold/30 px-3 py-1.5 text-xs font-bold text-maroon">{t(`${SEASON.directSeats.toLocaleString("en-US")} مباشرة · ${SEASON.lotterySeats.toLocaleString("en-US")} بالقرعة`, `${SEASON.directSeats.toLocaleString("en-US")} direct · ${SEASON.lotterySeats.toLocaleString("en-US")} by lottery`)}</p>
      </div>

      {/* The split bar */}
      <div className="mt-6 flex h-20 gap-1.5 overflow-hidden rounded-2xl md:h-24">
        <motion.div
          className="relative flex items-center justify-center overflow-hidden bg-green-dark text-white"
          initial={{ flexBasis: "50%" }}
          animate={{ flexBasis: inView ? "65%" : "50%" }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
        >
          <div className="bg-pattern absolute inset-0 opacity-15" />
          <span className="relative font-display text-3xl font-bold md:text-5xl">65%</span>
        </motion.div>
        <motion.div
          className="relative flex items-center justify-center overflow-hidden bg-gradient-to-l from-green-light to-green text-white ltr:bg-gradient-to-r"
          initial={{ flexBasis: "50%" }}
          animate={{ flexBasis: inView ? "35%" : "50%" }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
        >
          <motion.div
            className="absolute inset-y-0 w-1/3 bg-white/15 blur-xl"
            initial={en ? { left: "-40%" } : { right: "-40%" }}
            animate={inView ? (en ? { left: "140%" } : { right: "140%" }) : undefined}
            transition={{ duration: 1.6, delay: 1.2, ease: "easeInOut" }}
          />
          <span className="relative font-display text-3xl font-bold md:text-5xl">35%</span>
        </motion.div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[65fr_auto_35fr] md:items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: 0.6, duration: 0.6, ease: EASE }}
          className="rounded-3xl border border-green-dark/15 bg-green-dark/[.03] p-5"
        >
          <BadgeCheck className="size-7 text-green-dark" />
          <p className="mt-3 font-display text-xl font-bold text-green-dark">{t("القبول المباشر", "Direct acceptance")}</p>
          <p className="font-display text-3xl font-bold text-ink tabular-nums">{SEASON.directSeats.toLocaleString("en-US")} <span className="text-sm text-ink-soft">{t("مقعداً", "places")}</span></p>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {t(
              `تسجيل أول بطلب خاص به. يُقبل الأكبر سناً بعمر صاحب الطلب حتى تكتمل النسبة. في هذا الموسم: مواليد ${SEASON.referenceYear - SEASON.acceptedDirectAge} فما قبل (${SEASON.acceptedDirectAge} عاماً فأكثر).`,
              `The first registration, with its own application. The oldest are accepted, by the main applicant's age, until the share is filled. This season: born ${SEASON.referenceYear - SEASON.acceptedDirectAge} or earlier (aged ${SEASON.acceptedDirectAge} or over).`,
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-maroon ring-1 ring-gold/50">
              <CalendarDays className="size-3.5" /> {t(`التسجيل: ${direct.hijri}`, `Registration: ${dateEn(direct.hijri)}`)}
            </p>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-maroon ring-1 ring-gold/50">
              <CalendarDays className="size-3.5" /> {t(`إعلان الأعمار: ${direct.announce}`, `Ages announced: ${dateEn(direct.announce)}`)}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={inView ? { opacity: 1, scale: 1 } : undefined}
          transition={{ delay: 0.9, type: "spring", stiffness: 300, damping: 18 }}
          className="flex items-center justify-center"
        >
          <span className="flex items-center gap-2 rounded-full bg-gold px-3 py-2 text-xs font-bold text-ink md:flex-col md:px-2 md:py-3">
            <ArrowLeft className="size-4 md:rotate-0" />
            <span className="md:[writing-mode:vertical-rl]">{t("لم تُقبل؟ سجّل تسجيلاً أولياً على القرعة", "Not accepted? Pre-register for the lottery")}</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: 0.75, duration: 0.6, ease: EASE }}
          className="rounded-3xl border border-green-light/25 bg-green-light/[.06] p-5"
        >
          <Dices className="size-7 text-green" />
          <p className="mt-3 font-display text-xl font-bold text-green">{t("القرعة العلنية", "The public lottery")}</p>
          <p className="font-display text-3xl font-bold text-ink tabular-nums">{SEASON.lotterySeats.toLocaleString("en-US")} <span className="text-sm text-ink-soft">{t("مقعداً", "places")}</span></p>
          <p className="mt-2 text-sm leading-7 text-ink-soft">
            {t(
              "تسجيل أولي ثانٍ مستقل يُفتح بعد إعلان الأعمار، بطلب جديد لكل مؤهل، ومنهم من لم يُقبل مباشرة؛ فلا ينتقل أي طلب إليه وحده. في بث مباشر بإشراف لجنة رسمية تُسحب سنوات ميلاد، ولبعضها أشهر محددة، فيُقبل كل طلب وُلد صاحبه في سنة وشهر مسحوبين، بأفراده كلهم، ثم يثبّت تسجيله بدفع الدفعة الأولى.",
              "A second, separate pre-registration that opens after the ages are announced, with a new application from everyone eligible — including those not accepted directly; no application moves across by itself. In a live broadcast supervised by an official committee, birth years are drawn, some with specific months. Every application whose main applicant was born in a drawn year and month is accepted with all its members, and then confirms its registration by paying the first instalment.",
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-maroon ring-1 ring-gold/50">
              <CalendarDays className="size-3.5" /> {t(`التسجيل: ${lottery.hijri}`, `Registration: ${dateEn(lottery.hijri)}`)}
            </p>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-maroon ring-1 ring-gold/50">
              <CalendarDays className="size-3.5" /> {t(`القرعة: ${lottery.draw}`, `Draw: ${dateEn(lottery.draw)}`)}
            </p>
          </div>
        </motion.div>
      </div>

      <p className="mt-5 flex items-start gap-2 rounded-2xl bg-sand p-4 text-sm leading-7 text-ink-soft">
        <HandHeart className="mt-1 size-4 shrink-0 text-maroon" />
        {t(
          `حملة المنحة لأسر الشهداء: ${SEASON.scholarshipSeats} مقعد بقبول مباشر. وحملة الاستدراك تُفتح لإعلان أعمار جديدة عند عدم اكتمال الحصة، ومنها مقاعد من لم يثبّت تسجيله.`,
          `The scholarship campaign for families of martyrs: ${SEASON.scholarshipSeats} places by direct acceptance. A make-up campaign opens to announce new ages if the quota is not filled, including the places of those who did not confirm their registration.`,
        )}
      </p>
    </div>
  );
}
