import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicantsTab } from "../../_components/applicants";

export const metadata: Metadata = { title: "المتقدمون — إدارة الإداريين" };

/** The files open filtered by `?f=docs` (those that fall short): read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <ApplicantsTab />
    </Suspense>
  );
}
