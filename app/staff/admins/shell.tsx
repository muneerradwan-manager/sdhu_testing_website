"use client";

import { UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { OperationHeader } from "../_components/system";

/**
 * One operation of the administrators' file: its own page, opened from its own entry in the menu (the menu
 * lists the file's operations in the order the work is done — the rules, the reference lists, who applied,
 * the groups, the cluster requests, the evaluation, the classification). No tabs of the other operations: each
 * page holds its own work and its own records.
 */
export function AdminsManageShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <OperationHeader system="admins" icon={<UsersRound />} />
      <div className="mt-5">{children}</div>
    </div>
  );
}
