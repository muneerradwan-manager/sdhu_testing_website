import type { Metadata } from "next";
import { CmsPageHero } from "@/components/cms/page-hero";
import { NewsCount } from "./_components/news-count";
import { NewsExplorer } from "./_components/news-explorer";
import { NewsSidebar } from "./_components/news-sidebar";
import { NewsTicker } from "./_components/news-ticker";

export const metadata: Metadata = {
  title: "الأخبار والإعلانات الرسمية",
  description: "مدونة إدارة الحج والعمرة: القرارات والتعاميم والإعلانات الرسمية وأخبار موسم 1448هـ.",
};

export default function NewsPage() {
  return (
    <>
      <CmsPageHero page="news">
        <NewsCount />
      </CmsPageHero>

      <div className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <div className="relative z-10 -mt-6 md:-mt-8">
          <NewsTicker />
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <NewsExplorer />
          <NewsSidebar />
        </div>
      </div>
    </>
  );
}
