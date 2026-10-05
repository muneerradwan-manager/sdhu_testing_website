import type { Metadata } from "next";
import { Suspense } from "react";
import { Accounts } from "../../accounts";

export const metadata: Metadata = { title: "الحسابات — إدارة الموظفين" };

/** The accounts open one sheet from `?a=` and a filter from `?f=`: read on the client, under their own boundary */
export default function Page() {
  return (
    <Suspense>
      <Accounts />
    </Suspense>
  );
}
