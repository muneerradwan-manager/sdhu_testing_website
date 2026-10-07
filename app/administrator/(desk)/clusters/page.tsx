import type { Metadata } from "next";
import { AdminCluster } from "../cluster/cluster";

export const metadata: Metadata = { title: "إدارة التكتلات" };

export default function Page() {
  return <AdminCluster part="manage" />;
}
