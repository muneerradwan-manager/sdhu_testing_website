"use client";

import { motion } from "motion/react";
import { CalendarClock, Info } from "lucide-react";
import { SEASON } from "@/lib/season";
import { dateEn, MONTHS_EN } from "@/app/conditions/_lib/en";
import { useT } from "@/lib/i18n";
import { describePick, drawTotals, sortPicks, usePublishedDraw, type DrawPick } from "@/lib/lottery";
import { formatNumber } from "@/lib/utils";

/**
 * The lottery's results as the committee publishes them: birth years, each with all its months or the
 * drawn ones. A lottery application is accepted when its main applicant was born in one of them.
 */
/** describePick (lib/lottery) in English */
const pickEn = (p: DrawPick) => (p.months === "all" ? "All months" : `Born in ${p.months.map((m) => MONTHS_EN[m - 1]).join(", ")}`);

export function DrawTable() {
  const t = useT();
  const draw = usePublishedDraw();
  if (!draw) {
    return (
      <div className="rounded-2xl bg-sand p-8 text-center">
        <CalendarClock className="mx-auto size-10 text-gold-dark" />
        <p className="mt-3 font-display text-xl font-bold text-green-dark">{t("لم تُنشر نتائج القرعة بعد", "The lottery results have not been published yet")}</p>
        <p className="mt-1 text-ink-soft">
          {t(
            `تُسحب في البث المباشر ${SEASON.windows.lottery.draw}، وتُنشر هنا بعد اعتمادها: جدول بسنوات الميلاد وأشهرها.`,
            `The draw takes place live on ${dateEn(SEASON.windows.lottery.draw)}, and is published here once approved: a table of birth years and months.`,
          )}
        </p>
      </div>
    );
  }
  const picks = sortPicks(draw.picks);
  const totals = drawTotals(draw.picks);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-[1.75rem] border border-gold/40 bg-white">
        <div className="bg-green-dark px-6 py-5 text-center text-white">
          <p className="font-display text-2xl font-bold md:text-3xl">{t("نتائج قرعة الحج السوري", "Syrian Hajj lottery results")}</p>
          <p className="mt-1 font-display text-lg text-gold">
            {t(`لموسم ${SEASON.hijriYear}هـ — ${SEASON.referenceYear}م`, `${SEASON.hijriYear} AH season — ${SEASON.referenceYear}`)}
          </p>
        </div>
        <table className="w-full text-center">
          <thead>
            <tr className="bg-sand text-sm text-ink-soft">
              <th className="w-32 px-4 py-3 font-bold">{t("السنة", "Year")}</th>
              <th className="px-4 py-3 font-bold">{t("الشهر", "Month")}</th>
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
                <td className={p.months === "all" ? "px-4 py-3.5 text-lg font-bold text-ink" : "px-4 py-3.5 text-lg font-bold text-maroon"}>{t(describePick(p), pickEn(p))}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-gold/30 bg-sand/60 px-4 py-3 text-center text-sm text-ink-soft">
          {t(
            `${draw.label ? `نُشرت ${draw.label}` : "نُشرت بعد اعتمادها"} — تُقبل بها ${formatNumber(totals.apps)} طلباً تضم ${formatNumber(totals.seats)} شخصاً، من ${formatNumber(totals.poolApps)} طلباً سُجّلت تسجيلاً أولياً`,
            `${draw.label ? `Published ${dateEn(draw.label)}` : "Published once approved"} — ${formatNumber(totals.apps)} applications accepted, covering ${formatNumber(totals.seats)} people, out of ${formatNumber(totals.poolApps)} pre-registered applications`,
          )}
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-[1.75rem] bg-green-dark/6 p-6 leading-8">
          <p className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
            <Info className="size-5" /> {t("كيف تعرف نتيجة طلبك؟", "How do you find your result?")}
          </p>
          <ol className="mt-3 list-decimal space-y-2 ps-5 text-ink">
            <li>
              {t("انظر إلى سنة ميلاد ", "Look at the year of birth of the ")}
              <b>{t("صاحب الطلب", "main applicant")}</b>
              {t(": الأكبر سناً في طلبك، ومنه يُحسب الطلب كله.", ": the oldest person in your application, who counts for the whole application.")}
            </li>
            <li>{t("إن وجدت سنته في الجدول وأمامها «جميع الأشهر» فطلبك مقبول بكل أفراده.", "If the year is in the table with «All months», your application is accepted with all its members.")}</li>
            <li>{t("وإن كانت أمامها أشهر محددة فطلبك مقبول إن وُلد صاحبه في أحدها.", "If specific months are listed, your application is accepted if the main applicant was born in one of them.")}</li>
            <li>{t("أو ابحث برقمك الوطني في أعلى الصفحة.", "Or search with your national number at the top of the page.")}</li>
          </ol>
        </div>
        <div className="rounded-[1.75rem] border border-gold/40 bg-gold/15 p-6 leading-8 text-ink">
          <p className="font-bold text-maroon">{t("قُبلت؟ ثبّت تسجيلك", "Accepted? Confirm your registration")}</p>
          <p className="mt-1">
            {t(
              `من ${SEASON.windows.lottery.confirm}: ادخل إلى طلبك على المنصة، أكّد قبولك وادفع الدفعة الأولى. من لا يثبّت تسجيله في الموعد يسقط قبوله.`,
              `From ${dateEn(SEASON.windows.lottery.confirm)}: open your application on the platform, confirm your acceptance and pay the first instalment. Anyone who does not confirm in time loses their place.`,
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
