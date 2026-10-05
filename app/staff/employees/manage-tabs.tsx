"use client";

import { CalendarCheck, IdCard, KeyRound, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { SYSTEMS } from "@/lib/systems";
import { PageHeader } from "../_components/kit";
import { SectionTabs } from "../_components/system";
import { useEmployeesDesk } from "./desk";

/**
 * The employees file's management: one page, a tab for each part of the work in the order it is done —
 * the register first, then the portal accounts tied to its records, then who takes part in the season —
 * each with its records, and every employee's and account's sheet with its own.
 */
export function EmployeesManageShell({ children }: { children: ReactNode }) {
  const desk = useEmployeesDesk();
  return (
    <div>
      <PageHeader
        eyebrow={SYSTEMS.staff.label}
        title={SYSTEMS.staff.manage.label}
        icon={<UsersRound />}
        description="عمل الموظفين كله في صفحة واحدة، بترتيب العمل: تحفظ سجل الموظفين وتستكمل بياناتهم أولاً، ثم تربط حسابات البوابة بأصحابها، ثم تسجّل المشاركين في الموسم وتتابع أين أُسندوا وعلى أي رحلة. وفي كل تبويب سجلّه، وفي ملف كل موظف سجلّه."
      />
      <SectionTabs
        label="تبويبات إدارة الموظفين"
        tabs={[
          { href: "/staff/employees/manage", label: "السجل", icon: <IdCard />, index: true, count: desk.employees.length, urgent: desk.badges.register },
          { href: "/staff/employees/manage/accounts", label: "الحسابات", icon: <KeyRound />, count: desk.accounts.length, urgent: desk.badges.accounts },
          { href: "/staff/employees/manage/season", label: "المشاركون في الموسم", icon: <CalendarCheck />, count: desk.participants.length, urgent: desk.badges.season },
        ]}
      />
      <div className="mt-5">{children}</div>
    </div>
  );
}
