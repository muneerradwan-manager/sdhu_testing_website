import type { Metadata } from "next";
import { AdminGroup } from "../group/group";

export const metadata: Metadata = { title: "إدارة المجموعات" };

export default function Page() {
  return <AdminGroup part="manage" />;
}
