import type { Metadata } from "next";
import { EmployeesSummary } from "./summary";

export const metadata: Metadata = { title: "ملخص الموظفين" };

export default function Page() {
  return <EmployeesSummary />;
}
