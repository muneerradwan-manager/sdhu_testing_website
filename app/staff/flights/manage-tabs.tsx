import type { ReactNode } from "react";

/**
 * Every operation of «إدارة الطيران» is its own page from its own entry in the menu, and brings its own head:
 * a list's title and line (`OperationHeader`), or an item's screen its way back to the list (`EditHeader`).
 */
export function FlightsManageShell({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
