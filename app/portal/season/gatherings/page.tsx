"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** «التجمّعات» became «أداء المناسك»: each rite recorded after it was done */
export default function Page() {
  const router = useRouter();
  useEffect(() => router.replace("/portal/season/rites"), [router]);
  return null;
}
