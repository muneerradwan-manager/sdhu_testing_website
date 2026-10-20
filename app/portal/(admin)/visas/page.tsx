import type { Metadata } from "next";
import { AdminVisas } from "./visas";

export const metadata: Metadata = { title: "التأشيرات" };

export default function Page() {
  return <AdminVisas />;
}
