"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleMinus, Ticket, UserPlus, UserRoundCog, UserRoundX, Users, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ageOf, relationLabel } from "@/lib/registry";
import type { EligibilityResult, Member, SeasonRules } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { PersonChip, Question } from "./ui";

const ICON = {
  pass: <CheckCircle2 className="size-5 text-green-light" />,
  warn: <AlertTriangle className="size-5 text-gold-dark" />,
  fail: <XCircle className="size-5 text-maroon" />,
  na: <CircleMinus className="size-5 text-hint" />,
};

/** Conditions a person cannot change — the only way forward is to take them out of the application */
const FIXED_KEYS = new Set(["muslim", "syrian", "companion-age", "single-application"]);

export function EligibilityCheck({
  result,
  members,
  rules,
  animate = true,
  onContinue,
  onRemove,
  onAddPerson,
  onFixCompanion,
  onChangeApplicant,
  onSwitchToLottery,
}: {
  result: EligibilityResult;
  members: Member[];
  rules: SeasonRules;
  /** Direct acceptance, applicant below the accepted age: keep everything and register for the lottery instead */
  onSwitchToLottery?: () => void;
  /** Row-by-row reveal on the first check; after a fix the new result shows at once */
  animate?: boolean;
  onContinue: () => void;
  onRemove: (id: string) => void;
  onAddPerson: () => void;
  /** Re-pick the dedicated companion of this elderly member */
  onFixCompanion: (elderlyId: string) => void;
  onChangeApplicant: () => void;
}) {
  const totalRows = result.members.reduce((n, m) => n + m.checks.length, 0) + result.general.length;
  const [shown, setShown] = useState(animate ? 0 : totalRows);
  const done = shown >= totalRows;

  useEffect(() => {
    if (shown >= totalRows) return;
    const t = setTimeout(() => setShown((s) => s + 1), 110);
    return () => clearTimeout(t);
  }, [shown, totalRows]);

  const memberStarts = result.members.map((_, i) => result.members.slice(0, i).reduce((n, m) => n + m.checks.length, 0));
  const generalStart = result.members.reduce((n, m) => n + m.checks.length, 0);

  return (
    <Question
      title={done ? (result.eligible ? "جميع أفراد الطلب مستوفون للشروط" : "هناك ملاحظات تحتاج إلى تعديل") : "نطبّق شروط موسم 1448 على كل فرد..."}
      hint={done ? (result.eligible ? "يمكنك المتابعة إلى موافقة المرافقين ثم الدفع. الجواز والصورة والمعلومات الصحية تُطلب بعد القبول." : "لن يُقبل الطلب بهذه الحالة. اختر أحد الحلول المقترحة أدناه.") : "شروط ثابتة، وشروط تضبطها الإدارة بسنة الميلاد."}
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
              <Fixes
                result={result}
                members={members}
                rules={rules}
                onRemove={onRemove}
                onAddPerson={onAddPerson}
                onFixCompanion={onFixCompanion}
                onChangeApplicant={onChangeApplicant}
                onSwitchToLottery={onSwitchToLottery}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Question>
  );
}

/**
 * Actionable fixes: every problem comes with the action that resolves it, applied on the spot.
 * The check re-runs immediately after each action.
 */
