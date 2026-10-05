import type { ReactNode } from "react";
import { SystemGate } from "../_components/system";

/** The flights system opens for its owner alone: its summary here, its management under /manage */
export default function FlightsLayout({ children }: { children: ReactNode }) {
  return <SystemGate system="flights">{children}</SystemGate>;
}
