import type { ReactNode } from "react";
import { ExamGate } from "./_components/shell";

/** The exam system opens for its owner alone: its summary here, its management under /manage */
export default function ExamLayout({ children }: { children: ReactNode }) {
  return <ExamGate>{children}</ExamGate>;
}
