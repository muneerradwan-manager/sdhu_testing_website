import type { Metadata } from "next";
import { ClusterChannelPage } from "./channel";

export const metadata: Metadata = { title: "قناة التكتل" };

export default function Page() {
  return <ClusterChannelPage />;
}
