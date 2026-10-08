"use client";

import { Check, Copy, Download, FileQuestion, Plus, Power, PowerOff, Printer, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PrintSheet } from "@/components/print/print-sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { EXAM_CATEGORIES, QUESTION_TYPES, TRUE_FALSE, typeOf, type ExamCategory, type ExamQuestion, type QuestionType } from "@/lib/data/admin-exam";
import { matches } from "@/lib/ops";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { APPLIED_ROLES } from "@/app/administrator/_lib/admin";
import { useAllQuestions, useExamBank } from "@/app/administrator/_lib/admin-rules";
import { roleLabelOf } from "@/app/administrator/_lib/halls";
import { Panel, logAs, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";
import { FilterSelect, SearchBox } from "../../_components/ops-ui";
import { useExamDesk } from "./desk";
import { Records } from "./records";
import { Chip, Pick, Segments, downloadCsv } from "./ui";

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

/**
 * The question bank: one bank, its questions by category and type, each saying whose test it belongs to. A role's
 * test draws each section's questions from that role's questions in the section's categories. Every question is
 * chosen from options (2 to 6) and marked by the platform; its options are always shuffled on the paper. A question
 * used in an attempt is never edited: it is disabled, and a replacement is created in its place.
 */
export function Bank() {
  const user = useStaffUser()!;
  const toast = useToast();
  const desk = useExamDesk();
  const off = useStore((s) => s.adminRules.questionsOff) ?? [];
  const edits = useStore((s) => s.adminRules.questionEdits) ?? {};
  const added = useStore((s) => s.adminRules.questionsAdded) ?? [];
  const questionRoles = useStore((s) => s.adminRules.questionRoles) ?? {};
  const all = useAllQuestions();
  const live = useExamBank();
  const [open, setOpen] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  /** The question a new one replaces: disabled when the new one is saved */
  const [replacing, setReplacing] = useState<number | null>(null);
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

  /** A question joins or leaves one role's test */
  const toggleRole = (x: ExamQuestion, key: string, label: string) => {
    const on = x.roles.includes(key);
    actions.setAdminRules({ questionRoles: { ...questionRoles, [x.id]: on ? x.roles.filter((r) => r !== key) : [...x.roles, key] } });
    logAs(user, { action: on ? "إخراج سؤال من اختبار صفة" : "إدخال سؤال في اختبار صفة", target: `سؤال ${x.id}`, detail: label, system: "exams", area: "bank", ref: `q${x.id}` });
    toast({ title: on ? `خرج السؤال ${x.id} من اختبار ${label}` : `دخل السؤال ${x.id} في اختبار ${label}`, tone: on ? "info" : "success", icon: on ? "➖" : "➕" });
  };

  /** Disabled: no paper draws it from now on, and the papers that served it keep it */
  const toggle = (id: number, text: string, quiet = false) => {
    const was = off.includes(id);
    actions.setAdminRules({ questionsOff: was ? off.filter((x) => x !== id) : [...off, id] });
    logAs(user, { action: was ? "تفعيل سؤال" : "تعطيل سؤال", target: `سؤال ${id}`, detail: text.slice(0, 60), system: "exams", area: "bank", ref: `q${id}` });
    if (!quiet) toast({ title: was ? "فُعّل السؤال" : "عُطّل السؤال", body: was ? "يعود إلى أقسام اختبارات صفاته." : "لا يُسحب في أي ورقة بعد الآن، ويبقى في الأوراق التي ظهر فيها. تجده في «المعطّلة».", tone: was ? "success" : "info", icon: was ? "✅" : "⏸️" });
  };

  const close = () => {
    setOpen(null);
    setDraft(null);
    setReplacing(null);
  };

  const save = (id: number | "new") => {
    if (!draft) return;
    const problem = problemOf(draft, id === "new");
    if (problem) {
      toast({ title: "لم يُحفظ السؤال", body: problem, tone: "warning", icon: "✍️" });
      return;
    }
    const options = draft.type === "choice" ? draft.options.map((o) => o.trim()) : draft.options;
    if (id === "new") {
      const next = Math.max(999, ...all.map((x) => x.id)) + 1;
      const nq: ExamQuestion = { id: next, category: draft.category, type: draft.type, roles: draft.roles, text: draft.text.trim(), options, answer: draft.answer, explanation: draft.explanation.trim() };
      actions.setAdminRules({ questionsAdded: [...added, nq], ...(replacing !== null && !off.includes(replacing) && { questionsOff: [...off, replacing] }) });
      logAs(user, { action: "إضافة سؤال إلى بنك الأسئلة", target: `سؤال ${next}`, after: `${QUESTION_TYPES[draft.type]} — ${draft.category}`, detail: `${replacing !== null ? `بديلاً من السؤال ${replacing} — ` : ""}${nq.text.slice(0, 60)}`, system: "exams", area: "bank", ref: `q${next}` });
      if (replacing !== null && !off.includes(replacing)) logAs(user, { action: "تعطيل سؤال", target: `سؤال ${replacing}`, detail: `استُبدل بالسؤال ${next}`, system: "exams", area: "bank", ref: `q${replacing}` });
      toast({ title: `أُضيف السؤال ${next}`, body: replacing !== null ? `بديلاً من السؤال ${replacing}، الذي عُطّل ويبقى في الأوراق التي ظهر فيها.` : `${QUESTION_TYPES[draft.type]} في اختبارات ${draft.roles.length} صفات.`, tone: "success", icon: "➕" });
    } else {
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

  /** A replacement for a used question: its content to start from, and the original disabled once it is saved */
  const replace = (x: ExamQuestion) => {
    setShowOff(false);
    setOpen("new");
    setReplacing(x.id);
    setDraft(draftOf(x));
  };

  const download = () =>
    downloadCsv("بنك-الأسئلة-1448.csv", [
      ["الرقم", "النوع", "الفئة", "يدخل اختبار", "السؤال", "الخيارات", "الإجابة", "الحالة", "استُخدم في محاولات"],
      ...all.map((x) => [x.id, QUESTION_TYPES[typeOf(x)], x.category, x.roles.map(roleLabelOf).join(" / "), x.text, x.options.join(" | "), x.options[x.answer], off.includes(x.id) ? "معطّل" : "فعّال", used.get(x.id) ?? 0]),
    ]);

  return (
    <div className="space-y-4">
      <Panel
        icon={<FileQuestion />}
        title="بنك الأسئلة"
        action={
          <span className="flex flex-wrap items-center gap-2">
            <Chip tone="green">{live.length} فعّالاً</Chip>
            <Button size="sm" variant="glass" onClick={download}>
              <Download className="size-4" /> تصدير Excel
            </Button>
            <Button size="sm" variant="glass" onClick={() => window.print()}>
              <Printer className="size-4" /> تصدير PDF
            </Button>
            <Button
              size="sm"
              variant="gold"
              onClick={() => {
                setShowOff(false);
                setOpen("new");
                setReplacing(null);
                setDraft(blankDraft("choice", role || undefined));
              }}
            >
              <Plus className="size-4" /> سؤال جديد
            </Button>
          </span>
        }
      >
        <p className="text-sm leading-7 text-white/70">
          بنك واحد للموسم. كل سؤال اختيار من خيارات (من 2 إلى 6) أو صح وخطأ، تصحّحه المنصة فور التسليم، فلا سؤال يكتب المتقدم إجابته. الخيارات تُعرض دائماً بترتيب مختلف في كل ورقة. يُسحب كل قسم من أقسام الاختبار من أسئلة صفته في فئاته، وتحت كل سؤال الصفات التي يدخل اختبارها: اضغط صفة لتُدخله فيها أو تُخرجه. السؤال الذي ظهر في محاولة لا يُعدَّل: عطّله وأنشئ بديلاً.
        </p>
        <div className="mt-4 grid gap-2 md:grid-cols-[1.5fr_1fr_1fr]">
          <SearchBox value={q} onChange={setQ} label="بحث في الأسئلة" placeholder="نص السؤال أو خياراته أو رقمه..." />
          <FilterSelect label="الصفة" all="كل الصفات" value={role} onChange={setRole} options={APPLIED_ROLES.map((r) => ({ value: r.key, label: `${r.label} (${live.filter((x) => x.roles.includes(r.key)).length})` }))} />
          <FilterSelect label="الفئة" all="كل الفئات" value={category} onChange={setCategory} options={EXAM_CATEGORIES.map((c) => ({ value: c, label: `${c} (${live.filter((x) => x.category === c).length})` }))} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Segments
            label="نوع السؤال"
            value={type}
            onChange={setType}
            items={[{ value: "all" as const, label: "كل الأنواع", count: live.length }, ...TYPES.map((t) => ({ value: t, label: QUESTION_TYPES[t], count: live.filter((x) => typeOf(x) === t).length }))]}
          />
          <Segments
            label="حالة السؤال"
            value={showOff ? "off" : "on"}
            onChange={(v) => setShowOff(v === "off")}
            items={[
              { value: "on", label: "الفعّالة", count: live.length },
              { value: "off", label: "المعطّلة", count: off.length },
            ]}
          />
        </div>

        {open === "new" && draft && (
          <div className="mt-4 rounded-2xl bg-gold/10 p-4 ring-1 ring-gold/40">
            <p className="mb-3 font-bold text-gold">{replacing !== null ? `سؤال بديل من السؤال ${replacing} — يُعطَّل الأصل حين تحفظه` : "سؤال جديد"}</p>
            <QuestionForm draft={draft} setDraft={setDraft} isNew />
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="gold" onClick={() => save("new")}>
                <Plus className="size-4" /> {replacing !== null ? "إضافة البديل وتعطيل الأصل" : "إضافة السؤال"}
              </Button>
              <Button size="sm" variant="ghost" className="text-white" onClick={close}>
                إلغاء
              </Button>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-white/60">{shown.length} سؤالاً يطابق</p>
        <ul className="mt-2 space-y-2">
          {shown.map((x) => {
            const t = typeOf(x);
            const disabled = off.includes(x.id);
            const editing = open === x.id;
            const n = used.get(x.id) ?? 0;
            return (
              <li key={x.id} className={cn("rounded-2xl p-3 ring-1", disabled ? "bg-black/20 ring-white/10" : "bg-white/[.06] ring-white/10")}>
                <div className="flex flex-wrap items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 font-display text-sm font-bold text-gold">{x.id}</span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-bold", disabled ? "text-white/55" : "text-white")}>{x.text}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/60">
                      <Chip tone={disabled ? "maroon" : "green"}>{disabled ? "معطّل" : "فعّال"}</Chip>
                      <Chip tone="muted">{QUESTION_TYPES[t]}</Chip>
                      <Chip tone="gold">{x.category}</Chip>
                      <span>الإجابة: {x.options[x.answer]}</span>
                      {n > 0 && <Chip tone="muted">ظهر في {n} محاولات</Chip>}
                      {(edits[x.id] || isAdded(x.id)) && <Chip tone="gold">{isAdded(x.id) ? "أضفته هذا الموسم" : "معدَّل"}</Chip>}
                    </p>
                    {!disabled && (
                      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-white/55">يدخل اختبار:</span>
                        {APPLIED_ROLES.map((r) => (
                          <Pick key={r.key} on={x.roles.includes(r.key)} onClick={() => toggleRole(x, r.key, r.label)} label={`السؤال ${x.id} في اختبار ${r.label}`}>
                            {r.label}
                          </Pick>
                        ))}
                      </p>
                    )}
                    {n > 0 && !disabled && <p className="mt-1.5 text-[11px] text-white/55">استُخدم في محاولات: لا يُعدَّل. عطّله وأنشئ بديلاً.</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!disabled && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/10"
                        disabled={n > 0}
                        title={n > 0 ? "استُخدم في محاولات: لا يُعدَّل. عطّله وأنشئ بديلاً" : undefined}
                        onClick={() => {
                          if (editing) close();
                          else {
                            setOpen(x.id);
                            setReplacing(null);
                            setDraft(draftOf(x));
                          }
                        }}
                      >
                        {editing ? "إغلاق" : "تعديل"}
                      </Button>
                    )}
                    {n > 0 && !disabled && (
                      <Button size="sm" variant="ghost" className="text-gold hover:bg-white/10" onClick={() => replace(x)}>
                        <Copy className="size-4" /> إنشاء بديل
                      </Button>
                    )}
                    <Button size="sm" variant={disabled ? "primary" : "ghost"} className={disabled ? "" : "text-white hover:bg-maroon/40"} onClick={() => toggle(x.id, x.text)}>
                      {disabled ? (
                        <>
                          <Power className="size-4" /> تفعيل
                        </>
                      ) : (
                        <>
                          <PowerOff className="size-4" /> تعطيل
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {editing && draft && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <QuestionForm draft={draft} setDraft={setDraft} isNew={false} />
                    <Button size="sm" variant="gold" className="mt-3" onClick={() => save(x.id)}>
                      حفظ السؤال
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
      <Records area="bank" />

      <PrintSheet>
        <article className="text-[10pt] leading-relaxed text-black">
          <header className="border-b-2 border-[#00594F] pb-2">
            <p className="text-[9pt] text-[#555]">إدارة الامتحانات</p>
            <h1 className="font-display text-[15pt] font-bold text-[#00594F]">بنك الأسئلة — موسم 1448</h1>
            <p className="text-[9pt]">
              {shown.length} سؤالاً{role ? ` · صفة ${roleLabelOf(role)}` : ""}
              {category ? ` · فئة ${category}` : ""} · {showOff ? "المعطّلة" : "الفعّالة"}. الخيارات تُخلط في كل ورقة؛ هنا بترتيب البنك.
            </p>
          </header>
          <ol className="mt-3 space-y-2.5">
            {shown.map((x) => (
              <li key={x.id} className="break-inside-avoid">
                <p className="font-bold">
                  {x.id}. {x.text}
                </p>
                <p className="text-[8.5pt] text-[#444]">
                  {x.category} · {QUESTION_TYPES[typeOf(x)]} · يدخل اختبار: {x.roles.map(roleLabelOf).join("، ")}
                </p>
                <ul className="mt-0.5 ps-4">
                  {x.options.map((o, i) => (
                    <li key={i} className={i === x.answer ? "font-bold" : ""}>
                      {LETTERS[i]}) {o}
                      {i === x.answer ? " ✓" : ""}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </article>
      </PrintSheet>
    </div>
  );
}
