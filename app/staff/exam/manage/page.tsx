import type { Metadata } from "next";
import { Centers } from "../_components/centers";

export const metadata: Metadata = { title: "المراكز — إدارة الامتحانات" };

/** The management page opens on the centres, the first thing an exam needs */
export default function Page() {
  return <Centers />;
}
