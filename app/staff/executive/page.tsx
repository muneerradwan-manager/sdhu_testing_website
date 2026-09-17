import type { Metadata } from "next";
import { ExecutiveView } from "./view";

export const metadata: Metadata = { title: "لوحة الإدارة العليا" };

export default function Page() {
  return <ExecutiveView />;
}
