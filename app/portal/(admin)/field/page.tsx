import type { Metadata } from "next";
import { AdminField } from "./field";

export const metadata: Metadata = { title: "الميدان" };

export default function Page() {
  return <AdminField />;
}
