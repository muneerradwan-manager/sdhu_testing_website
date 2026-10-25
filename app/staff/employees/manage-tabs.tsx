"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { UsersRound } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { OperationHeader } from "../_components/system";

/**
 * One operation of the employees' file: its own page from its own entry in the menu — the register first, then
 * the portal accounts tied to its records, then who takes part in the season, then the decisions and circulars.
 * An item's own screen (an employee's edit screen, a circular `?id=`) brings its own title.
 */
export function EmployeesManageShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div>{children}</div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const path = usePathname().replace(/\/+$/, "");
  const id = useSearchParams().get("id");
  const own = path.endsWith("/edit") || (path.endsWith("/circulars") && !!id);
  return (
    <div>
      {!own && <OperationHeader system="staff" icon={<UsersRound />} />}
      <div className={own ? "" : "mt-5"}>{children}</div>
    </div>
  );
}
