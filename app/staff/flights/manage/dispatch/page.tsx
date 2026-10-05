import type { Metadata } from "next";
import { DispatchTab } from "../../manage-tabs";

export const metadata: Metadata = { title: "التفويج — إدارة الطيران" };

export default function Page() {
  return <DispatchTab />;
}
