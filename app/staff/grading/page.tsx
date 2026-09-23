import type { Metadata } from "next";
import { GradingView } from "./view";

export const metadata: Metadata = { title: "تصنيف المجموعات والتكتلات" };

export default function Page() {
  return <GradingView />;
}
