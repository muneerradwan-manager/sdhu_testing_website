import type { ReactNode } from "react";
import { EmployeesManageShell } from "../manage-tabs";

export default function ManageLayout({ children }: { children: ReactNode }) {
  return <EmployeesManageShell>{children}</EmployeesManageShell>;
}
