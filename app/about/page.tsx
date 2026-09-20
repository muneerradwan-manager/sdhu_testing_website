import type { Metadata } from "next";
import { CmsPageHero } from "@/components/cms/page-hero";
import { Accounts, Branches, Contact, Departments, History, Intro, Leaders, Missions, Pillars, Principles, Stats } from "./_sections";

export const metadata: Metadata = {
  title: "من نحن",
  description: "تعرّف على إدارة الحج والعمرة السورية: رؤيتها ورسالتها، إداراتها وبعثاتها، مبادئ المنصة الوطنية للحج، ودليل الفروع والتواصل.",
};

/**
 * صفحة «من نحن». كل أقسامها يديرها موظف المحتوى من لوحة التحكم: النصوص والصور
 * والأسماء والأرقام ودليل الفروع، وله أن يخفي أي قسم أو يؤرشفه أو يعيد ترتيبه.
 */
export default function AboutPage() {
  return (
    <>
      <CmsPageHero page="about" />
      <Intro />
      <Pillars />
      <Stats />
      <History />
      <Leaders />
      <Departments />
      <Accounts />
      <Missions />
      <Principles />
      <Branches />
      <Contact />
    </>
  );
}
