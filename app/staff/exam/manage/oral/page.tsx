import type { Metadata } from "next";
import { OralExams } from "../../_components/oral";

export const metadata: Metadata = { title: "الامتحان الشفهي — إدارة الامتحانات" };

export default function Page() {
  return <OralExams />;
}
