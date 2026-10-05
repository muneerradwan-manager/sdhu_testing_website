"use client";

import { BadgeCheck, Layers, ScrollText, Star, UsersRound, Vote } from "lucide-react";
import type { ReactNode } from "react";
import { SYSTEMS } from "@/lib/systems";
import { PageHeader } from "../_components/kit";
import { SectionTabs } from "../_components/system";
import { useAdminsDesk } from "./desk";

/**
 * The administrators' file's management: one page, a tab for each part of the work in the order it is
 * done — the rules the season runs on, then who applied, the groups, the election and its clusters, then
 * the evaluation and the classification at the end — each with its records.
 */
export function AdminsManageShell({ children }: { children: ReactNode }) {
  const desk = useAdminsDesk();
  return (
    <div>
      <PageHeader
        eyebrow={SYSTEMS.admins.label}
        title={SYSTEMS.admins.manage.label}
        icon={<UsersRound />}
        description="عمل الإداريين كله في صفحة واحدة، بترتيب الموسم: تضبط القواعد قبل أن يتقدم أحد، ثم تتابع المتقدمين وملفاتهم، وتعتمد المجموعات، وتفتح انتخاب رؤساء التكتلات وتعتمد برامجها، ثم تقيّم الإداريين وتنشر التصنيف. وفي كل تبويب سجلّه، وفي ورقة كل ملف أو مجموعة أو تكتل سجلّها."
      />
      <SectionTabs
        label="تبويبات إدارة الإداريين"
        tabs={[
          { href: "/staff/admins/manage", label: "القواعد", icon: <ScrollText />, index: true, urgent: desk.badges.rules },
          { href: "/staff/admins/manage/applicants", label: "المتقدمون", icon: <UsersRound />, count: desk.totals.applied, urgent: desk.badges.applicants },
          { href: "/staff/admins/manage/groups", label: "المجموعات", icon: <BadgeCheck />, count: desk.groups.length, urgent: desk.badges.groups },
          { href: "/staff/admins/manage/clusters", label: "التكتلات والانتخاب", icon: <Vote />, urgent: desk.badges.clusters },
          { href: "/staff/admins/manage/evaluation", label: "التقييم", icon: <Star />, urgent: desk.badges.evaluation },
          { href: "/staff/admins/manage/grading", label: "التصنيف", icon: <Layers />, urgent: desk.badges.grading },
        ]}
      />
      <div className="mt-5">{children}</div>
    </div>
  );
}
