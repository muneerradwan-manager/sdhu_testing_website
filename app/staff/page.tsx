import type { Metadata } from "next";
import { StaffLogin } from "./_components/login";

export const metadata: Metadata = { title: "دخول الموظفين" };

export default function StaffLoginPage() {
  return <StaffLogin />;
}
