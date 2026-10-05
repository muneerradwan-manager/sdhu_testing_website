import type { ReactNode } from "react";
import { SystemGate } from "../_components/system";

/** The employees system opens for its owner alone: its summary here, its management under /manage */
export default function EmployeesLayout({ children }: { children: ReactNode }) {
  return <SystemGate system="staff">{children}</SystemGate>;
}
