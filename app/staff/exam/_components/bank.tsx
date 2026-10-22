"use client";

import { Check, Lock, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PrintSheet } from "@/components/print/print-sheet";
import { PrintDocument, PrintNote, PrintTable } from "@/components/print/print-document";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { EXAM_CATEGORIES, QUESTION_TYPES, TRUE_FALSE, typeOf, type ExamCategory, type ExamQuestion, type QuestionType } from "@/lib/data/admin-exam";
import { matches } from "@/lib/ops";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { APPLIED_ROLES } from "@/app/administrator/_lib/admin";
import { useAllQuestions, useExamBank } from "@/app/administrator/_lib/admin-rules";
import { roleLabelOf } from "@/app/administrator/_lib/halls";
import { Drawer, logAs, smallInputClass, textareaClass, useCan, useStaffUser } from "../../_components/kit";
import { FilterSelect, SearchBox } from "../../_components/ops-ui";
import { AddButton, Box, EmptyRow, ListTable, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { useExamDesk } from "./desk";
import { RecordHistory, Records } from "./records";
import { ResetToOriginal } from "./shell";
import { Pick, Segments, downloadCsv } from "./ui";

const TYPES = Object.keys(QUESTION_TYPES) as QuestionType[];
const LETTERS = ["أ", "ب", "ج", "د", "هـ", "و"];

type Draft = { type: QuestionType; category: ExamCategory; roles: string[]; text: string; options: string[]; answer: number; explanation: string };

const blankDraft = (type: QuestionType, role?: string): Draft => ({
  type,
  category: "إداري",
  roles: role ? [role] : [],
  text: "",
  options: type === "choice" ? ["", "", "", ""] : [...TRUE_FALSE],
  answer: 0,
  explanation: "",
});

const draftOf = (x: ExamQuestion): Draft => ({ type: typeOf(x), category: x.category, roles: x.roles, text: x.text, options: [...x.options], answer: x.answer, explanation: x.explanation });

/** What stops a question from being saved; nothing when it can be */
function problemOf(d: Draft, isNew: boolean) {
  const options = d.options.map((o) => o.trim());
  if (!d.text.trim()) return "اكتب نص السؤال.";
  if (d.type === "choice") {
    if (options.length < 2 || options.length > 6) return "للسؤال من 2 إلى 6 خيارات.";
    if (options.some((o) => !o)) return "اكتب كل الخيارات، أو احذف الفارغ منها.";
    if (new Set(options).size !== options.length) return "الخيارات يجب ألا تتكرر.";
  }
  if (isNew && !d.roles.length) return "اختر صفة واحدة على الأقل يدخل السؤال اختبارها.";
  return "";
}

/** The editor of one question: its wording, its options (2 to 6) and the right one — there are no written questions */
function QuestionForm({ draft, setDraft, isNew }: { draft: Draft; setDraft: (d: Draft) => void; isNew: boolean }) {
  const choice = draft.type === "choice";
  return (
    <div className="space-y-3">
      {isNew && (
        <>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-white/55">النوع:</span>
            {TYPES.map((t) => (
              <Pick key={t} on={draft.type === t} onClick={() => setDraft({ ...blankDraft(t), category: draft.category, roles: draft.roles, text: draft.text, explanation: draft.explanation })}>
                {QUESTION_TYPES[t]}
              </Pick>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-white/55">الفئة:</span>
            {EXAM_CATEGORIES.map((c) => (
              <Pick key={c} on={draft.category === c} onClick={() => setDraft({ ...draft, category: c })}>
                {c}
              </Pick>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-white/55">يدخل اختبار:</span>
            {APPLIED_ROLES.map((r) => (
              <Pick key={r.key} on={draft.roles.includes(r.key)} onClick={() => setDraft({ ...draft, roles: draft.roles.includes(r.key) ? draft.roles.filter((x) => x !== r.key) : [...draft.roles, r.key] })}>
                {r.label}
              </Pick>
            ))}
          </div>
        </>
      )}
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">نص السؤال</span>
        <textarea rows={2} value={draft.text} onChange={(ev) => setDraft({ ...draft, text: ev.target.value })} className={textareaClass} aria-label="نص السؤال" />
      </label>
      <div>
        <span className="mb-1 block text-xs text-white/60">{choice ? "الخيارات (من 2 إلى 6) — اختر الإجابة الصحيحة" : "الإجابة الصحيحة"}</span>
        <ul className={cn(choice ? "space-y-2" : "flex gap-2")}>
          {draft.options.map((op, i) => (
            <li key={i} className="flex items-center gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={draft.answer === i}
                aria-label={`الإجابة الصحيحة ${choice ? LETTERS[i] : op}`}
                onClick={() => setDraft({ ...draft, answer: i })}
                className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold", draft.answer === i ? "bg-green-light text-white" : "bg-white/10 text-white/70 ring-1 ring-white/15")}
              >
                {draft.answer === i ? <Check className="size-4" /> : LETTERS[i]}
              </button>
              {choice ? (
                <>
                  <input value={op} onChange={(ev) => setDraft({ ...draft, options: draft.options.map((x, j) => (j === i ? ev.target.value : x)) })} className={smallInputClass} aria-label={`الخيار ${LETTERS[i]}`} />
                  {draft.options.length > 2 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-white hover:bg-maroon/40"
                      aria-label={`حذف الخيار ${LETTERS[i]}`}
                      onClick={() => setDraft({ ...draft, options: draft.options.filter((_, j) => j !== i), answer: draft.answer === i ? 0 : draft.answer > i ? draft.answer - 1 : draft.answer })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </>
              ) : (
                <span className="text-sm font-bold text-white">{op}</span>
              )}
            </li>
          ))}
        </ul>
        {choice && draft.options.length < 6 && (
          <Button size="sm" variant="ghost" className="mt-2 text-gold hover:bg-white/10" onClick={() => setDraft({ ...draft, options: [...draft.options, ""] })}>
            <Plus className="size-4" /> خيار
          </Button>
        )}
      </div>
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">شرح الإجابة</span>
        <textarea rows={2} value={draft.explanation} onChange={(ev) => setDraft({ ...draft, explanation: ev.target.value })} className={textareaClass} aria-label="شرح الإجابة" />
      </label>
    </div>
  );
}

type Sheet = { kind: "new"; replacing: number | null } | { kind: "open"; id: number };

/**
 * The question bank as a list: each question opens on its wording in a side sheet, to edit it — or, once it was
 * on a paper, to read it and create its replacement. Under each: disable or enable it. A role's test draws each
 * section from that role's questions in the section's categories; every question is marked by the platform.
 */
export function Bank() {
  const user = useStaffUser()!;
  const toast = useToast();
  const desk = useExamDesk();
  const storedOff = useStore((s) => s.adminRules.questionsOff);
  const storedEdits = useStore((s) => s.adminRules.questionEdits);
  const storedAdded = useStore((s) => s.adminRules.questionsAdded);
  const storedRoles = useStore((s) => s.adminRules.questionRoles);
  const off = storedOff ?? [];
  const edits = storedEdits ?? {};
  const added = storedAdded ?? [];
  const questionRoles = storedRoles ?? {};
  const all = useAllQuestions();
  const live = useExamBank();
  const may = useCan();
  // The correct answers are confidential: seen, and exported with the bank, only with their own permission
  const seeAnswers = may("exams.questions-answers.GET");
  const canExport = may("exams.questions-answers.export");
  const canDisable = may("exams.questions.disable");
  const canReplace = may("exams.questions.replace");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [role, setRole] = useState("");
  const [type, setType] = useState<QuestionType | "all">("all");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [showOff, setShowOff] = useState(false);

  // How many attempts served each question: a question on any paper is never edited again
  const used = useMemo(() => {
    const m = new Map<number, number>();
    for (const a of desk.attempts) for (const s of a.attempt.paper ?? []) for (const id of s.ids) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [desk.attempts]);

  const shown = all.filter(
    (x) =>
      off.includes(x.id) === showOff &&
      (!role || x.roles.includes(role)) &&
      (type === "all" || typeOf(x) === type) &&
      (!category || x.category === category) &&
      matches(q, [x.id, x.text, x.scenario, ...x.options]),
  );
  const isAdded = (id: number) => added.some((x) => x.id === id);
  const opened = sheet?.kind === "open" ? all.find((x) => x.id === sheet.id) : undefined;

  /** A question joins or leaves one role's test */
  const toggleRole = (x: ExamQuestion, key: string, label: string) => {
    const on = x.roles.includes(key);
    actions.setAdminRules({ questionRoles: { ...questionRoles, [x.id]: on ? x.roles.filter((r) => r !== key) : [...x.roles, key] } });
    logAs(user, { action: on ? "إخراج سؤال من اختبار صفة" : "إدخال سؤال في اختبار صفة", target: `سؤال ${x.id}`, detail: label, system: "exams", area: "bank", ref: `q${x.id}` });
    toast({ title: on ? `خرج السؤال ${x.id} من اختبار ${label}` : `دخل السؤال ${x.id} في اختبار ${label}`, tone: on ? "info" : "success", icon: on ? "➖" : "➕" });
  };

  /** Disabled: no paper draws it from now on, and the papers that served it keep it */
  const toggle = (id: number, text: string) => {
    const was = off.includes(id);
    actions.setAdminRules({ questionsOff: was ? off.filter((x) => x !== id) : [...off, id] });
    logAs(user, { action: was ? "تفعيل سؤال" : "تعطيل سؤال", target: `سؤال ${id}`, detail: text.slice(0, 60), system: "exams", area: "bank", ref: `q${id}` });
    toast({ title: was ? "فُعّل السؤال" : "عُطّل السؤال", body: was ? "يعود إلى أقسام اختبارات صفاته." : "لا يُسحب في أي ورقة بعد الآن، ويبقى في الأوراق التي ظهر فيها. تجده في «المعطّلة».", tone: was ? "success" : "info", icon: was ? "✅" : "⏸️" });
  };

  const close = () => {
    setSheet(null);
    setDraft(null);
  };
  const openNew = () => {
    setSheet({ kind: "new", replacing: null });
    setDraft(blankDraft("choice", role || undefined));
  };
  const openOne = (x: ExamQuestion) => {
    setSheet({ kind: "open", id: x.id });
    setDraft(draftOf(x));
  };
  /** A replacement for a used question: its content to start from, and the original disabled once it is saved */
  const replace = (x: ExamQuestion) => {
    setShowOff(false);
    setSheet({ kind: "new", replacing: x.id });
    setDraft(draftOf(x));
  };

  const save = () => {
    if (!draft || !sheet) return;
    const isNew = sheet.kind === "new";
    const problem = problemOf(draft, isNew);
    if (problem) {
      toast({ title: "لم يُحفظ السؤال", body: problem, tone: "warning", icon: "✍️" });
      return;
    }
    const options = draft.type === "choice" ? draft.options.map((o) => o.trim()) : draft.options;
    if (sheet.kind === "new") {
      const replacing = sheet.replacing;
      const next = Math.max(999, ...all.map((x) => x.id)) + 1;
      const nq: ExamQuestion = { id: next, category: draft.category, type: draft.type, roles: draft.roles, text: draft.text.trim(), options, answer: draft.answer, explanation: draft.explanation.trim() };
      actions.setAdminRules({ questionsAdded: [...added, nq], ...(replacing !== null && !off.includes(replacing) && { questionsOff: [...off, replacing] }) });
      logAs(user, { action: "إضافة سؤال إلى بنك الأسئلة", target: `سؤال ${next}`, after: `${QUESTION_TYPES[draft.type]} — ${draft.category}`, detail: `${replacing !== null ? `بديلاً من السؤال ${replacing} — ` : ""}${nq.text.slice(0, 60)}`, system: "exams", area: "bank", ref: `q${next}` });
      if (replacing !== null && !off.includes(replacing)) logAs(user, { action: "تعطيل سؤال", target: `سؤال ${replacing}`, detail: `استُبدل بالسؤال ${next}`, system: "exams", area: "bank", ref: `q${replacing}` });
      toast({ title: `أُضيف السؤال ${next}`, body: replacing !== null ? `بديلاً من السؤال ${replacing}، الذي عُطّل ويبقى في الأوراق التي ظهر فيها.` : `${QUESTION_TYPES[draft.type]} في اختبارات ${draft.roles.length} صفات.`, tone: "success", icon: "➕" });
    } else {
      const id = sheet.id;
      if (used.has(id)) {
        toast({ title: "استُخدم في محاولات: لا يُعدَّل", body: "عطّله وأنشئ بديلاً.", tone: "warning", icon: "🔒" });
        return;
      }
      const patch = { text: draft.text.trim(), options, answer: draft.answer, explanation: draft.explanation.trim() };
      if (isAdded(id)) actions.setAdminRules({ questionsAdded: added.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
      else actions.setAdminRules({ questionEdits: { ...edits, [id]: patch } });
      logAs(user, { action: "تعديل سؤال في بنك الأسئلة", target: `سؤال ${id}`, after: patch.text.slice(0, 60), system: "exams", area: "bank", ref: `q${id}` });
      toast({ title: "حُفظ السؤال", body: "يظهر بصيغته الجديدة في كل ورقة تُسحب بعد الآن.", tone: "success", icon: "✍️" });
    }
    close();
  };

  const download = () => {
    logAs(user, { action: "تصدير بنك الأسئلة بأجوبته", target: `${all.length} سؤالاً`, system: "exams", area: "bank", important: true });
    downloadCsv("بنك-الأسئلة-1448.csv", [
      ["الرقم", "النوع", "الفئة", "يدخل اختبار", "السؤال", "الخيارات", "الإجابة", "الحالة", "استُخدم في محاولات"],
      ...all.map((x) => [x.id, QUESTION_TYPES[typeOf(x)], x.category, x.roles.map(roleLabelOf).join(" / "), x.text, x.options.join(" | "), x.options[x.answer], off.includes(x.id) ? "معطّل" : "فعّال", used.get(x.id) ?? 0]),
    ]);
  };
  const print = () => {
    logAs(user, { action: "طباعة بنك الأسئلة بأجوبته", target: `${shown.length} سؤالاً`, system: "exams", area: "bank", important: true });
    window.print();
  };

  // What the sheet shows: a form to fill (a new question, or one never on a paper), or the question to read
  const n = opened ? (used.get(opened.id) ?? 0) : 0;
  const disabledOpen = !!opened && off.includes(opened.id);
  // A new question is added (POST, or `replace` for a substitute); one never on a paper is changed (PUT), seeing its answer
  const editable = sheet?.kind === "new" ? may(sheet.replacing !== null ? "exams.questions.replace" : "exams.questions.POST") : !!opened && n === 0 && !disabledOpen && may("exams.questions.PUT") && seeAnswers;

  return (
    <div className="space-y-5">
      <Title
        action={
          <>
            {may("exams.questions.POST") && (
              <AddButton onClick={openNew}>
                <Plus className="size-4" /> إضافة سؤال
              </AddButton>
            )}
            {canExport && (
              <span className="flex gap-3 text-sm font-bold">
                <RowLink onClick={download}>تصدير Excel</RowLink>
                <RowLink onClick={print}>تصدير PDF</RowLink>
              </span>
            )}
          </>
        }
      />
      <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr]">
        <SearchBox value={q} onChange={setQ} label="بحث في الأسئلة" placeholder="نص السؤال أو خياراته أو رقمه..." />
        <FilterSelect label="الصفة" all="كل الصفات" value={role} onChange={setRole} options={APPLIED_ROLES.map((r) => ({ value: r.key, label: `${r.label} (${live.filter((x) => x.roles.includes(r.key)).length})` }))} />
        <FilterSelect label="الفئة" all="كل الفئات" value={category} onChange={setCategory} options={EXAM_CATEGORIES.map((c) => ({ value: c, label: `${c} (${live.filter((x) => x.category === c).length})` }))} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segments
          label="حالة السؤال"
          value={showOff ? "off" : "on"}
          onChange={(v) => setShowOff(v === "off")}
          items={[
            { value: "on", label: "الفعّالة", count: live.length },
            { value: "off", label: "المعطّلة", count: off.length },
          ]}
        />
        <Segments
          label="نوع السؤال"
          value={type}
          onChange={setType}
          items={[{ value: "all" as const, label: "كل الأنواع", count: live.length }, ...TYPES.map((t) => ({ value: t, label: QUESTION_TYPES[t], count: live.filter((x) => typeOf(x) === t).length }))]}
        />
      </div>

      <ListTable head={["#", "السؤال", "النوع والفئة", "يدخل اختبار", "الحالة"]} minWidth="54rem">
        {shown.length === 0 && <EmptyRow cols={5}>لا أسئلة تطابق هذا البحث.</EmptyRow>}
        {shown.map((x) => {
          const disabled = off.includes(x.id);
          const times = used.get(x.id) ?? 0;
          return (
            <tr key={x.id} className={cn("align-top", disabled && "opacity-60")}>
              <td className="w-12 p-3 font-display font-bold text-gold">{x.id}</td>
              <td className="p-3">
                <button type="button" onClick={() => openOne(x)} className="text-right font-bold leading-6 text-white hover:text-gold">
                  {x.text}
                </button>
                {seeAnswers && <p className="text-xs text-white/55">الإجابة: {x.options[x.answer]}</p>}
                <RowActions>
                  {!disabled && times === 0 && may("exams.questions.PUT") && seeAnswers ? <RowLink onClick={() => openOne(x)}>تعديل</RowLink> : <RowLink onClick={() => openOne(x)}>عرض</RowLink>}
                  {!disabled && times > 0 && canReplace && <RowLink onClick={() => replace(x)}>إنشاء بديل</RowLink>}
                  {canDisable &&
                    (disabled ? (
                      <RowLink onClick={() => toggle(x.id, x.text)}>تفعيل</RowLink>
                    ) : (
                      <RowLink danger onClick={() => toggle(x.id, x.text)}>
                        تعطيل
                      </RowLink>
                    ))}
                </RowActions>
              </td>
              <td className="p-3">
                <span className="flex flex-wrap gap-1">
                  <Tag>{QUESTION_TYPES[typeOf(x)]}</Tag>
                  <Tag tone="gold">{x.category}</Tag>
                </span>
              </td>
              <td className="p-3 text-white/80">{x.roles.length ? x.roles.map(roleLabelOf).join("، ") : <span className="text-white/50">لا صفة</span>}</td>
              <td className="p-3">
                <span className="flex flex-wrap gap-1">
                  {disabled ? <Tag tone="maroon">معطّل</Tag> : <Tag tone="green">فعّال</Tag>}
                  {times > 0 && <Tag>ظهر في {times} محاولات</Tag>}
                  {(edits[x.id] || isAdded(x.id)) && <Tag tone="gold">{isAdded(x.id) ? "أضفته هذا الموسم" : "معدَّل"}</Tag>}
                </span>
              </td>
            </tr>
          );
        })}
      </ListTable>

      <Box title="كيف يعمل البنك؟" open={false}>
        <p className="leading-7">
          بنك واحد للموسم. كل سؤال اختيار من خيارات (من 2 إلى 6) أو صح وخطأ، تصحّحه المنصة فور التسليم، والخيارات تُعرض بترتيب مختلف في كل ورقة. يُسحب كل قسم من أقسام الاختبار من أسئلة صفته في فئاته. السؤال الذي ظهر في محاولة لا يُعدَّل: عطّله وأنشئ بديلاً.
        </p>
      </Box>
      <ResetToOriginal />
      <Records area="bank" />

      <Drawer
        open={!!sheet}
        onClose={close}
        title={sheet?.kind === "new" ? (sheet.replacing !== null ? `سؤال بديل من السؤال ${sheet.replacing}` : "سؤال جديد") : opened ? `السؤال ${opened.id}` : ""}
        footer={
          editable && (
            <div className="flex gap-2">
              <Button variant="gold" onClick={save}>
                <Check className="size-4" /> {sheet?.kind === "new" ? (sheet.replacing !== null ? "إضافة البديل وتعطيل الأصل" : "إضافة السؤال") : "حفظ السؤال"}
              </Button>
              <Button variant="glass" onClick={close}>
                إلغاء
              </Button>
            </div>
          )
        }
      >
        {sheet && draft && (
          <div className="space-y-5">
            {sheet.kind === "new" && sheet.replacing !== null && <p className="rounded-2xl bg-gold/10 p-3 text-sm text-gold ring-1 ring-gold/40">يُعطَّل السؤال {sheet.replacing} حين تحفظ هذا البديل، ويبقى في الأوراق التي ظهر فيها.</p>}
            {editable ? (
              <QuestionForm draft={draft} setDraft={setDraft} isNew={sheet.kind === "new"} />
            ) : (
              opened && (
                <div className="space-y-3">
                  <p className="rounded-2xl bg-white/[.06] p-3 text-sm text-white/80 ring-1 ring-white/10">
                    <Lock className="me-1 inline size-3.5 text-gold" />
                    {disabledOpen ? "سؤال معطّل: لا يُسحب في أي ورقة. فعّله ليعود إلى اختبارات صفاته." : n > 0 ? `ظهر في ${n} محاولات: لا يُعدَّل. أنشئ بديلاً منه، فيُعطَّل هو حين تحفظ البديل.` : "للاطلاع: تعديل الأسئلة يحتاج صلاحيته."}
                  </p>
                  <p className="font-bold leading-7 text-white">{opened.text}</p>
                  <ul className="space-y-1 text-sm">
                    {opened.options.map((o, i) => (
                      <li key={i} className={cn("rounded-xl px-3 py-1.5 ring-1", seeAnswers && i === opened.answer ? "bg-green-light/20 font-bold text-white ring-green-light/40" : "text-white/75 ring-white/10")}>
                        {LETTERS[i]}) {o} {seeAnswers && i === opened.answer && "✓"}
                      </li>
                    ))}
                  </ul>
                  {seeAnswers && opened.explanation && <p className="text-xs leading-6 text-white/65">{opened.explanation}</p>}
                  {!seeAnswers && <p className="text-xs text-white/55">الإجابة الصحيحة لا تظهر: الاطلاع عليها صلاحية مستقلة.</p>}
                  <p className="flex flex-wrap gap-x-3 text-sm font-bold">
                    {!disabledOpen && canReplace && <RowLink onClick={() => replace(opened)}>إنشاء بديل</RowLink>}
                    {canDisable && <RowLink onClick={() => toggle(opened.id, opened.text)}>{disabledOpen ? "تفعيل السؤال" : "تعطيل السؤال"}</RowLink>}
                  </p>
                </div>
              )
            )}
            {opened && !disabledOpen && may("exams.questions.assign-role") && (
              <section className="border-t border-white/10 pt-4">
                <p className="mb-2 text-sm font-bold text-white">يدخل اختبار</p>
                <p className="mb-2 text-xs text-white/55">اضغط صفة لتُدخله في اختبارها أو تُخرجه منه. يُحفظ فوراً.</p>
                <div className="flex flex-wrap gap-1.5">
                  {APPLIED_ROLES.map((r) => (
                    <Pick key={r.key} on={opened.roles.includes(r.key)} onClick={() => toggleRole(opened, r.key, r.label)} label={`السؤال ${opened.id} في اختبار ${r.label}`}>
                      {r.label}
                    </Pick>
                  ))}
                </div>
              </section>
            )}
            {opened && editable && canDisable && (
              <p className="text-xs font-bold">
                <RowLink danger onClick={() => toggle(opened.id, opened.text)}>
                  تعطيل السؤال
                </RowLink>
              </p>
            )}
            {opened && <RecordHistory refId={`q${opened.id}`} />}
          </div>
        )}
      </Drawer>

      <PrintSheet>
        <PrintDocument
          title="بنك الأسئلة — موسم 1448"
          source="إدارة الامتحانات"
          meta={[
            { label: "عدد الأسئلة", value: shown.length },
            { label: "الحالة", value: showOff ? "المعطّلة" : "الفعّالة" },
            ...(role ? [{ label: "الصفة", value: roleLabelOf(role) }] : []),
            ...(category ? [{ label: "الفئة", value: category }] : []),
            ...(type !== "all" ? [{ label: "النوع", value: QUESTION_TYPES[type] }] : []),
            ...(q.trim() ? [{ label: "البحث", value: q.trim() }] : []),
          ]}
        >
          <PrintNote>الخيارات تُخلط في كل ورقة؛ هنا بترتيب البنك، والإجابة الصحيحة بالخط العريض مع ✓.</PrintNote>
          <PrintTable
            head={["الرقم", "السؤال وخياراته", "الفئة والنوع", "يدخل اختبار"]}
            narrow={[0]}
            rows={shown.map((x) => [
              x.id,
              <>
                <b>{x.text}</b>
                {x.options.map((o, i) => (
                  <span key={i} className={cn("block ps-3", seeAnswers && i === x.answer && "font-bold")}>
                    {LETTERS[i]}) {o}
                    {seeAnswers && i === x.answer ? " ✓" : ""}
                  </span>
                ))}
              </>,
              <>
                {x.category}
                <span className="block">{QUESTION_TYPES[typeOf(x)]}</span>
              </>,
              x.roles.map(roleLabelOf).join("، ") || "—",
            ])}
            empty="لا أسئلة بهذا البحث."
          />
        </PrintDocument>
      </PrintSheet>
    </div>
  );
}
