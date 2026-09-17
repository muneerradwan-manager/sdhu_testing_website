import type { Metadata } from "next";
import { AdministratorLanding } from "./_components/landing";

export const metadata: Metadata = {
  description: "رئيس تكتل، رئيس مجموعة، معاون، موجّه، منسق تقني — رحلة الإداري من الامتحان إلى تشكيل المجموعة إلى الميدان.",
};

export default function AdministratorPage() {
  return <AdministratorLanding />;
}
