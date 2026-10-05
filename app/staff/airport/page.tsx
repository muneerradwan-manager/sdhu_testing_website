import type { Metadata } from "next";
import { AirportView } from "./view";

export const metadata: Metadata = { title: "رحلات مطاري" };

export default function Page() {
  return <AirportView />;
}
