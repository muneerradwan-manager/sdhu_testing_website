import type { Metadata } from "next";
import { AdminCluster } from "./cluster";

export const metadata: Metadata = { title: "التكتلات" };

export default function Page() {
  return <AdminCluster />;
}
