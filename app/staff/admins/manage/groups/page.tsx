import type { Metadata } from "next";
import { GroupsTab } from "../../_components/groups";

export const metadata: Metadata = { title: "المجموعات — إدارة الإداريين" };

export default function Page() {
  return <GroupsTab />;
}
