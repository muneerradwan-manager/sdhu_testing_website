import type { Metadata } from "next";
import { AllDisplays } from "./_components/screen";

export const metadata: Metadata = {
  title: "شاشات القاعات",
  description: "كل شاشات عرض القاعات الامتحانية في صفحة واحدة، كما تعرضها الآن.",
};

export default function Page() {
  return <AllDisplays />;
}
