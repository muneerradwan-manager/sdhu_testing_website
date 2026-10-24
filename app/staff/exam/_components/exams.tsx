"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
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
import { logAs, smallInputClass, textareaClass, useCan, useStaffUser } from "../../_components/kit";
import { OperationsPanel } from "../../_components/operations";
import { AddButton, Box, EditHeader, EditLayout, ListTable, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { useExamDesk, useExamProgress } from "./desk";
import { RecordHistory, Records } from "./records";
import { ResetToOriginal } from "./shell";
import { examOfAttempt } from "./sittings";
import { Chip, Field, Pick, Segments, Switch, selectClass } from "./ui";

const LIST = "/staff/exam/manage/exams";
const EDIT = "/staff/exam/manage/exams/edit";
const STATUS_TONE: Record<ExamStatus, "gold" | "green" | "muted"> = { draft: "gold", published: "green", archived: "muted" };
const DARK_MODAL = "max-w-md border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white";

/** A new test's screen, shaped for a role and a kind, in the halls given (a make-up test: where its absentees are) */
const newHref = (role?: string, kind?: ExamDef["kind"], centers?: string[]) => {
  const q = new URLSearchParams();
  if (role) q.set("role", role);
  if (kind) q.set("kind", kind);
  if (centers?.length) q.set("centers", centers.join(","));
  const s = q.toString();
  return s ? `${EDIT}?${s}` : EDIT;
};

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

/** What a test allows: a test created this season and never sat can be deleted; the roles' own tests never */
function useExamRules() {
  const halls = useHalls();
  const desk = useExamDesk();
  const sat = (e: ExamDef) => halls.centers.some((c) => halls.runs[runKey(e.id, c.id)]) || desk.attempts.some((a) => examOfAttempt(a) === e.id);
  const created = (e: ExamDef) => !APPLIED_ROLES.some((r) => r.key === e.id);
  return { deletable: (e: ExamDef) => created(e) && !sat(e) };
}

/** Published to be sat, or archived once done — never while a hall sits it — and deleted when allowed */
function useExamActions() {
  const user = useStaffUser()!;
  const toast = useToast();
  const halls = useHalls();
  const bank = useExamBank();
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
  };
  return { setStatus, remove };
}

