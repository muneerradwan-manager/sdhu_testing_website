import type { Metadata } from "next";
import { PlansPage } from "../_components/references-pages";

export const metadata: Metadata = { title: "الخطط التشغيلية", description: "خطة التكتل التشغيلية: ما تتضمنه، وكيف تُقدَّم وتُقبل." };

export default function Page() {
  return <PlansPage />;
}
