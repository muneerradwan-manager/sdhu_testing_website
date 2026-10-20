import type { Metadata } from "next";
import { AdminPilgrims } from "./pilgrims";

export const metadata: Metadata = { title: "تسجيل الحجاج" };

export default function Page() {
  return <AdminPilgrims />;
}
