import type { Metadata } from "next";
import { AdminLessons } from "./lessons";

export const metadata: Metadata = { title: "الدروس الدينية" };

export default function Page() {
  return <AdminLessons />;
}
