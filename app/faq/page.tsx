import type { Metadata } from "next";
import { FaqBody } from "./_components/faq-body";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة",
  description: "أجوبة معتمدة من الإدارة عن التسجيل والشروط والقبول والقرعة والتكاليف والخدمات، مصنّفة وقابلة للبحث — بيانات تجريبية.",
};

/** The page is drawn by a client component, so it follows the visitor's language */
export default function FaqPage() {
  return <FaqBody />;
}
