import type { Metadata } from "next";
import { ElectionView } from "./view";

export const metadata: Metadata = { title: "انتخاب رؤساء التكتلات" };

export default function Page() {
  return <ElectionView />;
}
