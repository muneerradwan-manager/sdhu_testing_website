import type { Metadata } from "next";
import { CmsHeading } from "@/components/cms/heading";
import { CmsPageHero } from "@/components/cms/page-hero";
import { Reveal } from "@/components/ui/motion";
import { ResultsSummary } from "./_components/summary";
import { GovernorateChart, OutcomeDonut } from "./_components/charts";
import { ResultSearch } from "./_components/result-search";
import { PublicLists } from "./_components/public-lists";
import { LotteryExplainer } from "./_components/lottery-explainer";
import { HeroLinks } from "./_components/hero-links";

export const metadata: Metadata = {
  title: "نتائج القبول 1448هـ",
  description: "الأعمار المقبولة وفق الأكبر سناً، وجدول سنوات الميلاد وأشهرها المسحوبة في القرعة، والبحث بالرقم الوطني — بيانات تجريبية.",
};

export default function ResultsPage() {
  return (
    <>
      <CmsPageHero page="results">
        <HeroLinks />
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
