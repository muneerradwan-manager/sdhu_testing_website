import type { Metadata } from "next";
import { AdminsSummary } from "./summary";

export const metadata: Metadata = { title: "ملخص الإداريين" };

export default function Page() {
  return <AdminsSummary />;
}
