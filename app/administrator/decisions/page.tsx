import type { Metadata } from "next";
import { DecisionsPage } from "../_components/references-pages";

export const metadata: Metadata = { title: "المقررات الإدارية", description: "المقررات التي تصدرها الإدارة لكل موسم." };

export default function Page() {
  return <DecisionsPage />;
}
