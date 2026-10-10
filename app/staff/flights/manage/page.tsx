import type { Metadata } from "next";
import { Suspense } from "react";
import { AirportsPage } from "../refs";

export const metadata: Metadata = { title: "المطارات ومندوبوها — إدارة الطيران" };

/** The management opens on what the flights are built from: the airports and who represents each (`?filter=norep`: those without one) */
export default function Page() {
  return (
    <Suspense>
      <AirportsPage />
    </Suspense>
  );
}
