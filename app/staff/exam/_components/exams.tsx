"use client";

import { motion } from "motion/react";
import { AlertTriangle, CalendarClock, Check, CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import {
  EXAM_CATEGORIES,
  EXAM_KINDS,
  QUESTION_TYPES,
  questionCount,
  sectionPool,
  shortageOf,
  typeOf,
  type ExamCategory,
  type ExamDef,
  type ExamSection,
  type QuestionType,
} from "@/lib/data/admin-exam";
import { cn } from "@/lib/utils";
import { APPLIED_ROLES } from "@/app/administrator/_lib/admin";
import { useExamBank } from "@/app/administrator/_lib/admin-rules";
import { hallActions, roleLabelOf, runKey, stageOf, useHalls } from "@/app/administrator/_lib/halls";
import { Drawer, Panel, logAs, smallInputClass, useStaffUser } from "../../_components/kit";
import { OperationsPanel } from "../../_components/operations";
import { useExamDesk, useExamProgress } from "./desk";
import { RecordHistory, Records } from "./records";
import { Chip, Field, Pick, Switch, selectClass } from "./ui";

const TYPES = Object.keys(QUESTION_TYPES) as QuestionType[];

type Editing = { exam: ExamDef; isNew: boolean } | null;

/**
 * The exams, each in one card and one form: its name, type, role, date and hour, duration, centres, and its
 * weighted sections with how many questions of each type they draw. Every role has its main exam; a
 * make-up exam is created for whoever missed his role's main one. An exam is stopped and started here.
 */
export function Exams() {
  const user = useStaffUser()!;
  const toast = useToast();
  const halls = useHalls();
  const desk = useExamDesk();
  const bank = useExamBank();
  const progress = useExamProgress();
  const [editing, setEditing] = useState<Editing>(null);

  /** A new make-up exam for a role, built like its main exam, in the centres where its absentees are */
  const makeup = (role: string, centers?: string[]) => {
    const main = halls.examById(role);
    setEditing({
      isNew: true,
      exam: {
        id: `x-${Date.now().toString(36)}`,
        name: `امتحان ${roleLabelOf(role)} الاستدراكي`,
        role,
        kind: "makeup",
        date: "",
        time: main?.time ?? "09:00",
        minutes: main?.minutes ?? 25,
        sections: main?.sections ?? [],
        centers,
      },
    });
  };

  const live = (e: ExamDef) => halls.centers.some((c) => ["open", "running"].includes(stageOf(halls.runs[runKey(e.id, c.id)])));
  const sat = (e: ExamDef) => halls.centers.some((c) => halls.runs[runKey(e.id, c.id)]);

  const setOn = (e: ExamDef, on: boolean) => {
    if (!on && live(e)) {
      toast({ title: "الامتحان جارٍ في قاعة الآن", body: "لا يُوقف حتى ينهيه مشرفو القاعات.", tone: "warning", icon: "⏸️" });
      return;
    }
    hallActions.saveExam({ ...e, off: on ? undefined : true });
    logAs(user, { action: on ? "تفعيل امتحان" : "إيقاف امتحان", target: e.name, detail: `${e.date} — ${e.time}`, system: "exams", area: "exams", ref: e.id, important: true });
    toast({ title: on ? `فُعّل ${e.name}` : `أُوقف ${e.name}`, body: on ? "يفتحه مشرفو القاعات في موعده." : "لا تفتحه أي قاعة حتى تفعّله.", tone: on ? "success" : "info", icon: on ? "▶️" : "⏸️" });
  };

  const remove = (e: ExamDef) => {
    hallActions.deleteExam(e.id);
    logAs(user, { action: "حذف امتحان", target: e.name, detail: `${e.date} — ${e.time}`, system: "exams", area: "exams", ref: e.id, important: true });
    toast({ title: `حُذف ${e.name}`, tone: "info", icon: "🗑️" });
  };

  // Absent from their role's main exam with nothing left to sit: grouped by role, to create its make-up
  const missed = APPLIED_ROLES.map((r) => {
    const rows = desk.noSitting.filter((a) => a.role === r.key);
    return { role: r, n: rows.length, centers: [...new Set(rows.map((a) => a.center!.id))] };
  }).filter((x) => x.n > 0);

  return (
    <div className="space-y-4">
      <OperationsPanel keys={["admin-exams", "admin-oral"]} system="exams" area="exams" title="مدة الامتحانات وأيام الشفهي وتفعيلها" />
      <Panel
        icon={<CalendarClock />}
        title="الامتحانات"
        action={
          <Button size="sm" variant="gold" onClick={() => makeup(APPLIED_ROLES[0].key)}>
            <Plus className="size-4" /> امتحان جديد
          </Button>
        }
      >
        <p className="text-sm leading-7 text-white/70">
          لكل صفة امتحانها الأساسي، في يوم وساعة واحدين في كل المراكز. ومن غاب عنه يؤدي الامتحان الاستدراكي لصفته حين تنشئه. كل ما يخص الامتحان في بطاقته: موعده ومدته ومراكزه وأقسامه وأسئلته، ويُعدَّل من «تعديل».
        </p>
        {missed.length > 0 && (
          <div className="mt-3 rounded-2xl bg-gold/10 p-3 ring-1 ring-gold/40">
            <p className="text-sm font-bold text-gold">غائبون لا امتحان باقٍ لهم:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {missed.map((m) => (
                <Button key={m.role.key} size="sm" variant="glass" onClick={() => makeup(m.role.key, m.centers)}>
                  <Plus className="size-4" /> استدراكي {m.role.label} ({m.n})
                </Button>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <ul className="grid gap-3 xl:grid-cols-2">
        {halls.exams.map((e, i) => {
          const p = progress(e);
          const missing = shortageOf(bank, e);
          return (
            <motion.li key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className={cn("rounded-3xl p-4 ring-1", e.off ? "bg-black/20 ring-white/10" : missing ? "bg-maroon/15 ring-maroon/40" : "bg-white/[.06] ring-white/10")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn("flex flex-wrap items-center gap-2 font-display text-lg font-bold", e.off ? "text-white/55" : "text-white")}>
                    {e.name}
                    <Chip tone={e.kind === "makeup" ? "gold" : "muted"}>{EXAM_KINDS[e.kind]}</Chip>
                  </p>
                  <p className="text-xs text-white/65">لصفة {roleLabelOf(e.role)}</p>
                </div>
                <span className="flex items-center gap-2 text-xs font-bold text-white/70">
                  {e.off ? "موقوف" : "مفعّل"}
                  <Switch on={!e.off} onChange={(on) => setOn(e, on)} label={`${e.name} مفعّل`} />
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {[
                  ["الموعد", e.date || "لم يُحدَّد", e.date ? e.time : undefined],
                  ["المدة", `${e.minutes} دقيقة`],
                  ["الأسئلة", `${questionCount(e)} في ${e.sections.length} أقسام`],
                  ["المراكز", e.centers?.length ? `${e.centers.length} مراكز` : `كلها (${halls.live.length})`],
                ].map(([k, v, t]) => (
                  <div key={k} className="rounded-xl bg-black/15 p-2">
                    <dt className="text-[11px] text-white/60">{k}</dt>
                    <dd className="font-bold leading-6 text-white">
                      {v} {t && <span dir="ltr">{t}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 flex flex-wrap gap-1.5">
                <Chip tone={p.tone}>{p.label}</Chip>
                <Chip tone="muted">{p.expected} ينتظرونه</Chip>
                {missing ? (
                  <Chip tone="maroon">
                    <AlertTriangle className="size-3" /> ينقص البنك {missing} أسئلة
                  </Chip>
                ) : (
                  <Chip tone="green">
                    <CheckCircle2 className="size-3" /> أسئلة البنك تكفيه
                  </Chip>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="glass" onClick={() => setEditing({ exam: e, isNew: false })}>
                  <Pencil className="size-4" /> تعديل
                </Button>
                {e.kind === "makeup" && !sat(e) && (
                  <Button size="sm" variant="ghost" className="text-white hover:bg-maroon/40" onClick={() => remove(e)}>
                    <Trash2 className="size-4" /> حذف
                  </Button>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>

      <Records area="exams" />

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing?.isNew ? "امتحان جديد" : `تعديل ${editing?.exam.name ?? ""}`} width="max-w-3xl">
        {editing && <ExamForm key={editing.exam.id} start={editing.exam} isNew={editing.isNew} onClose={() => setEditing(null)} />}
      </Drawer>
    </div>
  );
}

function ExamForm({ start, isNew, onClose }: { start: ExamDef; isNew: boolean; onClose: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const halls = useHalls();
  const bank = useExamBank();
  const [d, setD] = useState<ExamDef>(start);
  const weights = d.sections.reduce((a, s) => a + s.weight, 0);
  const missing = shortageOf(bank, d);
  const setSection = (i: number, patch: Partial<ExamSection>) => setD({ ...d, sections: d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const available = (categories: ExamCategory[], t: QuestionType) => sectionPool(bank, d.role, { categories }).filter((q) => typeOf(q) === t).length;

  const pickRole = (role: string) => {
    const main = halls.examById(role);
    setD({ ...d, role, name: `امتحان ${roleLabelOf(role)} الاستدراكي`, minutes: main?.minutes ?? d.minutes, sections: main?.sections ?? d.sections });
  };

  const save = () => {
    const problem = !d.name.trim()
      ? "اكتب اسم الامتحان."
      : !d.date.trim() || !d.time.trim()
        ? "حدّد يوم الامتحان وساعته."
        : weights !== 100
          ? `مجموع أوزان الأقسام ${weights}%، ويجب أن يكون 100.`
          : !questionCount(d)
            ? "لا أسئلة في الامتحان."
            : d.centers && !d.centers.length
              ? "اختر مركزاً واحداً على الأقل، أو «كل المراكز»."
              : "";
    if (problem) {
      toast({ title: "لم يُحفظ الامتحان", body: problem, tone: "warning", icon: "✍️" });
      return;
    }
    const next = { ...d, name: d.name.trim(), date: d.date.trim(), time: d.time.trim() };
    hallActions.saveExam(next);
    const where = next.centers?.length ? next.centers.map((c) => halls.centerById(c)?.name).join("، ") : "كل المراكز";
    if (isNew) {
      logAs(user, { action: "إنشاء امتحان", target: next.name, after: `${next.date} — ${next.time}`, detail: `${EXAM_KINDS[next.kind]} لصفة ${roleLabelOf(next.role)} — ${where} — ${questionCount(next)} سؤالاً في ${next.minutes} دقيقة`, system: "exams", area: "exams", ref: next.id, important: true });
    } else {
      const moved = start.date !== next.date || start.time !== next.time;
      if (moved) logAs(user, { action: "تغيير موعد امتحان", target: next.name, before: `${start.date} — ${start.time}`, after: `${next.date} — ${next.time}`, system: "exams", area: "exams", ref: next.id, important: true });
      if (!moved || JSON.stringify({ ...start, date: 0, time: 0 }) !== JSON.stringify({ ...next, date: 0, time: 0 }))
        logAs(user, { action: "تعديل امتحان", target: next.name, after: next.sections.map((s) => `${s.name} ${s.weight}%`).join("، "), detail: `${questionCount(next)} سؤالاً في ${next.minutes} دقيقة — ${where}`, system: "exams", area: "exams", ref: next.id });
    }
    toast({ title: isNew ? `أُنشئ ${next.name}` : `حُفظ ${next.name}`, body: isNew ? "يظهر لمشرفي القاعات ولمن يؤدونه في بواباتهم." : "يُطبَّق على كل ورقة تُسحب بعد الآن.", tone: "success", icon: "💾" });
    onClose();
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr]">
        <Field label="اسم الامتحان">
          <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className={smallInputClass} />
        </Field>
        <Field label="النوع" hint={d.kind === "main" ? "الامتحان الأساسي لصفته، يؤديه كل متقدميها." : "يؤديه من غاب عن الامتحان الأساسي لصفته."}>
          <p className="flex h-11 items-center">
            <Chip tone={d.kind === "makeup" ? "gold" : "muted"}>{EXAM_KINDS[d.kind]}</Chip>
          </p>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="الصفة" className="sm:col-span-1">
          {isNew ? (
            <select value={d.role} onChange={(e) => pickRole(e.target.value)} className={selectClass}>
              {APPLIED_ROLES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="flex h-11 items-center font-bold text-white">{roleLabelOf(d.role)}</p>
          )}
        </Field>
        <Field label="اليوم">
          <input value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} className={smallInputClass} placeholder="26 ربيع الآخر 1448" />
        </Field>
        <Field label="الساعة">
          <input value={d.time} onChange={(e) => setD({ ...d, time: e.target.value })} className={cn(smallInputClass, "text-center")} dir="ltr" placeholder="09:00" />
        </Field>
        <Field label="المدة (دقيقة)">
          <input type="number" min={5} max={180} value={d.minutes} onChange={(e) => setD({ ...d, minutes: Math.max(5, Math.min(180, Number(e.target.value) || 5)) })} className={cn(smallInputClass, "text-center")} />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-white">المراكز</p>
        <div className="flex flex-wrap gap-1.5">
          <Pick on={!d.centers} onClick={() => setD({ ...d, centers: undefined })}>
            كل المراكز الفعّالة ({halls.live.length})
          </Pick>
          {halls.live.map((c) => {
            const on = !!d.centers?.includes(c.id);
            return (
              <Pick key={c.id} on={on} onClick={() => setD({ ...d, centers: on ? d.centers!.filter((x) => x !== c.id) : [...(d.centers ?? []), c.id] })}>
                {c.name}
              </Pick>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-white">الأقسام</p>
          <Chip tone="green">{questionCount(d)} سؤالاً</Chip>
          <Chip tone={weights === 100 ? "green" : "maroon"}>مجموع الأوزان {weights}%</Chip>
          {missing > 0 && <Chip tone="maroon">ينقص البنك {missing} أسئلة</Chip>}
        </div>
        <p className="mb-3 text-xs leading-5 text-white/60">لكل قسم موضوعه (فئات البنك التي يُسحب منها)، ووزنه من علامة الكتابي، وعدد أسئلته من كل نوع. تحت كل عدد ما في بنك الصفة من ذلك النوع. تُسحب أسئلة كل قسم لكل متقدم بترتيب خاص به.</p>
        <ul className="space-y-3">
          {d.sections.map((s, i) => (
            <li key={s.id} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <input value={s.name} onChange={(e) => setSection(i, { name: e.target.value })} className={cn(smallInputClass, "min-w-0 flex-1 font-bold")} aria-label="اسم القسم" />
                <label className="flex items-center gap-1.5 whitespace-nowrap text-sm text-white/80">
                  الوزن
                  <span className="w-20 shrink-0">
                    <input type="number" min={0} max={100} value={s.weight} onChange={(e) => setSection(i, { weight: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} className={cn(smallInputClass, "text-center")} aria-label={`وزن ${s.name}`} />
                  </span>
                  %
                </label>
                {d.sections.length > 1 && (
                  <Button size="sm" variant="ghost" className="text-white hover:bg-maroon/40" onClick={() => setD({ ...d, sections: d.sections.filter((_, j) => j !== i) })} aria-label={`حذف ${s.name}`}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-white/55">يُسحب من:</span>
                {EXAM_CATEGORIES.map((c) => (
                  <Pick key={c} on={s.categories.includes(c)} onClick={() => setSection(i, { categories: s.categories.includes(c) ? s.categories.filter((y) => y !== c) : [...s.categories, c] })}>
                    {c}
                  </Pick>
                ))}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {TYPES.map((t) => {
                  const have = available(s.categories, t);
                  const short = s.counts[t] > have;
                  return (
                    <label key={t} className="flex items-center justify-between gap-2 rounded-xl bg-white/[.05] px-3 py-2 ring-1 ring-white/10">
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-white">{QUESTION_TYPES[t]}</span>
                        <span className={cn("block text-[11px]", short ? "font-bold text-gold" : "text-white/55")}>{short ? `في البنك ${have} فقط` : `في البنك ${have}`}</span>
                      </span>
                      <span className="w-16 shrink-0">
                        <input type="number" min={0} max={30} value={s.counts[t]} onChange={(e) => setSection(i, { counts: { ...s.counts, [t]: Math.max(0, Math.min(30, Number(e.target.value) || 0)) } })} className={cn(smallInputClass, "text-center")} aria-label={`${s.name}: عدد أسئلة ${QUESTION_TYPES[t]}`} />
                      </span>
                    </label>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
        <Button size="sm" variant="glass" className="mt-3" onClick={() => setD({ ...d, sections: [...d.sections, { id: `s${Date.now()}`, name: "قسم جديد", weight: 0, categories: [], counts: { choice: 0, truefalse: 0 } }] })}>
          <Plus className="size-4" /> قسم جديد
        </Button>
      </div>

      <div className="flex gap-2 border-t border-white/10 pt-4">
        <Button variant="gold" onClick={save}>
          <Check className="size-4" /> {isNew ? "إنشاء الامتحان" : "حفظ الامتحان"}
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
      </div>
      {!isNew && <RecordHistory refId={d.id} />}
    </div>
  );
}
