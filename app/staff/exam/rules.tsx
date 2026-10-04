"use client";

import { Check, FileQuestion, GraduationCap, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { EXAM_QUESTIONS, questionsForRole } from "@/lib/data/admin-exam";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { APPLIED_ROLES } from "@/app/administrator/_lib/admin";
import { useExamBank, useExamRules } from "@/app/administrator/_lib/admin-rules";
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

// ───────────────────────── Exam rules ─────────────────────────

const EXAM_FIELDS: { key: "questions" | "minutes" | "passMark" | "writtenMin" | "writtenWeight"; label: string; unit: string; min: number; max: number; step?: number; hint: (v: number) => string }[] = [
  { key: "questions", label: "عدد أسئلة الامتحان", unit: "سؤالاً", min: 5, max: 60, hint: () => `لكل صفة امتحانها: تُسحب أسئلته من أسئلة صفته في البنك (البنك فيه ${EXAM_QUESTIONS.length} سؤالاً)` },
  { key: "minutes", label: "مدة الامتحان", unit: "دقيقة", min: 5, max: 180, hint: (v) => `${v} دقيقة للامتحان كاملاً` },
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
  const value = (k: (typeof EXAM_FIELDS)[number]["key"]) => (k === "writtenWeight" ? Math.round(exam.writtenWeight * 100) : (exam[k] as number));

  const set = (k: (typeof EXAM_FIELDS)[number]["key"], v: number, label: string) => {
    const before = value(k);
    actions.setAdminRules({ exam: { ...stored, [k]: k === "writtenWeight" ? v / 100 : v } });
    logAs(user, { action: "تعديل قواعد امتحان الإداريين", target: label, before: String(before), after: String(v) });
    toast({ title: `حُفظ: ${label}`, body: `من ${before} إلى ${v}`, tone: "success", icon: "💾" });
  };

  return (
    <Panel icon={<GraduationCap />} title="قواعد الامتحان" action={<Chip tone={stored ? "green" : "gold"}>{stored ? "معدَّلة هذا الموسم" : "القيم الافتراضية"}</Chip>}>
      <p className="text-sm leading-7 text-white/70">
        تُطبَّق على كل متقدم لم يُعفَ من الامتحانين. المجدِّد في صفته بتقييم مستوفٍ معفى منهما بحسب إعدادات الموسم.
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

// ───────────────────────── Question bank ─────────────────────────

/**
 * The question bank. Every role sits its own exam, so every question says whose exam it belongs to: one
 * role, several, or all of them (first aid, emergencies). The count of each role shows whether its exam
 * still has enough questions for the season's length.
 */
export function Bank() {
  const user = useStaffUser()!;
  const toast = useToast();
  const off = useStore((s) => s.adminRules.questionsOff) ?? [];
  const edits = useStore((s) => s.adminRules.questionEdits) ?? {};
  const questionRoles = useStore((s) => s.adminRules.questionRoles) ?? {};
  const live = useExamBank();
  const exam = useExamRules();
  const [open, setOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ text: string; options: string[]; answer: number; explanation: string } | null>(null);
  const [role, setRole] = useState<string>("all");
  const rolesOf = (id: number) => questionRoles[id] ?? EXAM_QUESTIONS.find((q) => q.id === id)!.roles;
  const shown = role === "all" ? EXAM_QUESTIONS : EXAM_QUESTIONS.filter((q) => rolesOf(q.id).includes(role));

  /** A question joins or leaves one role's exam */
  const toggleRole = (id: number, key: string, label: string) => {
    const now = rolesOf(id);
    const on = now.includes(key);
    actions.setAdminRules({ questionRoles: { ...questionRoles, [id]: on ? now.filter((r) => r !== key) : [...now, key] } });
    logAs(user, { action: on ? "إخراج سؤال من امتحان صفة" : "إدخال سؤال في امتحان صفة", target: `سؤال ${id}`, detail: label });
    toast({ title: on ? `خرج السؤال ${id} من امتحان ${label}` : `دخل السؤال ${id} في امتحان ${label}`, tone: on ? "info" : "success", icon: on ? "➖" : "➕" });
  };

  const toggle = (id: number, text: string) => {
    const on = off.includes(id);
    actions.setAdminRules({ questionsOff: on ? off.filter((x) => x !== id) : [...off, id] });
    logAs(user, { action: on ? "إعادة سؤال إلى بنك الامتحان" : "سحب سؤال من بنك الامتحان", target: `سؤال ${id}`, detail: text.slice(0, 60) });
    toast({ title: on ? "أُعيد السؤال إلى البنك" : "سُحب السؤال من البنك", tone: on ? "success" : "info", icon: on ? "✅" : "🚫" });
  };

  const save = (id: number) => {
    if (!draft) return;
    actions.setAdminRules({ questionEdits: { ...edits, [id]: { text: draft.text, options: draft.options, answer: draft.answer, explanation: draft.explanation } } });
    logAs(user, { action: "تعديل سؤال في بنك الامتحان", target: `سؤال ${id}`, after: draft.text.slice(0, 60) });
    toast({ title: "حُفظ السؤال", body: "يظهر بصيغته الجديدة في امتحان هذا الموسم.", tone: "success", icon: "✍️" });
    setOpen(null);
    setDraft(null);
  };

  return (
    <Panel icon={<FileQuestion />} title="بنك الأسئلة" action={<Chip tone={off.length ? "maroon" : "green"}>{EXAM_QUESTIONS.length - off.length} سؤالاً في البنك</Chip>}>
      <p className="text-sm leading-7 text-white/70">
        لكل صفة امتحانها: يأخذ المتقدم أسئلته من أسئلة صفته في البنك، وبعض الأسئلة مشترك بين الصفات. تحت كل سؤال الصفات التي يدخل امتحانها، فاضغط صفة لتُدخله في امتحانها أو تُخرجه. واسحب سؤالاً فلا يظهر لأحد هذا الموسم، أو عدّل نصه وخياراته وإجابته الصحيحة.
      </p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="امتحان صفة">
        {[{ key: "all", label: "كل الأسئلة" }, ...APPLIED_ROLES].map((r) => {
          const n = r.key === "all" ? live.length : questionsForRole(live, r.key).length;
          const short = r.key !== "all" && n < exam.questions;
          return (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={role === r.key}
              onClick={() => setRole(r.key)}
              className={cn("rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition", role === r.key ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white/80 ring-white/15 hover:bg-white/10")}
            >
              {r.label} <span className={cn("tabular-nums", short && role !== r.key && "text-gold")}>({n})</span>
            </button>
          );
        })}
      </div>
      {role !== "all" && questionsForRole(live, role).length < exam.questions && (
        <p className="mt-2 text-xs font-semibold text-gold">في امتحان هذه الصفة {questionsForRole(live, role).length} أسئلة فقط، والامتحان {exam.questions} سؤالاً: يأخذ المتقدم ما فيه.</p>
      )}
      <ul className="mt-4 space-y-2">
        {shown.map((q) => {
          const e = edits[q.id];
          const text = e?.text ?? q.text;
          const options = e?.options ?? q.options;
          const answer = e?.answer ?? q.answer;
          const disabled = off.includes(q.id);
          const editing = open === q.id;
          return (
            <li key={q.id} className={cn("rounded-2xl p-3 ring-1", disabled ? "bg-maroon/15 ring-maroon/30" : "bg-white/[.06] ring-white/10")}>
              <div className="flex flex-wrap items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 font-display font-bold text-gold">{q.id}</span>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-bold", disabled ? "text-white/50 line-through" : "text-white")}>{text}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <Chip>{q.category}</Chip>
                    <span>الإجابة: {options[answer]}</span>
                    {e && <Chip tone="gold">معدَّل</Chip>}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-white/55">في امتحان:</span>
                    {APPLIED_ROLES.map((r) => {
                      const on = rolesOf(q.id).includes(r.key);
                      return (
                        <button
                          key={r.key}
                          type="button"
                          aria-pressed={on}
                          aria-label={`السؤال ${q.id} في امتحان ${r.label}`}
                          onClick={() => toggleRole(q.id, r.key, r.label)}
                          className={cn("rounded-full px-2 py-0.5 font-bold ring-1 transition", on ? "bg-green-light/30 text-white ring-green-light/50" : "text-white/40 ring-white/15 hover:text-white/70")}
                        >
                          {on && <Check className="-mt-0.5 me-0.5 inline size-3" />}
                          {r.label}
                        </button>
                      );
                    })}
                    {rolesOf(q.id).length === APPLIED_ROLES.length && <Chip tone="green">مشترك بين الصفات كلها</Chip>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                    onClick={() => {
                      if (editing) {
                        setOpen(null);
                        setDraft(null);
                      } else {
                        setOpen(q.id);
                        setDraft({ text, options: [...options], answer, explanation: e?.explanation ?? q.explanation });
                      }
                    }}
                  >
                    {editing ? "إغلاق" : "تعديل"}
                  </Button>
                  <Button size="sm" variant={disabled ? "primary" : "ghost"} className={disabled ? "" : "text-white hover:bg-maroon/40"} onClick={() => toggle(q.id, text)}>
                    {disabled ? <><Check className="size-4" /> إعادة</> : <><X className="size-4" /> سحب</>}
                  </Button>
                </div>
              </div>
              {editing && draft && (
                <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                  <label className="block">
                    <span className="mb-1 block text-xs text-white/60">نص السؤال</span>
                    <textarea rows={2} value={draft.text} onChange={(ev) => setDraft({ ...draft, text: ev.target.value })} className={textareaClass} aria-label="نص السؤال" />
                  </label>
                  <div>
                    <span className="mb-1 block text-xs text-white/60">الخيارات — اختر الإجابة الصحيحة</span>
                    <ul className="space-y-2">
                      {draft.options.map((op, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <button
                            type="button"
                            role="radio"
                            aria-checked={draft.answer === i}
                            aria-label={`الإجابة الصحيحة ${i + 1}`}
                            onClick={() => setDraft({ ...draft, answer: i })}
                            className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold", draft.answer === i ? "bg-green-light text-white" : "bg-white/10 text-white/70 ring-1 ring-white/15")}
                          >
                            {draft.answer === i ? <Check className="size-4" /> : i + 1}
                          </button>
                          <input
                            value={op}
                            onChange={(ev) => setDraft({ ...draft, options: draft.options.map((x, j) => (j === i ? ev.target.value : x)) })}
                            className={smallInputClass}
                            aria-label={`الخيار ${i + 1}`}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs text-white/60">شرح الإجابة</span>
                    <textarea rows={2} value={draft.explanation} onChange={(ev) => setDraft({ ...draft, explanation: ev.target.value })} className={textareaClass} aria-label="شرح الإجابة" />
                  </label>
                  <Button size="sm" variant="gold" onClick={() => save(q.id)}>
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
