import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StaffFrame } from "./_components/frame";

export const metadata: Metadata = {
  title: { default: "بوابة الموظفين", template: "%s | بوابة الموظفين" },
  description: "لوحة الموظفين الدائمين: مراجعة الطلبات، إعدادات الموسم، القرعة، الإداريون، غرفة العمليات وسجل الأحداث — بيانات تجريبية.",
};

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <StaffFrame>{children}</StaffFrame>;
}
