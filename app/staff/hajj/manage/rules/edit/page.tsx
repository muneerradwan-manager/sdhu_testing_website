import type { Metadata } from "next";
import { Suspense } from "react";
import { RuleEditor } from "../../../_components/rules";

export const metadata: Metadata = { title: "تحرير شرط — إدارة التسجيل على الحج" };

/** Opens the item from `?id=`: read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <RuleEditor />
    </Suspense>
  );
}
