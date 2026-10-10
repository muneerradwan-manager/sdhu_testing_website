import type { Metadata } from "next";
import { Suspense } from "react";
import { LotteryView } from "./view";

export const metadata: Metadata = { title: "القبول والقرعة" };

export default function Page() {
  return (
    <Suspense>
      <LotteryView />
    </Suspense>
  );
}
