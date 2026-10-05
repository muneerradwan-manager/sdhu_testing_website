import type { ReactNode } from "react";
import { AdminsManageShell } from "../shell";

/** The administrators' file's management: one page, its tabs, each with its records */
export default function ManageLayout({ children }: { children: ReactNode }) {
  return <AdminsManageShell>{children}</AdminsManageShell>;
}
