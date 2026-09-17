import type { Metadata } from "next";
import { RegisterFlow } from "./register-flow";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default function RegisterPage() {
  return <RegisterFlow />;
}