function Fixes({
  result,
  members,
  rules,
  onRemove,
  onAddPerson,
  onFixCompanion,
  onChangeApplicant,
  onSwitchToLottery,
}: {
  result: EligibilityResult;
  members: Member[];
  rules: SeasonRules;
  onSwitchToLottery?: () => void;
  onRemove: (id: string) => void;
  onAddPerson: () => void;
  onFixCompanion: (elderlyId: string) => void;
  onChangeApplicant: () => void;
}) {
  const applicant = members.find((m) => m.relation === "self");
  const companions = members.filter((m) => m.relation !== "self");
  const failures = result.members.flatMap((m) => m.checks.filter((c) => c.status === "fail").map((c) => ({ ...c, memberId: m.id })));
  const limitFail = result.general.some((g) => g.key === "limit" && g.status === "fail");

  // Size limit: applicant + maxCompanions, or + maxCompanionsFamily for a man with only his wife and children
  const nonFamily = companions.filter((c) => c.relation !== "spouse" && c.relation !== "child");
  const familyPossible = applicant?.person.gender === "M" && nonFamily.length > 0 && companions.length - nonFamily.length <= rules.maxCompanionsFamily;
  const overBy = companions.length - rules.maxCompanions;

  return (
    <div className="space-y-4 rounded-3xl bg-maroon/6 p-4 md:p-5">
      <p className="font-display text-xl font-bold text-maroon">عدّل الطلب من هنا مباشرة</p>

      {limitFail && (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-maroon/20">
          <p className="flex items-center gap-2 font-bold text-maroon">
            <Users className="size-5" /> عدد المرافقين {companions.length}، والحد {rules.maxCompanions}
          </p>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            أزل {overBy === 1 ? "شخصاً واحداً" : overBy === 2 ? "شخصين" : `${overBy} أشخاص`} من الطلب
            {familyPossible && (
              <>
                {" "}
                — أو أزل {nonFamily.map((n) => n.person.firstName).join(" و")} ليصبح الطلب عائلياً (الزوجة والأولاد) فيرتفع الحد إلى {rules.maxCompanionsFamily}
              </>
            )}
            . ومن يُزال يمكنه تقديم طلب مستقل.
          </p>
          <ul className="mt-3 space-y-2">
            {companions.map((c) => {
              const breaksFamily = familyPossible && nonFamily.includes(c);
              return (
                <li key={c.person.id} className={cn("flex items-center gap-3 rounded-2xl p-2.5", breaksFamily ? "bg-gold/20 ring-1 ring-gold-dark/40" : "bg-sand")}>
                  <PersonChip
                    className="flex-1"
                    name={`${c.person.firstName} ${c.person.lastName}`}
                    gender={c.person.gender}
                    sub={
                      <>
                        {relationLabel(c.relation, c.person.gender)} — {ageOf(c.person)} عاماً
                        {breaksFamily && <span className="font-bold text-maroon"> · ليس من الزوجة والأولاد</span>}
                      </>
                    }
                  />
                  <Button size="sm" variant="maroon" onClick={() => onRemove(c.person.id)} aria-label={`إزالة ${c.person.firstName}`}>
                    <UserRoundX className="size-4" /> إزالة
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {failures.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {failures.map((f) => {
            const m = members.find((x) => x.person.id === f.memberId)!;
            const first = m.person.firstName;
            const isSelf = m.relation === "self";
            return (
              <div key={`${f.memberId}-${f.key}`} className="flex flex-col rounded-2xl bg-white p-4 ring-1 ring-maroon/20">
                <p className="font-bold text-maroon">
                  {first}: {f.label}
                </p>
                <p className="mt-1 flex-1 text-sm leading-6 text-ink-soft">{f.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {f.key === "mahram" && (
                    <Button size="sm" onClick={onAddPerson}>
                      <UserPlus className="size-4" /> أضف محرماً لها
                    </Button>
                  )}
                  {f.key === "elderly-companion" && (
                    <Button size="sm" onClick={() => onFixCompanion(m.person.id)}>
                      <UserRoundCog className="size-4" /> اختر مرافقاً {m.person.gender === "F" ? "لها" : "له"}
                    </Button>
                  )}
                  {f.key === "direct-age" && onSwitchToLottery && (
                    <Button size="sm" onClick={onSwitchToLottery}>
                      <Ticket className="size-4" /> التسجيل على القرعة بدلاً من ذلك
                    </Button>
                  )}
                  {f.key === "direct-age" && (
                    <Button size="sm" variant="outline" onClick={onAddPerson}>
                      <UserPlus className="size-4" /> إضافة والد أو والدة (يصبح صاحب الطلب)
                    </Button>
                  )}
                  {f.key === "hajj-before" && m.person.gender === "M" && (
                    <Button size="sm" onClick={onAddPerson}>
                      <UserPlus className="size-4" /> أضف والدته أو زوجته
                    </Button>
                  )}
                  {f.key === "direct-age" ? null : isSelf ? (
                    (f.key === "applicant-age" || FIXED_KEYS.has(f.key) || f.key === "hajj-before") && (
                      <Button size="sm" variant="outline" onClick={onChangeApplicant}>
                        <UserRoundCog className="size-4" /> تقديم الطلب باسم شخص آخر
                      </Button>
                    )
                  ) : (
                    <Button size="sm" variant="maroon" onClick={() => onRemove(m.person.id)}>
                      <UserRoundX className="size-4" /> إزالة {first} من الطلب
                    </Button>
                  )}
                </div>
                {!isSelf && FIXED_KEYS.has(f.key) && <p className="mt-2 text-xs text-hint">هذا الشرط لا يتغيّر بتعديل الطلب، فالحل إزالته ليكمل الباقون.</p>}
              </div>
            );
          })}
        </div>
      )}

      {result.general
        .filter((g) => g.status === "fail" && g.key !== "limit")
        .map((g) => (
          <div key={g.key} className="rounded-2xl bg-white p-4 ring-1 ring-maroon/20">
            <p className="font-bold text-maroon">{g.label}</p>
            <p className="mt-1 text-sm text-ink-soft">{g.detail}</p>
          </div>
        ))}
    </div>
  );
}
