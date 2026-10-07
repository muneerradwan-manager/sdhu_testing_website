"use client";

import { GraduationCap, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { actions, useStore } from "@/lib/store";
import { hallActions } from "@/app/administrator/_lib/halls";
import { logAs, useStaffUser } from "../../_components/kit";
import { OperationHeader, SystemGate } from "../../_components/system";

/** The exam file opens to the holders of «إدارة الامتحانات» alone — the director follows it from «صلاحيات الإدارة» */
export function ExamGate({ children }: { children: ReactNode }) {
  return <SystemGate system="exams">{children}</SystemGate>;
}

/**
 * One operation of the exam file: its own page from its own entry in the menu, in the order the work is done —
 * the centres, then the exams and their sections, then the question bank that fills them, then who sits where,
 * then the results — each with its records. Putting the whole file back as the platform ships it stays at hand
 * on every one of them.
 */
export function ManageShell({ children }: { children: ReactNode }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const rules = useStore((s) => s.adminRules);
  const exams = useStore((s) => s.examHalls.exams);
  const edited = [rules.exam, rules.questionsOff, rules.questionEdits, rules.questionRoles, rules.blueprints, rules.questionsAdded, exams].some((v) => v !== undefined);

  return (
    <div>
      <OperationHeader
        system="exams"
        icon={<GraduationCap />}
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
      <div className="mt-5">{children}</div>
    </div>
  );
}
