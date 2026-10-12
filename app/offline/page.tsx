import type { Metadata } from "next";
import { OfflineBody } from "./_components/offline-body";

export const metadata: Metadata = { title: "لا يوجد اتصال" };

export default function OfflinePage() {
  return <OfflineBody />;
}
