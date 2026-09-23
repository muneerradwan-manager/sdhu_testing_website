import type { Metadata } from "next";
import { AdminRulesView } from "./view";

export const metadata: Metadata = { title: "قواعد الإداريين" };

export default function Page() {
  return <AdminRulesView />;
}
