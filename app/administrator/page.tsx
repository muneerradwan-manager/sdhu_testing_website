"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * The administrators had a landing page here; with one account and one sign-in its content lives elsewhere: signing in
 * and creating an account in the header, the roles and their conditions in «التسجيل كإداري», the cadre's references
 * in «المزيد» and in the administrator's sidebar («مراجع الكادر»). The old address leads to «ملفي», which asks a
 * visitor to sign in first
 */
export default function AdministratorPage() {
  const router = useRouter();
  useEffect(() => router.replace("/portal"), [router]);
  return null;
}
