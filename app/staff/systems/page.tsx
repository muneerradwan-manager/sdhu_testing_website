import type { Metadata } from "next";
import { Suspense } from "react";
import { SystemsView } from "./view";

export const metadata: Metadata = { title: "صلاحيات الإدارة" };

export default function Page() {
  return (
    <Suspense>
      <SystemsView />
    </Suspense>
  );
}
