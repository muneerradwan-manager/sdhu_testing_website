import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewsView } from "./view";

export const metadata: Metadata = { title: "مراجعة الطلبات" };

export default function Page() {
  return (
    <Suspense>
      <ReviewsView />
    </Suspense>
  );
}
