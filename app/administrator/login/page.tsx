import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginFlow } from "./login-flow";

export const metadata: Metadata = { title: "دخول الإداري" };

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginFlow />
    </Suspense>
  );
}
