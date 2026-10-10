import type { Metadata } from "next";
import { Suspense } from "react";
import { OperationalFilesView } from "./view";

export const metadata: Metadata = { title: "الملفات التشغيلية" };

/** The season's files, or one file's screen from `?type=&season=`: read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <OperationalFilesView />
    </Suspense>
  );
}
