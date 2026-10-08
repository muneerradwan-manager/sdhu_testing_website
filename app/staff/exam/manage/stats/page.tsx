import type { Metadata } from "next";
import { Stats } from "../../_components/stats";

export const metadata: Metadata = { title: "الإحصائيات — إدارة الامتحانات" };

export default function Page() {
  return <Stats />;
}
