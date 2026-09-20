import type { Metadata } from "next";
import { CmsPageHero } from "@/components/cms/page-hero";
import { Reveal } from "@/components/ui/motion";
import { AcademyCard, Notice, Planned } from "./_sections";
import { NotifyForm } from "./notify-form";

export const metadata: Metadata = {
  title: "العمرة — قريباً",
  description: "خدمات العمرة على المنصة الوطنية قيد الإعداد، وستُعلن تفاصيلها عند اعتمادها.",
};

/**
 * صفحة خدمات العمرة. لا برنامج ولا سعر ولا موعد مخترع هنا: كل ما يظهر هو قدرة مخطط لها
 * موسومة بـ«قريباً»، وكل نصوصها تُدار من لوحة المحتوى حتى تنشر الإدارة التفاصيل المعتمدة.
 */
export default function UmrahPage() {
  return (
    <>
      <CmsPageHero page="umrah" variant="badge" />
      <Notice />
      <Planned />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pt-20 md:px-8 md:pt-24 lg:grid-cols-2">
        <AcademyCard />
        <Reveal delay={0.1}>
          <NotifyForm />
        </Reveal>
      </section>
    </>
  );
}
