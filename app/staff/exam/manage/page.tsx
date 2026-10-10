import type { Metadata } from "next";
import { Centers } from "../_components/centers";

export const metadata: Metadata = { title: "القاعات والمحافظات — إدارة الامتحانات" };

/** The management opens on the halls, the first thing an exam needs */
export default function Page() {
  return <Centers />;
}
