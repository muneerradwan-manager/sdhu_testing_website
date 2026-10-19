"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** «الرحلات والزيارات» became part of «التجمّعات»: a trip or a visit is a gathering of the group */
export default function Page() {
  const router = useRouter();
  useEffect(() => router.replace("/portal/season/gatherings"), [router]);
  return null;
}
