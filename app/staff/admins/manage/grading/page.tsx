import type { Metadata } from "next";
import { GradingTab } from "../../_components/grading";

export const metadata: Metadata = { title: "التصنيف — إدارة الإداريين" };

export default function Page() {
  return <GradingTab />;
}
