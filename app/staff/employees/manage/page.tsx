import type { Metadata } from "next";
import { Suspense } from "react";
import { Register } from "../register";

export const metadata: Metadata = { title: "السجل — إدارة الموظفين" };

/** The management page opens on the register. A sheet from `?e=` and a filter from `?f=` are read on the client, under their own boundary */
export default function Page() {
  return (
    <Suspense>
      <Register />
    </Suspense>
  );
}
