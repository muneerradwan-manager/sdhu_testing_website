import type { Metadata } from "next";
import { FlightsSummary } from "./summary";

export const metadata: Metadata = { title: "ملخص الطيران" };

export default function Page() {
  return <FlightsSummary />;
}
