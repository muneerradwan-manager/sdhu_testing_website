import type { Metadata } from "next";
import { ConditionsBody } from "./_components/conditions-body";

export const metadata: Metadata = {
  title: "شروط التسجيل والتكاليف",
  description: "شروط موسم الحج 1448هـ، وحدود الطلب، والرسوم والتكاليف مع حاسبة، ونسبتا القبول، وتقويم الموسم، وفحص أهلية مبدئي — بيانات تجريبية.",
};

/** The page's sections are drawn by a client component, so they follow the visitor's language */
export default function ConditionsPage() {
  return <ConditionsBody />;
}
