import type { Metadata } from "next";
import { BadgeCheck, QrCode, ShieldAlert } from "lucide-react";
import { CmsPageHero } from "@/components/cms/page-hero";
import { VerifyTabs } from "./_components/verify-tabs";

export const metadata: Metadata = {
  title: "التحقق من الجهات والوثائق",
  description: "تحقّق من اعتماد التكتلات والحملات، ومن صحة الإيصالات وشهادات الحج عبر رقمها أو رمز QR، وتصفّح دليل الخدمات المعتمد — بيانات تجريبية.",
};

export default function VerifyPage() {
  return (
    <>
      <CmsPageHero page="verify">
        <div className="mt-7 flex flex-wrap gap-2 text-sm">
          {[
            { icon: BadgeCheck, t: "تكتلات معتمدة لموسم 1448 بالقائمة الكاملة" },
            { icon: QrCode, t: "مسح رمز QR للإيصالات والشهادات" },
            { icon: ShieldAlert, t: "إبلاغ فوري عن الجهات المخالفة" },
          ].map((x) => (
            <span key={x.t} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur">
              <x.icon className="size-4 text-gold" /> {x.t}
            </span>
          ))}
        </div>
      </CmsPageHero>

      <section className="bg-pattern-dark">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 md:px-8 md:pt-14">
          <VerifyTabs />
        </div>
      </section>
    </>
  );
}
