import type { Metadata } from "next";
import { CommitteeView } from "./view";

export const metadata: Metadata = { title: "لجنة التقييم" };

export default function Page() {
  return <CommitteeView />;
}
