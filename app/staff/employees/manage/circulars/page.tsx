import type { Metadata } from "next";
import { Suspense } from "react";
import { Circulars } from "../../circulars";

export const metadata: Metadata = { title: "القرارات والتعميمات — إدارة الموظفين" };

/** The shelf (`?s=`) and the open item (`?id=`) are read on the client, under their own boundary */
export default function Page() {
  return (
    <Suspense>
      <Circulars />
    </Suspense>
  );
}
