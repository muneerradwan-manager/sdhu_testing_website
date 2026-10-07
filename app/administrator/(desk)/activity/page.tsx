import type { Metadata } from "next";
import { AdminActivity } from "./activity";

export const metadata: Metadata = { title: "سجل نشاطي" };

export default function Page() {
  return <AdminActivity />;
}
