import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicantsTab } from "../../_components/applicants";

export const metadata: Metadata = { title: "المتقدمون — إدارة الإداريين" };

/** A file opens from `?id=`, those that fall short from `?f=docs`: read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <ApplicantsTab />
    </Suspense>
  );
}
