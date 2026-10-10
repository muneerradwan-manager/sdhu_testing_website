"use client";

import { usePathname } from "next/navigation";
import { UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { OperationHeader } from "../_components/system";

/**
 * One operation of the employees' file: its own page from its own entry in the menu — the register first, then
 * the portal accounts tied to its records, then who takes part in the season. An employee's edit screen
 * brings its own title.
 */
export function EmployeesManageShell({ children }: { children: ReactNode }) {
  const own = usePathname().replace(/\/+$/, "").endsWith("/edit");
  return (
    <div>
      {!own && <OperationHeader system="staff" icon={<UsersRound />} />}
      <div className={own ? "" : "mt-5"}>{children}</div>
    </div>
  );
}
