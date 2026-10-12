import type { Metadata } from "next";
import { Tour3DHero } from "./_components/hero";
import { Tour3D } from "./_components/tour";

export const metadata: Metadata = {
  title: "جولة ثلاثية الأبعاد",
  description: "مجسمات ثلاثية الأبعاد للمسجد الحرام والمسجد النبوي وجبل عرفات وجسر الجمرات ومسجدَي عائشة وقباء، للتعرّف على المكان قبل الوصول إليه.",
};

export default function Tour3DPage() {
  return (
    <>
      <Tour3DHero />
      <Tour3D />
    </>
  );
}
