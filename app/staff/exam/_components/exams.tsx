"use client";

import { motion } from "motion/react";
import { AlertTriangle, Archive, CalendarClock, Check, CheckCircle2, Pencil, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import {
  DEFAULT_INSTRUCTIONS,
  EXAM_CATEGORIES,
  EXAM_KINDS,
  EXAM_STATUS,
  PAIRING,
  SECTION_ORDERS,
  questionCount,
  sectionPool,
  shortageOf,
  type ExamCategory,
  type ExamDef,
  type ExamQuestion,
  type ExamSection,
  type ExamStatus,
  type Pairing,
  type SectionOrder,
} from "@/lib/data/admin-exam";
import { dayHijri, dayTimeLabel } from "@/lib/operations";
import { cn } from "@/lib/utils";
import { APPLIED_ROLES } from "@/app/administrator/_lib/admin";
import { useExamBank } from "@/app/administrator/_lib/admin-rules";
import { hallActions, roleLabelOf, runKey, stageOf, useHalls, type Halls } from "@/app/administrator/_lib/halls";
import { Drawer, Panel, logAs, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";
import { OperationsPanel } from "../../_components/operations";
import { useExamDesk, useExamProgress } from "./desk";
import { RecordHistory, Records } from "./records";
import { examOfAttempt } from "./sittings";
import { Chip, Field, Pick, Switch, selectClass, type ChipTone } from "./ui";

const STATUS_TONE: Record<ExamStatus, ChipTone> = { draft: "gold", published: "green", archived: "muted" };

/**
 * Each section's ready questions for a test: its pool in the role's bank, less what the sections before it draw
 * (counted as the shortage counts them, so the two always agree)
 */
function readyOf(bank: ExamQuestion[], role: string, sections: Pick<ExamSection, "categories" | "draw">[]) {
  const used = new Set<number>();
  return sections.map((s) => {
    const pool = sectionPool(bank, role, s).filter((q) => !used.has(q.id));
    pool.slice(0, Math.max(0, s.draw)).forEach((q) => used.add(q.id));
    return pool.length;
  });
}

/** «القسم الإداري: 2، القسم الشرعي: 1» — what each section lacks in the bank */
function shortList(sections: Pick<ExamSection, "name" | "draw">[], ready: number[]) {
  return sections
    .map((s, i) => ({ name: s.name, n: s.draw - ready[i] }))
    .filter((x) => x.n > 0)
    .map((x) => `${x.name}: ${x.n}`)
    .join("، ");
}

/** Is a sitting of the test open or under way in any hall now? */
const isLive = (halls: Halls, id: string) => halls.centers.some((c) => ["open", "running"].includes(stageOf(halls.runs[runKey(id, c.id)])));

type Editing = { exam: ExamDef; isNew: boolean } | null;

/**
 * The tests as the administration's platform lists them: one automated test per role («الاختبار المؤتمت لصفة …»)
 * and the make-up tests created for whoever missed it. Each card says the test's status, whether the applicant sees
 * his result, its time, its halls and its sections — each drawing so many questions from its ready pool, with its
 * own pass mark. Passing the test is passing every section. A test is published to be sat and archived once done.
 */
export function Exams() {
  const user = useStaffUser()!;
  const toast = useToast();
  const halls = useHalls();
  const desk = useExamDesk();
  const bank = useExamBank();
  const progress = useExamProgress();
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  /** A new test for a role, built like its main test, in the halls where its absentees are */
  const create = (role: string, kind: ExamDef["kind"], centers?: string[]) => {
    const main = halls.examById(role);
    setEditing({
      isNew: true,
      exam: {
        id: `x-${Date.now().toString(36)}`,
        name: `الاختبار ${kind === "makeup" ? "الاستدراكي" : "المؤتمت"} لصفة ${roleLabelOf(role)}`,
        role,
        kind,
        day: "",
        date: "",
        time: main?.time ?? "09:00",
        minutes: main?.minutes ?? 25,
        sections: main?.sections ?? [],
        centers,
        status: "draft",
        showResult: main?.showResult ?? true,
        instructions: main?.instructions ?? DEFAULT_INSTRUCTIONS,
        pairing: main?.pairing ?? "manual",
        network: main?.network ?? true,
      },
    });
  };

  const sat = (e: ExamDef) => halls.centers.some((c) => halls.runs[runKey(e.id, c.id)]) || desk.attempts.some((a) => examOfAttempt(a) === e.id);
  const created = (e: ExamDef) => !APPLIED_ROLES.some((r) => r.key === e.id);

  /** Published to be sat, or archived once done — never while a hall sits it */
  const setStatus = (e: ExamDef, status: ExamStatus) => {
    if (status !== "published" && isLive(halls, e.id)) {
      toast({ title: "الاختبار جارٍ في قاعة الآن", body: "لا يُؤرشف حتى ينهي مشرفو القاعات جلساته.", tone: "warning", icon: "⏸️" });
      return;
    }
    if (status === "published") {
      const missing = shortageOf(bank, e);
      if (!e.day) {
        toast({ title: "لا يُنشر اختبار بلا موعد", body: "حدّد يومه وساعته من «تعديل» أولاً.", tone: "warning", icon: "📅" });
        return;
      }
      if (missing) {
        toast({ title: "بنك الأسئلة لا يكفي لنشره", body: `ينقص ${missing} أسئلة — ${shortList(e.sections, readyOf(bank, e.role, e.sections))}. أضف أسئلة إلى البنك أو خفّف ما يُسحب.`, tone: "warning", icon: "⚠️" });
        return;
      }
    }
    hallActions.saveExam({ ...e, status, off: undefined });
    logAs(user, { action: status === "published" ? "نشر اختبار" : status === "archived" ? "أرشفة اختبار" : "إعادة اختبار إلى المسودة", target: e.name, before: EXAM_STATUS[e.status], after: EXAM_STATUS[status], detail: dayTimeLabel(e.day, e.time), system: "exams", area: "exams", ref: e.id, important: true });
    toast({
      title: status === "published" ? `نُشر ${e.name}` : status === "archived" ? `أُرشف ${e.name}` : `${e.name} مسودة`,
      body: status === "published" ? "يفتح مشرفو القاعات جلساته في موعده." : status === "archived" ? "تبقى محاولاته ونتائجه، ولا تُفتح له جلسة." : "لا تُفتح له جلسة حتى تنشره.",
      tone: status === "published" ? "success" : "info",
      icon: status === "published" ? "📣" : "🗄️",
    });
  };

  const remove = (e: ExamDef) => {
    hallActions.deleteExam(e.id);
    logAs(user, { action: "حذف اختبار", target: e.name, detail: dayTimeLabel(e.day, e.time), system: "exams", area: "exams", ref: e.id, important: true });
    toast({ title: `حُذف ${e.name}`, tone: "info", icon: "🗑️" });
    setRemoving(null);
  };

  // Absent from their role's test with nothing left to sit: grouped by role, to create its make-up
  const missed = APPLIED_ROLES.map((r) => {
    const rows = desk.noSitting.filter((a) => a.role === r.key);
    return { role: r, n: rows.length, centers: [...new Set(rows.map((a) => a.center!.id))] };
  }).filter((x) => x.n > 0);

  return (
    <div className="space-y-4">
      <OperationsPanel keys={["admin-exams"]} system="exams" area="exams" title="مدة الاختبارات وتفعيلها" />
      <Panel
        icon={<CalendarClock />}
        title="الاختبارات"
        action={
          <Button size="sm" variant="gold" onClick={() => create(APPLIED_ROLES[0].key, "makeup")}>
            <Plus className="size-4" /> اختبار جديد
          </Button>
        }
      >
        <p className="text-sm leading-7 text-white/70">
          لكل صفة اختبارها المؤتمت، مبنياً من أقسام: يُسحب لكل متقدم من كل قسم عدد من أسئلته الجاهزة، ولكل قسم نسبة نجاحه. الناجح من نجح في كل الأقسام، لا بمجموع يبلغه. لا يُجلس إلا لاختبار منشور، والمؤرشف يحفظ محاولاته ونتائجه. ومن غاب عن اختباره يؤدي اختباراً استدراكياً حين تنشئه.
        </p>
        {missed.length > 0 && (
          <div className="mt-3 rounded-2xl bg-gold/10 p-3 ring-1 ring-gold/40">
            <p className="text-sm font-bold text-gold">غائبون لا اختبار باقٍ لهم:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {missed.map((m) => (
                <Button key={m.role.key} size="sm" variant="glass" onClick={() => create(m.role.key, "makeup", m.centers)}>
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
          const ready = readyOf(bank, e.role, e.sections);
          const missing = shortageOf(bank, e);
          return (
            <motion.li
              key={e.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn("rounded-3xl p-4 ring-1", e.status === "archived" ? "bg-black/20 ring-white/10" : missing ? "bg-maroon/15 ring-maroon/40" : "bg-white/[.06] ring-white/10")}
            >
              <div className="min-w-0">
                <p className={cn("font-display text-lg font-bold", e.status === "archived" ? "text-white/60" : "text-white")}>{e.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Chip tone={STATUS_TONE[e.status]}>{EXAM_STATUS[e.status]}</Chip>
                  <Chip tone={e.kind === "makeup" ? "gold" : "muted"}>{EXAM_KINDS[e.kind]}</Chip>
                  {e.showResult && <Chip tone="green">النتيجة تظهر للمتقدم</Chip>}
                  <span className="text-xs text-white/65">لصفة {roleLabelOf(e.role)}</span>
                </p>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {[
                  ["الموعد", dayTimeLabel(e.day, e.time) || "لم يُحدَّد", e.day ? e.date : undefined],
                  ["المدة", `${e.minutes} دقيقة`],
                  ["أسئلة المحاولة", `${questionCount(e)} في ${e.sections.length} أقسام`],
                  ["القاعات", e.centers?.length ? e.centers.map((c) => halls.centerById(c)?.name).filter(Boolean).join("، ") : `كلها (${halls.live.length})`],
                ].map(([k, v, sub]) => (
                  <div key={k} className="rounded-xl bg-black/15 p-2">
                    <dt className="text-[11px] text-white/60">{k}</dt>
                    <dd className="font-bold leading-6 text-white">{v}</dd>
                    {sub && <dd className="text-[11px] text-white/55">{sub}</dd>}
                  </div>
                ))}
              </dl>
              <ul className="mt-3 space-y-1">
                {e.sections.map((s, j) => {
                  const short = s.draw > ready[j];
                  return (
                    <li key={s.id} className={cn("rounded-xl px-2.5 py-1.5 text-xs leading-5 ring-1", short ? "bg-maroon/25 text-white ring-maroon/50" : "bg-white/[.04] text-white/85 ring-white/10")}>
                      <b className="text-white">{s.name}</b> · يُسحب {s.draw} من {ready[j]} جاهز · نجاح {s.pass}% · {SECTION_ORDERS[s.order]}
                      {short && <span className="font-bold text-gold"> — ينقص {s.draw - ready[j]}</span>}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 flex flex-wrap gap-1.5">
                <Chip tone={p.tone}>{p.label}</Chip>
                <Chip tone="muted">ينتظرونه {p.expected}</Chip>
                {p.present > 0 && <Chip tone="muted">حضروا {p.present}</Chip>}
                {p.sat > 0 && <Chip tone="muted">سلّموا {p.sat}</Chip>}
                {p.confirmed > 0 && <Chip tone="green">مؤكَّدة {p.confirmed} · ناجحون {p.passed}</Chip>}
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
              <p className="mt-2 text-xs text-white/60">
                الدخول: {PAIRING[e.pairing].label}
                {e.network ? " · شبكة القاعة مطلوبة" : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="glass" onClick={() => setEditing({ exam: e, isNew: false })}>
                  <Pencil className="size-4" /> تعديل
                </Button>
                {e.status === "draft" && (
                  <Button size="sm" variant="gold" onClick={() => setStatus(e, "published")}>
                    <Send className="size-4" /> نشر
                  </Button>
                )}
                {e.status === "published" && (
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setStatus(e, "archived")}>
                    <Archive className="size-4" /> أرشفة
                  </Button>
                )}
                {e.status === "archived" && (
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setStatus(e, "published")}>
                    <RotateCcw className="size-4" /> إعادة نشره
                  </Button>
                )}
                {created(e) &&
                  !sat(e) &&
                  (removing === e.id ? (
                    <span className="flex items-center gap-2 text-xs text-white/80">
                      حذفه نهائياً؟
                      <Button size="sm" variant="maroon" onClick={() => remove(e)}>
                        حذف
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white" onClick={() => setRemoving(null)}>
                        تراجع
                      </Button>
                    </span>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-white hover:bg-maroon/40" onClick={() => setRemoving(e.id)}>
                      <Trash2 className="size-4" /> حذف
                    </Button>
                  ))}
              </div>
            </motion.li>
          );
        })}
      </ul>

      <Records area="exams" />

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing?.isNew ? "اختبار جديد" : `تعديل ${editing?.exam.name ?? ""}`} width="max-w-3xl">
        {editing && <ExamForm key={editing.exam.id} start={editing.exam} isNew={editing.isNew} onClose={() => setEditing(null)} />}
      </Drawer>
    </div>
  );
}

// ───────────────────────── The form ─────────────────────────

type SectionDraft = { id: string; name: string; categories: ExamCategory[]; draw: string; pass: string; order: SectionOrder };
type Draft = {
  name: string;
  role: string;
  kind: ExamDef["kind"];
  day: string;
  time: string;
  minutes: string;
  status: ExamStatus;
  showResult: boolean;
  pairing: Pairing;
  network: boolean;
  centers?: string[];
  instructions: string;
  sections: SectionDraft[];
};

const sectionDrafts = (sections: ExamSection[]): SectionDraft[] => sections.map((s) => ({ ...s, draw: String(s.draw), pass: String(s.pass) }));

const toDraft = (e: ExamDef): Draft => ({
  name: e.name,
  role: e.role,
  kind: e.kind,
  day: e.day ?? "",
  time: e.time,
  minutes: String(e.minutes),
  status: e.status,
  showResult: e.showResult,
  pairing: e.pairing,
  network: e.network,
  centers: e.centers,
  instructions: e.instructions.join("\n"),
  sections: sectionDrafts(e.sections),
});

/** A whole number typed in a field, or NaN */
const whole = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN);

/** What stops the test from being saved, in the platform's words; nothing when it can be */
function problemOf(d: Draft, ready: number[]) {
  const minutes = whole(d.minutes);
  const names = d.sections.map((s) => s.name.trim());
  if (d.name.trim().length < 3) return "اكتب عنوان الاختبار (3 أحرف فأكثر).";
  if (!d.day || !/^\d{2}:\d{2}/.test(d.time)) return "حدّد يوم الاختبار وساعته.";
  if (!(minutes >= 5 && minutes <= 480)) return "مدة الاختبار يجب أن تكون من 5 إلى 480 دقيقة.";
  if (d.centers && !d.centers.length) return "اختر قاعة واحدة على الأقل، أو «كل القاعات».";
  if (!d.sections.length) return "للاختبار قسم واحد على الأقل.";
  if (names.some((n) => !n)) return "اكتب اسم كل قسم.";
  if (new Set(names).size !== names.length) return "أسماء الأقسام يجب ألا تتكرر.";
  const bare = d.sections.find((s) => !s.categories.length);
  if (bare) return `اختر فئة واحدة على الأقل يُسحب منها «${bare.name.trim()}».`;
  if (d.sections.some((s) => !(whole(s.draw) >= 1 && whole(s.draw) <= 500))) return "عدد ما يُسحب من كل قسم يجب أن يكون من 1 إلى 500.";
  if (d.sections.some((s) => !(whole(s.pass) >= 0 && whole(s.pass) <= 100))) return "نسبة النجاح في كل قسم يجب أن تكون من 0 إلى 100.";
  const lacks = d.sections.map((s, i) => whole(s.draw) - ready[i]).reduce((a, n) => a + Math.max(0, n), 0);
  if (d.status === "published" && lacks)
    return `بنك الأسئلة لا يكفي لنشره: ينقص ${lacks} أسئلة — ${shortList(
      d.sections.map((s) => ({ name: s.name.trim(), draw: whole(s.draw) })),
      ready,
    )}. أضف أسئلة إلى البنك، أو خفّف ما يُسحب، أو احفظه مسودة.`;
  return "";
}

function ExamForm({ start, isNew, onClose }: { start: ExamDef; isNew: boolean; onClose: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const halls = useHalls();
  const bank = useExamBank();
  const [d, setD] = useState<Draft>(() => toDraft(start));
  const draws = d.sections.map((s) => ({ categories: s.categories, draw: whole(s.draw) || 0 }));
  const ready = readyOf(bank, d.role, draws);
  const total = draws.reduce((a, s) => a + s.draw, 0);
  const lacks = draws.reduce((a, s, i) => a + Math.max(0, s.draw - ready[i]), 0);
  const main = !isNew && APPLIED_ROLES.some((r) => r.key === start.id);
  const setSection = (i: number, patch: Partial<SectionDraft>) => setD({ ...d, sections: d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  /** A new test takes the role's main test's shape, which it then changes */
  const pickRole = (role: string) => {
    const m = halls.examById(role);
    setD({ ...d, role, name: `الاختبار ${d.kind === "makeup" ? "الاستدراكي" : "المؤتمت"} لصفة ${roleLabelOf(role)}`, minutes: String(m?.minutes ?? whole(d.minutes)), sections: m ? sectionDrafts(m.sections) : d.sections });
  };

  const save = () => {
    const problem = problemOf(d, ready);
    if (problem) {
      toast({ title: "لم يُحفظ الاختبار", body: problem, tone: "warning", icon: "✍️" });
      return;
    }
    if (start.status === "published" && d.status !== "published" && isLive(halls, start.id)) {
      toast({ title: "الاختبار جارٍ في قاعة الآن", body: "يبقى منشوراً حتى ينهي مشرفو القاعات جلساته.", tone: "warning", icon: "⏸️" });
      return;
    }
    const next: ExamDef = {
      ...start,
      name: d.name.trim(),
      role: d.role,
      kind: d.kind,
      day: d.day,
      date: d.day !== start.day || !start.date ? dayHijri(d.day) : start.date,
      time: d.time.slice(0, 5),
      minutes: whole(d.minutes),
      status: d.status,
      showResult: d.showResult,
      pairing: d.pairing,
      network: d.network,
      centers: d.centers,
      instructions: d.instructions
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      sections: d.sections.map((s) => ({ id: s.id, name: s.name.trim(), categories: s.categories, draw: whole(s.draw), pass: whole(s.pass), order: s.order })),
      off: undefined,
    };
    hallActions.saveExam(next);
    const where = next.centers?.length ? next.centers.map((c) => halls.centerById(c)?.name).join("، ") : "كل القاعات";
    const shape = `${next.sections.map((s) => `${s.name}: ${s.draw} أسئلة بنجاح ${s.pass}%`).join("، ")} — ${next.minutes} دقيقة — ${where}`;
    const when = dayTimeLabel(next.day, next.time);
    if (isNew) {
      logAs(user, { action: "إنشاء اختبار", target: next.name, after: `${EXAM_STATUS[next.status]} — ${when}`, detail: `${EXAM_KINDS[next.kind]} لصفة ${roleLabelOf(next.role)} — ${shape}`, system: "exams", area: "exams", ref: next.id, important: true });
    } else {
      if (start.status !== next.status)
        logAs(user, { action: next.status === "published" ? "نشر اختبار" : next.status === "archived" ? "أرشفة اختبار" : "إعادة اختبار إلى المسودة", target: next.name, before: EXAM_STATUS[start.status], after: EXAM_STATUS[next.status], system: "exams", area: "exams", ref: next.id, important: true });
      const moved = start.day !== next.day || start.time !== next.time;
      if (JSON.stringify({ ...start, status: 0, off: undefined }) !== JSON.stringify({ ...next, status: 0 }))
        logAs(user, { action: "تعديل اختبار", target: next.name, before: moved ? dayTimeLabel(start.day, start.time) || "بلا موعد" : undefined, after: moved ? when : undefined, detail: shape, system: "exams", area: "exams", ref: next.id, important: moved });
    }
    toast({
      title: isNew ? `أُنشئ ${next.name}` : `حُفظ ${next.name}`,
      body: next.status === "published" ? "يفتح مشرفو القاعات جلساته في موعده، ويُطبَّق على كل ورقة تُسحب بعد الآن." : next.status === "draft" ? "مسودة: لا تُفتح له جلسة حتى تنشره." : "مؤرشف: تبقى محاولاته ونتائجه.",
      tone: "success",
      icon: "💾",
    });
    onClose();
  };

  return (
    <div className="space-y-5">
      <Field label="عنوان الاختبار">
        <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className={smallInputClass} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="الصفة">
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
        <Field label="النوع" hint={d.kind === "main" ? "اختبار الصفة، يؤديه كل متقدميها." : "يؤديه من غاب عن اختبار صفته."}>
          {main ? (
            <p className="flex h-11 items-center">
              <Chip tone="muted">{EXAM_KINDS.main}</Chip>
            </p>
          ) : (
            <select value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as ExamDef["kind"] })} className={selectClass}>
              {(Object.keys(EXAM_KINDS) as ExamDef["kind"][]).map((k) => (
                <option key={k} value={k}>
                  {EXAM_KINDS[k]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="الحالة" hint={d.status === "published" ? "يُجلس له في موعده." : d.status === "draft" ? "لا تُفتح له جلسة." : "يحفظ محاولاته ونتائجه، ولا تُفتح له جلسة."}>
          <select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as ExamStatus })} className={selectClass}>
            {(Object.keys(EXAM_STATUS) as ExamStatus[]).map((k) => (
              <option key={k} value={k}>
                {EXAM_STATUS[k]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="اليوم" hint={d.day ? dayHijri(d.day) : "تُفتح القاعة من قبل موعده بساعة إلى آخر يومه."}>
          <input type="date" value={d.day} onChange={(e) => setD({ ...d, day: e.target.value })} className={cn(smallInputClass, "text-center")} dir="ltr" />
        </Field>
        <Field label="الساعة">
          <input type="time" value={d.time} onChange={(e) => setD({ ...d, time: e.target.value })} className={cn(smallInputClass, "text-center")} dir="ltr" />
        </Field>
        <Field label="المدة (دقيقة)" hint="من 5 إلى 480">
          <input inputMode="numeric" value={d.minutes} onChange={(e) => setD({ ...d, minutes: e.target.value })} className={cn(smallInputClass, "text-center")} dir="ltr" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
          <span>
            <span className="block text-sm font-bold text-white">النتيجة تظهر للمتقدم</span>
            <span className="block text-xs leading-5 text-white/60">يرى نتيجته، قسماً قسماً، لحظة تأكيد تسليمه.</span>
          </span>
          <Switch on={d.showResult} onChange={(showResult) => setD({ ...d, showResult })} label="النتيجة تظهر للمتقدم" />
        </div>
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
          <span>
            <span className="block text-sm font-bold text-white">شبكة القاعة مطلوبة</span>
            <span className="block text-xs leading-5 text-white/60">طلب الدخول من خارج شبكة القاعة يوافق عليه المشرف ويكتب سببه.</span>
          </span>
          <Switch on={d.network} onChange={(network) => setD({ ...d, network })} label="شبكة القاعة مطلوبة" />
        </div>
      </div>

      <Field label="وضع الدخول" hint={PAIRING[d.pairing].hint}>
        <select value={d.pairing} onChange={(e) => setD({ ...d, pairing: e.target.value as Pairing })} className={selectClass}>
          {(Object.keys(PAIRING) as Pairing[]).map((k) => (
            <option key={k} value={k}>
              {PAIRING[k].label}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <p className="mb-2 text-sm font-bold text-white">القاعات</p>
        <div className="flex flex-wrap gap-1.5">
          <Pick on={!d.centers} onClick={() => setD({ ...d, centers: undefined })}>
            كل القاعات الفعّالة ({halls.live.length})
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
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-white">تعليمات شاشة القاعة</p>
          <Button size="sm" variant="ghost" className="text-gold hover:bg-white/10" onClick={() => setD({ ...d, instructions: DEFAULT_INSTRUCTIONS.join("\n") })}>
            التعليمات الافتراضية
          </Button>
        </div>
        <textarea rows={5} value={d.instructions} onChange={(e) => setD({ ...d, instructions: e.target.value })} className={textareaClass} aria-label="تعليمات شاشة القاعة" />
        <p className="mt-1 text-xs leading-5 text-white/60">سطر لكل نقطة. تظهر على شاشة عرض القاعة أثناء الاختبار.</p>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-white">الأقسام</p>
          <Chip tone="green">{total} سؤالاً في المحاولة</Chip>
          {lacks > 0 && <Chip tone="maroon">ينقص البنك {lacks} أسئلة</Chip>}
        </div>
        <p className="mb-3 text-xs leading-5 text-white/60">لكل قسم اسم لا يتكرر، والفئات التي تُسحب منها أسئلته، وكم سؤالاً يُسحب لكل متقدم من أسئلته الجاهزة في بنك الصفة، ونسبة النجاح فيه. «عشوائي» يرتّب الأسئلة لكل متقدم ترتيباً خاصاً به، و«مرتّب» بترتيب البنك؛ والخيارات تُخلط دائماً. الناجح من بلغ نسبة كل قسم.</p>
        <ul className="space-y-3">
          {d.sections.map((s, i) => {
            const draw = whole(s.draw) || 0;
            const short = draw > ready[i];
            return (
              <li key={s.id} className={cn("rounded-2xl p-3 ring-1", short ? "bg-maroon/15 ring-maroon/40" : "bg-white/[.06] ring-white/10")}>
                <div className="flex flex-wrap items-center gap-2">
                  <input value={s.name} onChange={(e) => setSection(i, { name: e.target.value })} className={cn(smallInputClass, "min-w-0 flex-1 font-bold")} aria-label="اسم القسم" placeholder="اسم القسم" />
                  <span className="w-28 shrink-0">
                    <select value={s.order} onChange={(e) => setSection(i, { order: e.target.value as SectionOrder })} className={selectClass} aria-label={`ترتيب ${s.name}`}>
                      {(Object.keys(SECTION_ORDERS) as SectionOrder[]).map((o) => (
                        <option key={o} value={o}>
                          {SECTION_ORDERS[o]}
                        </option>
                      ))}
                    </select>
                  </span>
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
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center justify-between gap-2 rounded-xl bg-white/[.05] px-3 py-2 ring-1 ring-white/10">
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-white">يُسحب</span>
                      <span className={cn("block text-[11px]", short ? "font-bold text-gold" : "text-white/55")}>
                        يُسحب {draw} من {ready[i]} جاهز{short ? ` — ينقص ${draw - ready[i]}` : ""}
                      </span>
                    </span>
                    <span className="w-20 shrink-0">
                      <input inputMode="numeric" value={s.draw} onChange={(e) => setSection(i, { draw: e.target.value })} className={cn(smallInputClass, "text-center")} dir="ltr" aria-label={`ما يُسحب من ${s.name}`} />
                    </span>
                  </label>
                  <label className="flex items-center justify-between gap-2 rounded-xl bg-white/[.05] px-3 py-2 ring-1 ring-white/10">
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-white">نسبة النجاح</span>
                      <span className="block text-[11px] text-white/55">من 0 إلى 100%</span>
                    </span>
                    <span className="flex w-24 shrink-0 items-center gap-1">
                      <input inputMode="numeric" value={s.pass} onChange={(e) => setSection(i, { pass: e.target.value })} className={cn(smallInputClass, "text-center")} dir="ltr" aria-label={`نسبة النجاح في ${s.name}`} />
                      <span className="text-sm text-white/70">%</span>
                    </span>
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
        <Button
          size="sm"
          variant="glass"
          className="mt-3"
          onClick={() => setD({ ...d, sections: [...d.sections, { id: `s${Date.now().toString(36)}`, name: `القسم ${d.sections.length + 1}`, categories: [], draw: "1", pass: "50", order: "random" }] })}
        >
          <Plus className="size-4" /> قسم جديد
        </Button>
      </div>

      <div className="flex gap-2 border-t border-white/10 pt-4">
        <Button variant="gold" onClick={save}>
          <Check className="size-4" /> {isNew ? "إنشاء الاختبار" : "حفظ الاختبار"}
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
      </div>
      {!isNew && <RecordHistory refId={start.id} />}
    </div>
  );
}
