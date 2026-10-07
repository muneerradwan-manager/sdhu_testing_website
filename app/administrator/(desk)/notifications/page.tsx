import type { Metadata } from "next";
import { AdminNotifications } from "./notifications";

export const metadata: Metadata = { title: "الإشعارات" };

export default function Page() {
  return <AdminNotifications />;
}
