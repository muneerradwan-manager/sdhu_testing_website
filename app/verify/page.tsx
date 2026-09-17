import type { Metadata } from "next";
import { BadgeCheck, QrCode, ShieldAlert } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { CLUSTERS } from "@/lib/data/clusters";
import { VerifyTabs } from "./_components/verify-tabs";

export const metadata: Metadata = {
  title: "التحقق من الجهات والوثائق",
  description: "تحقّق من اعتماد التكتلات والحملات، ومن صحة الإيصالات وشهادات الحج عبر رقمها أو رمز QR، وتصفّح دليل الخدمات المعتمد — بيانات تجريبية.",
};

export default function VerifyPage() {
  return (
    <>
      <PageHero
        title={
          <>
            التحقق من <span className="text-gold-shine">الجهات والوثائق</span>
          </>
        }
        description="قبل أن تدفع أي مبلغ أو تعتمد على أي ورقة: تأكد أن الجهة معتمدة للموسم، وأن الإيصال أو الشهادة صادرة فعلاً عن المنصة."
        image="/images/kaaba-panoramio.jpg"
        crumbs={[{ label: "التحقق من الجهات والوثائق" }]}
      >
        <div className="mt-7 flex flex-wrap gap-2 text-sm">
          {[
            { icon: BadgeCheck, t: `${CLUSTERS.length} تكتلات معتمدة لموسم 1448` },
            { icon: QrCode, t: "مسح رمز QR للإيصالات والشهادات" },
            { icon: ShieldAlert, t: "إبلاغ فوري عن الجهات المخالفة" },
          ].map((x) => (
            <span key={x.t} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur">
              <x.icon className="size-4 text-gold" /> {x.t}
            </span>
          ))}
        </div>
      </PageHero>

      <section className="bg-pattern-dark">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 md:px-8 md:pt-14">
          <VerifyTabs />
        </div>
      </section>
    </>
  );
}
