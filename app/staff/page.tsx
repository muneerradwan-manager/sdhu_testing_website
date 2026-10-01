import type { Metadata } from "next";
import { StaffLanding } from "./_components/landing";

export const metadata: Metadata = {
  description: "بوابة الموظفين: مراجعة الطلبات، إعدادات الموسم، القرعة، الإداريون والمجموعات، الطيران، غرفة العمليات والملفات التشغيلية — بصلاحية لكل مهمة.",
};

export default function StaffHomePage() {
  return <StaffLanding />;
}
