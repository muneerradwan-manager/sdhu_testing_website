import type { Metadata } from "next";
import { AdminRegisterFlow } from "./register-flow";

export const metadata: Metadata = { title: "إنشاء حساب إداري" };

export default function AdminRegisterPage() {
  return <AdminRegisterFlow />;
}
