import type { Metadata } from "next";
import { EmployeesView } from "./view";

export const metadata: Metadata = { title: "الموظفون" };

export default function Page() {
  return <EmployeesView />;
}
