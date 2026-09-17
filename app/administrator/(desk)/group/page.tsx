import type { Metadata } from "next";
import { AdminGroup } from "./group";

export const metadata: Metadata = { title: "مجموعتي" };

export default function Page() {
  return <AdminGroup />;
}
