import type { Metadata } from "next";
import { LiveSittings } from "../../_components/live";

export const metadata: Metadata = { title: "الجلسات الفعالة — إدارة الامتحانات" };

export default function Page() {
  return <LiveSittings />;
}
