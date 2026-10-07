import type { Metadata } from "next";
import { AdminGroup } from "./group";

export const metadata: Metadata = { title: "تشكيل المجموعات" };

export default function Page() {
  return <AdminGroup part="formation" />;
}
