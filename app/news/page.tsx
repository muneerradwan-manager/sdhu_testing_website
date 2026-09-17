import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { ARTICLES } from "@/lib/data/news";
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
      <PageHero
        title={
          <>
            مدونة الإدارة <span className="text-gold-shine">والإعلانات الرسمية</span>
          </>
        }
        description="كل قرار وتعميم وإعلان يصدر عن الإدارة يُنشر هنا أولاً، بعد اعتماده. تابع مواعيد الموسم، ونتائج القبول، والتحذيرات المهمة."
        image="/images/haram-2022.jpg"
        crumbs={[{ label: "الأخبار" }]}
      >
        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/85 ring-1 ring-white/15 backdrop-blur">
          <Newspaper className="size-4 text-gold" />
          {ARTICLES.length} منشورات في موسم 1448هـ — المصدر الرسمي الوحيد لإعلانات الإدارة
        </p>
      </PageHero>

      <div className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <div className="relative z-10 -mt-6 md:-mt-8">
          <NewsTicker />
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <NewsExplorer articles={ARTICLES} />
          <NewsSidebar />
        </div>
      </div>
    </>
  );
}
