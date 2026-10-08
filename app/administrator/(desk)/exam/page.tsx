import type { Metadata } from "next";
import { AdminExam } from "./exam";

export const metadata: Metadata = { title: "الاختبار المؤتمت ونتيجته" };

export default function Page() {
  return <AdminExam />;
}
