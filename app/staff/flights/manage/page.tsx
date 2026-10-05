import type { Metadata } from "next";
import { RefsTab } from "../manage-tabs";

export const metadata: Metadata = { title: "المطارات والناقلون — إدارة الطيران" };

/** The management page opens on what the flights are built from: airports, carriers and their representatives */
export default function Page() {
  return <RefsTab />;
}
