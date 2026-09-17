import type { Metadata } from "next";
import { LotteryView } from "./view";

export const metadata: Metadata = { title: "القبول والقرعة" };

export default function Page() {
  return <LotteryView />;
}
