"use client";

import { Check, FileQuestion, GraduationCap, LayoutList, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import {
  EXAM_CATEGORIES,
  QUESTION_TYPES,
  TRUE_FALSE,
  pointsOf,
  questionCount,
  sectionPool,
  typeOf,
  type ExamBlueprint,
  type ExamCategory,
  type ExamQuestion,
  type ExamSection,
  type QuestionType,
} from "@/lib/data/admin-exam";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { APPLIED_ROLES } from "@/app/administrator/_lib/admin";
import { useAllQuestions, useBlueprints, useExamBank, useExamRules } from "@/app/administrator/_lib/admin-rules";
import { useAdminRows } from "../_components/data";
import { Panel, logAs, smallInputClass, textareaClass, useStaffUser } from "../_components/kit";

const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/40",
  gold: "bg-gold/20 text-gold ring-gold/40",
  maroon: "bg-maroon/40 text-white ring-maroon/60",
} as const;

function Chip({ tone = "gold", children }: { tone?: keyof typeof CHIP; children: React.ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", CHIP[tone])}>{children}</span>;
}

const TYPES = Object.keys(QUESTION_TYPES) as QuestionType[];

/** A toggle chip for picking a role, a category or a type */
function Pick({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={cn("rounded-full px-2.5 py-1 text-xs font-bold ring-1 transition", on ? "bg-green-light/30 text-white ring-green-light/50" : "text-white/45 ring-white/15 hover:text-white/75")}
    >
      {on && <Check className="-mt-0.5 me-0.5 inline size-3" />}
      {children}
    </button>
  );
}

// ───────────────────────── Exam rules ─────────────────────────

const EXAM_FIELDS: { key: "passMark" | "writtenMin" | "writtenWeight"; label: string; unit: string; min: number; max: number; step?: number; hint: (v: number) => string }[] = [
  { key: "passMark", label: "علامة النجاح النهائية", unit: "من 100", min: 40, max: 100, hint: () => "الكتابي والشفهي معاً بأوزانهما" },
  { key: "writtenMin", label: "الحد الأدنى للكتابي وحده", unit: "من 100", min: 0, max: 100, hint: () => "من ينزل عنه لا يُستدعى للشفهي" },
  { key: "writtenWeight", label: "وزن الكتابي من النتيجة", unit: "%", min: 0, max: 100, step: 5, hint: (v) => `الشفهي ${100 - v}%` },
];

export function ExamRules() {
  const user = useStaffUser()!;
  const toast = useToast();
  const exam = useExamRules();
  const stored = useStore((s) => s.adminRules.exam);
  const announced = useAdminRows().filter((r) => r.profile.resultPublishedAt).length;
  const value = (k: (typeof EXAM_FIELDS)[number]["key"]) => (k === "writtenWeight" ? Math.round(exam.writtenWeight * 100) : exam[k]);

  const set = (k: (typeof EXAM_FIELDS)[number]["key"], v: number, label: string) => {
    const before = value(k);
    actions.setAdminRules({ exam: { ...stored, [k]: k === "writtenWeight" ? v / 100 : v } });
    logAs(user, { action: "تعديل قواعد امتحان الإداريين", target: label, before: String(before), after: String(v) });
    toast({ title: `حُفظ: ${label}`, body: `من ${before} إلى ${v}`, tone: "success", icon: "💾" });
  };

  return (
    <Panel icon={<GraduationCap />} title="قواعد الامتحان" action={<Chip tone={stored ? "green" : "gold"}>{stored ? "معدَّلة هذا الموسم" : "القيم الافتراضية"}</Chip>}>
      <p className="text-sm leading-7 text-white/70">
        كيف تُحكم النتيجة: تُطبَّق على كل متقدم لم يُعفَ من الامتحانين. المجدِّد في صفته بتقييم مستوفٍ معفى منهما بحسب إعدادات الموسم. أما مدة امتحان كل صفة وأقسامه وأسئلته ففي «هيكل الامتحان».
      </p>
      {announced > 0 && (
        <p className="mt-2 text-xs font-semibold leading-6 text-gold">
          أُعلنت {announced} نتائج. النتيجة النهائية لا تُحفظ رقماً ثابتاً بل تُحسب دائماً بهذه القواعد، فتعديل الأوزان أو علامة النجاح أو حد الكتابي يغيّر النتائج المعلنة أيضاً.
        </p>
      )}
      <ul className="mt-4 space-y-3">
        {EXAM_FIELDS.map((f) => {
          const v = value(f.key);
          return (
            <li key={f.key} className="rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-white">{f.label}</p>
                  <p className="text-xs text-white/60">{f.hint(v)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={v}
                    min={f.min}
                    max={f.max}
                    step={f.step ?? 1}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n) && n >= f.min && n <= f.max) set(f.key, n, f.label);
                    }}
                    className={cn(smallInputClass, "w-28 text-center font-display text-lg")}
                    aria-label={f.label}
                  />
                  <span className="text-sm text-white/70">{f.unit}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ───────────────────────── Blueprints ─────────────────────────

/**
 * Each role's exam, built section by section: what each section is about (the bank categories it draws
 * from), its share of the written mark, and how many questions of each type it serves. A draft is edited,
 * then saved: the weights must add up to 100. Papers already served keep the structure they were drawn on.
 */
export function Blueprints() {
  const user = useStaffUser()!;
  const toast = useToast();
  const stored = useStore((s) => s.adminRules.blueprints);
  const blueprints = useBlueprints();
  const bank = useExamBank();
  const [role, setRole] = useState<string>(APPLIED_ROLES[0].key);
  const [draft, setDraft] = useState<ExamBlueprint | null>(null);
  const b = draft ?? blueprints[role];
  const label = APPLIED_ROLES.find((r) => r.key === role)!.label;
  const weights = b.sections.reduce((a, s) => a + s.weight, 0);
  const edited = !!stored?.[role];

  const edit = (f: (x: ExamBlueprint) => ExamBlueprint) => setDraft(f(b));
  const setSection = (i: number, patch: Partial<ExamSection>) => edit((x) => ({ ...x, sections: x.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const available = (categories: ExamCategory[], t: QuestionType) => sectionPool(bank, role, { categories }).filter((q) => typeOf(q) === t).length;

  const save = () => {
    if (weights !== 100) {
      toast({ title: "مجموع أوزان الأقسام ليس 100", body: `المجموع الآن ${weights}%.`, tone: "warning", icon: "⚖️" });
      return;
    }
    actions.setAdminRules({ blueprints: { ...stored, [role]: b } });
    logAs(user, { action: "تعديل هيكل امتحان صفة", target: label, after: b.sections.map((s) => `${s.name} ${s.weight}%`).join("، "), detail: `${questionCount(b)} سؤالاً في ${b.minutes} دقيقة` });
    toast({ title: `حُفظ هيكل امتحان ${label}`, body: "يُطبَّق على كل ورقة تُسحب بعد الآن.", tone: "success", icon: "💾" });
    setDraft(null);
  };

  return (
    <Panel
      icon={<LayoutList />}
      title="هيكل الامتحان"
      action={<Chip tone={edited ? "green" : "gold"}>{edited ? "معدَّل هذا الموسم" : "كما تطلقه المنصة"}</Chip>}
    >
      <p className="text-sm leading-7 text-white/70">
        لكل صفة امتحانها، مقسوماً أقساماً: لكل قسم موضوعه (فئات البنك التي يُسحب منها)، ووزنه من علامة الكتابي، وعدد أسئلته من كل نوع: اختيار من متعدد، وصح أو خطأ، وتحريري يصححه مصحح. تُسحب أسئلة كل قسم لكل متقدم بترتيب خاص به.
      </p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="امتحان صفة">
        {APPLIED_ROLES.map((r) => (
          <button
            key={r.key}
            type="button"
            role="radio"
            aria-checked={role === r.key}
            onClick={() => {
              setRole(r.key);
              setDraft(null);
            }}
            className={cn("rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition", role === r.key ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white/80 ring-white/15 hover:bg-white/10")}
          >
            {r.label} <span className="tabular-nums">({questionCount(blueprints[r.key])})</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
        <label className="flex items-center gap-2 whitespace-nowrap text-sm font-bold text-white">
          المدة
          <span className="w-20 shrink-0">
            <input
              type="number"
              min={5}
              max={180}
              value={b.minutes}
              onChange={(e) => edit((x) => ({ ...x, minutes: Math.max(5, Math.min(180, Number(e.target.value) || 5)) }))}
              className={cn(smallInputClass, "text-center")}
              aria-label="مدة الامتحان بالدقائق"
            />
          </span>
          دقيقة
        </label>
        <Chip tone="green">{questionCount(b)} سؤالاً</Chip>
        <Chip tone={weights === 100 ? "green" : "maroon"}>مجموع الأوزان {weights}%</Chip>
      </div>

      <ul className="mt-4 space-y-3">
        {b.sections.map((s, i) => (
          <li key={s.id} className="rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
            <div className="flex flex-wrap items-center gap-3">
              <input value={s.name} onChange={(e) => setSection(i, { name: e.target.value })} className={cn(smallInputClass, "min-w-0 flex-1 font-bold")} aria-label="اسم القسم" />
              <label className="flex items-center gap-1.5 whitespace-nowrap text-sm text-white/80">
                الوزن
                <span className="w-20 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={s.weight}
                    onChange={(e) => setSection(i, { weight: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                    className={cn(smallInputClass, "text-center font-display text-lg")}
                    aria-label={`وزن ${s.name}`}
                  />
                </span>
                %
              </label>
              {b.sections.length > 1 && (
                <Button size="sm" variant="ghost" className="text-white hover:bg-maroon/40" onClick={() => edit((x) => ({ ...x, sections: x.sections.filter((_, j) => j !== i) }))} aria-label={`حذف ${s.name}`}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-white/55">يُسحب من:</span>
              {EXAM_CATEGORIES.map((c) => (
                <Pick key={c} on={s.categories.includes(c)} onClick={() => setSection(i, { categories: s.categories.includes(c) ? s.categories.filter((y) => y !== c) : [...s.categories, c] })} label={`${s.name}: ${c}`}>
                  {c}
                </Pick>
              ))}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
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
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={s.counts[t]}
                        onChange={(e) => setSection(i, { counts: { ...s.counts, [t]: Math.max(0, Math.min(30, Number(e.target.value) || 0)) } })}
                        className={cn(smallInputClass, "text-center")}
                        aria-label={`${s.name}: عدد أسئلة ${QUESTION_TYPES[t]}`}
                      />
                    </span>
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="glass" onClick={() => edit((x) => ({ ...x, sections: [...x.sections, { id: `s${Date.now()}`, name: "قسم جديد", weight: 0, categories: [], counts: { choice: 0, truefalse: 0, written: 0 } }] }))}>
          <Plus className="size-4" /> قسم جديد
        </Button>
        <span className="flex-1" />
        {draft && (
          <>
            <Button size="sm" variant="ghost" className="text-white" onClick={() => setDraft(null)}>
              تراجع
            </Button>
            <Button size="sm" variant="gold" onClick={save}>
              <Check className="size-4" /> حفظ الهيكل
            </Button>
          </>
        )}
        {!draft && edited && (
          <Button
            size="sm"
            variant="ghost"
            className="text-white"
            onClick={() => {
              const rest = { ...stored };
              delete rest[role];
              actions.setAdminRules({ blueprints: Object.keys(rest).length ? rest : undefined });
              logAs(user, { action: "إعادة هيكل امتحان صفة إلى الأصل", target: label });
              toast({ title: `أُعيد هيكل امتحان ${label} إلى الأصل`, tone: "info", icon: "↩️" });
            }}
          >
            <RotateCcw className="size-4" /> الأصل
          </Button>
        )}
      </div>
      {weights !== 100 && <p className="mt-2 text-xs font-semibold text-gold">مجموع أوزان الأقسام {weights}%: يجب أن يكون 100 ليُحفظ الهيكل.</p>}
    </Panel>
  );
}

// ───────────────────────── Question bank ─────────────────────────

type Draft = { type: QuestionType; category: ExamCategory; roles: string[]; scenario: string; text: string; options: string[]; answer: number; explanation: string; points: number };

const blankDraft = (type: QuestionType, role?: string): Draft => ({
  type,
  category: "إداري",
  roles: role && role !== "all" ? [role] : [],
  scenario: "",
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
              <Pick key={t} on={draft.type === t} onClick={() => setDraft({ ...blankDraft(t), category: draft.category, roles: draft.roles, scenario: draft.scenario, text: draft.text, explanation: draft.explanation })}>
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
            <span className="text-white/55">في امتحان:</span>
            {APPLIED_ROLES.map((r) => (
              <Pick key={r.key} on={draft.roles.includes(r.key)} onClick={() => setDraft({ ...draft, roles: draft.roles.includes(r.key) ? draft.roles.filter((x) => x !== r.key) : [...draft.roles, r.key] })}>
                {r.label}
              </Pick>
            ))}
          </div>
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">سيناريو قبل السؤال (اختياري)</span>
            <textarea rows={2} value={draft.scenario} onChange={(ev) => setDraft({ ...draft, scenario: ev.target.value })} className={textareaClass} aria-label="السيناريو" />
          </label>
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
                  <input
                    value={op}
                    onChange={(ev) => setDraft({ ...draft, options: draft.options.map((x, j) => (j === i ? ev.target.value : x)) })}
                    className={smallInputClass}
                    aria-label={`الخيار ${i + 1}`}
                  />
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
 * The question bank. Every role sits its own exam, so every question says whose exam it belongs to: one
 * role, several, or all of them (first aid, emergencies). Questions are of three types; the
 * administration writes new ones of any type, edits any, and withdraws one from this season's exams.
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
  const [role, setRole] = useState<string>("all");
  const [type, setType] = useState<QuestionType | "all">("all");
  const shown = all.filter((q) => (role === "all" || q.roles.includes(role)) && (type === "all" || typeOf(q) === type));
  const isAdded = (id: number) => added.some((q) => q.id === id);

  /** A question joins or leaves one role's exam */
  const toggleRole = (q: ExamQuestion, key: string, label: string) => {
    const on = q.roles.includes(key);
    actions.setAdminRules({ questionRoles: { ...questionRoles, [q.id]: on ? q.roles.filter((r) => r !== key) : [...q.roles, key] } });
    logAs(user, { action: on ? "إخراج سؤال من امتحان صفة" : "إدخال سؤال في امتحان صفة", target: `سؤال ${q.id}`, detail: label });
    toast({ title: on ? `خرج السؤال ${q.id} من امتحان ${label}` : `دخل السؤال ${q.id} في امتحان ${label}`, tone: on ? "info" : "success", icon: on ? "➖" : "➕" });
  };

  const toggle = (id: number, text: string) => {
    const on = off.includes(id);
    actions.setAdminRules({ questionsOff: on ? off.filter((x) => x !== id) : [...off, id] });
    logAs(user, { action: on ? "إعادة سؤال إلى بنك الامتحان" : "سحب سؤال من بنك الامتحان", target: `سؤال ${id}`, detail: text.slice(0, 60) });
    toast({ title: on ? "أُعيد السؤال إلى البنك" : "سُحب السؤال من البنك", tone: on ? "success" : "info", icon: on ? "✅" : "🚫" });
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
        toast({ title: "اختر صفة واحدة على الأقل", body: "السؤال يدخل امتحان الصفات التي تختارها.", tone: "warning", icon: "✍️" });
        return;
      }
      const next = Math.max(999, ...all.map((q) => q.id)) + 1;
      const q: ExamQuestion = {
        id: next,
        category: draft.category,
        type: draft.type,
        roles: draft.roles,
        ...(draft.scenario.trim() ? { scenario: draft.scenario.trim() } : {}),
        text: draft.text.trim(),
        options: draft.options,
        answer: draft.answer,
        explanation: draft.explanation.trim(),
        ...(draft.type === "written" ? { points: draft.points } : {}),
      };
      actions.setAdminRules({ questionsAdded: [...added, q] });
      logAs(user, { action: "إضافة سؤال إلى بنك الامتحان", target: `سؤال ${next}`, after: `${QUESTION_TYPES[draft.type]} — ${draft.category}`, detail: q.text.slice(0, 60) });
      toast({ title: `أُضيف السؤال ${next}`, body: `${QUESTION_TYPES[draft.type]} في امتحان ${draft.roles.length} صفات.`, tone: "success", icon: "➕" });
    } else if (isAdded(id)) {
      actions.setAdminRules({ questionsAdded: added.map((q) => (q.id === id ? { ...q, text: draft.text, options: draft.options, answer: draft.answer, explanation: draft.explanation, ...(draft.type === "written" ? { points: draft.points } : {}) } : q)) });
      logAs(user, { action: "تعديل سؤال في بنك الامتحان", target: `سؤال ${id}`, after: draft.text.slice(0, 60) });
      toast({ title: "حُفظ السؤال", tone: "success", icon: "✍️" });
    } else {
      actions.setAdminRules({ questionEdits: { ...edits, [id]: { text: draft.text, options: draft.options, answer: draft.answer, explanation: draft.explanation, ...(draft.type === "written" ? { points: draft.points } : {}) } } });
      logAs(user, { action: "تعديل سؤال في بنك الامتحان", target: `سؤال ${id}`, after: draft.text.slice(0, 60) });
      toast({ title: "حُفظ السؤال", body: "يظهر بصيغته الجديدة في امتحان هذا الموسم.", tone: "success", icon: "✍️" });
    }
    close();
  };

  return (
    <Panel
      icon={<FileQuestion />}
      title="بنك الأسئلة"
      action={
        <span className="flex items-center gap-2">
          <Chip tone={off.length ? "maroon" : "green"}>{live.length} سؤالاً في البنك</Chip>
          <Button
            size="sm"
            variant="gold"
            onClick={() => {
              setOpen("new");
              setDraft(blankDraft("choice", role));
            }}
          >
            <Plus className="size-4" /> سؤال جديد
          </Button>
        </span>
      }
    >
      <p className="text-sm leading-7 text-white/70">
        لكل صفة امتحانها: تُسحب أسئلته من أسئلة صفته في البنك بحسب «هيكل الامتحان»، وبعض الأسئلة مشترك بين الصفات. والأسئلة ثلاثة أنواع: اختيار من متعدد، وصح أو خطأ، وتحريري يصححه مصحح. تحت كل سؤال الصفات التي يدخل امتحانها، فاضغط صفة لتُدخله في امتحانها أو تُخرجه. واكتب سؤالاً جديداً من أي نوع، أو عدّل سؤالاً، أو اسحبه فلا يظهر لأحد هذا الموسم.
      </p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="امتحان صفة">
        {[{ key: "all", label: "كل الأسئلة" }, ...APPLIED_ROLES].map((r) => (
          <button
            key={r.key}
            type="button"
            role="radio"
            aria-checked={role === r.key}
            onClick={() => setRole(r.key)}
            className={cn("rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition", role === r.key ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white/80 ring-white/15 hover:bg-white/10")}
          >
            {r.label} <span className="tabular-nums">({r.key === "all" ? live.length : live.filter((q) => q.roles.includes(r.key)).length})</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="نوع السؤال">
        {(["all", ...TYPES] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={cn("rounded-full px-3 py-1 text-xs font-bold ring-1 transition", type === t ? "bg-white text-ink ring-white" : "text-white/70 ring-white/15 hover:bg-white/10")}
          >
            {t === "all" ? "كل الأنواع" : QUESTION_TYPES[t]} <span className="tabular-nums">({t === "all" ? live.length : live.filter((q) => typeOf(q) === t).length})</span>
          </button>
        ))}
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

      <ul className="mt-4 space-y-2">
        {shown.map((q) => {
          const t = typeOf(q);
          const disabled = off.includes(q.id);
          const editing = open === q.id;
          return (
            <li key={q.id} className={cn("rounded-2xl p-3 ring-1", disabled ? "bg-maroon/15 ring-maroon/30" : "bg-white/[.06] ring-white/10")}>
              <div className="flex flex-wrap items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 font-display text-sm font-bold text-gold">{q.id}</span>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-bold", disabled ? "text-white/50 line-through" : "text-white")}>{q.text}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <Chip tone="green">{QUESTION_TYPES[t]}</Chip>
                    <Chip>{q.category}</Chip>
                    <span>{t === "written" ? `العلامة الكاملة ${pointsOf(q)} درجات` : `الإجابة: ${q.options[q.answer]}`}</span>
                    {(edits[q.id] || isAdded(q.id)) && <Chip tone="gold">{isAdded(q.id) ? "أضافته الإدارة" : "معدَّل"}</Chip>}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-white/55">في امتحان:</span>
                    {APPLIED_ROLES.map((r) => (
                      <Pick key={r.key} on={q.roles.includes(r.key)} onClick={() => toggleRole(q, r.key, r.label)} label={`السؤال ${q.id} في امتحان ${r.label}`}>
                        {r.label}
                      </Pick>
                    ))}
                    {q.roles.length === APPLIED_ROLES.length && <Chip tone="green">مشترك بين الصفات كلها</Chip>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                    onClick={() => {
                      if (editing) close();
                      else {
                        setOpen(q.id);
                        setDraft({ ...blankDraft(t), category: q.category, roles: q.roles, scenario: q.scenario ?? "", text: q.text, options: [...q.options], answer: q.answer, explanation: q.explanation, points: pointsOf(q) });
                      }
                    }}
                  >
                    {editing ? "إغلاق" : "تعديل"}
                  </Button>
                  <Button size="sm" variant={disabled ? "primary" : "ghost"} className={disabled ? "" : "text-white hover:bg-maroon/40"} onClick={() => toggle(q.id, q.text)}>
                    {disabled ? <><Check className="size-4" /> إعادة</> : <><X className="size-4" /> سحب</>}
                  </Button>
                </div>
              </div>
              {editing && draft && (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <QuestionForm draft={draft} setDraft={setDraft} isNew={false} />
                  <Button size="sm" variant="gold" className="mt-3" onClick={() => save(q.id)}>
                    حفظ السؤال
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
