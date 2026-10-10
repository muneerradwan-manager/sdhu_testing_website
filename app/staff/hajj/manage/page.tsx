import type { Metadata } from "next";
import { PagesList } from "../_components/pages";

export const metadata: Metadata = { title: "صفحات التسجيل — إدارة التسجيل على الحج" };

export default function Page() {
  return <PagesList />;
}
