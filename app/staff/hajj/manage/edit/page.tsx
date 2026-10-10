import type { Metadata } from "next";
import { Suspense } from "react";
import { PageEditor } from "../../_components/pages";

export const metadata: Metadata = { title: "تحرير صفحة — إدارة التسجيل على الحج" };

/** Opens the item from `?id=`: read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <PageEditor />
    </Suspense>
  );
}
