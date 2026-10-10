import type { Metadata } from "next";
import { Suspense } from "react";
import { OperationsView } from "./view";

export const metadata: Metadata = { title: "غرفة العمليات" };

export default function Page() {
  return (
    <Suspense>
      <OperationsView />
    </Suspense>
  );
}
