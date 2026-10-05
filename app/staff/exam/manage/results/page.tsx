import type { Metadata } from "next";
import { Suspense } from "react";
import { Results } from "../../_components/results";

export const metadata: Metadata = { title: "النتائج — إدارة الامتحانات" };

/** The list opens filtered by `?s=` (where applicants stand): read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <Results />
    </Suspense>
  );
}
