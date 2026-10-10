import type { ReactNode } from "react";
import { RegManageShell } from "../_components/shell";

export default function ManageLayout({ children }: { children: ReactNode }) {
  return <RegManageShell>{children}</RegManageShell>;
}
