import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicationsPage } from "../../_components/applications";

export const metadata: Metadata = { title: "الطلبات ومراحلها — إدارة التسجيل على الحج" };

/** The list opens filtered from `?f=`: read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <ApplicationsPage />
    </Suspense>
  );
}
