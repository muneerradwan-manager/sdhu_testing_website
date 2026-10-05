import type { Metadata } from "next";
import { SystemsView } from "./view";

export const metadata: Metadata = { title: "صلاحيات الإدارة" };

export default function Page() {
  return <SystemsView />;
}
