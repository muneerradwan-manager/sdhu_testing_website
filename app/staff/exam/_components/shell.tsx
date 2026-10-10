"use client";

import { usePathname } from "next/navigation";
import { GraduationCap, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { actions, useStore } from "@/lib/store";
import { hallActions } from "@/app/administrator/_lib/halls";
import { logAs, useStaffUser } from "../../_components/kit";
import { OperationHeader, SystemGate } from "../../_components/system";
import { Box } from "../../_components/wp";

/** The exam file opens to the holders of «إدارة الامتحانات» alone — the director follows it from «صلاحيات الإدارة» */
export function ExamGate({ children }: { children: ReactNode }) {
  return <SystemGate system="exams">{children}</SystemGate>;
}

/**
 * One operation of the exam file: its own page from its own entry in the menu, in the order the work is done —
 * the halls, then the tests, then the question bank that fills them, then who sits where and the sittings, then
 * following them, the review, the results and the statistics. An edit screen (`…/edit`) brings its own head.
 */
export function ManageShell({ children }: { children: ReactNode }) {
  const path = usePathname().replace(/\/+$/, "");
  const own = path.endsWith("/edit");
  return (
    <div>
      {!own && <OperationHeader system="exams" icon={<GraduationCap />} />}
      <div className={own ? "" : "mt-5"}>{children}</div>
    </div>
  );
}

/**
 * Putting the tests and the question bank back as the platform ships them: rarely wanted, so it waits closed at the
 * end of the tests' and the bank's pages, and only once something was changed.
 */
export function ResetToOriginal() {
  const user = useStaffUser()!;
  const toast = useToast();
  const rules = useStore((s) => s.adminRules);
  const exams = useStore((s) => s.examHalls.exams);
  const edited = [rules.questionsOff, rules.questionEdits, rules.questionRoles, rules.blueprints, rules.questionsAdded, exams].some((v) => v !== undefined);
  if (!edited) return null;
  return (
    <Box title="خيارات متقدمة" open={false}>
      <p className="text-xs leading-5 text-white/60">يعيد الاختبارات وأقسامها ومواعيدها، وأسئلة البنك، كما تطلقها المنصة. يُسجَّل ويصل إلى مديرة الموسم.</p>
      <Button
        size="sm"
        variant="outline"
        className="border-white/25 text-white hover:bg-white/10"
        onClick={() => {
          actions.setAdminRules({ questionsOff: undefined, questionEdits: undefined, questionRoles: undefined, blueprints: undefined, questionsAdded: undefined });
          hallActions.resetExams();
          logAs(user, { action: "إعادة الاختبارات وبنك الأسئلة إلى الأصل", target: "موسم 1448", system: "exams", important: true });
          toast({ title: "أُعيد كل شيء إلى الأصل", body: "الاختبارات وأقسامها ومواعيدها، والأسئلة، كما تطلقها المنصة.", tone: "info", icon: "↩️" });
        }}
      >
        <RotateCcw className="size-4" /> إعادة الاختبارات والبنك إلى الأصل
      </Button>
    </Box>
  );
}
