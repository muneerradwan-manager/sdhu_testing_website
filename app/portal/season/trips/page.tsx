"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** «الرحلات والزيارات» became part of «التجمّعات», now «أداء المناسك» */
export default function Page() {
  const router = useRouter();
  useEffect(() => router.replace("/portal/season/rites"), [router]);
  return null;
}
