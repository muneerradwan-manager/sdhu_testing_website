"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import confetti from "canvas-confetti";
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleCheck,
  CircleX,
  Cloud,
  CloudUpload,
  DoorClosed,
  DoorOpen,
  ExternalLink,
  Flag,
  Gavel,
  GraduationCap,
  Hourglass,
  IdCard,
  Landmark,
  ListChecks,
  MapPin,
  PenLine,
  RotateCcw,
  Send,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Modal, StarRating, useToast } from "@/components/ui/widgets";
import { QUESTION_TYPES, TRUE_FALSE, finalScoreWith, pointsOf, questionCount, typeOf, weightsLabel, type ExamQuestion, type QuestionType } from "@/lib/data/admin-exam";
import { useAllQuestions, useExamBank, useExamRules } from "../../_lib/admin-rules";
import { actions, type AdminProfile } from "@/lib/store";
import { useHolders } from "@/lib/systems";
import { useScrollLock } from "@/lib/scroll-lock";
import { cn } from "@/lib/utils";
import { logAdmin, positionLabelOf, resultOf, useAdmin } from "../../_lib/admin";
import { hallActions, markedExam, mustSit, roleLabelOf, sentExam, useMyHall } from "../../_lib/halls";
import { AdminShell, LockedCard, SimButton } from "../../_components/ui";

type Exam = NonNullable<AdminProfile["exam"]>;

export function AdminExam() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const rules = useExamRules();
  const hall = useMyHall(admin.id, p);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const onSubmitted = useCallback(() => setJustSubmitted(true), []);
  const onGraded = useCallback(() => setJustSubmitted(false), []);
  const sits = mustSit(p, hall.key) && !!hall.center;
  const inHall = hall.stage === "open" || hall.stage === "running";
  const joined = !!hall.run?.joined[admin.id];

  // Opening his account while his hall is open is his arrival: the supervisor sees him and confirms him
  useEffect(() => {
    if (!sits || !inHall || joined || p?.exam) return;
    hallActions.join(hall.key, admin.id);
    logAdmin(admin.id, "فتح الحساب في القاعة الامتحانية", `الإداري ${admin.id.slice(-3)}`, `${hall.center!.name} — بانتظار تأكيد المشرف للحضور`);
  }, [sits, inHall, joined, p?.exam, hall.key, hall.center, admin.id]);

  // A paper from before the halls (no sections) cannot be sat: the hall serves a new one
  useEffect(() => {
    if (p?.exam && !p.exam.submittedAt && !p.exam.paper) actions.upsertAdmin(admin.id, { exam: undefined });
  }, [p?.exam, admin.id]);

  if (!p?.eligibleAt || !p.feePaidAt) {
    return (
      <AdminShell title="الامتحان الكتابي في القاعة" subtitle="جماعي لكل صفة، في قاعة المركز الامتحاني لمحافظتك.">
        <LockedCard title="الامتحان غير متاح بعد" text="يُفتح الامتحان الكتابي بعد تقديم طلب المشاركة: التحقق من الأهلية للصفة التي اخترتها، ثم تسديد رسم التسجيل. بعدها تظهر هنا قاعتك وموعد امتحان صفتك." href="/administrator/apply" cta="إلى طلب المشاركة" />
      </AdminShell>
    );
  }

  if (p.examExempt) {
    return (
      <AdminShell title="الامتحان الكتابي في القاعة" subtitle="لا امتحان هذا الموسم: جدّدت الصفة نفسها بتقييم مستوفٍ وفق شروط الإدارة.">
        <LockedCard title="معفى من الامتحانين" text="من يجدد صفته التي شغلها الموسم الماضي بتقييم لا يقل عن الحد الذي حددته الإدارة يُعفى من الامتحانين الكتابي والشفهي، ويعامَل معاملة الناجح في التأهيل." href="/administrator/group" cta="متابعة إلى مجموعتي" />
      </AdminShell>
    );
  }

  if (p.exam?.paper?.some((x) => x.ids.length) && !p.exam.submittedAt) return <ExamRunner onSubmitted={onSubmitted} />;

  return (
    <AdminShell
      image="/images/haram-2022.jpg"
      title={p.exam?.submittedAt ? "نتيجتي في التأهيل" : "الامتحان الكتابي في القاعة"}
      subtitle={p.exam?.submittedAt ? `${weightsLabel(rules)} — الحد الأدنى للنجاح ${rules.passMark}.` : "جماعي لكل صفة في يومها، في قاعة مركزك الامتحاني، يفتحه مشرف القاعة ويبدؤه للجميع معاً."}
    >
      {p.exam?.submittedAt ? <Results grading={justSubmitted} onGraded={onGraded} /> : <HallScreen />}
    </AdminShell>
  );
}

// ───────────────────────── The hall ─────────────────────────

const STEPS = [
  { icon: DoorOpen, t: "يفتح المشرف القاعة" },
  { icon: IdCard, t: "يؤكد حضورك بهويتك" },
  { icon: Hourglass, t: "يبدأ الامتحان للجميع" },
  { icon: Send, t: "ترسل أو ينهيه المشرف" },
];

