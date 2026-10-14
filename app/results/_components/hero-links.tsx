"use client";

import { ListChecks, Search, ShieldCheck } from "lucide-react";
import { RESULTS_SUMMARY } from "@/lib/data/public-results";
import { useT } from "@/lib/i18n";
import { dateEn } from "@/app/conditions/_lib/en";

/** The links under the results page's header, in the visitor's language */
export function HeroLinks() {
  const t = useT();
  return (
    <div className="mt-7 flex flex-wrap items-center gap-3">
      <a
        href="#search"
        className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gold px-6 font-bold text-ink shadow-[0_12px_30px_-12px_rgba(217,200,158,.9)] transition hover:-translate-y-0.5 hover:bg-white"
      >
        <Search className="size-5" /> {t("ابحث برقمك الوطني", "Search with your national number")}
      </a>
      <a
        href="#lists"
        className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
      >
        <ListChecks className="size-5" /> {t("جدول نتائج القرعة", "Lottery results table")}
      </a>
      <span className="inline-flex items-center gap-2 rounded-full bg-ink/30 px-3 py-1.5 text-xs text-white/85 ring-1 ring-white/15">
        <ShieldCheck className="size-4 text-gold" /> {t(`آخر تحديث: ${RESULTS_SUMMARY.lastUpdate}`, `Last updated: ${dateEn(RESULTS_SUMMARY.lastUpdate)}`)}
      </span>
    </div>
  );
}
