import type { Metadata } from "next";
import { Suspense } from "react";
import { EmployeeEditor } from "../../editor";

export const metadata: Metadata = { title: "تعديل موظف — إدارة الموظفين" };

/** One employee's screen, from `?id=` (none adds a new one): read on the client, under its own boundary */
export default function Page() {
  return (
    <Suspense>
      <EmployeeEditor />
    </Suspense>
  );
}
