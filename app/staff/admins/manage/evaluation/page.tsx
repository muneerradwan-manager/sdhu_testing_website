import type { Metadata } from "next";
import { Suspense } from "react";
import { EvaluationTab } from "../../_components/evaluation";

export const metadata: Metadata = { title: "التقييم — إدارة الإداريين" };

/** An administrator opens from `?id=`: read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <EvaluationTab />
    </Suspense>
  );
}
