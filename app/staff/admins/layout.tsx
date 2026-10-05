import type { ReactNode } from "react";
import { SystemGate } from "../_components/system";

/** The administrators' file opens to the holders of «إدارة الإداريين» alone: its summary here, its management under /manage */
export default function AdminsLayout({ children }: { children: ReactNode }) {
  return <SystemGate system="admins">{children}</SystemGate>;
}
