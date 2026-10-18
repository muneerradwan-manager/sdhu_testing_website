import type { Metadata } from "next";
import { GroupPageDesk } from "./group-page";

export const metadata: Metadata = { title: "صفحة المجموعة العامة" };

export default function Page() {
  return <GroupPageDesk />;
}
