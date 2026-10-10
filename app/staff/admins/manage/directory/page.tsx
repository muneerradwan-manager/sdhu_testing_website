import type { Metadata } from "next";
import { Suspense } from "react";
import { DirectoryTab } from "../../_components/directory";

export const metadata: Metadata = { title: "التكتلات والمجموعات — إدارة الإداريين" };

/** Its list is in the address (`?v=`): read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <DirectoryTab />
    </Suspense>
  );
}