function DeleteDialog({ exam, onClose, onDone }: { exam: ExamDef | null; onClose: () => void; onDone?: () => void }) {
  const { remove } = useExamActions();
  return (
    <Modal open={!!exam} onClose={onClose} className={DARK_MODAL}>
      {exam && (
        <div>
          <p className="font-display text-xl font-bold">حذف «{exam.name}» نهائياً؟</p>
          <p className="mt-2 text-sm leading-7 text-white/75">لم يُجلس له بعد، فلا تضيع محاولة ولا نتيجة.</p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="maroon"
              onClick={() => {
                remove(exam);
                onClose();
                onDone?.();
              }}
            >
              <Trash2 className="size-4" /> حذف
            </Button>
            <Button variant="glass" onClick={onClose}>
              تراجع
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ───────────────────────── All tests ─────────────────────────

/**
 * The tests as a list: one automated test per role and the make-up tests created for whoever missed it. Each opens
 * on its name to its own edit screen; publishing and archiving are under its name. How many sat and passed each is
 * on the file's dashboard.
 */
export function Exams() {
  const halls = useHalls();
  const desk = useExamDesk();
  const bank = useExamBank();
  const progress = useExamProgress();
  const { setStatus } = useExamActions();
  const { deletable } = useExamRules();
  const may = useCan();
  const [filter, setFilter] = useState<"all" | ExamStatus>("all");
  const [removing, setRemoving] = useState<ExamDef | null>(null);
  const shown = halls.exams.filter((e) => filter === "all" || e.status === filter);
  const count = (s: ExamStatus) => halls.exams.filter((e) => e.status === s).length;

  // Absent from their role's test with nothing left to sit: grouped by role, to create its make-up
  const missed = APPLIED_ROLES.map((r) => {
    const rows = desk.noSitting.filter((a) => a.role === r.key);
    return { role: r, n: rows.length, centers: [...new Set(rows.map((a) => a.center!.id))] };
  }).filter((x) => x.n > 0);

  return (
    <div className="space-y-5">
      <Title
        action={
          may("exams.exams.POST") && (
            <AddButton href={newHref()}>
              <Plus className="size-4" /> إضافة اختبار
            </AddButton>
          )
        }
      />
      {missed.length > 0 && may("exams.exams.POST") && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-gold/10 p-3 text-sm ring-1 ring-gold/40">
          <span className="font-bold text-gold">غائبون لا اختبار باقٍ لهم:</span>
          {missed.map((m) => (
            <Link key={m.role.key} href={newHref(m.role.key, "makeup", m.centers)} className="font-bold text-white underline-offset-4 hover:text-gold hover:underline">
              + استدراكي {m.role.label} ({m.n})
            </Link>
          ))}
        </p>
      )}
      <Segments
        value={filter}
        onChange={setFilter}
        label="تصفية الاختبارات"
        items={[
          { value: "all", label: "الكل", count: halls.exams.length },
          { value: "published", label: EXAM_STATUS.published, count: count("published") },
          { value: "draft", label: EXAM_STATUS.draft, count: count("draft") },
          { value: "archived", label: EXAM_STATUS.archived, count: count("archived") },
        ]}
      />
      <ListTable head={["الاختبار", "الموعد", "الأسئلة", "القاعات", "الحالة"]} minWidth="52rem">
        {shown.map((e) => {
          const p = progress(e);
          const missing = shortageOf(bank, e);
          return (
            <tr key={e.id} className={cn("align-top", e.status === "archived" && "opacity-60")}>
              <td className="p-3">
                <Link href={`${EDIT}?id=${e.id}`} className="font-bold text-white hover:text-gold">
                  {e.name}
                </Link>
                <p className="text-xs text-white/55">
                  {EXAM_KINDS[e.kind]} لصفة {roleLabelOf(e.role)}
                </p>
                <RowActions>
                  <RowLink href={`${EDIT}?id=${e.id}`}>{may("exams.exams.PUT") ? "تعديل" : "عرض"}</RowLink>
                  {e.status === "draft" && may("exams.exams.publish") && <RowLink onClick={() => setStatus(e, "published")}>نشر</RowLink>}
                  {e.status === "published" && may("exams.exams.archive") && <RowLink onClick={() => setStatus(e, "archived")}>أرشفة</RowLink>}
                  {e.status === "archived" && may("exams.exams.publish") && <RowLink onClick={() => setStatus(e, "published")}>إعادة نشره</RowLink>}
                  {e.status !== "draft" && <RowLink href={`/staff/exam/manage/results?s=${e.id}`}>النتائج</RowLink>}
                  {deletable(e) && may("exams.exams.DELETE") && (
                    <RowLink danger onClick={() => setRemoving(e)}>
                      حذف
                    </RowLink>
                  )}
                </RowActions>
              </td>
              <td className="p-3 text-white/80">
                {dayTimeLabel(e.day, e.time) || <span className="font-bold text-gold">لم يُحدَّد</span>}
                <span className="block text-[11px] text-white/50">
                  {e.day && e.date ? `${e.date} · ` : ""}
                  {e.minutes} دقيقة
                </span>
              </td>
              <td className="p-3">
                <span className="block text-white/80">
                  {questionCount(e)} في {e.sections.length} أقسام
                </span>
                {missing ? <Tag tone="maroon">ينقص البنك {missing}</Tag> : <Tag tone="green">البنك يكفيه</Tag>}
              </td>
              <td className="p-3 text-white/80">{e.centers?.length ? e.centers.map((c) => halls.centerById(c)?.name).filter(Boolean).join("، ") : `كلها (${halls.live.length})`}</td>
              <td className="p-3">
                <span className="flex flex-wrap gap-1">
                  <Tag tone={STATUS_TONE[e.status]}>{EXAM_STATUS[e.status]}</Tag>
                  {e.status === "published" && <Tag tone={p.tone === "green" ? "green" : p.tone === "gold" ? "gold" : "muted"}>{p.label}</Tag>}
                </span>
              </td>
            </tr>
          );
        })}
      </ListTable>

      <Box title="مواعيد فتح الاختبار للإداريين" open={false}>
        <OperationsPanel keys={["admin-exams", "admin-orals"]} system="exams" area="exams" title="مدة الاختبارات وتفعيلها" />
      </Box>
      <ResetToOriginal />
      <Records area="exams" />
      <DeleteDialog exam={removing} onClose={() => setRemoving(null)} />
    </div>
  );
}

// ───────────────────────── Edit one test ─────────────────────────

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

/** A new test for a role, built like its main test, in the halls given */
function blankExam(halls: Halls, role: string, kind: ExamDef["kind"], centers?: string[]): ExamDef {
  const main = halls.examById(role);
  return {
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
  };
}

/** One test on its own screen (`?id=`; none: a new one, shaped by `?role=`, `?kind=` and `?centers=`) */
export function ExamEditor() {
  const params = useSearchParams();
  const halls = useHalls();
  const id = params.get("id");
  const stored = id ? halls.examById(id) : undefined;
  const roleParam = params.get("role") ?? "";
  const role = APPLIED_ROLES.some((r) => r.key === roleParam) ? roleParam : APPLIED_ROLES[0].key;
  const kind: ExamDef["kind"] = params.get("kind") === "main" ? "main" : "makeup";
  const centers = (params.get("centers") ?? "").split(",").filter((c) => halls.centerById(c));
  if (id && !stored)
    return (
      <div>
        <EditHeader back={LIST} backLabel="كل الاختبارات" nav={false} title="لم يُعثر على هذا الاختبار" />
        <p className="text-white/70">ربما حُذف. ارجع إلى الاختبارات وافتحه من القائمة.</p>
      </div>
    );
  return <ExamForm key={stored?.id ?? `new-${role}-${kind}-${centers.join(",")}`} stored={stored} fresh={{ role, kind, centers: centers.length ? centers : undefined }} />;
}

/**
 * As a site's edit screen: the title, the sections and the hall screen's instructions in the middle; on the side
 * its status and saving, its time, its role, its halls, how applicants enter and see their result, and its history.
 */
function ExamForm({ stored: opened, fresh }: { stored?: ExamDef; fresh: { role: string; kind: ExamDef["kind"]; centers?: string[] } }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const router = useRouter();
  const halls = useHalls();
  // What this screen opened on: the stored test, or a new one shaped once (its id kept until it is saved)
  const [start] = useState<ExamDef>(() => opened ?? blankExam(halls, fresh.role, fresh.kind, fresh.centers));
  const bank = useExamBank();
  const { deletable } = useExamRules();
  const may = useCan();
  const stored = halls.examById(start.id);
  const isNew = !stored;
  // Creating (POST) or changing (PUT) it; publishing and archiving are acts of their own
  const allowed = may(isNew ? "exams.exams.POST" : "exams.exams.PUT");
  const statusAllowed = (s: ExamStatus) => s === (stored?.status ?? "draft") || (s === "published" ? may("exams.exams.publish") : s === "archived" ? may("exams.exams.archive") : may("exams.exams.PUT"));
  const [d, setD] = useState<Draft>(() => toDraft(start));
  const [saved, setSaved] = useState<Draft>(() => toDraft(start));
  const [removing, setRemoving] = useState(false);
  const dirty = isNew || JSON.stringify(d) !== JSON.stringify(saved);
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
    if (!allowed || !statusAllowed(d.status)) return;
    const problem = problemOf(d, ready);
    if (problem) {
      toast({ title: "لم يُحفظ الاختبار", body: problem, tone: "warning", icon: "✍️" });
      return;
    }
    // Compared with what is stored now: the list may have published or archived it since this screen opened
    const prev = stored ?? start;
    if (prev.status === "published" && d.status !== "published" && isLive(halls, prev.id)) {
      toast({ title: "الاختبار جارٍ في قاعة الآن", body: "يبقى منشوراً حتى ينهي مشرفو القاعات جلساته.", tone: "warning", icon: "⏸️" });
      return;
    }
    const next: ExamDef = {
      ...prev,
      name: d.name.trim(),
      role: d.role,
      kind: d.kind,
      day: d.day,
      date: d.day !== prev.day || !prev.date ? dayHijri(d.day) : prev.date,
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
      if (prev.status !== next.status)
        logAs(user, { action: next.status === "published" ? "نشر اختبار" : next.status === "archived" ? "أرشفة اختبار" : "إعادة اختبار إلى المسودة", target: next.name, before: EXAM_STATUS[prev.status], after: EXAM_STATUS[next.status], system: "exams", area: "exams", ref: next.id, important: true });
      const moved = prev.day !== next.day || prev.time !== next.time;
      if (JSON.stringify({ ...prev, status: 0, off: undefined }) !== JSON.stringify({ ...next, status: 0 }))
        logAs(user, { action: "تعديل اختبار", target: next.name, before: moved ? dayTimeLabel(prev.day, prev.time) || "بلا موعد" : undefined, after: moved ? when : undefined, detail: shape, system: "exams", area: "exams", ref: next.id, important: moved });
    }
    toast({
      title: isNew ? `أُنشئ ${next.name}` : `حُفظ ${next.name}`,
      body: next.status === "published" ? "يفتح مشرفو القاعات جلساته في موعده، ويُطبَّق على كل ورقة تُسحب بعد الآن." : next.status === "draft" ? "مسودة: لا تُفتح له جلسة حتى تنشره." : "مؤرشف: تبقى محاولاته ونتائجه.",
      tone: "success",
      icon: "💾",
    });
    setSaved(d);
    if (isNew) router.replace(`${EDIT}?id=${next.id}`);
  };

  return (
    <div>
      <EditHeader back={LIST} backLabel="كل الاختبارات" title={isNew ? "إضافة اختبار" : `تعديل ${start.name}`}>
        أقسامه وما يُسحب من كل قسم ونسبة نجاحه، وموعده وقاعاته. الناجح من نجح في كل الأقسام.
      </EditHeader>
      <EditLayout
        main={
          <>
            <input
              value={d.name}
              onChange={(e) => setD({ ...d, name: e.target.value })}
              placeholder="عنوان الاختبار"
              aria-label="عنوان الاختبار"
              className="h-16 w-full rounded-2xl border-2 border-white/15 bg-white/10 px-5 font-display text-2xl font-bold text-white outline-none placeholder:text-white/35 focus:border-gold"
            />

            <section className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-white">الأقسام</h2>
                <Chip tone="green">{total} سؤالاً في المحاولة</Chip>
                {lacks > 0 && <Chip tone="maroon">ينقص البنك {lacks} أسئلة</Chip>}
              </div>
              <p className="mb-3 text-xs leading-5 text-white/60">لكل قسم فئاته، وكم سؤالاً يُسحب لكل متقدم من أسئلة صفته الجاهزة، ونسبة نجاحه. «عشوائي» يرتّب الأسئلة لكل متقدم ترتيباً خاصاً، والخيارات تُخلط دائماً.</p>
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
                              {draw} من {ready[i]} جاهز{short ? ` — ينقص ${draw - ready[i]}` : ""}
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
              <button
                type="button"
                className="mt-3 text-sm font-bold text-gold hover:underline"
                onClick={() => setD({ ...d, sections: [...d.sections, { id: `s${Date.now().toString(36)}`, name: `القسم ${d.sections.length + 1}`, categories: [], draw: "1", pass: "50", order: "random" }] })}
              >
                + إضافة قسم
              </button>
            </section>

            <section className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold text-white">تعليمات شاشة القاعة</h2>
                <button type="button" className="text-xs font-bold text-gold hover:underline" onClick={() => setD({ ...d, instructions: DEFAULT_INSTRUCTIONS.join("\n") })}>
                  التعليمات الافتراضية
                </button>
              </div>
              <textarea rows={5} value={d.instructions} onChange={(e) => setD({ ...d, instructions: e.target.value })} className={textareaClass} aria-label="تعليمات شاشة القاعة" />
              <p className="mt-1 text-xs text-white/60">سطر لكل نقطة. تظهر على شاشة عرض القاعة أثناء الاختبار.</p>
            </section>
          </>
        }
        side={
          <>
            <Box title="الحالة والحفظ">
              <Field label="الحالة" hint={d.status === "published" ? "يُجلس له في موعده." : d.status === "draft" ? "لا تُفتح له جلسة." : "يحفظ محاولاته ونتائجه، ولا تُفتح له جلسة."}>
                <select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as ExamStatus })} className={selectClass}>
                  {(Object.keys(EXAM_STATUS) as ExamStatus[]).map((k) => (
                    <option key={k} value={k} disabled={!statusAllowed(k)}>
                      {EXAM_STATUS[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Button variant="gold" className="w-full" onClick={save} disabled={!dirty || !allowed}>
                <Save className="size-4" /> {isNew ? "إنشاء الاختبار" : "حفظ الاختبار"}
              </Button>
              <p className="text-xs text-white/55">{!allowed ? `للاطلاع: ${isNew ? "إنشاء الاختبارات" : "تعديل الاختبارات"} يحتاج صلاحيته.` : dirty ? "لديك تعديلات لم تُحفظ." : "محفوظ."}</p>
              {stored && (
                <p className="flex flex-wrap gap-x-3 text-xs font-bold">
                  <Tag tone={STATUS_TONE[stored.status]}>{EXAM_STATUS[stored.status]} الآن</Tag>
                  {stored.status !== "draft" && <RowLink href={`/staff/exam/manage/results?s=${stored.id}`}>نتائجه</RowLink>}
                  {deletable(stored) && may("exams.exams.DELETE") && (
                    <RowLink danger onClick={() => setRemoving(true)}>
                      حذف الاختبار
                    </RowLink>
                  )}
                </p>
              )}
            </Box>

            <Box title="الموعد والمدة">
              <Field label="اليوم" hint={d.day ? dayHijri(d.day) : "تُفتح القاعة من قبل موعده بساعة إلى آخر يومه."}>
                <input type="date" value={d.day} onChange={(e) => setD({ ...d, day: e.target.value })} className={cn(smallInputClass, "text-center")} dir="ltr" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="الساعة">
                  <input type="time" value={d.time} onChange={(e) => setD({ ...d, time: e.target.value })} className={cn(smallInputClass, "text-center")} dir="ltr" />
                </Field>
                <Field label="المدة (دقيقة)" hint="من 5 إلى 480">
                  <input inputMode="numeric" value={d.minutes} onChange={(e) => setD({ ...d, minutes: e.target.value })} className={cn(smallInputClass, "text-center")} dir="ltr" />
                </Field>
              </div>
            </Box>

            <Box title="الصفة والنوع">
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
                  <p className="font-bold text-white">{roleLabelOf(d.role)}</p>
                )}
              </Field>
              <Field label="النوع" hint={d.kind === "main" ? "اختبار الصفة، يؤديه كل متقدميها." : "يؤديه من غاب عن اختبار صفته."}>
                {main ? (
                  <Chip tone="muted">{EXAM_KINDS.main}</Chip>
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
            </Box>

            <Box title="القاعات">
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
            </Box>

            <Box title="الدخول والنتيجة">
              <Field label="وضع الدخول" hint={PAIRING[d.pairing].hint}>
                <select value={d.pairing} onChange={(e) => setD({ ...d, pairing: e.target.value as Pairing })} className={selectClass}>
                  {(Object.keys(PAIRING) as Pairing[]).map((k) => (
                    <option key={k} value={k}>
                      {PAIRING[k].label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-start justify-between gap-3">
                <span>
                  <span className="block font-bold text-white">شبكة القاعة مطلوبة</span>
                  <span className="block text-xs leading-5 text-white/60">طلب الدخول من خارجها يوافق عليه المشرف بسبب.</span>
                </span>
                <Switch on={d.network} onChange={(network) => setD({ ...d, network })} label="شبكة القاعة مطلوبة" />
              </div>
              <div className="flex items-start justify-between gap-3">
                <span>
                  <span className="block font-bold text-white">النتيجة تظهر للمتقدم</span>
                  <span className="block text-xs leading-5 text-white/60">يراها قسماً قسماً لحظة تأكيد تسليمه.</span>
                </span>
                <Switch on={d.showResult} onChange={(showResult) => setD({ ...d, showResult })} label="النتيجة تظهر للمتقدم" />
              </div>
            </Box>

            {stored && (
              <Box title="سجلّه" open={false}>
                <RecordHistory refId={stored.id} bare />
              </Box>
            )}
          </>
        }
      />
      <DeleteDialog exam={removing ? (stored ?? null) : null} onClose={() => setRemoving(false)} onDone={() => router.push(LIST)} />
    </div>
  );
}
