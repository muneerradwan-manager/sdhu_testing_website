"use client";

import { MovedTo } from "../../_components/ui";

/** «الرحلات» is a tab of «القوائم» now */
export default function Page() {
  return <MovedTo href="/administrator/lists?tab=flights" title="القوائم" />;
}
