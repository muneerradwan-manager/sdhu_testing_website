import type { Metadata } from "next";
import { AdminField } from "../field/field";

export const metadata: Metadata = { title: "قناة المجموعة" };

export default function Page() {
  return <AdminField only="channel" />;
}
