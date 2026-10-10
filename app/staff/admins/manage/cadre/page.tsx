import type { Metadata } from "next";
import { Suspense } from "react";
import { CadreTab } from "../../_components/cadre";

export const metadata: Metadata = { title: "الكادر الإداري — إدارة الإداريين" };

/** A person opens from `?id=`, the other views from `?v=`: read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <CadreTab />
    </Suspense>
  );
}