function HallScreen() {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const rules = useExamRules();
  const hall = useMyHall(admin.id, p);
  const bank = useExamBank();
  const toast = useToast();
  const role = hall.role;
  const blueprint = hall.exam;
  const run = hall.run;
  const joined = !!run?.joined[admin.id];
  const present = !!run?.present[admin.id];
  const supervisorName = hall.supervisor?.name ?? "مشرف القاعة";
  const target = `${hall.center?.name ?? ""} — ${hall.exam?.name ?? `امتحان ${roleLabelOf(role)}`}`;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const minutesIn = run?.startedAt ? Math.max(1, Math.round((now - run.startedAt) / 60_000)) : 0;
  const step = hall.stage === "idle" ? 0 : !present ? 1 : hall.stage === "open" ? 2 : 3;

  // Demo: what the hall's supervisor does in the staff portal, done from here for a visitor trying the portal alone
  const sim = (action: string, f: () => void) => {
    f();
    actions.logEvent({ actor: supervisorName, role: "موظف", action: `${action} (محاكاة)`, target });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <div className="flex items-center gap-4">
          <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-green-dark to-green text-gold">{hall.stage === "idle" ? <DoorClosed className="size-8" /> : <DoorOpen className="size-8" />}</span>
          <div className="min-w-0">
            <p className="text-sm text-hint">{hall.exam?.kind === "makeup" ? `${hall.exam.name} — لمن غاب عن الامتحان الأساسي` : `امتحان صفة ${positionLabelOf(role)}`}</p>
            <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">{hall.center ? hall.center.name : "مركزك الامتحاني"}</h2>
          </div>
        </div>

        {hall.center ? (
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: MapPin,
                k: "القاعة",
                v: (
                  <>
                    {hall.center.hall}
                    {hall.center.at && (
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${hall.center.at.lat},${hall.center.at.lng}`} target="_blank" rel="noreferrer" className="mt-1 flex w-fit items-center gap-1 text-xs font-bold text-green hover:underline">
                        الاتجاهات إلى القاعة <ExternalLink className="size-3" />
                      </a>
                    )}
                  </>
                ),
              },
              { icon: AlarmClock, k: "الموعد", v: `${hall.session?.date ?? ""} — ${hall.session?.time ?? ""}` },
              { icon: ShieldCheck, k: "مشرف القاعة", v: hall.supervisor?.name ?? "لم يُسند بعد" },
            ].map((x) => (
              <div key={x.k} className="rounded-2xl bg-sand p-3">
                <dt className="flex items-center gap-1.5 text-xs text-hint"><x.icon className="size-3.5" /> {x.k}</dt>
                <dd className="mt-1 text-sm font-bold leading-6 text-ink">{x.v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-6 rounded-2xl bg-gold/15 p-4 text-sm leading-7 text-ink-soft">
            لم يُحدَّد مركزك الامتحاني بعد: محافظة قيدك لا تتبع أياً من المراكز. تُسندك إدارة الامتحانات إلى مركز، فتظهر هنا قاعتك وموعدك.
          </p>
        )}

        {hall.center && (
          <>
            <ol className="mt-6 grid grid-cols-4 gap-2 text-center">
              {STEPS.map((s, i) => (
                <li key={s.t} className={cn("rounded-2xl p-3 text-xs font-bold leading-5 ring-1 transition", i < step ? "bg-green-dark text-white ring-green-dark" : i === step ? "bg-gold/20 text-green-dark ring-gold-dark" : "bg-white text-hint ring-gold/30")}>
                  {i < step ? <Check className="mx-auto mb-1 size-5" /> : <s.icon className="mx-auto mb-1 size-5" />}
                  {s.t}
                </li>
              ))}
            </ol>

            <motion.div key={`${hall.stage}-${joined}-${present}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-3xl border-2 border-dashed border-gold-dark/50 bg-gold/10 p-5">
              {hall.stage === "idle" && (
                <>
                  <p className="font-display text-lg font-bold text-green-dark">القاعة لم تُفتح بعد</p>
                  <p className="mt-1 text-sm leading-7 text-ink-soft">
                    احضر إلى القاعة يوم {hall.session?.date} قبل الساعة {hall.session?.time} ومعك هويتك الشخصية. الامتحان جماعي: يؤديه كل المتقدمين لصفة {positionLabelOf(role)} في الوقت نفسه، كلٌّ في قاعة مركزه، ولا يُؤدّى من البيت. حين يفتح المشرف القاعة افتح حسابك هنا.
                  </p>
                  <SimButton className="mt-4" onClick={() => sim("فتح القاعة الامتحانية", () => hallActions.open(hall.key, supervisorName))}>محاكاة: يفتح المشرف القاعة</SimButton>
                </>
              )}
              {(hall.stage === "open" || hall.stage === "running") && !present && (
                <>
                  <p className="font-display text-lg font-bold text-green-dark">دخلت حسابك في القاعة</p>
                  <p className="mt-1 text-sm leading-7 text-ink-soft">
                    أرِ المشرف هويتك الشخصية ليطابقها مع اسمك ويؤكد حضورك.
                    {hall.stage === "running" && ` بدأ الامتحان منذ ${minutesIn} دقيقة: تدخله حين يؤكد حضورك، بالوقت المتبقي فقط.`}
                  </p>
                  <SimButton className="mt-4" onClick={() => sim("تأكيد حضور متقدم في القاعة", () => blueprint && hallActions.confirm(hall.key, admin.id, { bank, blueprint, role }))}>محاكاة: يؤكد المشرف حضورك</SimButton>
                </>
              )}
              {hall.stage === "open" && present && (
                <>
                  <p className="font-display text-lg font-bold text-green-dark">حضورك مؤكد</p>
                  <p className="mt-1 text-sm leading-7 text-ink-soft">ابقَ في مكانك: يبدأ الامتحان للجميع في اللحظة نفسها حين يبدؤه المشرف، وتنتقل هذه الصفحة إليه وحدها.</p>
                  <SimButton className="mt-4" onClick={() => sim("بدء الامتحان في القاعة", () => blueprint && hallActions.start(hall.key, { bank, blueprint, role }))}>محاكاة: يبدأ المشرف الامتحان</SimButton>
                </>
              )}
              {(hall.stage === "ended" || hall.stage === "closed") && (
                <>
                  <p className="font-display text-lg font-bold text-maroon">انتهى امتحان صفتك في قاعتك</p>
                  <p className="mt-1 text-sm leading-7 text-ink-soft">
                    {hall.stage === "closed" ? "أُغلقت القاعة ولم تؤدِّ الامتحان، فسُجّلت غائباً عن جلسة صفتك." : "أنهى المشرف الامتحان قبل أن يؤكد حضورك، فلم تعد تدخله."} تواصل مع إدارة الامتحانات: يظهر لك هنا الامتحان الاستدراكي حين تحدد موعده.
                  </p>
                  <SimButton
                    className="mt-4"
                    onClick={() => {
                      hallActions.reset(hall.key);
                      logAdmin(admin.id, "إعادة جلسة الامتحان (نسخة تجريبية)", `الإداري ${admin.id.slice(-3)}`, target);
                      toast({ title: "أُعيدت الجلسة", body: "القاعة مغلقة من جديد كما قبل فتحها.", icon: "↩️", tone: "info" });
                    }}
                  >
                    <RotateCcw className="size-4" /> إعادة التجربة: الجلسة من بدايتها
                  </SimButton>
                </>
              )}
            </motion.div>
          </>
        )}

        <ul className="mt-6 space-y-3">
          {[
            { icon: Hourglass, t: "يبدأ المشرف الامتحان ويُنهيه للجميع معاً، ووقتك يُحسب من لحظة البدء." },
            { icon: CloudUpload, t: "الإجابات تُحفظ تلقائياً مع كل اختيار وكل كلمة." },
            { icon: Flag, t: "علّم أي سؤال للمراجعة وارجع إليه من شبكة الأسئلة." },
            { icon: AlarmClock, t: "حين ينتهي الوقت أو ينهي المشرف الامتحان يُرسل كما هو." },
            { icon: PenLine, t: "الأسئلة المؤتمتة تُصحَّح فور الإرسال، والتحريرية يصححها مصحح مخوّل دون أن يرى اسمك." },
          ].map((r) => (
            <li key={r.t} className="flex items-center gap-3 rounded-2xl border border-gold/30 p-3">
              <r.icon className="size-5 shrink-0 text-gold-dark" /> <span className="leading-7">{r.t}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="md:p-8">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><ListChecks className="size-5 text-gold-dark" /> هيكل امتحان صفتك</h3>
        <p className="text-xs text-hint">
          {hall.exam?.name ?? `امتحان صفة ${positionLabelOf(role)}`} لموسم 1448 — {blueprint ? `${questionCount(blueprint)} سؤالاً في ${blueprint.minutes} دقيقة` : ""}
        </p>
        <ul className="mt-5 space-y-4">
          {blueprint?.sections.map((s, i) => (
            <li key={s.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-bold">{s.name}</span>
                <span className="font-display font-bold tabular-nums text-maroon">{s.weight}%</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-sand">
                <motion.div className="h-full rounded-full bg-gradient-to-l from-green-dark to-green-light" initial={{ width: 0 }} animate={{ width: `${s.weight}%` }} transition={{ delay: 0.2 + i * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
              </div>
              <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-hint">
                {(Object.keys(s.counts) as QuestionType[]).filter((t) => s.counts[t] > 0).map((t) => (
                  <span key={t}>{QUESTION_TYPES[t]}: {s.counts[t]}</span>
                ))}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-2xl bg-gold/15 p-4 text-xs leading-6 text-ink-soft">
          علامة الكتابي من 100: نصيب كل قسم من علامته بحسب وزنه. السؤال المؤتمت بدرجة، والتحريري بدرجاته كما يقدّرها المصحح. تُسحب أسئلة كل قسم من بنك صفتك بترتيب خاص بك، فلا يتطابق امتحان متقدمَين.
        </p>
        <div className="mt-6 rounded-2xl border border-gold/40 p-4 text-sm leading-7">
          <p className="font-bold text-green-dark">بعد الكتابي</p>
          <p className="text-ink-soft">الامتحان الشفهي: {rules.oralDate}. تُدخل النتيجة على المنصة من إدارة الامتحانات.</p>
          <p className="mt-1 text-ink-soft">
            النتيجة النهائية: الكتابي {Math.round(rules.writtenWeight * 100)}% + الشفهي {Math.round(rules.oralWeight * 100)}%، والنجاح من <b className="text-maroon">{rules.passMark}</b>، ولا يُستدعى للشفهي من نزل في الكتابي عن {rules.writtenMin} — كما حددتها الإدارة لهذا الموسم.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ───────────────────────── Runner ─────────────────────────

type Served = { q: ExamQuestion; section: { id: string; name: string; weight: number } };

/** The paper as served, question by question with its section, from the bank as it stands (withdrawn ones included) */
function useServed(exam: Exam | undefined): Served[] {
  const all = useAllQuestions();
  return useMemo(() => {
    const byId = new Map(all.map((q) => [q.id, q]));
    return (exam?.paper ?? []).flatMap((s) => s.ids.flatMap((id) => (byId.has(id) ? [{ q: byId.get(id)!, section: { id: s.id, name: s.name, weight: s.weight } }] : [])));
  }, [all, exam?.paper]);
}

const answered = (e: Exam, q: ExamQuestion) => (typeOf(q) === "written" ? !!String(e.answers[q.id] ?? "").trim() : e.answers[q.id] !== undefined);

function ExamRunner({ onSubmitted }: { onSubmitted: () => void }) {
  const admin = useAdmin()!;
  const bank = useAllQuestions();
  const hall = useMyHall(admin.id, admin.profile);
  const exam = admin.profile!.exam!;
  const served = useServed(exam);
  const answers = exam.answers;
  const [idx, setIdx] = useState(0);
  const [flags, setFlags] = useState<number[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [confirm, setConfirm] = useState(false);
  const [dir, setDir] = useState(1);
  const submitted = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const container = useRef<HTMLDivElement>(null);

  const total = (exam.minutes ?? 25) * 60_000;
  const remaining = Math.max(0, total - (now - exam.startedAt));
  const expired = remaining <= 0;
  const { q, section } = served[idx];
  const type = typeOf(q);
  const answeredCount = served.filter((x) => answered(exam, x.q)).length;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    container.current?.focus();
    return () => {
      clearInterval(t);
      window.clearTimeout(saveTimer.current);
    };
  }, []);
  useScrollLock(true);

  const submit = useCallback(
    (auto: boolean, paper = exam, demo?: string) => {
      if (submitted.current) return;
      submitted.current = true;
      const sent = sentExam(paper, bank);
      onSubmitted();
      actions.upsertAdmin(admin.id, { exam: sent });
      const written = sent.toGrade?.length ?? 0;
      logAdmin(
        admin.id,
        demo ?? (auto ? "إرسال الامتحان الكتابي تلقائياً (انتهى الوقت)" : "إرسال الامتحان الكتابي"),
        `الإداري ${admin.id.slice(-3)}`,
        `${hall.center?.name ?? ""} — النتيجة ${written ? `المبدئية ${sent.provisional} من 100، و${written} إجابات تحريرية للتصحيح` : `${sent.score} من 100`}`,
      );
    },
    [admin.id, exam, bank, onSubmitted, hall.center],
  );

  useEffect(() => {
    if (expired) submit(true);
  }, [expired, submit]);

  const save = (value: number | string) => {
    actions.upsertAdmin(admin.id, { exam: { ...exam, answers: { ...answers, [q.id]: value } } });
    setSaving("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaving("saved"), 650);
  };

  /**
   * Demo: the whole paper answered at once and sent, without going through it question by question.
   * To pass: every option right and every written answer the full one the grader expects. To fail:
   * one option in three right and a written answer of a few words, below the written's minimum.
   */
  const simulate = (pass: boolean) => {
    const filled: Record<number, number | string> = {};
    served.forEach(({ q }, i) => {
      if (typeOf(q) === "written") filled[q.id] = pass ? q.explanation : "لا أعرف.";
      else filled[q.id] = pass || i % 3 === 0 ? q.answer : (q.answer + 1) % q.options.length;
    });
    submit(false, { ...exam, answers: filled }, pass ? "إرسال الامتحان الكتابي بإجابات ناجحة (محاكاة)" : "إرسال الامتحان الكتابي بإجابات راسبة (محاكاة)");
  };

  const goTo = (i: number) => {
    if (i < 0 || i >= served.length) return;
    setDir(i > idx ? 1 : -1);
    setIdx(i);
  };

  const toggleFlag = () => setFlags((f) => (f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id]));

  const onKey = (e: React.KeyboardEvent) => {
    // Typing a written answer is not a shortcut
    if (confirm || (e.target as HTMLElement).tagName === "TEXTAREA") return;
    const n = Number(e.key);
    if (type !== "written" && n >= 1 && n <= q.options.length) save(n - 1);
    if (e.key === "ArrowLeft") goTo(idx + 1);
    if (e.key === "ArrowRight") goTo(idx - 1);
  };

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const low = remaining < 2 * 60_000;
  const sections = exam.paper ?? [];

  return (
    <div ref={container} className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-sand outline-none" tabIndex={-1} onKeyDown={onKey} role="application" aria-label="الامتحان الكتابي">
      {/* top bar */}
      <div className="sticky top-0 z-10 border-b border-gold/30 bg-green-dark text-white shadow-lg">
        <div className="bg-pattern pointer-events-none absolute inset-0 opacity-10" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gold text-ink"><GraduationCap className="size-5" /></span>
            <div>
              <p className="font-display font-bold">الامتحان الكتابي — {hall.center?.name ?? "موسم 1448"}</p>
              <p className="text-xs text-white/70">{admin.name} — السؤال {idx + 1} من {served.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-white/75 sm:flex" aria-live="polite">
              {saving === "saving" ? <CloudUpload className="size-4 animate-pulse" /> : <Cloud className="size-4" />}
              {saving === "saving" ? "جارٍ الحفظ..." : saving === "saved" ? "حُفظ تلقائياً" : "الحفظ التلقائي مفعّل"}
            </span>
            <motion.span
              animate={low ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={low ? { repeat: Infinity, duration: 1 } : undefined}
              className={cn("flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-lg font-bold tabular-nums", low ? "bg-maroon text-white" : "bg-white/10 text-gold")}
              dir="ltr"
              role="timer"
              aria-label="الوقت المتبقي"
            >
              <Hourglass className="size-4" />
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </motion.span>
            <Button variant="gold" size="sm" onClick={() => setConfirm(true)}>
              <Send className="size-4" /> إرسال
            </Button>
          </div>
        </div>
        <div className="h-1 bg-white/10">
          <motion.div className="h-full bg-gold" animate={{ width: `${(answeredCount / served.length) * 100}%` }} />
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-8 md:px-8 lg:grid-cols-[1fr_17rem]">
        <div className="overflow-hidden rounded-[2rem] border border-gold/30 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)] md:p-10">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={q.id} initial={{ opacity: 0, x: dir * -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * 40 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
              <p className="text-xs font-bold text-gold-dark">{section.name} — {section.weight}% من علامة الكتابي</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap gap-2">
                  <Badge tone="gold">{QUESTION_TYPES[type]}</Badge>
                  {type === "written" && <Badge tone="green">{pointsOf(q)} درجات</Badge>}
                </span>
                <button type="button" onClick={toggleFlag} aria-pressed={flags.includes(q.id)} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition", flags.includes(q.id) ? "bg-maroon text-white" : "bg-sand text-ink-soft hover:bg-maroon/10 hover:text-maroon")}>
                  <Flag className={cn("size-4", flags.includes(q.id) && "fill-current")} /> {flags.includes(q.id) ? "معلَّم للمراجعة" : "علّم للمراجعة"}
                </button>
              </div>
              {q.scenario && (
                <div className="mt-5 rounded-2xl border-r-4 border-maroon bg-maroon/5 p-4 text-sm leading-7 text-ink">
                  <span className="font-bold text-maroon">سيناريو تشغيلي: </span>
                  {q.scenario}
                </div>
              )}
              <h2 className="mt-5 font-display text-xl font-bold leading-[1.7] text-ink md:text-2xl">
                <span className="text-maroon">{idx + 1}.</span> {q.text}
              </h2>
              {type === "written" ? (
                <WrittenAnswer key={q.id} value={String(answers[q.id] ?? "")} onSave={save} />
              ) : type === "truefalse" ? (
                <div className="mt-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label="صح أو خطأ">
                  {TRUE_FALSE.map((o, i) => {
                    const on = answers[q.id] === i;
                    return (
                      <motion.button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => save(i)}
                        className={cn("flex items-center justify-center gap-3 rounded-2xl border-2 p-6 font-display text-2xl font-bold transition", on ? (i === 0 ? "border-green-dark bg-green-dark text-white" : "border-maroon bg-maroon text-white") : "border-gold/40 text-ink hover:border-gold-dark hover:bg-sand")}
                      >
                        {i === 0 ? <CircleCheck className="size-7" /> : <CircleX className="size-7" />} {o}
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <ul className="mt-6 space-y-3" role="radiogroup" aria-label="الخيارات">
                  {q.options.map((o, i) => {
                    const on = answers[q.id] === i;
                    return (
                      <li key={o}>
                        <motion.button
                          type="button"
                          role="radio"
                          aria-checked={on}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => save(i)}
                          className={cn("flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-right transition", on ? "border-green-dark bg-green-dark/5 shadow-md" : "border-gold/40 hover:border-gold-dark hover:bg-sand")}
                        >
                          <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl font-bold transition", on ? "bg-green-dark text-gold" : "bg-sand text-ink-soft")}>
                            {on ? <Check className="size-5" /> : ["أ", "ب", "ج", "د"][i]}
                          </span>
                          <span className="leading-7">{o}</span>
                          <kbd className="mr-auto hidden rounded-md border border-gold/50 px-1.5 font-mono text-xs text-hint md:inline">{i + 1}</kbd>
                        </motion.button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-gold-light pt-6">
            <Button variant="ghost" onClick={() => goTo(idx - 1)} disabled={idx === 0}>
              <ArrowRight className="size-4" /> السابق
            </Button>
            {idx < served.length - 1 ? (
              <Button onClick={() => goTo(idx + 1)}>
                التالي <ArrowLeft className="size-4" />
              </Button>
            ) : (
              <Button variant="maroon" onClick={() => setConfirm(true)}>
                مراجعة وإرسال <Send className="size-4" />
              </Button>
            )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-3xl border-2 border-dashed border-maroon/30 bg-white p-4">
            <p className="text-sm font-bold text-maroon">للتجربة فقط</p>
            <p className="mt-1 text-xs leading-5 text-ink-soft">تُجاب الأسئلة كلها دفعة واحدة ويُرسل الامتحان، دون انتظار الإجابة سؤالاً سؤالاً.</p>
            <div className="mt-3 grid gap-2">
              <SimButton className="justify-center" onClick={() => simulate(true)}>محاكاة: إجابات ناجحة</SimButton>
              <SimButton className="justify-center" onClick={() => simulate(false)}>محاكاة: إجابات راسبة</SimButton>
            </div>
          </div>
          <div className="rounded-3xl border border-gold/30 bg-white p-5">
            <p className="text-sm font-bold text-green-dark">شبكة الأسئلة</p>
            {sections.map((s) => (
              <div key={s.id} className="mt-3">
                <p className="text-xs font-bold text-hint">{s.name} — {s.weight}%</p>
                <div className="mt-1.5 grid grid-cols-5 gap-2">
                  {served.map((x, i) =>
                    x.section.id !== s.id ? null : (
                      <button
                        key={x.q.id}
                        type="button"
                        onClick={() => goTo(i)}
                        aria-label={`السؤال ${i + 1}${answered(exam, x.q) ? " — مُجاب" : ""}${flags.includes(x.q.id) ? " — معلَّم" : ""}`}
                        className={cn(
                          "relative grid aspect-square place-items-center rounded-xl text-sm font-bold transition",
                          answered(exam, x.q) ? "bg-green-dark text-white" : "bg-sand text-ink-soft hover:bg-gold/30",
                          i === idx && "ring-2 ring-gold-dark ring-offset-2",
                        )}
                      >
                        {typeOf(x.q) === "written" ? <PenLine className="size-4" /> : i + 1}
                        {flags.includes(x.q.id) && <span className="absolute -left-1 -top-1 size-3 rounded-full bg-maroon ring-2 ring-white" />}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ))}
            <ul className="mt-4 space-y-1.5 text-xs text-ink-soft">
              <li className="flex items-center gap-2"><span className="size-3 rounded bg-green-dark" /> مُجاب ({answeredCount})</li>
              <li className="flex items-center gap-2"><span className="size-3 rounded bg-sand ring-1 ring-gold" /> بلا إجابة ({served.length - answeredCount})</li>
              <li className="flex items-center gap-2"><span className="size-3 rounded-full bg-maroon" /> للمراجعة ({flags.length})</li>
              <li className="flex items-center gap-2"><PenLine className="size-3" /> سؤال تحريري</li>
            </ul>
          </div>
          <p className="rounded-3xl bg-green-dark/6 p-4 text-xs leading-6 text-green-dark">اختصارات: الأرقام 1–4 للاختيار، والأسهم للتنقل. وقتك ووقت القاعة واحد: حين ينهي المشرف الامتحان يُرسل كما هو.</p>
        </aside>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)}>
        <div className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-maroon/10 text-maroon"><Send className="size-8" /></span>
          <h3 className="mt-4 font-display text-2xl font-bold text-green-dark">إرسال الامتحان نهائياً؟</h3>
          <p className="mt-2 text-ink-soft">لا يمكن الرجوع أو تعديل الإجابات بعد الإرسال.</p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-2xl bg-green-light/10 p-3"><p className="font-display text-2xl font-bold text-green">{answeredCount}</p>مُجاب</div>
            <div className="rounded-2xl bg-sand p-3"><p className="font-display text-2xl font-bold text-ink">{served.length - answeredCount}</p>بلا إجابة</div>
            <div className="rounded-2xl bg-maroon/8 p-3"><p className="font-display text-2xl font-bold text-maroon">{flags.length}</p>للمراجعة</div>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => setConfirm(false)}>متابعة الإجابة</Button>
            <Button
              variant="maroon"
              onClick={() => {
                setConfirm(false);
                submit(false);
              }}
            >
              نعم، أرسل الامتحان <Send className="size-4" />
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** A written answer, kept as it is typed and saved a moment after the typing stops */
function WrittenAnswer({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(value);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <label className="mt-6 block">
      <span className="mb-2 block text-sm font-bold text-ink-soft">إجابتك — يصححها مصحح مخوّل دون أن يرى اسمك</span>
      <textarea
        value={text}
        rows={8}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => onSave(v), 500);
        }}
        onBlur={() => {
          window.clearTimeout(timer.current);
          if (text !== value) onSave(text);
        }}
        className="w-full rounded-2xl border-2 border-gold/40 bg-white p-4 leading-8 text-ink outline-none transition focus:border-green-dark"
        placeholder="اكتب إجابتك هنا بخطوات واضحة..."
        aria-label="الإجابة التحريرية"
      />
      <span className="mt-1 block text-xs text-hint">{text.trim() ? text.trim().split(/\s+/).length : 0} كلمة</span>
    </label>
  );
}

// ───────────────────────── Results ─────────────────────────

function ScoreRing({ value, label, tone = "green", size = 150 }: { value: number; label: string; tone?: "green" | "gold" | "maroon"; size?: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => (Math.round(v * 10) / 10).toString());
  const offset = useTransform(mv, (v) => 283 - (283 * v) / 100);
  useEffect(() => {
    const c = animate(mv, value, { duration: 1.6, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [mv, value]);
  const stroke = tone === "gold" ? "#AD9E6E" : tone === "maroon" ? "#672146" : "#289E92";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#E4DDD3" strokeWidth="7" />
        <motion.circle cx="50" cy="50" r="45" fill="none" stroke={stroke} strokeWidth="7" strokeLinecap="round" strokeDasharray="283" style={{ strokeDashoffset: offset }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <motion.p className="font-display text-4xl font-bold tabular-nums text-ink">{text}</motion.p>
          <p className="text-xs text-hint">{label}</p>
        </div>
      </div>
    </div>
  );
}

function Results({ grading, onGraded }: { grading: boolean; onGraded: () => void }) {
  const rules = useExamRules();
  // The marks are entered by whoever holds «إدارة الامتحانات» this season
  const owner = useHolders().exams[0]?.staff.name ?? "مسؤول الامتحانات";
  const admin = useAdmin()!;
  const toast = useToast();
  const p = admin.profile!;
  const exam = p.exam!;
  const served = useServed(exam);
  const hall = useMyHall(admin.id, p);
  const r = resultOf(p, rules);
  const pending = (exam.toGrade ?? []).filter((id) => exam.marks?.[id] === undefined);
  const shown = r.written ?? exam.provisional ?? 0;
  const autoQs = served.filter((x) => typeOf(x.q) !== "written");
  const correct = autoQs.filter((x) => exam.answers[x.q.id] === x.q.answer).length;
  const [review, setReview] = useState(false);
  const [stars, setStars] = useState(0);

  useEffect(() => {
    if (!grading) return;
    const t = setTimeout(onGraded, 2400);
    return () => clearTimeout(t);
  }, [grading, onGraded]);

  /** Demo: the committee's oral, high enough to pass, or low enough that the final falls below the pass mark */
  const simulateOral = (pass: boolean) => {
    const at = Date.now();
    const written = exam.score ?? 0;
    // Low enough to fall below the pass mark with this season's weights, where the oral can still decide it
    const failing = rules.oralWeight ? Math.floor((rules.passMark - written * rules.writtenWeight) / rules.oralWeight) - 10 : 0;
    const score = pass ? 84 : Math.max(0, Math.min(40, failing));
    const final = finalScoreWith(written, score, rules);
    actions.upsertAdmin(admin.id, {
      oral: { score, by: owner, at, note: pass ? "قوي في السيناريوهات الميدانية، يحتاج إلى تحسين الإلقاء" : "تردّد في المواقف الميدانية، ولم يحسن التصرف في حالة الإغماء" },
      resultPublishedAt: at,
    });
    actions.logEvent({ actor: owner, role: "موظف", system: "exams", area: "results", ref: admin.id, action: "إدخال نتيجة الامتحان الشفهي (محاكاة)", target: admin.name, detail: `${score} من 100 (${Math.round(score / 5)} من 20) — اللجنة رقم 3` });
    actions.logEvent({ actor: owner, role: "موظف", system: "exams", area: "results", ref: admin.id, action: "إعلان النتيجة النهائية (محاكاة)", target: admin.name, detail: `النهائية ${final} — ${final >= rules.passMark ? "ناجح" : "لم يجتز"}` });
    logAdmin(admin.id, "الاطلاع على النتيجة النهائية", `الإداري ${admin.id.slice(-3)}`, `الكتابي ${written} × ${Math.round(rules.writtenWeight * 100)}% + الشفهي ${score} × ${Math.round(rules.oralWeight * 100)}% = ${final}`);
    toast({ title: "نُشرت نتيجتك النهائية", body: `النتيجة: ${final} من 100`, icon: "📜", tone: "gold" });
  };

  /** Demo: the grader marks the written answers by what they hold: a full answer one point short of full, a few words next to nothing */
  const simulateGrading = () => {
    let e = exam;
    for (const id of pending) {
      const q = served.find((x) => x.q.id === id)?.q;
      if (q) e = markedExam(e, id, String(exam.answers[id] ?? "").trim().length >= 40 ? Math.max(0, pointsOf(q) - 1) : Math.floor(pointsOf(q) / 5), owner);
    }
    actions.upsertAdmin(admin.id, { exam: e });
    actions.logEvent({ actor: owner, role: "موظف", system: "exams", area: "results", action: "تصحيح الإجابات التحريرية (محاكاة)", target: `ورقة ${admin.id.slice(-4)}`, detail: `الكتابي ${e.score} من 100` });
    toast({ title: "صُحّحت إجاباتك التحريرية", body: `علامة الكتابي: ${e.score} من 100`, icon: "✍️", tone: "gold" });
  };

  const retake = () => {
    actions.upsertAdmin(admin.id, { exam: undefined, oral: undefined, resultPublishedAt: undefined });
    if (hall.key) hallActions.reset(hall.key);
    logAdmin(admin.id, "إعادة الامتحان الكتابي (نسخة تجريبية)", `الإداري ${admin.id.slice(-3)}`);
  };

  if (grading) {
    return (
      <Card className="grid min-h-96 place-items-center text-center">
        <div>
          <div className="relative mx-auto size-28">
            <motion.span className="absolute inset-0 rounded-full border-4 border-gold-light border-t-green-dark" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} />
            <span className="absolute inset-0 grid place-items-center text-green-dark"><ListChecks className="size-10" /></span>
          </div>
          <p className="mt-6 font-display text-2xl font-bold text-green-dark">نصحح إجاباتك تلقائياً...</p>
          <p className="mt-1 text-hint">الأسئلة المؤتمتة تُصحَّح فور الإرسال، والتحريرية يصححها مصحح مخوّل</p>
        </div>
      </Card>
    );
  }

  const published = r.published && r.final !== undefined;
  const tally = exam.tally ?? {};
  const marks = exam.marks ?? {};

  return (
    <div className="space-y-6">
      {published ? (
        <FinalResult written={r.written!} oral={r.oral!} final={r.final!} passed={r.passed} note={p.oral?.note} by={p.oral?.by} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* written */}
        <Card className="md:p-8">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark"><GraduationCap className="size-6 text-gold-dark" /> الامتحان الكتابي</h3>
            {pending.length ? <Badge tone="gold">مبدئية — بانتظار التصحيح</Badge> : <Badge tone={r.writtenPassed ? "green" : "maroon"}>{r.writtenPassed ? "اجتزت الحد الأدنى" : "دون الحد الأدنى"}</Badge>}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <ScoreRing value={shown} label={pending.length ? "مبدئية من 100" : "من 100"} tone={pending.length ? "gold" : r.writtenPassed ? "green" : "maroon"} />
            <dl className="space-y-2 text-sm">
              {autoQs.length > 0 && <div><dt className="inline text-hint">المؤتمتة الصحيحة: </dt><dd className="inline font-bold">{correct} من {autoQs.length}</dd></div>}
              <div><dt className="inline text-hint">الوزن في النتيجة: </dt><dd className="inline font-bold">{Math.round(rules.writtenWeight * 100)}%</dd></div>
              <div><dt className="inline text-hint">المدة المستغرقة: </dt><dd className="inline font-bold">{Math.max(1, Math.round(((exam.submittedAt ?? 0) - exam.startedAt) / 60000))} دقيقة</dd></div>
              {hall.center && <div><dt className="inline text-hint">القاعة: </dt><dd className="inline font-bold">{hall.center.name}</dd></div>}
            </dl>
          </div>

          {(exam.paper?.length ?? 0) > 0 && (
            <ul className="mt-6 space-y-3">
              {exam.paper!.map((s) => {
                const t = tally[s.id] ?? { earned: 0, possible: 0 };
                const earned = t.earned + s.ids.reduce((a, id) => a + (exam.toGrade?.includes(id) ? (marks[id] ?? 0) : 0), 0);
                const waiting = s.ids.some((id) => pending.includes(id));
                const pct = t.possible ? Math.round((earned / t.possible) * 100) : 0;
                return (
                  <li key={s.id}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-bold">{s.name} <span className="font-normal text-hint">— {s.weight}%</span></span>
                      <span className="tabular-nums text-ink-soft">
                        {earned} من {t.possible} درجة{waiting && <span className="text-gold-dark"> — تحريري قيد التصحيح</span>}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand">
                      <motion.div className={cn("h-full rounded-full", waiting ? "bg-gold" : "bg-green-light")} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {pending.length > 0 && (
            <div className="mt-5 rounded-2xl bg-gold/15 p-4 text-sm leading-7 text-ink-soft">
              علامتك المبدئية {exam.provisional} من 100 تحسب {pending.length === 1 ? "إجابتك التحريرية" : `إجاباتك التحريرية الـ${pending.length}`} صفراً حتى يصححها مصحح مخوّل في إدارة الامتحانات، دون أن يرى اسمك. تكتمل علامة الكتابي بعد التصحيح.
              <SimButton className="mt-3" onClick={simulateGrading}>محاكاة: يصحح المصحح الإجابات التحريرية</SimButton>
            </div>
          )}

          <button type="button" onClick={() => setReview((v) => !v)} className="mt-4 flex items-center gap-1.5 text-sm font-bold text-green-dark">
            مراجعة الإجابات <ChevronDown className={cn("size-4 transition", review && "rotate-180")} />
          </button>
          <AnimatePresence initial={false}>
            {review && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                {served.map(({ q }, i) => {
                  const written = typeOf(q) === "written";
                  const ok = !written && exam.answers[q.id] === q.answer;
                  return (
                    <li key={q.id} className="mt-3 rounded-2xl border border-gold/30 p-3 text-sm">
                      <p className="flex items-start gap-2 font-semibold">
                        {written ? <PenLine className="mt-0.5 size-5 shrink-0 text-gold-dark" /> : ok ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-green-light" /> : <CircleX className="mt-0.5 size-5 shrink-0 text-maroon" />}
                        {i + 1}. {q.text}
                      </p>
                      {written ? (
                        <>
                          <p className="mr-7 mt-1 whitespace-pre-line rounded-xl bg-sand p-2 text-xs leading-6">{String(exam.answers[q.id] ?? "") || "— لم تُجب —"}</p>
                          <p className="mr-7 mt-1 text-xs font-bold text-green">{marks[q.id] !== undefined ? `درجتك: ${marks[q.id]} من ${pointsOf(q)}` : exam.toGrade?.includes(q.id) ? "قيد التصحيح" : `0 من ${pointsOf(q)}`}</p>
                        </>
                      ) : (
                        <p className="mr-7 mt-1 text-green">الصحيح: {q.options[q.answer]}</p>
                      )}
                      <p className="mr-7 mt-0.5 text-xs leading-5 text-ink-soft">{q.explanation}</p>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
          {!pending.length && !r.writtenPassed && (
            <div className="mt-6 rounded-2xl bg-maroon/6 p-4">
              <p className="text-sm leading-7 text-maroon">لم تبلغ الحد الأدنى ({rules.writtenMin}) في الكتابي، فلا تنتقل إلى الشفهي هذا الموسم.</p>
              <SimButton className="mt-3" onClick={retake}><RotateCcw className="size-4" /> إعادة المحاولة (للتجربة فقط)</SimButton>
            </div>
          )}
        </Card>

        {/* oral */}
        <Card className="md:p-8">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark"><Gavel className="size-6 text-gold-dark" /> الامتحان الشفهي</h3>
          <p className="mt-1 text-sm text-hint">خارج المنصة — ونتيجته على المنصة</p>
          <ul className="mt-5 space-y-2 text-sm">
            <li className="flex items-center gap-2"><Landmark className="size-4 text-gold-dark" /> {rules.oralDate}</li>
            <li className="flex items-center gap-2"><UsersRound className="size-4 text-gold-dark" /> ثلاثة أعضاء — 20 دقيقة: حاج غاضب، إغماء في الحافلة، قراءة خريطة المشاعر</li>
          </ul>
          {r.oral !== undefined ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-wrap items-center gap-6">
              <ScoreRing value={r.oral} label="من 100" tone="gold" size={130} />
              <dl className="space-y-2 text-sm">
                <div><dt className="inline text-hint">أدخلها: </dt><dd className="inline font-bold">{p.oral?.by}</dd></div>
                <div><dt className="inline text-hint">على الورقة الرسمية: </dt><dd className="inline font-bold">{Math.round((r.oral / 100) * 20)} من 20</dd></div>
                {p.oral?.note && <div><dt className="inline text-hint">ملاحظات اللجنة: </dt><dd className="inline font-bold">«{p.oral.note}»</dd></div>}
              </dl>
            </motion.div>
          ) : pending.length ? (
            <p className="mt-6 rounded-2xl bg-sand p-4 text-sm text-ink-soft">يُحدَّد بعد اكتمال علامة الكتابي: من بلغ فيه {rules.writtenMin} يُستدعى إلى الشفهي.</p>
          ) : r.writtenPassed ? (
            <div className="mt-6 rounded-3xl border-2 border-dashed border-gold-dark/50 bg-gold/10 p-6 text-center">
              <motion.span animate={{ rotate: [0, 180, 180, 360] }} transition={{ repeat: Infinity, duration: 3, times: [0, 0.4, 0.6, 1] }} className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-gold-dark">
                <Hourglass className="size-7" />
              </motion.span>
              <p className="mt-4 font-display text-xl font-bold text-green-dark">بانتظار إدخال نتيجة اللجنة</p>
              <p className="mt-1 text-sm leading-7 text-ink-soft">يُدخلها {owner} (إدارة الامتحانات) من بوابة الموظفين، ولا تظهر إلا بعد إعلانها. الصفحة تتحدث تلقائياً.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <SimButton onClick={() => simulateOral(true)}>محاكاة: نتيجة شفهي ناجحة</SimButton>
                <SimButton onClick={() => simulateOral(false)}>محاكاة: نتيجة شفهي راسبة</SimButton>
              </div>
            </div>
          ) : (
            <p className="mt-6 rounded-2xl bg-sand p-4 text-sm text-ink-soft">غير متاح — يلزم اجتياز الكتابي أولاً.</p>
          )}
        </Card>
      </div>

      {published && (
        <Card className="text-center md:p-8">
          <p className="font-bold">هل كانت معايير التقييم ونتيجتك واضحة؟</p>
          <div className="mt-3 flex justify-center">
            <StarRating
              value={stars}
              size="lg"
              onChange={(v) => {
                setStars(v);
                logAdmin(admin.id, "تقييم مرحلة النتيجة النهائية", "تجربة الإداري", `${v} من 5`);
                toast({ title: "شكراً لتقييمك", icon: "⭐", tone: "gold" });
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

function FinalResult({ written, oral, final, passed, note, by }: { written: number; oral: number; final: number; passed: boolean; note?: string; by?: string }) {
  const rules = useExamRules();
  const fired = useRef(false);
  useEffect(() => {
    if (!passed || fired.current) return;
    fired.current = true;
    const colors = ["#D9C89E", "#AD9E6E", "#00594F", "#672146"];
    const t1 = setTimeout(() => confetti({ particleCount: 120, spread: 90, origin: { x: 0.2, y: 0.5 }, colors }), 900);
    const t2 = setTimeout(() => confetti({ particleCount: 120, spread: 90, origin: { x: 0.8, y: 0.5 }, colors }), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [passed]);

  const parts = useMemo(
    () => [
      { k: "الكتابي", v: written, w: rules.writtenWeight, c: "bg-green-light" },
      { k: "الشفهي", v: oral, w: rules.oralWeight, c: "bg-gold-dark" },
    ],
    [written, oral, rules.writtenWeight, rules.oralWeight],
  );

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className={cn("relative overflow-hidden rounded-[2rem] p-7 text-white shadow-2xl md:p-10", passed ? "bg-gradient-to-br from-green-dark via-green to-maroon" : "bg-ink")}>
      <div className="bg-pattern absolute inset-0 opacity-15" />
      {passed && <motion.div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-gold/25 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 5, repeat: Infinity }} />}
      <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <motion.div initial={{ rotate: -120, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", damping: 11, delay: 0.2 }} className="mx-auto grid size-36 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-ink shadow-2xl ring-8 ring-white/10">
          <div className="text-center">
            {passed ? <Trophy className="mx-auto size-10" /> : <CircleX className="mx-auto size-10" />}
            <p className="font-display text-3xl font-bold tabular-nums">{final}</p>
          </div>
        </motion.div>
        <div>
          <p className="text-sm text-gold">نتيجتي النهائية — نُشرت في {rules.resultsDate}</p>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">{passed ? "تهانينا، اجتزت التأهيل!" : "لم تجتز التأهيل هذا الموسم"}</h2>
          <p className="mt-2 leading-8 text-white/80">
            {passed ? "الترتيب: 41 من 1,380 متقدماً — اسمك في قائمة الناجحين — مرشّح لمنصب رئيس مجموعة." : `الحد الأدنى للنجاح ${rules.passMark}. يبقى سجلك مرجعاً في أي تأهيل لاحق.`}
          </p>
          <div className="mt-6 space-y-3">
            {parts.map((x, i) => (
              <div key={x.k}>
                <div className="flex justify-between text-sm">
                  <span>{x.k}: {x.v} × {Math.round(x.w * 100)}%</span>
                  <span className="font-bold tabular-nums text-gold">{(Math.round(x.v * x.w * 10) / 10).toFixed(1)}</span>
                </div>
                <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-white/15">
                  <motion.div className={cn("h-full rounded-full", x.c)} initial={{ width: 0 }} animate={{ width: `${x.v * x.w}%` }} transition={{ delay: 0.4 + i * 0.25, duration: 1 }} />
                </div>
              </div>
            ))}
            <div className="relative pt-3">
              <div className="flex justify-between text-sm font-bold">
                <span>النهائية</span>
                <span className="text-gold">{final} من 100</span>
              </div>
              <div className="relative mt-1 h-3.5 overflow-hidden rounded-full bg-white/15">
                <motion.div className="h-full rounded-full bg-gradient-to-l from-gold to-gold-dark" initial={{ width: 0 }} animate={{ width: `${final}%` }} transition={{ delay: 1, duration: 1.2 }} />
                <span className="absolute inset-y-0 w-0.5 bg-white" style={{ right: `${rules.passMark}%` }} />
              </div>
              <p className="mt-1 text-xs text-white/60" style={{ marginRight: `calc(${rules.passMark}% - 1.5rem)` }}>حد النجاح {rules.passMark}</p>
            </div>
          </div>
          {note && <p className="mt-4 text-sm text-white/70">ملاحظات اللجنة ({by}): «{note}»</p>}
          {passed && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ButtonLink href="/administrator/group" variant="gold" size="lg">
                <BadgeCheck className="size-5" /> التالي: طلب تشكيل مجموعة
              </ButtonLink>
              <span className="text-sm text-white/70">من 11 إلى 25 جمادى الأولى</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
