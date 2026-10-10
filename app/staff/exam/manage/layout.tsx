import type { ReactNode } from "react";
import { ManageShell } from "../_components/shell";

/** The exam file's operations: each its own page from its own entry in the menu; an edit screen brings its own head */
export default function ManageLayout({ children }: { children: ReactNode }) {
  return <ManageShell>{children}</ManageShell>;
}
