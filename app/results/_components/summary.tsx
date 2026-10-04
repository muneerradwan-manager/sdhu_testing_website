"use client";

import { BadgeCheck, CalendarRange, Dices, ShieldCheck } from "lucide-react";
import { Counter, Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { RESULTS_SUMMARY as S } from "@/lib/data/public-results";
import { drawTotals, usePublishedDraw } from "@/lib/lottery";

/** Headline numbers and the accepted-ages announcement */
export function ResultsSummary() {
  const draw = usePublishedDraw();
  const lottery = draw ? drawTotals(draw.picks) : null;
  const byMonth = draw ? draw.picks.filter((p) => p.months !== "all").length : 0;
  const cards = [
    {
      icon: BadgeCheck,
      label: "مقبولون مباشرة وفق الأكبر سناً",
      value: S.direct,
      note: `35% من الحصة — ${S.acceptedAge} عاماً فأكثر`,
      tone: "from-green-dark to-green text-white",
      iconTone: "bg-white/15 text-gold",
    },
    {
      icon: Dices,
      label: "مقبولون بالقرعة",
      value: lottery?.seats ?? 0,
      note: lottery ? `65% من الحصة — ${lottery.apps.toLocaleString("en-US")} طلباً، بث مباشر 1 شعبان` : "لم تُنشر نتائج القرعة بعد",
      tone: "from-white to-white text-ink",
      iconTone: "bg-green-light/12 text-green",
    },
    {
      icon: CalendarRange,
      label: "سنوات ميلاد سُحبت",
      value: draw?.picks.length ?? 0,
      note: draw ? (byMonth ? `منها ${byMonth} بأشهر محددة — يُطابَق ميلاد صاحب الطلب` : "كلها بجميع أشهرها") : "تُعلن في البث المباشر",
      tone: "from-white to-white text-ink",
      iconTone: "bg-gold/35 text-maroon",
    },
  ];
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 md:-mt-16 md:px-8">
      <div className="grid gap-4 lg:grid-cols-[1.05fr_1.6fr]">
        <Reveal>
          <div className="group relative h-full overflow-hidden rounded-3xl bg-maroon-dark p-7 text-white shadow-[0_30px_60px_-30px_rgba(66,0,35,.8)] md:p-9">
            <div className="bg-pattern absolute inset-0 opacity-20" />
            <div className="absolute -left-16 -top-16 size-56 rounded-full bg-gold/20 blur-3xl transition duration-700 group-hover:scale-125" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gold ring-1 ring-gold/30">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-gold" />
                </span>
                إعلان رسمي معتمد
              </span>
              <p className="mt-5 text-lg font-semibold text-white/85">الأعمار المقبولة وفق الأكبر سناً</p>
              <p className="mt-1 flex items-end gap-3">
                <span className="font-display text-8xl leading-none font-bold text-gold-shine md:text-9xl">
                  <Counter to={S.acceptedAge} duration={1.6} />
                </span>
                <span className="mb-3 font-display text-2xl font-bold">عاماً فأكثر</span>
              </p>
              <p className="mt-5 text-sm leading-7 text-white/70">
                اعتُمدت في {S.directApprovedAt}. ولم ينتقل أي طلب إلى القرعة وحده: التسجيل الأولي على القرعة كان مستقلاً بطلب جديد من{" "}
                {S.lotteryWindow}، مفتوحاً لكل مؤهل ومنهم من لم يُقبل مباشرة.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                  <ShieldCheck className="size-3.5 text-gold" />
                  آخر تحديث: {S.lastUpdate}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  طلبات التسجيل الأولي على القرعة: <span className="font-bold tabular-nums">{S.lotteryEligible.toLocaleString("en-US")}</span>
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        <Stagger className="grid gap-4 sm:grid-cols-3" gap={0.12}>
          {cards.map((c) => (
            <StaggerItem key={c.label}>
              <div
                className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br p-6 shadow-[0_20px_50px_-30px_rgba(0,89,79,.45)] transition duration-500 hover:-translate-y-1 ${c.tone}`}
              >
                <span className={`flex size-12 items-center justify-center rounded-2xl transition duration-500 group-hover:rotate-6 group-hover:scale-110 ${c.iconTone}`}>
                  <c.icon className="size-6" />
                </span>
                <p className="mt-5 text-sm font-semibold opacity-80">{c.label}</p>
                <p className="mt-1 font-display text-4xl font-bold md:text-[2.6rem]">
                  <Counter to={c.value} />
                </p>
                <p className="mt-auto pt-4 text-xs leading-6 opacity-70">{c.note}</p>
                <span className="absolute -bottom-10 -left-10 size-28 rounded-full border-[14px] border-current opacity-[.04] transition duration-700 group-hover:scale-150" />
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
