import type { Metadata } from "next";
import { Suspense } from "react";
import { Season } from "../../season";

export const metadata: Metadata = { title: "المشاركون في الموسم — إدارة الموظفين" };

/** The season tab opens a filter from `?f=`: read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <Season />
    </Suspense>
  );
}
