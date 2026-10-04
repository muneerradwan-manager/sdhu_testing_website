import type { Metadata } from "next";
import { ExamView } from "./view";

export const metadata: Metadata = { title: "إدارة الامتحان" };

export default function Page() {
  return <ExamView />;
}
