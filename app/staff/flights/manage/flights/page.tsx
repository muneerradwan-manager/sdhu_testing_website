import type { Metadata } from "next";
import { Suspense } from "react";
import { FlightsList } from "../../view";

export const metadata: Metadata = { title: "الرحلات — إدارة الطيران" };

/** The list opens a flight's sheet from `?f=`: read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <FlightsList />
    </Suspense>
  );
}
