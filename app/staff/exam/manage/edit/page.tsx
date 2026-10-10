import type { Metadata } from "next";
import { Suspense } from "react";
import { CenterEditor } from "../../_components/centers";

export const metadata: Metadata = { title: "تعديل قاعة — إدارة الامتحانات" };

/** Opens the hall from `?id=` (none: a new hall): read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <CenterEditor />
    </Suspense>
  );
}
