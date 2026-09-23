"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarRange, Check, ClipboardList, FileQuestion, GraduationCap, Plus, RotateCcw, ScrollText, Trash2, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { EXAM_QUESTIONS } from "@/lib/data/admin-exam";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { COMMITMENTS, POSITIONS } from "@/app/administrator/_lib/admin";
import { useAdminCalendar, useCommitments, useEvaluationStages, useExamRules, useRoles } from "@/app/administrator/_lib/admin-rules";
import { Gate, Kpi, PageHeader, Panel, Tabs, logAs, smallInputClass, textareaClass, useStaffUser } from "../_components/kit";

type Tab = "exam" | "bank" | "roles" | "stages" | "calendar";

const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/40",
  gold: "bg-gold/20 text-gold ring-gold/40",
  maroon: "bg-maroon/40 text-white ring-maroon/60",
} as const;

function Chip({ tone = "gold", children }: { tone?: keyof typeof CHIP; children: React.ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", CHIP[tone])}>{children}</span>;
}

/**
 * Everything about the administrators that is not a number in the season settings: the exam and its
 * question bank, which roles are open, what the applicant commits to, and the calendar. The platform
 * ships defaults and the administration edits them here; the administrator portal reads the result.
 */
export function AdminRulesView() {
  return (
    <Gate perms={["season.settings", "administrators.manage"]}>
      <AdminRules />
    </Gate>
  );
}

function AdminRules() {
  const user = useStaffUser()!;
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("exam");
  const rules = useStore((s) => s.adminRules);
  const exam = useExamRules();
  const roles = useRoles();
  const commitments = useCommitments();
  const edited = Object.keys(rules).length;

  return (
    <div>
      <PageHeader
        eyebrow="الجزء الثاني — الإداريون الموسميون"
        icon={<ScrollText />}
        title="قواعد الإداريين"
        description="ما يراه الإداري في بوابته يبدأ من هنا: الامتحان وبنك أسئلته، والصفات المفتوحة هذا الموسم، والالتزامات التي يوقّع عليها، ورزنامة مراحله. تُعدَّل هنا فتظهر عنده في الموسم نفسه."
        actions={
          edited > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="border-white/25 text-white hover:bg-white/10"
              onClick={() => {
                actions.resetAdminRules();
                logAs(user, { action: "إعادة قواعد الإداريين إلى الأصل", target: "موسم 1448" });
                toast({ title: "أُعيدت القواعد الافتراضية", tone: "info", icon: "↩️" });
              }}
            >
              <RotateCcw className="size-4" /> إعادة الكل إلى الأصل
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="أسئلة الامتحان" value={exam.questions} icon={<FileQuestion />} hint={`من بنك فيه ${EXAM_QUESTIONS.length} سؤالاً`} />
        <Kpi label="مدة الامتحان" value={exam.minutes} suffix="دقيقة" icon={<GraduationCap />} tone="gold" delay={0.05} hint={`النجاح من ${exam.passMark}`} />
        <Kpi label="الصفات المفتوحة" value={roles.length} icon={<UsersRound />} tone="teal" delay={0.1} hint={`من ${POSITIONS.length} صفة`} />
        <Kpi label="الالتزامات" value={commitments.length} icon={<ClipboardList />} tone="maroon" delay={0.15} hint="يوقّع عليها كل متقدم" />
      </div>

      <div className="mt-6">
        <Tabs
          id="admin-rules"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "exam", label: "قواعد الامتحان" },
            { value: "bank", label: "بنك الأسئلة", count: EXAM_QUESTIONS.length },
            { value: "roles", label: "الصفات والالتزامات" },
            { value: "stages", label: "مراحل التقييم" },
            { value: "calendar", label: "رزنامة الإداريين" },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="mt-4 space-y-4">
          {tab === "exam" && <ExamRules />}
          {tab === "bank" && <Bank />}
          {tab === "roles" && <RolesAndCommitments />}
          {tab === "stages" && <Stages />}
          {tab === "calendar" && <Calendar />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────── Exam rules ─────────────────────────

const EXAM_FIELDS: { key: "questions" | "minutes" | "passMark" | "writtenMin" | "writtenWeight"; label: string; unit: string; min: number; max: number; step?: number; hint: (v: number) => string }[] = [
  { key: "questions", label: "عدد أسئلة الامتحان", unit: "سؤالاً", min: 5, max: 60, hint: () => `تُسحب من بنك الأسئلة — البنك فيه ${EXAM_QUESTIONS.length} سؤالاً` },
  { key: "minutes", label: "مدة الامتحان", unit: "دقيقة", min: 5, max: 180, hint: (v) => `${v} دقيقة للامتحان كاملاً` },
  { key: "passMark", label: "علامة النجاح النهائية", unit: "من 100", min: 40, max: 100, hint: () => "الكتابي والشفهي معاً بأوزانهما" },
  { key: "writtenMin", label: "الحد الأدنى للكتابي وحده", unit: "من 100", min: 0, max: 100, hint: () => "من ينزل عنه لا يُستدعى للشفهي" },
  { key: "writtenWeight", label: "وزن الكتابي من النتيجة", unit: "%", min: 0, max: 100, step: 5, hint: (v) => `الشفهي ${100 - v}%` },
];

function ExamRules() {
  const user = useStaffUser()!;
  const toast = useToast();
  const exam = useExamRules();
  const stored = useStore((s) => s.adminRules.exam);
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

function Bank() {
  const user = useStaffUser()!;
  const toast = useToast();
  const off = useStore((s) => s.adminRules.questionsOff) ?? [];
  const edits = useStore((s) => s.adminRules.questionEdits) ?? {};
  const [open, setOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ text: string; options: string[]; answer: number; explanation: string } | null>(null);

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
        كل متقدم يأخذ أسئلته من هذا البنك. اسحب سؤالاً فلا يظهر لأحد هذا الموسم، أو عدّل نصه وخياراته وإجابته الصحيحة.
      </p>
      <ul className="mt-4 space-y-2">
        {EXAM_QUESTIONS.map((q) => {
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

// ───────────────────────── Roles and commitments ─────────────────────────

function RolesAndCommitments() {
  const user = useStaffUser()!;
  const toast = useToast();
  const off = useStore((s) => s.adminRules.rolesOff) ?? [];
  const desc = useStore((s) => s.adminRules.roleDesc) ?? {};
  const cOff = useStore((s) => s.adminRules.commitmentsOff) ?? [];
  const cEdits = useStore((s) => s.adminRules.commitmentEdits) ?? {};
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [cEditing, setCEditing] = useState<string | null>(null);
  const [cDraft, setCDraft] = useState({ label: "", detail: "" });

  const toggleRole = (key: string, label: string) => {
    const on = off.includes(key);
    actions.setAdminRules({ rolesOff: on ? off.filter((x) => x !== key) : [...off, key] });
    logAs(user, { action: on ? "فتح صفة للتقدم هذا الموسم" : "إغلاق صفة عن التقدم هذا الموسم", target: label });
    toast({ title: on ? `فُتحت صفة ${label}` : `أُغلقت صفة ${label}`, body: on ? "تظهر في طلب المشاركة." : "لا تظهر في طلب المشاركة هذا الموسم.", tone: on ? "success" : "info", icon: on ? "✅" : "🚫" });
  };

  return (
    <div className="space-y-4">
      <Panel icon={<UsersRound />} title="الصفات المتاحة للتقدم" action={<Chip tone={off.length ? "maroon" : "green"}>{POSITIONS.length - off.length} من {POSITIONS.length}</Chip>}>
        <p className="text-sm leading-7 text-white/70">
          رئاسة التكتل ومعاونها لا يُتقدَّم إليهما أصلاً: الأولى بالانتخاب والثانية باختيار الرئيس المنتخب، فتبقيان خارج قائمة التقدم مهما فُتحتا.
        </p>
        <ul className="mt-4 space-y-2">
          {POSITIONS.map((p) => {
            const disabled = off.includes(p.key);
            return (
              <li key={p.key} className={cn("rounded-2xl p-3 ring-1", disabled ? "bg-maroon/15 ring-maroon/30" : "bg-white/[.06] ring-white/10")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-white">
                      {p.label}
                      {p.elected && <Chip tone="gold">بالانتخاب — لا يُتقدَّم إليها</Chip>}
                      {desc[p.key] && <Chip>وصف معدَّل</Chip>}
                    </p>
                    {editing === p.key ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input value={draft} onChange={(e) => setDraft(e.target.value)} className={cn(smallInputClass, "min-w-0 flex-1")} aria-label={`وصف ${p.label}`} />
                        <Button
                          size="sm"
                          variant="gold"
                          onClick={() => {
                            actions.setAdminRules({ roleDesc: { ...desc, [p.key]: draft.trim() || p.desc } });
                            logAs(user, { action: "تعديل وصف صفة", target: p.label, after: draft.trim().slice(0, 60) });
                            setEditing(null);
                            toast({ title: "حُفظ الوصف", tone: "success", icon: "✍️" });
                          }}
                        >
                          حفظ
                        </Button>
                        <Button size="sm" variant="ghost" className="text-white" onClick={() => setEditing(null)}>
                          إلغاء
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-xs leading-6 text-white/65">{desc[p.key] ?? p.desc}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/10"
                      onClick={() => {
                        setEditing(p.key);
                        setDraft(desc[p.key] ?? p.desc);
                      }}
                    >
                      الوصف
                    </Button>
                    <Button size="sm" variant={disabled ? "primary" : "ghost"} className={disabled ? "" : "text-white hover:bg-maroon/40"} onClick={() => toggleRole(p.key, p.label)}>
                      {disabled ? "فتح" : "إغلاق"}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel icon={<ClipboardList />} title="التزامات الإداري" action={<Chip tone={cOff.length ? "maroon" : "green"}>{COMMITMENTS.length - cOff.length} التزاماً</Chip>}>
        <p className="text-sm leading-7 text-white/70">يوقّع عليها كل متقدم إلكترونياً مع تاريخها، وتُحفظ في استمارة تسجيله.</p>
        <ul className="mt-4 space-y-2">
          {COMMITMENTS.map((c) => {
            const disabled = cOff.includes(c.key);
            const label = cEdits[c.key]?.label ?? c.label;
            const detail = cEdits[c.key]?.detail ?? c.detail;
            return (
              <li key={c.key} className={cn("rounded-2xl p-3 ring-1", disabled ? "bg-maroon/15 ring-maroon/30" : "bg-white/[.06] ring-white/10")}>
                {cEditing === c.key ? (
                  <div className="space-y-2">
                    <input value={cDraft.label} onChange={(e) => setCDraft({ ...cDraft, label: e.target.value })} className={smallInputClass} aria-label="نص الالتزام" />
                    <textarea rows={2} value={cDraft.detail} onChange={(e) => setCDraft({ ...cDraft, detail: e.target.value })} className={textareaClass} aria-label="تفصيل الالتزام" />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="gold"
                        onClick={() => {
                          actions.setAdminRules({ commitmentEdits: { ...cEdits, [c.key]: { label: cDraft.label.trim() || c.label, detail: cDraft.detail.trim() || c.detail } } });
                          logAs(user, { action: "تعديل التزام على الإداريين", target: cDraft.label.trim().slice(0, 60) });
                          setCEditing(null);
                          toast({ title: "حُفظ الالتزام", tone: "success", icon: "✍️" });
                        }}
                      >
                        حفظ
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white" onClick={() => setCEditing(null)}>
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-bold", disabled ? "text-white/50 line-through" : "text-white")}>{label}</p>
                      <p className="text-xs leading-6 text-white/65">{detail}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/10"
                        onClick={() => {
                          setCEditing(c.key);
                          setCDraft({ label, detail });
                        }}
                      >
                        تعديل
                      </Button>
                      <Button
                        size="sm"
                        variant={disabled ? "primary" : "ghost"}
                        className={disabled ? "" : "text-white hover:bg-maroon/40"}
                        onClick={() => {
                          const on = cOff.includes(c.key);
                          actions.setAdminRules({ commitmentsOff: on ? cOff.filter((x) => x !== c.key) : [...cOff, c.key] });
                          logAs(user, { action: on ? "إعادة التزام إلى الطلب" : "إسقاط التزام من الطلب", target: label });
                          toast({ title: on ? "أُعيد الالتزام" : "أُسقط الالتزام", tone: on ? "success" : "info", icon: on ? "✅" : "🚫" });
                        }}
                      >
                        {disabled ? "إعادة" : "إسقاط"}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

// ───────────────────────── Calendar ─────────────────────────

function Calendar() {
  const user = useStaffUser()!;
  const toast = useToast();
  const rows = useAdminCalendar();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ hijri: "", title: "", detail: "" });

  const write = (next: { hijri: string; title: string; detail: string }[], action: string, target?: string) => {
    actions.setAdminRules({ calendar: next });
    logAs(user, { action, target });
  };

  return (
    <Panel
      icon={<CalendarRange />}
      title="رزنامة الإداريين"
      action={
        <Button
          size="sm"
          variant="gold"
          onClick={() => {
            write([...rows, { hijri: "تاريخ جديد", title: "مرحلة جديدة", detail: "" }], "إضافة مرحلة إلى رزنامة الإداريين");
            toast({ title: "أُضيفت مرحلة", body: "عدّل تاريخها وعنوانها.", tone: "success", icon: "🗓️" });
          }}
        >
          <Plus className="size-4" /> مرحلة
        </Button>
      }
    >
      <p className="text-sm leading-7 text-white/70">هذه المواعيد يراها الإداري في بوابته. ما تكتبه هنا هو ما يظهر عنده.</p>
      <ul className="mt-4 space-y-2">
        {rows.map((r, i) => (
          <li key={`${r.title}-${i}`} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
            {editing === i ? (
              <div className="space-y-2">
                <input value={draft.hijri} onChange={(e) => setDraft({ ...draft, hijri: e.target.value })} className={smallInputClass} aria-label="التاريخ الهجري" />
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={smallInputClass} aria-label="عنوان المرحلة" />
                <textarea rows={2} value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} className={textareaClass} aria-label="تفصيل المرحلة" />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="gold"
                    onClick={() => {
                      write(rows.map((x, j) => (j === i ? { ...draft } : x)), "تعديل مرحلة في رزنامة الإداريين", draft.title);
                      setEditing(null);
                      toast({ title: "حُفظت المرحلة", tone: "success", icon: "🗓️" });
                    }}
                  >
                    حفظ
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white" onClick={() => setEditing(null)}>
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gold">{r.hijri}</p>
                  <p className="font-bold text-white">{r.title}</p>
                  {r.detail && <p className="text-xs leading-6 text-white/65">{r.detail}</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                    onClick={() => {
                      setEditing(i);
                      setDraft({ hijri: r.hijri, title: r.title, detail: r.detail });
                    }}
                  >
                    تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-maroon/40"
                    aria-label={`حذف ${r.title}`}
                    onClick={() => {
                      write(rows.filter((_, j) => j !== i), "حذف مرحلة من رزنامة الإداريين", r.title);
                      toast({ title: "حُذفت المرحلة", tone: "info", icon: "🗑️" });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ───────────────────────── Evaluation stages ─────────────────────────

/**
 * An administrator is scored stage by stage, so the administration decides what the stages are.
 * The evaluation screen renders exactly this list.
 */
function Stages() {
  const user = useStaffUser()!;
  const toast = useToast();
  const stages = useEvaluationStages();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ label: "", hint: "" });

  const write = (next: { key: string; label: string; hint: string }[], action: string, target?: string) => {
    actions.setAdminRules({ stages: next });
    logAs(user, { action, target });
  };

  return (
    <Panel
      icon={<ClipboardList />}
      title="مراحل تقييم الإداري"
      action={
        <Button
          size="sm"
          variant="gold"
          onClick={() => {
            write([...stages, { key: `stage-${Date.now()}`, label: "مرحلة جديدة", hint: "" }], "إضافة مرحلة إلى تقييم الإداريين");
            toast({ title: "أُضيفت مرحلة", body: "عدّل اسمها ووصفها.", tone: "success", icon: "➕" });
          }}
        >
          <Plus className="size-4" /> مرحلة
        </Button>
      }
    >
      <p className="text-sm leading-7 text-white/70">
        الإداري يُقيَّم في كل مرحلة على حدة بدرجة من 5 وملاحظة ودليل، لأن عمله في المطارات غير عمله في المشاعر. هذه القائمة هي ما يظهر في شاشة التقييم.
      </p>
      <ul className="mt-4 space-y-2">
        {stages.map((st, i) => (
          <li key={st.key} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
            {editing === i ? (
              <div className="space-y-2">
                <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className={smallInputClass} aria-label="اسم المرحلة" />
                <input value={draft.hint} onChange={(e) => setDraft({ ...draft, hint: e.target.value })} className={smallInputClass} aria-label="وصف المرحلة" />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="gold"
                    onClick={() => {
                      write(stages.map((x, j) => (j === i ? { ...x, label: draft.label.trim() || x.label, hint: draft.hint.trim() } : x)), "تعديل مرحلة في تقييم الإداريين", draft.label);
                      setEditing(null);
                      toast({ title: "حُفظت المرحلة", tone: "success", icon: "✍️" });
                    }}
                  >
                    حفظ
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white" onClick={() => setEditing(null)}>
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-bold text-white">
                    <span className="grid size-6 place-items-center rounded-lg bg-white/10 text-xs text-gold">{i + 1}</span>
                    {st.label}
                  </p>
                  {st.hint && <p className="mt-0.5 text-xs leading-6 text-white/65">{st.hint}</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                    onClick={() => {
                      setEditing(i);
                      setDraft({ label: st.label, hint: st.hint });
                    }}
                  >
                    تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-maroon/40"
                    aria-label={`حذف ${st.label}`}
                    onClick={() => {
                      write(stages.filter((_, j) => j !== i), "حذف مرحلة من تقييم الإداريين", st.label);
                      toast({ title: "حُذفت المرحلة", tone: "info", icon: "🗑️" });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
