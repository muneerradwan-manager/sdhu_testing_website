import type { ReactNode } from "react";
import { FlightsManageShell } from "../manage-tabs";

export default function ManageLayout({ children }: { children: ReactNode }) {
  return <FlightsManageShell>{children}</FlightsManageShell>;
}
