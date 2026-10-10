import type { Metadata } from "next";
import { RulesList } from "../../_components/rules";

export const metadata: Metadata = { title: "شروط الأهلية — إدارة التسجيل على الحج" };

export default function Page() {
  return <RulesList />;
}
