import type { Metadata } from "next";
import { Bank } from "../../_components/bank";

export const metadata: Metadata = { title: "بنك الأسئلة — إدارة الامتحانات" };

export default function Page() {
  return <Bank />;
}
