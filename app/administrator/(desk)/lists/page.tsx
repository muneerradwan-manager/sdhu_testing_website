import type { Metadata } from "next";
import { AdminLists } from "./lists";

export const metadata: Metadata = { title: "القوائم" };

export default function Page() {
  return <AdminLists />;
}
