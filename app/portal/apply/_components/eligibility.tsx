"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleMinus, UserPlus, UserRoundX, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ageOf, relationLabel } from "@/lib/registry";
import type { EligibilityResult, Member } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { PersonChip, Question } from "./ui";

const ICON = {
  pass: <CheckCircle2 className="size-5 text-green-light" />,
  warn: <AlertTriangle className="size-5 text-gold-dark" />,
  fail: <XCircle className="size-5 text-maroon" />,
  na: <CircleMinus className="size-5 text-hint" />,
};

export function EligibilityCheck({
  result,
  members,
  onContinue,
  onRemove,
  onAddPerson,
  onFixCompanion,
  onFixHealth,
}: {
  result: EligibilityResult;
  members: Member[];
  onContinue: () => void;
  onRemove: (id: string) => void;
  onAddPerson: () => void;
  onFixCompanion: () => void;
  onFixHealth: () => void;
}) {
  const totalRows = result.members.reduce((n, m) => n + m.checks.length, 0) + result.general.length;
  const [shown, setShown] = useState(0);
  const done = shown >= totalRows;

  useEffect(() => {
    if (shown >= totalRows) return;
    const t = setTimeout(() => setShown((s) => s + 1), 110);
    return () => clearTimeout(t);
  }, [shown, totalRows]);

  const memberStarts = result.members.map((_, i) => result.members.slice(0, i).reduce((n, m) => n + m.checks.length, 0));
  const generalStart = result.members.reduce((n, m) => n + m.checks.length, 0);
  const failures = result.members.flatMap((m) => m.checks.filter((c) => c.status === "fail").map((c) => ({ ...c, memberId: m.id, name: m.name })));
  const generalFail = result.general.filter((g) => g.status === "fail");

  return (
    <Question
      title={done ? (result.eligible ? "جميع أفراد الطلب مستوفون للشروط" : "هناك ملاحظات تحتاج إلى تعديل") : "نطبّق شروط موسم 1448 على كل فرد..."}
      hint={done ? (result.eligible ? "يمكنك المتابعة إلى الموافقات والوثائق والدفع." : "لن يُقبل الطلب بهذه الحالة. اختر أحد الحلول المقترحة أدناه.") : "شروط ثابتة، وشروط تضبطها الإدارة بسنة الميلاد."}
      speak={done ? (result.eligible ? "جميع أفراد الطلب مستوفون للشروط" : "هناك ملاحظات تحتاج إلى تعديل") : undefined}
    >
      <div className="space-y-4">
        {result.members.map((mr, mi) => {
          const member = members.find((m) => m.person.id === mr.id)!;
          const startIdx = memberStarts[mi];
          const complete = shown >= startIdx + mr.checks.length;
          return (
            <div key={mr.id} className={cn("overflow-hidden rounded-3xl border-2 transition-colors", complete ? (mr.eligible ? "border-green-light/40" : "border-maroon/40") : "border-gold/40")}>
              <div className={cn("flex items-center gap-3 p-4 transition-colors", complete ? (mr.eligible ? "bg-green-light/8" : "bg-maroon/6") : "bg-sand")}>
                <PersonChip
                  className="flex-1"
                  name={mr.name}
                  gender={member.person.gender}
                  sub={`${relationLabel(member.relation, member.person.gender)} — ${ageOf(member.person)} عاماً`}
                />
                <AnimatePresence mode="wait">
                  {complete ? (
                    <motion.span key="r" initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("rounded-full px-3 py-1 text-sm font-bold", mr.eligible ? "bg-green-light text-white" : "bg-maroon text-white")}>
                      {mr.eligible ? "مؤهل" : "غير مستوفٍ"}
                    </motion.span>
                  ) : (
                    <motion.span key="l" className="size-5 animate-spin rounded-full border-2 border-gold-dark border-t-transparent" />
                  )}
                </AnimatePresence>
              </div>
              <ul className="divide-y divide-gold-light/70 px-4">
                {mr.checks.map((c, i) => {
                  const visible = shown > startIdx + i;
                  return (
                    <motion.li key={c.key} initial={false} animate={{ opacity: visible ? 1 : 0.25 }} className="flex items-start gap-3 py-3">
                      <span className="mt-0.5">{visible ? ICON[c.status] : <span className="block size-5 rounded-full bg-gold-light" />}</span>
                      <div className="min-w-0">
                        <p className={cn("font-bold", c.status === "fail" && visible ? "text-maroon" : "text-ink")}>{c.label}</p>
                        {visible && <p className="text-sm leading-6 text-ink-soft">{c.detail}</p>}
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        <div className="rounded-3xl border-2 border-gold/40 p-4">
          <p className="mb-2 font-bold text-green-dark">شروط الطلب ككل</p>
          {result.general.map((g, i) => {
            const visible = shown > generalStart + i;
            return (
              <div key={g.key} className="flex items-start gap-3 py-2">
                <span className="mt-0.5">{visible ? ICON[g.status] : <span className="block size-5 rounded-full bg-gold-light" />}</span>
                <div>
                  <p className="font-bold">{g.label}</p>
                  {visible && <p className="text-sm text-ink-soft">{g.detail}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
            {result.eligible ? (
              <Button size="xl" onClick={onContinue} className="w-full md:w-auto">
                متابعة <ArrowLeft className="size-6" />
              </Button>
            ) : (
              <div className="rounded-3xl bg-maroon/6 p-5">
                <p className="font-display text-xl font-bold text-maroon">الحلول المقترحة</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {failures.map((f) => {
                    const firstName = f.name.split(" ")[0];
                    return (
                      <div key={`${f.memberId}-${f.key}`} className="rounded-2xl bg-white p-4">
                        <p className="text-sm font-bold text-maroon">{firstName}: {f.label}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {f.key === "mahram" && (
                            <Button size="sm" onClick={onAddPerson}>
                              <UserPlus className="size-4" /> أضف محرماً
                            </Button>
                          )}
                          {f.key === "elderly-companion" && (
                            <Button size="sm" onClick={onFixCompanion}>اختر مرافقاً</Button>
                          )}
                          {f.key === "terminal" && (
                            <Button size="sm" variant="outline" onClick={onFixHealth}>تعديل الإقرار الصحي</Button>
                          )}
                          {members.find((m) => m.person.id === f.memberId)?.relation !== "self" && (
                            <Button size="sm" variant="maroon" onClick={() => onRemove(f.memberId)}>
                              <UserRoundX className="size-4" /> إزالة {firstName} من الطلب
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {generalFail.map((g) => (
                    <div key={g.key} className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold text-maroon">{g.label}</p>
                      <p className="mt-1 text-sm text-ink-soft">{g.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Question>
  );
}
