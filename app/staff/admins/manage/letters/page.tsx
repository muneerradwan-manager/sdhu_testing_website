import type { Metadata } from "next";
import { LettersTab } from "../../_components/letters";

export const metadata: Metadata = { title: "المراسلات — إدارة الإداريين" };

export default function Page() {
  return <LettersTab />;
}
