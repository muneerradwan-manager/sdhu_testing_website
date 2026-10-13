import type { Metadata } from "next";
import { CmsPageHero } from "@/components/cms/page-hero";
import { HeroBadges } from "./_components/hero-badges";
import { VerifyTabs } from "./_components/verify-tabs";

export const metadata: Metadata = {
  title: "التحقق من الجهات والوثائق",
  description: "تحقّق من اعتماد التكتلات والحملات، ومن صحة الإيصالات وشهادات الحج عبر رقمها أو رمز QR — بيانات تجريبية.",
};

export default function VerifyPage() {
  return (
    <>
      <CmsPageHero page="verify">
        <HeroBadges />
      </CmsPageHero>

      <section className="bg-pattern-dark">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 md:px-8 md:pt-14">
          <VerifyTabs />
        </div>
      </section>
    </>
  );
}
