import type { Metadata } from "next";
import { Exams } from "../../_components/exams";

export const metadata: Metadata = { title: "الامتحانات — إدارة الامتحانات" };

export default function Page() {
  return <Exams />;
}
