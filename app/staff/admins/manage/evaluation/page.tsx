import type { Metadata } from "next";
import { EvaluationTab } from "../../_components/evaluation";

export const metadata: Metadata = { title: "التقييم — إدارة الإداريين" };

export default function Page() {
  return <EvaluationTab />;
}
