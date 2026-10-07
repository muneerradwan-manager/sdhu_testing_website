import type { Metadata } from "next";
import { JobDescriptionsPage } from "../_components/references-pages";

export const metadata: Metadata = { title: "التوصيف الوظيفي", description: "كل صفة في الموسم ومهامها، والهيكل التنظيمي للتكتل." };

export default function Page() {
  return <JobDescriptionsPage />;
}
