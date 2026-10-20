import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterFlow } from "./register-flow";

export const metadata: Metadata = { title: "إنشاء حساب في المنصة" };

export default function RegisterPage() {
  // RegisterFlow reads ?for= (what the visitor came to do): the static export needs it under Suspense
  return (
    <Suspense>
      <RegisterFlow />
    </Suspense>
  );
}
