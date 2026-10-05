import type { Metadata } from "next";
import { RulesTab } from "../_components/rules";

export const metadata: Metadata = { title: "القواعد — إدارة الإداريين" };

/** The management page opens on the rules, set before anyone applies */
export default function Page() {
  return <RulesTab />;
}
