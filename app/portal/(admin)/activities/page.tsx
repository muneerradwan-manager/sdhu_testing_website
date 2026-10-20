import type { Metadata } from "next";
import { AdminActivities } from "./activities";

export const metadata: Metadata = { title: "النشاطات الدينية" };

export default function Page() {
  return <AdminActivities />;
}
