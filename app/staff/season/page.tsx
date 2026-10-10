import type { Metadata } from "next";
import { Suspense } from "react";
import { SeasonView } from "./view";

export const metadata: Metadata = { title: "إعدادات موسم 1448" };

export default function Page() {
  return (
    <Suspense>
      <SeasonView />
    </Suspense>
  );
}
