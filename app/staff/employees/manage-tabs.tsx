"use client";

import { UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { OperationHeader } from "../_components/system";

/**
 * One operation of the employees' file: its own page from its own entry in the menu — the register first, then
 * the portal accounts tied to its records, then who takes part in the season — each with its records, and
 * every employee's and account's sheet with its own.
 */
export function EmployeesManageShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <OperationHeader system="staff" icon={<UsersRound />} />
      <div className="mt-5">{children}</div>
    </div>
  );
}
