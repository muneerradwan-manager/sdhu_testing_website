import type { Metadata } from "next";
import { Suspense } from "react";
import { MyCirculars } from "./view";

export const metadata: Metadata = { title: "القرارات والتعميمات" };

/** The open one (`?id=`) and the shelf (`?k=`, `?f=`) are read on the client, under their own boundary */
export default function Page() {
  return (
    <Suspense>
      <MyCirculars />
    </Suspense>
  );
}
