import type { Metadata } from "next";
import { AdminEvaluation } from "./evaluation";

export const metadata: Metadata = { title: "التقييم بعد الموسم" };

export default function Page() {
  return <AdminEvaluation />;
}
