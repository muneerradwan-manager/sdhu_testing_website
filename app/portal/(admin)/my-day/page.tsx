import type { Metadata } from "next";
import { AdminField } from "../field/field";

export const metadata: Metadata = { title: "يومي" };

export default function Page() {
  return <AdminField only="day" />;
}
