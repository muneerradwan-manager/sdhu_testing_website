import type { Metadata } from "next";
import { AdminCluster } from "./cluster";

export const metadata: Metadata = { title: "تشكيل التكتلات" };

export default function Page() {
  return <AdminCluster part="formation" />;
}
