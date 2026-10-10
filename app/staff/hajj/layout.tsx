import type { ReactNode } from "react";
import { SystemGate } from "../_components/system";

/** «إدارة التسجيل على الحج» opens for its holder alone: its summary here, its management under /manage */
export default function RegistrationLayout({ children }: { children: ReactNode }) {
  return <SystemGate system="registration">{children}</SystemGate>;
}
