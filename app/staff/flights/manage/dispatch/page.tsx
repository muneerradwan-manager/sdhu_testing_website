import type { Metadata } from "next";
import { Suspense } from "react";
import { DispatchPage } from "../../dispatch";

export const metadata: Metadata = { title: "التفويج — إدارة الطيران" };

/** One of the dispatch's lists opens from `?view=`: read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <DispatchPage />
    </Suspense>
  );
}
