import type { Metadata } from "next";
import { ListChecks, Search, ShieldCheck } from "lucide-react";
import { CmsHeading } from "@/components/cms/heading";
import { CmsPageHero } from "@/components/cms/page-hero";
import { Reveal } from "@/components/ui/motion";
import { RESULTS_SUMMARY } from "@/lib/data/public-results";
import { ResultsSummary } from "./_components/summary";
import { GovernorateChart, OutcomeDonut } from "./_components/charts";
import { ResultSearch } from "./_components/result-search";
import { PublicLists } from "./_components/public-lists";
import { LotteryExplainer } from "./_components/lottery-explainer";

export const metadata: Metadata = {
  title: "نتائج القبول 1448هـ",
  description: "الأعمار المقبولة وفق الأكبر سناً، وقوائم المقبولين بالقرعة والاحتياط، والبحث بالرقم الوطني — بيانات تجريبية.",
};

export default function ResultsPage() {
  return (
    <>
      <CmsPageHero page="results">
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <a
            href="#search"
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gold px-6 font-bold text-ink shadow-[0_12px_30px_-12px_rgba(217,200,158,.9)] transition hover:-translate-y-0.5 hover:bg-white"
          >
            <Search className="size-5" /> ابحث برقمك الوطني
          </a>
          <a
            href="#lists"
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
          >
            <ListChecks className="size-5" /> القوائم العامة
          </a>
          <span className="inline-flex items-center gap-2 rounded-full bg-ink/30 px-3 py-1.5 text-xs text-white/85 ring-1 ring-white/15">
            <ShieldCheck className="size-4 text-gold" /> آخر تحديث: {RESULTS_SUMMARY.lastUpdate}
          </span>
        </div>
      </CmsPageHero>

      <ResultsSummary />

      <section id="search" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 md:px-8 md:pt-28">
        <CmsHeading page="results" section="search" />
        <Reveal data-tour-target>
          <ResultSearch />
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 md:px-8 md:pt-28">
        <CmsHeading page="results" section="charts" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="h-full">
            <OutcomeDonut />
          </Reveal>
          <Reveal delay={0.1} className="h-full">
            <GovernorateChart />
          </Reveal>
        </div>
      </section>

      <section id="lists" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 md:px-8 md:pt-28">
        <CmsHeading page="results" section="lists" />
        <Reveal>
          <PublicLists />
        </Reveal>
      </section>

      <LotteryExplainer />
    </>
  );
}
