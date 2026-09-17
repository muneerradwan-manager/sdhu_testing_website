import type { Metadata } from "next";
import { AdminExam } from "./exam";

export const metadata: Metadata = { title: "الامتحان والنتيجة" };

export default function Page() {
  return <AdminExam />;
}
