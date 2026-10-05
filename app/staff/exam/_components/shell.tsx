"use client";

import { CalendarClock, FileQuestion, GraduationCap, Landmark, RotateCcw, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { actions, useStore } from "@/lib/store";
import { SYSTEMS } from "@/lib/systems";
import { useExamBank } from "@/app/administrator/_lib/admin-rules";
import { hallActions } from "@/app/administrator/_lib/halls";
import { logAs, PageHeader, useStaffUser } from "../../_components/kit";
import { SectionTabs, SystemGate } from "../../_components/system";
import { useExamDesk } from "./desk";

/** The exam file opens to the holders of «إدارة الامتحانات» alone — the director follows it from «صلاحيات الإدارة» */
export function ExamGate({ children }: { children: ReactNode }) {
  return <SystemGate system="exams">{children}</SystemGate>;
}

/**
 * The exam file's management: one page, a tab for each part in the order the work is done — the centres
 * and the question bank the exams are built on, then the exams, then who sits where, then the results —
 * each with its records.
 */
export function ManageShell({ children }: { children: ReactNode }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const desk = useExamDesk();
  const bank = useExamBank();
  const rules = useStore((s) => s.adminRules);
  const exams = useStore((s) => s.examHalls.exams);
  const edited = [rules.exam, rules.questionsOff, rules.questionEdits, rules.questionRoles, rules.blueprints, rules.questionsAdded, exams].some((v) => v !== undefined);

  return (
    <div>
      <PageHeader
        eyebrow={SYSTEMS.exams.label}
        title={SYSTEMS.exams.manage.label}
        icon={<GraduationCap />}
        description="عمل الامتحان كله في صفحة واحدة، بترتيب العمل: تجهّز المراكز وبنك الأسئلة أولاً، ثم تبني الامتحانات ومواعيدها، ثم توزّع المتقدمين، ثم تصحّح وتعلن النتائج. وفي كل تبويب سجلّه: ما تغيّر فيه، ومن غيّره، ومتى."
        actions={
          edited && (
            <Button
              size="sm"
              variant="outline"
              className="border-white/25 text-white hover:bg-white/10"
              onClick={() => {
                actions.setAdminRules({ exam: undefined, questionsOff: undefined, questionEdits: undefined, questionRoles: undefined, blueprints: undefined, questionsAdded: undefined });
                hallActions.resetExams();
                logAs(user, { action: "إعادة الامتحانات وبنك الأسئلة وقواعد النجاح إلى الأصل", target: "موسم 1448", system: "exams", important: true });
                toast({ title: "أُعيد كل شيء إلى الأصل", body: "الامتحانات ومواعيدها، والأسئلة، وقواعد النجاح كما تطلقها المنصة.", tone: "info", icon: "↩️" });
              }}
            >
              <RotateCcw className="size-4" /> إعادة إلى الأصل
            </Button>
          )
        }
      />
      <SectionTabs
        label="تبويبات إدارة الامتحانات"
        tabs={[
          { href: "/staff/exam/manage", label: "المراكز", icon: <Landmark />, index: true, urgent: desk.badges.centers },
          { href: "/staff/exam/manage/bank", label: "بنك الأسئلة", icon: <FileQuestion />, count: bank.length },
          { href: "/staff/exam/manage/exams", label: "الامتحانات", icon: <CalendarClock />, urgent: desk.badges.exams },
          { href: "/staff/exam/manage/people", label: "المتقدمون", icon: <UsersRound />, urgent: desk.badges.people },
          { href: "/staff/exam/manage/results", label: "النتائج", icon: <GraduationCap />, count: desk.badges.results || undefined },
        ]}
      />
      <div className="mt-5">{children}</div>
    </div>
  );
}
