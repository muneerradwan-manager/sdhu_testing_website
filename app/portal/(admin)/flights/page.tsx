"use client";

import { MovedTo } from "@/app/administrator/_components/ui";

/** «الرحلات» is a tab of «القوائم» now */
export default function Page() {
  return <MovedTo href="/portal/lists?tab=flights" title="القوائم" />;
}
