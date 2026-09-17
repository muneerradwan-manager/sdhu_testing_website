import type { Metadata } from "next";
import { AdminRequests } from "./requests";

export const metadata: Metadata = { title: "طلبات الانتساب" };

export default function Page() {
  return <AdminRequests />;
}
