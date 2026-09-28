import type { Metadata } from "next";
import { MyFilesView } from "./view";

export const metadata: Metadata = { title: "ملفاتي التشغيلية" };

export default function Page() {
  return <MyFilesView />;
}
