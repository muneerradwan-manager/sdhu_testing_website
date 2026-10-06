"use client";

import { Check, Download, FileQuestion, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { EXAM_CATEGORIES, QUESTION_TYPES, TRUE_FALSE, pointsOf, typeOf, type ExamCategory, type ExamQuestion, type QuestionType } from "@/lib/data/admin-exam";
import { matches } from "@/lib/ops";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { APPLIED_ROLES } from "@/app/administrator/_lib/admin";
import { useAllQuestions, useExamBank } from "@/app/administrator/_lib/admin-rules";
import { roleLabelOf } from "@/app/administrator/_lib/halls";
import { Panel, logAs, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";
import { FilterSelect, SearchBox } from "../../_components/ops-ui";
import { Records } from "./records";
import { Chip, Pick, Segments, downloadCsv } from "./ui";

const TYPES = Object.keys(QUESTION_TYPES) as QuestionType[];

type Draft = { type: QuestionType; category: ExamCategory; roles: string[]; text: string; options: string[]; answer: number; explanation: string; points: number };

const blankDraft = (type: QuestionType, role?: string): Draft => ({
  type,
  category: "إداري",
  roles: role ? [role] : [],
  text: "",
  options: type === "choice" ? ["", "", "", ""] : type === "truefalse" ? [...TRUE_FALSE] : [],
  answer: type === "written" ? -1 : 0,
  explanation: "",
  points: 5,
});

/** The editor of one question: its wording, and per type its options and answer, or its full mark */
function QuestionForm({ draft, setDraft, isNew }: { draft: Draft; setDraft: (d: Draft) => void; isNew: boolean }) {
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
            <span className="text-white/55">التصنيف:</span>
            {EXAM_CATEGORIES.map((c) => (
              <Pick key={c} on={draft.category === c} onClick={() => setDraft({ ...draft, category: c })}>
                {c}
              </Pick>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-white/55">يدخل امتحان:</span>
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
      {draft.type === "written" ? (
        <label className="flex items-center gap-2 text-sm text-white/80">
          العلامة الكاملة
          <span className="w-20 shrink-0">
            <input type="number" min={1} max={20} value={draft.points} onChange={(e) => setDraft({ ...draft, points: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} className={cn(smallInputClass, "text-center")} aria-label="العلامة الكاملة للسؤال" />
          </span>
          درجة
        </label>
      ) : (
        <div>
          <span className="mb-1 block text-xs text-white/60">{draft.type === "truefalse" ? "الإجابة الصحيحة" : "الخيارات — اختر الإجابة الصحيحة"}</span>
          <ul className={cn(draft.type === "truefalse" ? "flex gap-2" : "space-y-2")}>
            {draft.options.map((op, i) => (
              <li key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={draft.answer === i}
                  aria-label={`الإجابة الصحيحة ${draft.type === "truefalse" ? op : i + 1}`}
                  onClick={() => setDraft({ ...draft, answer: i })}
                  className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold", draft.answer === i ? "bg-green-light text-white" : "bg-white/10 text-white/70 ring-1 ring-white/15")}
                >
                  {draft.answer === i ? <Check className="size-4" /> : i + 1}
                </button>
                {draft.type === "truefalse" ? (
                  <span className="text-sm font-bold text-white">{op}</span>
                ) : (
                  <input value={op} onChange={(ev) => setDraft({ ...draft, options: draft.options.map((x, j) => (j === i ? ev.target.value : x)) })} className={smallInputClass} aria-label={`الخيار ${i + 1}`} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">{draft.type === "written" ? "ما ينتظره المصحح في الإجابة" : "شرح الإجابة"}</span>
        <textarea rows={2} value={draft.explanation} onChange={(ev) => setDraft({ ...draft, explanation: ev.target.value })} className={textareaClass} aria-label={draft.type === "written" ? "دليل التصحيح" : "شرح الإجابة"} />
      </label>
    </div>
  );
}

/**
 * The question bank: one bank, its questions classified by subject and by type, each saying whose exam
 * it belongs to. A role's exams draw from that role's questions by their sections. A deleted question
 * leaves this season's exams but stays readable in the papers already served, and can be restored.
 */
export function Bank() {
  const user = useStaffUser()!;
  const toast = useToast();
  const off = useStore((s) => s.adminRules.questionsOff) ?? [];
  const edits = useStore((s) => s.adminRules.questionEdits) ?? {};
  const added = useStore((s) => s.adminRules.questionsAdded) ?? [];
  const questionRoles = useStore((s) => s.adminRules.questionRoles) ?? {};
  const all = useAllQuestions();
  const live = useExamBank();
  const [open, setOpen] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [role, setRole] = useState("");
  const [type, setType] = useState<QuestionType | "all">("all");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [showOff, setShowOff] = useState(false);
  const shown = all.filter(
    (x) =>
      off.includes(x.id) === showOff &&
      (!role || x.roles.includes(role)) &&
      (type === "all" || typeOf(x) === type) &&
      (!category || x.category === category) &&
      matches(q, [x.id, x.text, x.scenario, ...x.options]),
  );
  const isAdded = (id: number) => added.some((x) => x.id === id);

  /** A question joins or leaves one role's exams */
  const toggleRole = (x: ExamQuestion, key: string, label: string) => {
    const on = x.roles.includes(key);
    actions.setAdminRules({ questionRoles: { ...questionRoles, [x.id]: on ? x.roles.filter((r) => r !== key) : [...x.roles, key] } });
    logAs(user, { action: on ? "إخراج سؤال من امتحان صفة" : "إدخال سؤال في امتحان صفة", target: `سؤال ${x.id}`, detail: label, system: "exams", area: "bank", ref: `q${x.id}` });
    toast({ title: on ? `خرج السؤال ${x.id} من امتحان ${label}` : `دخل السؤال ${x.id} في امتحان ${label}`, tone: on ? "info" : "success", icon: on ? "➖" : "➕" });
  };

  const toggle = (id: number, text: string) => {
    const was = off.includes(id);
    actions.setAdminRules({ questionsOff: was ? off.filter((x) => x !== id) : [...off, id] });
    logAs(user, { action: was ? "استعادة سؤال إلى بنك الأسئلة" : "حذف سؤال من بنك الأسئلة", target: `سؤال ${id}`, detail: text.slice(0, 60), system: "exams", area: "bank", ref: `q${id}` });
    toast({ title: was ? "استُعيد السؤال" : "حُذف السؤال", body: was ? "يعود إلى امتحانات صفاته." : "لا يُسحب في أي ورقة بعد الآن. تجده في «المحذوفة» لاستعادته.", tone: was ? "success" : "info", icon: was ? "✅" : "🗑️" });
  };

  const close = () => {
    setOpen(null);
    setDraft(null);
  };

  const save = (id: number | "new") => {
    if (!draft) return;
    if (!draft.text.trim() || (draft.type === "choice" && draft.options.some((o) => !o.trim()))) {
      toast({ title: "أكمل السؤال", body: draft.type === "choice" ? "النص والخيارات الأربعة." : "نص السؤال.", tone: "warning", icon: "✍️" });
      return;
    }
    if (id === "new") {
      if (!draft.roles.length) {
        toast({ title: "اختر صفة واحدة على الأقل", body: "السؤال يدخل امتحانات الصفات التي تختارها.", tone: "warning", icon: "✍️" });
        return;
      }
      const next = Math.max(999, ...all.map((x) => x.id)) + 1;
      const nq: ExamQuestion = {
        id: next,
        category: draft.category,
        type: draft.type,
        roles: draft.roles,
        text: draft.text.trim(),
        options: draft.options,
        answer: draft.answer,
        explanation: draft.explanation.trim(),
        ...(draft.type === "written" ? { points: draft.points } : {}),
      };
      actions.setAdminRules({ questionsAdded: [...added, nq] });
      logAs(user, { action: "إضافة سؤال إلى بنك الأسئلة", target: `سؤال ${next}`, after: `${QUESTION_TYPES[draft.type]} — ${draft.category}`, detail: nq.text.slice(0, 60), system: "exams", area: "bank", ref: `q${next}` });
      toast({ title: `أُضيف السؤال ${next}`, body: `${QUESTION_TYPES[draft.type]} في امتحانات ${draft.roles.length} صفات.`, tone: "success", icon: "➕" });
    } else {
      const patch = { text: draft.text, options: draft.options, answer: draft.answer, explanation: draft.explanation, ...(draft.type === "written" ? { points: draft.points } : {}) };
      if (isAdded(id)) actions.setAdminRules({ questionsAdded: added.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
      else actions.setAdminRules({ questionEdits: { ...edits, [id]: patch } });
      logAs(user, { action: "تعديل سؤال في بنك الأسئلة", target: `سؤال ${id}`, after: draft.text.slice(0, 60), system: "exams", area: "bank", ref: `q${id}` });
      toast({ title: "حُفظ السؤال", body: "يظهر بصيغته الجديدة في كل ورقة تُسحب بعد الآن.", tone: "success", icon: "✍️" });
    }
    close();
  };

  const download = () =>
    downloadCsv("بنك-أسئلة-التأهيل-1448.csv", [
      ["الرقم", "النوع", "التصنيف", "يدخل امتحان", "السؤال", "الإجابة", "في البنك"],
      ...all.map((x) => [x.id, QUESTION_TYPES[typeOf(x)], x.category, x.roles.map(roleLabelOf).join(" / "), x.text, typeOf(x) === "written" ? "تحريري" : x.options[x.answer], off.includes(x.id) ? "محذوف" : "نعم"]),
    ]);

  return (
    <div className="space-y-4">
      <Panel
        icon={<FileQuestion />}
        title="بنك الأسئلة"
        action={
          <span className="flex items-center gap-2">
            <Chip tone="green">{live.length} سؤالاً</Chip>
            <Button size="sm" variant="glass" onClick={download}>
              <Download className="size-4" /> تنزيل
            </Button>
            <Button
              size="sm"
              variant="gold"
              onClick={() => {
                setShowOff(false);
                setOpen("new");
                setDraft(blankDraft("choice", role || undefined));
              }}
            >
              <Plus className="size-4" /> سؤال جديد
            </Button>
          </span>
        }
      >
        <p className="text-sm leading-7 text-white/70">
          بنك واحد للموسم، أسئلته مصنّفة بموضوعها ونوعها: اختيار من متعدد، وصح أو خطأ، وتحريري يصححه مصحح. وتحت كل سؤال الصفات التي يدخل امتحاناتها: اضغط صفة لتُدخله فيها أو تُخرجه. تسحب أقسام كل امتحان أسئلتها من هنا بحسب موضوعها.
        </p>
        <div className="mt-4 grid gap-2 md:grid-cols-[1.5fr_1fr_1fr]">
          <SearchBox value={q} onChange={setQ} label="بحث في الأسئلة" placeholder="نص السؤال أو خياراته أو رقمه..." />
          <FilterSelect label="الصفة" all="كل الصفات" value={role} onChange={setRole} options={APPLIED_ROLES.map((r) => ({ value: r.key, label: `${r.label} (${live.filter((x) => x.roles.includes(r.key)).length})` }))} />
          <FilterSelect label="التصنيف" all="كل التصنيفات" value={category} onChange={setCategory} options={EXAM_CATEGORIES.map((c) => ({ value: c, label: `${c} (${live.filter((x) => x.category === c).length})` }))} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Segments
            label="نوع السؤال"
            value={type}
            onChange={setType}
            items={[{ value: "all" as const, label: "كل الأنواع", count: live.length }, ...TYPES.map((t) => ({ value: t, label: QUESTION_TYPES[t], count: live.filter((x) => typeOf(x) === t).length }))]}
          />
          <Segments
            label="المحذوفة"
            value={showOff ? "off" : "on"}
            onChange={(v) => setShowOff(v === "off")}
            items={[
              { value: "on", label: "في البنك" },
              { value: "off", label: "المحذوفة", count: off.length },
            ]}
          />
        </div>

        {open === "new" && draft && (
          <div className="mt-4 rounded-2xl bg-gold/10 p-4 ring-1 ring-gold/40">
            <p className="mb-3 font-bold text-gold">سؤال جديد</p>
            <QuestionForm draft={draft} setDraft={setDraft} isNew />
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="gold" onClick={() => save("new")}>
                <Plus className="size-4" /> إضافة السؤال
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
            const deleted = off.includes(x.id);
            const editing = open === x.id;
            return (
              <li key={x.id} className={cn("rounded-2xl p-3 ring-1", deleted ? "bg-maroon/15 ring-maroon/30" : "bg-white/[.06] ring-white/10")}>
                <div className="flex flex-wrap items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 font-display text-sm font-bold text-gold">{x.id}</span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-bold", deleted ? "text-white/50 line-through" : "text-white")}>{x.text}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/60">
                      <Chip tone="green">{QUESTION_TYPES[t]}</Chip>
                      <Chip tone="gold">{x.category}</Chip>
                      <span>{t === "written" ? `العلامة الكاملة ${pointsOf(x)} درجات` : `الإجابة: ${x.options[x.answer]}`}</span>
                      {(edits[x.id] || isAdded(x.id)) && <Chip tone="gold">{isAdded(x.id) ? "أضفته هذا الموسم" : "معدَّل"}</Chip>}
                    </p>
                    {!deleted && (
                      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-white/55">يدخل امتحان:</span>
                        {APPLIED_ROLES.map((r) => (
                          <Pick key={r.key} on={x.roles.includes(r.key)} onClick={() => toggleRole(x, r.key, r.label)} label={`السؤال ${x.id} في امتحان ${r.label}`}>
                            {r.label}
                          </Pick>
                        ))}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!deleted && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/10"
                        onClick={() => {
                          if (editing) close();
                          else {
                            setOpen(x.id);
                            setDraft({ ...blankDraft(t), category: x.category, roles: x.roles, text: x.text, options: [...x.options], answer: x.answer, explanation: x.explanation, points: pointsOf(x) });
                          }
                        }}
                      >
                        {editing ? "إغلاق" : "تعديل"}
                      </Button>
                    )}
                    <Button size="sm" variant={deleted ? "primary" : "ghost"} className={deleted ? "" : "text-white hover:bg-maroon/40"} onClick={() => toggle(x.id, x.text)}>
                      {deleted ? (
                        <>
                          <RotateCcw className="size-4" /> استعادة
                        </>
                      ) : (
                        <>
                          <Trash2 className="size-4" /> حذف
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
    </div>
  );
}
