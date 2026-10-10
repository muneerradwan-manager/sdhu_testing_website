"use client";

import { useSearchParams } from "next/navigation";
import { UsersRound } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { OperationHeader } from "../_components/system";

/**
 * One operation of the administrators' file: its own page, opened from its own entry in the menu (the menu
 * lists the file's operations in the order the work is done). Its title heads the page — except on an item's
 * own edit screen (`?id=`), which brings its own heading and its way back to the list.
 */
export function AdminsManageShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <Suspense fallback={<OperationHeader system="admins" icon={<UsersRound />} />}>
        <Header />
      </Suspense>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Header() {
  const editing = useSearchParams().has("id");
  return editing ? null : <OperationHeader system="admins" icon={<UsersRound />} />;
}
