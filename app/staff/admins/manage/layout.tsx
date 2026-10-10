import type { ReactNode } from "react";
import { AdminsManageShell } from "../shell";

/** The administrators' file's operations: each its own page under the operation's title */
export default function ManageLayout({ children }: { children: ReactNode }) {
  return <AdminsManageShell>{children}</AdminsManageShell>;
}
