import type { Metadata } from "next";
import { ClusterProfilesView } from "./view";

export const metadata: Metadata = { title: "برامج التكتلات" };

export default function Page() {
  return <ClusterProfilesView />;
}
