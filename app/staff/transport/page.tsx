import type { Metadata } from "next";
import { Suspense } from "react";
import { TransportView } from "./view";

export const metadata: Metadata = { title: "المواصلات" };

/** Its sections are read from `?view=`, on the client, under their own boundary */
export default function Page() {
  return (
    <Suspense>
      <TransportView />
    </Suspense>
  );
}
