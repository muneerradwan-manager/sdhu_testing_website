import type { Metadata } from "next";
import { Suspense } from "react";
import { MedicalView } from "./view";

export const metadata: Metadata = { title: "الفريق الطبي" };

/** Its sections are read from `?view=`, on the client, under their own boundary */
export default function Page() {
  return (
    <Suspense>
      <MedicalView />
    </Suspense>
  );
}
