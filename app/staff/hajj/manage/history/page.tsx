import type { Metadata } from "next";
import { HistoryPage } from "../../_components/history";

export const metadata: Metadata = { title: "الإصدارات والمواسم — إدارة التسجيل على الحج" };

export default function Page() {
  return <HistoryPage />;
}
