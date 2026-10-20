"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * One sign-in for everyone: the account is one, pilgrim or administrator. The administrators' old sign-in address
 * leads to it, with its demo administrators shown first (and what the address asked for: ?next, ?demo=all).
 */
export default function AdminLoginPage() {
  const router = useRouter();
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (!q.get("demo")) q.set("demo", "admins");
    router.replace(`/login?${q.toString()}`);
  }, [router]);
  return null;
}
