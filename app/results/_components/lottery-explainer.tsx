"use client";

import { CalendarRange, FileSpreadsheet, Gavel, Keyboard, ListChecks, Lock, ShieldCheck, Tv, UserCheck } from "lucide-react";
import { Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { useT } from "@/lib/i18n";
import { drawTotals, OFFICIAL_DRAW } from "@/lib/lottery";

const POOL = drawTotals(OFFICIAL_DRAW);

type T = ReturnType<typeof useT>;

function phases(t: T) {
  return [
    {
      tag: t("قبل البث", "Before the broadcast"),
      time: t("26 آب – 25 أيلول", "26 August – 25 September"),
      tone: "bg-white text-ink",
      accent: "bg-green-light/12 text-green",
      live: false,
      steps: [
        {
          icon: ListChecks,
          text: t(
            "يُفتح التسجيل الأولي على القرعة بطلب جديد من 26 آب إلى 10 أيلول برسم التسجيل فقط، وتتحقق المنصة من أهلية كل طلب.",
            "Lottery pre-registration opens, with a new application, from 26 August to 10 September for the registration fee only, and the platform checks every application's eligibility.",
          ),
        },
        {
          icon: FileSpreadsheet,
          text: t(
            `تُحصي المنصة المسجّلين بحسب سنة ميلاد صاحب الطلب وشهره: ${POOL.poolApps.toLocaleString("en-US")} طلباً تضم ${POOL.poolSeats.toLocaleString("en-US")} شخصاً، فيُعرف كم مقعداً تشغل كل سنة وكل شهر.`,
            `The platform counts the registrants by the main applicant's year and month of birth: ${POOL.poolApps.toLocaleString("en-US")} applications covering ${POOL.poolSeats.toLocaleString("en-US")} people, so it is known how many places each year and each month would take.`,
          ),
        },
        { icon: Gavel, text: t("تستلم لجنة تنظيم القرعة هذا الإحصاء وتشرف على كل ما يليه.", "The lottery committee receives these figures and supervises everything that follows.") },
      ],
    },
    {
      tag: t("أثناء البث", "During the broadcast"),
      time: t("السبت 26 أيلول — دير الزور", "Saturday 26 September — Deir ez-Zor"),
      tone: "bg-green-dark text-white",
      accent: "bg-white/10 text-gold",
      live: true,
      steps: [
        {
          icon: Tv,
          text: t(
            "تُسحب على الهواء مباشرة سنواتُ ميلاد، ولبعضها أشهر محددة، حتى تكتمل مقاعد القرعة. ويمكن لكل عائلة المتابعة من بيتها.",
            "Birth years — some with specific months — are drawn live on air until the lottery places are filled. Every family can follow from home.",
          ),
        },
        {
          icon: CalendarRange,
          text: t(
            "لا تُسحب أسماء: يُقبل كل طلب وُلد صاحبه في سنة مسحوبة، أو في شهر مسحوب من سنة سُحبت بأشهرها.",
            "No names are drawn: every application whose main applicant was born in a drawn year, or in a drawn month of a year drawn by months, is accepted.",
          ),
        },
        { icon: Lock, text: t("المنصة مقفلة: لا يستطيع أحد تغيير أي طلب فيها أثناء القرعة.", "The platform is locked: no one can change any application during the draw.") },
      ],
    },
    {
      tag: t("بعد البث", "After the broadcast"),
      time: t("26 أيلول — النتائج في اليوم نفسه", "26 September — results the same day"),
      tone: "bg-white text-ink",
      accent: "bg-gold/35 text-maroon",
      live: false,
      steps: [
        {
          icon: Keyboard,
          text: t(
            "يُدخل مكتب القرعة في المنصة ما سُحب في البث، سنةً سنة، وتحسب المنصة المقاعد التي يغطيها حتى تطابق مقاعد القرعة.",
            "The lottery office enters what was drawn into the platform, year by year, and the platform counts the places it covers until they match the lottery places.",
          ),
        },
        {
          icon: ShieldCheck,
          text: t(
            "تعتمد الإدارة النتائج وتنشرها: يظهر جدول السنوات والأشهر للجميع، ويعرف كل مسجّل نتيجته في حسابه وبرقمه الوطني.",
            "The Administration approves and publishes the results: the table of years and months is shown to everyone, and each registrant sees their result in their account and by national number.",
          ),
        },
        {
          icon: UserCheck,
          text: t(
            "يثبّت المقبولون تسجيلهم من 11 إلى 27 تشرين الأول بتأكيد القبول ودفع الدفعة الأولى، ومن لا يثبّت يسقط قبوله.",
            "Those accepted confirm their registration from 11 to 27 October by confirming acceptance and paying the first instalment; anyone who does not confirm loses their place.",
          ),
        },
      ],
    },
  ];
}

export function LotteryExplainer() {
  const t = useT();
  const PHASES = phases(t);
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
      <SectionHeading
        eyebrow={t("الشفافية أولاً", "Transparency first")}
        title={t("كيف تتم القرعة؟", "How does the lottery work?")}
        description={t(
          "القرعة لا تُجرى داخل المنصة، بل ببث مباشر بإشراف لجنة رسمية تسحب سنوات الميلاد وأشهرها. دور المنصة يكون قبل البث وبعده فقط.",
          "The lottery is not run inside the platform: it is held in a live broadcast, supervised by an official committee that draws birth years and months. The platform's role is only before and after the broadcast.",
        )}
      />

      <Stagger className="relative grid gap-5 lg:grid-cols-3" gap={0.15}>
        <div className="absolute inset-x-10 top-10 hidden h-px bg-gradient-to-l from-gold/0 via-gold-dark/60 to-gold/0 lg:block ltr:bg-gradient-to-r" aria-hidden />
        {PHASES.map((p, i) => (
          <StaggerItem key={i} className="h-full">
            <article className={`relative flex h-full flex-col overflow-hidden rounded-3xl border border-gold/40 p-6 shadow-[0_24px_60px_-40px_rgba(0,89,79,.6)] md:p-7 ${p.tone}`}>
              {p.live && <div className="bg-pattern absolute inset-0 opacity-15" />}
              <div className="relative flex items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span className={`flex size-11 items-center justify-center rounded-2xl font-display text-lg font-bold ${p.accent}`}>{i + 1}</span>
                  <span>
                    <span className="block font-display text-xl font-bold">{p.tag}</span>
                    <span className="block text-xs opacity-70">{p.time}</span>
                  </span>
                </span>
                {p.live && (
                  <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white">
                    <span className="size-1.5 animate-pulse rounded-full bg-white" /> {t("مباشر", "Live")}
                  </span>
                )}
              </div>
              <ul className="relative mt-6 space-y-4">
                {p.steps.map((s, j) => (
                  <li key={j} className="flex gap-3">
                    <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${p.accent}`}>
                      <s.icon className="size-4" />
                    </span>
                    <p className="text-sm leading-7 opacity-90">{s.text}</p>
                  </li>
                ))}
              </ul>
            </article>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal delay={0.2}>
        <div className="relative mt-8 flex flex-col items-start gap-4 overflow-hidden rounded-3xl bg-maroon-dark p-6 text-white sm:flex-row sm:items-center md:p-8">
          <div className="bg-pattern absolute inset-0 opacity-10" />
          <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gold text-maroon-dark">
            <Lock className="size-7" />
          </span>
          <div className="relative">
            <p className="font-display text-xl font-bold text-gold md:text-2xl">{t("قاعدة ثابتة: لا شيء يظهر قبل الاعتماد والنشر", "A fixed rule: nothing is shown before it is approved and published")}</p>
            <p className="mt-1 text-sm leading-7 text-white/75">
              {t(
                "لا تظهر أي نتيجة لأي شخص قبل أن تعتمدها الإدارة وتنشرها. وكل إدخال أو نشر مسجّل في سجل الأحداث باسم من نفّذه ووقته، ويبقى جدول النتائج متاحاً حتى نهاية الموسم ثم يُؤرشف.",
                "No result is shown to anyone before the Administration approves and publishes it. Every entry and publication is recorded in the event log with who did it and when, and the results table stays available until the end of the season, then is archived.",
              )}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
