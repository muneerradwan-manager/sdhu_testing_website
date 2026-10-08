import type { Metadata } from "next";
import { Suspense } from "react";
import { Review } from "../../_components/review";

export const metadata: Metadata = { title: "المراجعة والتقارير — إدارة الامتحانات" };

/** Opens on one of its tabs by `?t=`: read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <Review />
    </Suspense>
  );
}
