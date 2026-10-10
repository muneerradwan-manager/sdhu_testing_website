import type { Metadata } from "next";
import { Suspense } from "react";
import { ExamEditor } from "../../../_components/exams";

export const metadata: Metadata = { title: "تعديل اختبار — إدارة الامتحانات" };

/** Opens the test from `?id=` (none: a new one, shaped by `?role=`, `?kind=` and `?centers=`): read on the client */
export default function Page() {
  return (
    <Suspense>
      <ExamEditor />
    </Suspense>
  );
}
