import type { Metadata } from "next";
import { AdminRequests } from "./requests";

export const metadata: Metadata = { title: "حجاج المجموعة" };

export default function Page() {
  return <AdminRequests />;
}
