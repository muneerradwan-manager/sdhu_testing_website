import type { Metadata } from "next";
import { ReviewsView } from "./view";

export const metadata: Metadata = { title: "طلبات تحتاج مراجعة" };

export default function Page() {
  return <ReviewsView />;
}
