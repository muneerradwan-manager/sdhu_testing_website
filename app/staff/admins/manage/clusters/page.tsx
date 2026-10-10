import type { Metadata } from "next";
import { Suspense } from "react";
import { ClustersTab } from "../../_components/clusters";

export const metadata: Metadata = { title: "التكتلات — إدارة الإداريين" };

/** A request opens from `?id=`, the other views from `?v=`: read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <ClustersTab />
    </Suspense>
  );
}
