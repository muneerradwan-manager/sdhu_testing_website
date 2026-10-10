import type { Metadata } from "next";
import { Suspense } from "react";
import { ReferenceTab } from "../../_components/reference";

export const metadata: Metadata = { title: "القوائم المرجعية — إدارة الإداريين" };

/** Its list is in the address (`?s=`): read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <ReferenceTab />
    </Suspense>
  );
}
