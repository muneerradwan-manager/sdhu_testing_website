import type { Metadata } from "next";
import { Suspense } from "react";
import { StepEditor } from "../../../_components/steps";

export const metadata: Metadata = { title: "تحرير خطوة — إدارة التسجيل على الحج" };

/** Opens the item from `?id=`: read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <StepEditor />
    </Suspense>
  );
}
