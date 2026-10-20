import type { Metadata } from "next";
import { MyContracts } from "./contracts";

export const metadata: Metadata = { title: "العقود" };

export default function Page() {
  return <MyContracts />;
}
