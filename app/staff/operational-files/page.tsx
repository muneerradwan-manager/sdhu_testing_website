import type { Metadata } from "next";
import { OperationalFilesView } from "./view";

export const metadata: Metadata = { title: "الملفات التشغيلية" };

export default function Page() {
  return <OperationalFilesView />;
}
