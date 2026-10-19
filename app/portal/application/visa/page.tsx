"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** «التأشيرة» became part of «خزنة الوثائق»: an old link to it opens the vault */
export default function Page() {
  const router = useRouter();
  useEffect(() => router.replace("/portal/application/documents"), [router]);
  return null;
}
