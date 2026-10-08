import type { Metadata } from "next";
import { Sittings } from "../../_components/sittings";

export const metadata: Metadata = { title: "جلسات الاختبار — إدارة الامتحانات" };

export default function Page() {
  return <Sittings />;
}
