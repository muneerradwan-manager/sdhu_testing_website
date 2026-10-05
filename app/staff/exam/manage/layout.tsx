import type { ReactNode } from "react";
import { ManageShell } from "../_components/shell";

/** The exam system's management: one page, its tabs, each with its records */
export default function ManageLayout({ children }: { children: ReactNode }) {
  return <ManageShell>{children}</ManageShell>;
}
