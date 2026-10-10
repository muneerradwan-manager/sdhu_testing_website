import type { Metadata } from "next";
import { StepsList } from "../../_components/steps";

export const metadata: Metadata = { title: "الخطوات بعد القبول — إدارة التسجيل على الحج" };

export default function Page() {
  return <StepsList />;
}
