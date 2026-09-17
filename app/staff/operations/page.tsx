import type { Metadata } from "next";
import { OperationsView } from "./view";

export const metadata: Metadata = { title: "غرفة العمليات" };

export default function Page() {
  return <OperationsView />;
}
