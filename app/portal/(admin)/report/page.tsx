import type { Metadata } from "next";
import { AdminField } from "../field/field";

export const metadata: Metadata = { title: "بلاغ لغرفة العمليات" };

export default function Page() {
  return <AdminField only="ticket" />;
}
