import type { Metadata } from "next";
import { AdminApply } from "./apply";

export const metadata: Metadata = { title: "طلب المشاركة" };

export default function Page() {
  return <AdminApply />;
}
