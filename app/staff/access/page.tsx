import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessView } from "./view";

export const metadata: Metadata = { title: "صلاحيات الموظفين" };

export default function Page() {
  return (
    <Suspense>
      <AccessView />
    </Suspense>
  );
}
