import type { Metadata } from "next";
import { DirectoryTab } from "../../_components/directory";

export const metadata: Metadata = { title: "التكتلات والمجموعات — إدارة الإداريين" };

export default function Page() {
  return <DirectoryTab />;
}
