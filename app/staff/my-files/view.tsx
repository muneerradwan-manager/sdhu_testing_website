"use client";

import { BriefcaseBusiness, UserX } from "lucide-react";
import { useEmployees } from "@/lib/ops";
import { Empty, PageHeader, useStaffUser } from "../_components/kit";
import { MyFiles } from "./my-files";
import { MyFlights } from "./my-flights";

/** Every staff member's own page: his posts in the season's operational files */
export function MyFilesView() {
  const user = useStaffUser()!;
  const employee = useEmployees().find((e) => e.staffId === user.id);
  return (
    <div>
      <PageHeader
        eyebrow={user.title}
        icon={<BriefcaseBusiness />}
        title="ملفاتي التشغيلية"
        description="أين تعمل هذا الموسم ومتى: البرج أو المخيم، ومنصبك ووصفه الوظيفي، ومسؤولك المباشر، وفريقك وأرقام التواصل معهم. تُحدَّث الصفحة وحدها كلما غيّرت إدارة شؤون البعثة إسنادك."
      />
      {employee ? (
        <div className="space-y-6">
          <MyFlights employeeId={employee.id} />
          <MyFiles employee={employee} />
        </div>
      ) : (
        <Empty icon={<UserX />} title="حسابك غير مربوط بسجل موظف" text="يربطه قسم الموارد البشرية من صفحة الموظفين، ثم تظهر مواقعك هنا." />
      )}
    </div>
  );
}
