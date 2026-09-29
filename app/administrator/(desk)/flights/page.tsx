import type { Metadata } from "next";
import { AdminFlights } from "./flights";

export const metadata: Metadata = { title: "الرحلات" };

export default function Page() {
  return <AdminFlights />;
}
