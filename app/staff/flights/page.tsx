import type { Metadata } from "next";
import { FlightsView } from "./view";

export const metadata: Metadata = { title: "الطيران" };

export default function Page() {
  return <FlightsView />;
}
