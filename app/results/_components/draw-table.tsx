"use client";

import { motion } from "motion/react";
import { CalendarClock, Info } from "lucide-react";
import { SEASON } from "@/lib/season";
import { describePick, drawTotals, sortPicks, usePublishedDraw } from "@/lib/lottery";
import { formatNumber } from "@/lib/utils";

/**
 * The lottery's results as the committee publishes them: birth years, each with all its months or the
 * drawn ones. A lottery application is accepted when its main applicant was born in one of them.
 */
export function DrawTable() {
  const draw = usePublishedDraw();
  if (!draw) {
    return (
      <div className="rounded-2xl bg-sand p-8 text-center">
        <CalendarClock className="mx-auto size-10 text-gold-dark" />
        <p className="mt-3 font-display text-xl font-bold text-green-dark">لم تُنشر نتائج القرعة بعد</p>
        <p className="mt-1 text-ink-soft">
          تُسحب في البث المباشر {SEASON.windows.lottery.draw}، وتُنشر هنا بعد اعتمادها: جدول بسنوات الميلاد وأشهرها.
        </p>
      </div>
    );
  }
  const picks = sortPicks(draw.picks);
  const t = drawTotals(draw.picks);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-[1.75rem] border border-gold/40 bg-white">
        <div className="bg-green-dark px-6 py-5 text-center text-white">
          <p className="font-display text-2xl font-bold md:text-3xl">نتائج قرعة الحج السوري</p>
          <p className="mt-1 font-display text-lg text-gold">
            لموسم {SEASON.hijriYear}هـ — {SEASON.referenceYear}م
          </p>
        </div>
        <table className="w-full text-center">
          <thead>
            <tr className="bg-sand text-sm text-ink-soft">
              <th className="w-32 px-4 py-3 font-bold">السنة</th>
              <th className="px-4 py-3 font-bold">الشهر</th>
            </tr>
          </thead>
          <tbody>
            {picks.map((p, i) => (
              <motion.tr
                key={p.year}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="border-t border-gold/30"
              >
                <td className="px-4 py-3.5 font-display text-2xl font-bold text-green-dark tabular-nums">{p.year}</td>
                <td className={p.months === "all" ? "px-4 py-3.5 text-lg font-bold text-ink" : "px-4 py-3.5 text-lg font-bold text-maroon"}>{describePick(p)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-gold/30 bg-sand/60 px-4 py-3 text-center text-sm text-ink-soft">
          {draw.label ? `نُشرت ${draw.label}` : "نُشرت بعد اعتمادها"} — تُقبل بها {formatNumber(t.apps)} طلباً تضم {formatNumber(t.seats)} شخصاً، من {formatNumber(t.poolApps)} طلباً سُجّلت تسجيلاً أولياً
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-[1.75rem] bg-green-dark/6 p-6 leading-8">
          <p className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
            <Info className="size-5" /> كيف تعرف نتيجة طلبك؟
          </p>
          <ol className="mt-3 list-decimal space-y-2 ps-5 text-ink">
            <li>انظر إلى سنة ميلاد <b>صاحب الطلب</b>: الأكبر سناً في طلبك، ومنه يُحسب الطلب كله.</li>
            <li>إن وجدت سنته في الجدول وأمامها «جميع الأشهر» فطلبك مقبول بكل أفراده.</li>
            <li>وإن كانت أمامها أشهر محددة فطلبك مقبول إن وُلد صاحبه في أحدها.</li>
            <li>أو ابحث برقمك الوطني في أعلى الصفحة.</li>
          </ol>
        </div>
        <div className="rounded-[1.75rem] border border-gold/40 bg-gold/15 p-6 leading-8 text-ink">
          <p className="font-bold text-maroon">قُبلت؟ ثبّت تسجيلك</p>
          <p className="mt-1">
            من {SEASON.windows.lottery.confirm}: ادخل إلى طلبك على المنصة، أكّد قبولك وادفع الدفعة الأولى. من لا يثبّت تسجيله في الموعد يسقط قبوله.
          </p>
        </div>
      </div>
    </div>
  );
}
