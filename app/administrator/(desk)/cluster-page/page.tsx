import type { Metadata } from "next";
import { ClusterPageDesk } from "./cluster-page";

export const metadata: Metadata = { title: "صفحة التكتل العامة" };

export default function Page() {
  return <ClusterPageDesk />;
}
