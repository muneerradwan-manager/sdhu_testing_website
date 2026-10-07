import type { Metadata } from "next";
import { Suspense } from "react";
import { ReferencesTab } from "../../_components/references";

export const metadata: Metadata = { title: "المراجع الإدارية — إدارة الإداريين" };

/** Its tab is in the address (`?tab=plans`): read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <ReferencesTab />
    </Suspense>
  );
}
