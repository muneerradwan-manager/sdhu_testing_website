import type { Metadata } from "next";
import { AdminDashboard } from "./dashboard";

export const metadata: Metadata = { title: "ملفي كإداري" };

export default function Page() {
  return <AdminDashboard />;
}
