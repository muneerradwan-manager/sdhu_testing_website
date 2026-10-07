import type { Metadata } from "next";
import { ClustersTab } from "../../_components/clusters";

export const metadata: Metadata = { title: "التكتلات — إدارة الإداريين" };

export default function Page() {
  return <ClustersTab />;
}
