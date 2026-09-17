import type { Metadata } from "next";
import { AuditView } from "./view";

export const metadata: Metadata = { title: "سجل الأحداث" };

export default function Page() {
  return <AuditView />;
}
