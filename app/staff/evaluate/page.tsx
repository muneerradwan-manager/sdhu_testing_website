import type { Metadata } from "next";
import { EvaluateView } from "./view";

export const metadata: Metadata = { title: "تقييم الإداريين" };

export default function Page() {
  return <EvaluateView />;
}
