import type { Metadata } from "next";
import { Suspense } from "react";
import { RulesTab } from "../_components/rules";

export const metadata: Metadata = { title: "القواعد — إدارة الإداريين" };

/** Its section is in the address (`?s=`): read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <RulesTab />
    </Suspense>
  );
}
