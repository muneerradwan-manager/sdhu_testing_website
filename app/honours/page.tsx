import type { Metadata } from "next";
import { HallOfHonour } from "./_components/hall-of-honour";

export const metadata: Metadata = {
  title: "لوحة الشرف",
  description: "المتميّزون من إداريي المنصة في كل موسم: ترتيب أفضل رؤساء المجموعات، وأفضل تكتل، وأوائل المنسقين والموجّهين والمعاونين، من موسم 1444هـ حتى 1447هـ — بيانات تجريبية.",
};

/** The administrators each season honoured, linked from «المزيد» (app/honours/_lib/roll reads them from the platform's records) */
export default function HonoursPage() {
  return <HallOfHonour />;
}
