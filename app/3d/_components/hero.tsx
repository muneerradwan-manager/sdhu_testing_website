"use client";

import { PageHero } from "@/components/ui/page-hero";
import { useT } from "@/lib/i18n";

export function Tour3DHero() {
  const t = useT();
  return (
    <PageHero
      title={t("جولة ثلاثية الأبعاد", "3D Tour")}
      description={t(
        "تعرّف على المسجد الحرام والمسجد النبوي وجبل عرفات وجسر الجمرات ومسجدَي عائشة وقباء قبل أن تصل إليها: اختر المكان، ثم أدِر المجسم وقرّبه بإصبعك أو بالفأرة.",
        "Get to know Masjid al-Haram, the Prophet's Mosque, Mount Arafat, the Jamarat Bridge and the Aisha and Quba mosques before you arrive: choose a place, then turn the model and zoom in with your finger or the mouse.",
      )}
      image="/images/kaaba-hajj.jpg"
      crumbs={[{ label: t("دليل المناسك", "Hajj Rites Guide"), href: "/guide" }, { label: t("جولة ثلاثية الأبعاد", "3D Tour") }]}
    />
  );
}
