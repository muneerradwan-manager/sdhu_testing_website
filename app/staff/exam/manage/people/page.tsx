import type { Metadata } from "next";
import { Suspense } from "react";
import { People } from "../../_components/people";

export const metadata: Metadata = { title: "المتقدمون — إدارة الامتحانات" };

/** The list opens filtered by `?c=` (a centre, or none): read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <People />
    </Suspense>
  );
}
