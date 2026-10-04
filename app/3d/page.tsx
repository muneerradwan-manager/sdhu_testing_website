import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { Tour3D } from "./_components/tour";

export const metadata: Metadata = {
  title: "جولة ثلاثية الأبعاد",
  description: "مجسمات ثلاثية الأبعاد للمسجد الحرام والمسجد النبوي وجبل عرفات وجسر الجمرات ومسجدَي عائشة وقباء، للتعرّف على المكان قبل الوصول إليه.",
};

export default function Tour3DPage() {
  return (
    <>
      <PageHero
        title="جولة ثلاثية الأبعاد"
        description="تعرّف على المسجد الحرام والمسجد النبوي وجبل عرفات وجسر الجمرات ومسجدَي عائشة وقباء قبل أن تصل إليها: اختر المكان، ثم أدِر المجسم وقرّبه بإصبعك أو بالفأرة."
        image="/images/kaaba-hajj.jpg"
        crumbs={[{ label: "دليل المناسك", href: "/guide" }, { label: "جولة ثلاثية الأبعاد" }]}
      />
      <Tour3D />
    </>
  );
}
