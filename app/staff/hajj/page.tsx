import type { Metadata } from "next";
import { RegistrationSummary } from "./summary";

export const metadata: Metadata = { title: "ملخص التسجيل على الحج" };

export default function Page() {
  return <RegistrationSummary />;
}
