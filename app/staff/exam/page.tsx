import type { Metadata } from "next";
import { ExamSummary } from "./_components/summary";

export const metadata: Metadata = { title: "ملخص الامتحانات" };

export default function Page() {
  return <ExamSummary />;
}
