"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import confetti from "canvas-confetti";
import {
  AlarmClock,
  BadgeCheck,
  CalendarCheck,
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
import { QUESTION_TYPES, TRUE_FALSE, finalScoreWith, questionCount, typeOf, weightsLabel, type ExamQuestion, type QuestionType } from "@/lib/data/admin-exam";
import { oralDayLabel, useAllQuestions, useExamBank, useExamRules, useOral } from "../../_lib/admin-rules";
import { actions, type AdminProfile } from "@/lib/store";
import { useHolders } from "@/lib/systems";
import { useScrollLock } from "@/lib/scroll-lock";
import { cn } from "@/lib/utils";
import { logAdmin, paperOf, paperPatch, papersOf, positionLabelOf, resultOf, useAdmin } from "../../_lib/admin";
import { hallActions, mustSit, roleLabelOf, sentExam, useHalls, useMyHall } from "../../_lib/halls";
import { AdminShell, LockedCard, SimButton } from "../../_components/ui";
import { DemoJump, OperationClosed } from "@/components/app/operation-closed";
import { dayLabel, rangeLabel, shiftDay, useOperation, useToday } from "@/lib/operations";

type Exam = NonNullable<AdminProfile["exam"]>;

export function AdminExam() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const rules = useExamRules();
  const hall = useMyHall(admin.id, p);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const onSubmitted = useCallback(() => setJustSubmitted(true), []);
  const onGraded = useCallback(() => setJustSubmitted(false), []);
  const op = useOperation("admin-exams");
  // The exam he sits now: his role's, or — for a role that sits two — the first of them not sent yet
  const current = paperOf(p, hall.role);
  const roles = hall.roles.length ? hall.roles : [hall.role];
  const anySent = roles.some((r) => !!paperOf(p, r)?.submittedAt);
  const allSent = roles.every((r) => !!paperOf(p, r)?.submittedAt);
  const sits = mustSit(p, hall.role, hall.key) && !!hall.center;
  const inHall = hall.stage === "open" || hall.stage === "running";
  const joined = !!hall.run?.joined[admin.id];

  // Opening his account while his hall is open is his arrival: the supervisor sees him and confirms him
  useEffect(() => {
    if (!sits || !inHall || joined || current) return;
    hallActions.join(hall.key, admin.id);
    logAdmin(admin.id, "فتح الحساب في القاعة الامتحانية", `الإداري ${admin.id.slice(-3)}`, `${hall.center!.name} — بانتظار تأكيد المشرف للحضور`);
  }, [sits, inHall, joined, current, hall.key, hall.center, admin.id]);

  // A paper from before the halls (no sections) cannot be sat: the hall serves a new one
  useEffect(() => {
    if (current && !current.submittedAt && !current.paper) actions.upsertAdmin(admin.id, paperPatch(p, hall.role, undefined));
  }, [current, p, hall.role, admin.id]);

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
        <LockedCard title="معفى من الامتحانين" text="من يجدد صفته التي شغلها الموسم الماضي بتقييم لا يقل عن الحد الذي حددته الإدارة يُعفى من الامتحانين الكتابي والشفهي، ويعامَل معاملة الناجح في التأهيل." href="/administrator/group" cta="تشكيل المجموعات" />
      </AdminShell>
    );
  }

  // Nothing sat yet and the exams are not open: his hall waits for their dates
  if (!op.open && !current && !anySent && !p.oral && !p.resultPublishedAt) {
    return (
      <AdminShell title="الامتحانات" subtitle={`امتحانات التأهيل ${rangeLabel(op.start, op.end)}: الكتابي في قاعة مركزك ثم الشفهي، قبل تشكيل المجموعات.`}>
        <OperationClosed state={op} text={hall.center ? `قاعتك: ${hall.center.name}.` : undefined} />
      </AdminShell>
    );
  }

  if (current?.paper?.some((x) => x.ids.length) && !current.submittedAt) return <ExamRunner key={hall.role} examRole={hall.role} onSubmitted={onSubmitted} />;

  return (
    <AdminShell
      image="/images/haram-2022.jpg"
      title={allSent ? "نتيجتي في التأهيل" : "الامتحان الكتابي في القاعة"}
      subtitle={allSent ? `${weightsLabel(rules)} — الحد الأدنى للنجاح ${rules.passMark}.` : "جماعي لكل صفة في يومها، في قاعة مركزك الامتحاني، يفتحه مشرف القاعة ويبدؤه للجميع معاً."}
    >
      {allSent ? (
        <Results grading={justSubmitted} onGraded={onGraded} />
      ) : (
        <div className="space-y-6">
          <TwoExams />
          <HallScreen />
        </div>
      )}
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

/** A role that sits two exams: each with its day, and how he stands in it — he must pass both */
function TwoExams() {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const rules = useExamRules();
  const halls = useHalls();
  const hall = useMyHall(admin.id, p);
  if (hall.roles.length < 2) return null;
  return (
    <Card className="md:p-6">
      <p className="font-display text-lg font-bold text-green-dark">صفتك «{positionLabelOf(p.positions[0] ?? "")}» تمتحن امتحانين، ويلزمك اجتيازهما معاً</p>
      <p className="mt-1 text-sm text-ink-soft">لكل امتحان يومه وقاعته، وحدّه الأدنى {rules.writtenMin} من 100. علامة الكتابي في نتيجتك متوسط العلامتين.</p>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {hall.roles.map((r) => {
          const paper = paperOf(p, r);
          const sitting = halls.sittingOf(admin.id, r);
          const now = r === hall.role && !paper?.submittedAt;
          return (
            <li key={r} className={cn("rounded-2xl border-2 p-3", paper?.submittedAt ? (paper.score !== undefined && paper.score >= rules.writtenMin ? "border-green-light/50 bg-green-light/5" : "border-maroon/30 bg-maroon/5") : now ? "border-gold-dark/50 bg-gold/10" : "border-gold/30")}>
              <p className="font-bold">امتحان {roleLabelOf(r)}</p>
              <p className="text-xs text-ink-soft">{sitting ? `${sitting.exam.date} — ${sitting.exam.time}` : "يُحدَّد موعده"}</p>
              <p className="mt-1 text-sm font-bold">
                {paper?.submittedAt ? `${paper.score ?? paper.provisional} من 100 — ${paper.score !== undefined && paper.score >= rules.writtenMin ? "اجتزته" : "دون الحد الأدنى"}` : now ? "امتحانك الآن" : "بعده"}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

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
            { icon: PenLine, t: "الأسئلة كلها اختيار من متعدد أو صح وخطأ، وتُصحَّح فور الإرسال." },
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
                {(Object.keys(QUESTION_TYPES) as QuestionType[]).filter((t) => (s.counts[t] ?? 0) > 0).map((t) => (
                  <span key={t}>{QUESTION_TYPES[t]}: {s.counts[t]}</span>
                ))}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-2xl bg-gold/15 p-4 text-xs leading-6 text-ink-soft">
          علامة الكتابي من 100: نصيب كل قسم من علامته بحسب وزنه، ولكل سؤال درجة. لا أسئلة تحريرية: كل سؤال اختيار من متعدد أو صح وخطأ. تُسحب أسئلة كل قسم من بنك صفتك بترتيب خاص بك، فلا يتطابق امتحان متقدمَين.
        </p>
        <div className="mt-6 rounded-2xl border border-gold/40 p-4 text-sm leading-7">
          <p className="font-bold text-green-dark">بعد الكتابي</p>
          <OralNote />
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

const answered = (e: Exam, q: ExamQuestion) => e.answers[q.id] !== undefined;

/**
 * The written exam on one page: every question of the paper in one list, under the headings of its sections
 * (each with its weight and the numbers of its questions), numbered straight through. The timer, the saving
 * and the questions' grid stay in view; a number in the grid takes the page to its question.
 */
function ExamRunner({ examRole, onSubmitted }: { examRole: string; onSubmitted: () => void }) {
  const admin = useAdmin()!;
  const bank = useAllQuestions();
  const hall = useMyHall(admin.id, admin.profile);
  const exam = paperOf(admin.profile, examRole)!;
  const served = useServed(exam);
  const answers = exam.answers;
  const [flags, setFlags] = useState<number[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [confirm, setConfirm] = useState(false);
  const submitted = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);

  const total = (exam.minutes ?? 25) * 60_000;
  const remaining = Math.max(0, total - (now - exam.startedAt));
  const expired = remaining <= 0;
  const answeredCount = served.filter((x) => answered(exam, x.q)).length;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
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
      actions.upsertAdmin(admin.id, paperPatch(admin.profile, examRole, sent));
      logAdmin(admin.id, demo ?? (auto ? "إرسال الامتحان الكتابي تلقائياً (انتهى الوقت)" : "إرسال الامتحان الكتابي"), `الإداري ${admin.id.slice(-3)}`, `${hall.center?.name ?? ""} — النتيجة ${sent.score ?? sent.provisional} من 100`);
    },
    [admin.id, admin.profile, examRole, exam, bank, onSubmitted, hall.center],
  );

  useEffect(() => {
    if (expired) submit(true);
  }, [expired, submit]);

  const save = (id: number, value: number | string) => {
    actions.upsertAdmin(admin.id, paperPatch(admin.profile, examRole, { ...exam, answers: { ...answers, [id]: value } }));
    setSaving("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaving("saved"), 650);
  };

  /**
   * Demo: the whole paper answered at once and sent. To pass: every answer right. To fail: one in three
   * right, below the written's minimum.
   */
  const simulate = (pass: boolean) => {
    const filled: Record<number, number | string> = {};
    served.forEach(({ q }, i) => {
      filled[q.id] = pass || i % 3 === 0 ? q.answer : (q.answer + 1) % q.options.length;
    });
    submit(false, { ...exam, answers: filled }, pass ? "إرسال الامتحان الكتابي بإجابات ناجحة (محاكاة)" : "إرسال الامتحان الكتابي بإجابات راسبة (محاكاة)");
  };

  const toggleFlag = (id: number) => setFlags((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const jump = (id: number) => document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const low = remaining < 2 * 60_000;
  const sections = (exam.paper ?? []).map((s) => {
    const first = served.findIndex((x) => x.section.id === s.id);
    const count = served.filter((x) => x.section.id === s.id).length;
    return { ...s, first, count };
  }).filter((s) => s.count > 0);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-sand" aria-label="الامتحان الكتابي">
      {/* top bar */}
      <div className="sticky top-0 z-10 border-b border-gold/30 bg-green-dark text-white shadow-lg">
        <div className="bg-pattern pointer-events-none absolute inset-0 opacity-10" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gold text-ink"><GraduationCap className="size-5" /></span>
            <div>
              <p className="font-display font-bold">
                {hall.roles.length > 1 ? `امتحان ${roleLabelOf(examRole)}` : "الامتحان الكتابي"} — {hall.center?.name ?? "موسم 1448"}
              </p>
              <p className="text-xs text-white/70">
                {admin.name} — أجبت عن {answeredCount} من {served.length} سؤالاً
              </p>
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
        <div className="min-w-0 space-y-6">
          {sections.map((s) => (
            <section key={s.id} className="overflow-hidden rounded-[2rem] border border-gold/30 bg-white shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)]">
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gold/30 bg-green-dark/5 px-6 py-4 md:px-10">
                <h2 className="font-display text-xl font-bold text-green-dark">{s.name}</h2>
                <p className="text-sm font-bold text-gold-dark">
                  الأسئلة {s.first + 1}{s.count > 1 ? ` – ${s.first + s.count}` : ""} — {s.weight}% من علامة الكتابي
                </p>
              </header>
              <ol className="divide-y divide-gold/20">
                {served.map((x, i) =>
                  x.section.id !== s.id ? null : (
                    <QuestionBlock key={x.q.id} n={i + 1} q={x.q} value={answers[x.q.id]} flagged={flags.includes(x.q.id)} onFlag={() => toggleFlag(x.q.id)} onSave={(v) => save(x.q.id, v)} />
                  ),
                )}
              </ol>
            </section>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-gold/30 bg-white p-6 md:px-10">
            <p className="text-sm text-ink-soft">
              أجبت عن <b className="text-ink">{answeredCount}</b> من {served.length} سؤالاً{flags.length ? ` — ${flags.length} معلَّمة للمراجعة` : ""}. راجع إجاباتك قبل الإرسال.
            </p>
            <Button variant="maroon" size="lg" onClick={() => setConfirm(true)}>
              مراجعة وإرسال الامتحان <Send className="size-5" />
            </Button>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-3xl border-2 border-dashed border-maroon/30 bg-white p-4">
            <p className="text-sm font-bold text-maroon">للتجربة فقط</p>
            <p className="mt-1 text-xs leading-5 text-ink-soft">تُجاب الأسئلة كلها دفعة واحدة ويُرسل الامتحان.</p>
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
                        onClick={() => jump(x.q.id)}
                        aria-label={`السؤال ${i + 1}${answered(exam, x.q) ? " — مُجاب" : ""}${flags.includes(x.q.id) ? " — معلَّم" : ""}`}
                        className={cn("relative grid aspect-square place-items-center rounded-xl text-sm font-bold transition", answered(exam, x.q) ? "bg-green-dark text-white" : "bg-sand text-ink-soft hover:bg-gold/30")}
                      >
                        {i + 1}
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
            </ul>
          </div>
          <p className="rounded-3xl bg-green-dark/6 p-4 text-xs leading-6 text-green-dark">الأسئلة كلها في هذه الصفحة؛ اضغط رقم سؤال في الشبكة لتنتقل إليه. وقتك ووقت القاعة واحد: حين ينهي المشرف الامتحان يُرسل كما هو.</p>
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

/** One question of the paper, in its place on the page: its kind, its scenario, its text, and the answer */
function QuestionBlock({ n, q, value, flagged, onFlag, onSave }: { n: number; q: ExamQuestion; value: number | string | undefined; flagged: boolean; onFlag: () => void; onSave: (v: number | string) => void }) {
  const type = typeOf(q);
  return (
    <li id={`question-${q.id}`} className="scroll-mt-28 p-6 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap gap-2">
          <Badge tone="gold">{QUESTION_TYPES[type]}</Badge>
        </span>
        <button type="button" onClick={onFlag} aria-pressed={flagged} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition", flagged ? "bg-maroon text-white" : "bg-sand text-ink-soft hover:bg-maroon/10 hover:text-maroon")}>
          <Flag className={cn("size-3.5", flagged && "fill-current")} /> {flagged ? "معلَّم للمراجعة" : "علّم للمراجعة"}
        </button>
      </div>
      {q.scenario && (
        <div className="mt-4 rounded-2xl border-r-4 border-maroon bg-maroon/5 p-4 text-sm leading-7 text-ink">
          <span className="font-bold text-maroon">سيناريو تشغيلي: </span>
          {q.scenario}
        </div>
      )}
      <h3 className="mt-4 font-display text-lg font-bold leading-[1.7] text-ink md:text-xl">
        <span className="text-maroon">{n}.</span> {q.text}
      </h3>
      {type === "truefalse" ? (
        <div className="mt-4 grid max-w-md grid-cols-2 gap-3" role="radiogroup" aria-label={`السؤال ${n}: صح أو خطأ`}>
          {TRUE_FALSE.map((o, i) => {
            const on = value === i;
            return (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onSave(i)}
                className={cn("flex items-center justify-center gap-2 rounded-2xl border-2 p-3 font-display text-lg font-bold transition", on ? (i === 0 ? "border-green-dark bg-green-dark text-white" : "border-maroon bg-maroon text-white") : "border-gold/40 text-ink hover:border-gold-dark hover:bg-sand")}
              >
                {i === 0 ? <CircleCheck className="size-5" /> : <CircleX className="size-5" />} {o}
              </button>
            );
          })}
        </div>
      ) : (
        <ul className="mt-4 grid gap-2 md:grid-cols-2" role="radiogroup" aria-label={`السؤال ${n}: الخيارات`}>
          {q.options.map((o, i) => {
            const on = value === i;
            return (
              <li key={o}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onSave(i)}
                  className={cn("flex h-full w-full items-center gap-3 rounded-2xl border-2 p-3 text-right transition", on ? "border-green-dark bg-green-dark/5 shadow-md" : "border-gold/40 hover:border-gold-dark hover:bg-sand")}
                >
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl text-sm font-bold transition", on ? "bg-green-dark text-gold" : "bg-sand text-ink-soft")}>
                    {on ? <Check className="size-4" /> : ["أ", "ب", "ج", "د"][i]}
                  </span>
                  <span className="leading-7">{o}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

// ───────────────────────── The oral's day ─────────────────────────

/** Before the written: the oral's days, booked by each one himself once his written passes */
function OralNote() {
  const oral = useOral();
  return (
    <p className="text-ink-soft">
      الامتحان الشفهي أيامه {rangeLabel(oral.op.start, oral.op.end)} في {oral.place}. من يجتز الكتابي يحجز منها يوماً بنفسه من صفحة الامتحانات، وتُدخل اللجنة نتيجته على المنصة.
    </p>
  );
}

/**
 * The oral's day, booked by the administrator himself once his written passed: one of the days the exams'
 * staff set, with seats left, at least a day ahead. He may change it until the day before; on the day the
 * committee examines him and enters his result.
 */
function OralBooking({ owner, onSimulate }: { owner: string; onSimulate: (pass: boolean) => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const oral = useOral();
  const today = useToday();
  const booking = admin.profile!.oralBooking;
  const [changing, setChanging] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const left = (d: string) => oral.perDay - (oral.booked[d] ?? 0) + (booking?.day === d ? 1 : 0);
  const bookable = (d: string) => d > today && left(d) > 0;
  const choosing = !booking || changing;

  const book = (day: string) => {
    actions.upsertAdmin(admin.id, { oralBooking: { day, at: Date.now() } });
    logAdmin(admin.id, booking ? "تغيير يوم الامتحان الشفهي" : "حجز يوم الامتحان الشفهي", oralDayLabel(day, true), `${oral.time} — ${oral.place}${booking ? ` — بدل ${oralDayLabel(booking.day, true)}` : ""}`);
    toast({ title: booking ? "غُيّر يوم امتحانك الشفهي" : "حُجز يوم امتحانك الشفهي", body: `${oralDayLabel(day, true)} — ${oral.time}`, icon: "📅", tone: "success" });
    setChanging(false);
    setPick(null);
  };

  if (oral.op.status === "off")
    return <p className="mt-6 rounded-2xl bg-maroon/6 p-4 text-sm leading-7 text-maroon">أوقفت إدارة الامتحانات حجز أيام الشفهي الآن. {booking ? `يبقى موعدك ${oralDayLabel(booking.day, true)}.` : "يُفتح من جديد حين تعيده."}</p>;

  if (!choosing && booking)
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-3xl border-2 border-green-dark/30 bg-green-dark/5 p-5">
          <p className="text-xs font-bold text-green">موعد امتحانك الشفهي</p>
          <p className="mt-1 font-display text-2xl font-bold text-green-dark">{oralDayLabel(booking.day, true)}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {oral.time} — {oral.place}
          </p>
          {booking.day > today ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button size="sm" variant="outline" onClick={() => setChanging(true)}>
                تغيير اليوم
              </Button>
              <span className="text-xs text-hint">يُغيَّر حتى {dayLabel(shiftDay(booking.day, -1))}.</span>
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold text-maroon">{booking.day === today ? "اليوم موعدك: احضر بهويتك في الوقت." : "مضى موعدك: بانتظار إدخال اللجنة نتيجتك."}</p>
          )}
        </div>
        <div className="rounded-3xl border-2 border-dashed border-gold-dark/50 bg-gold/10 p-5 text-center">
          <p className="font-display text-lg font-bold text-green-dark">بعد امتحانك تُدخل اللجنة نتيجتك</p>
          <p className="mt-1 text-sm leading-7 text-ink-soft">يُدخلها {owner} (إدارة الامتحانات) من بوابة الموظفين، ولا تظهر إلا بعد إعلانها.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <SimButton onClick={() => onSimulate(true)}>محاكاة: نتيجة شفهي ناجحة</SimButton>
            <SimButton onClick={() => onSimulate(false)}>محاكاة: نتيجة شفهي راسبة</SimButton>
          </div>
        </div>
      </div>
    );

  const any = oral.days.some(bookable);
  return (
    <div className="mt-6 rounded-3xl border-2 border-gold-dark/40 bg-gold/10 p-5">
      <p className="font-display text-lg font-bold text-green-dark">{booking ? "اختر يوماً آخر لامتحانك الشفهي" : "احجز يوم امتحانك الشفهي"}</p>
      <p className="mt-1 text-sm leading-7 text-ink-soft">
        اجتزت الكتابي. أيام الشفهي {rangeLabel(oral.op.start, oral.op.end)}، {oral.time}، لكل يوم {oral.perDay} مقعداً. يُحجز اليوم قبل موعده بيوم على الأقل.
      </p>
      {any ? (
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {oral.days.map((d) => {
            const ok = bookable(d);
            const n = left(d);
            return (
              <li key={d}>
                <button
                  type="button"
                  disabled={!ok}
                  aria-pressed={pick === d}
                  onClick={() => setPick(d)}
                  className={cn("w-full rounded-2xl border-2 p-3 text-right transition disabled:cursor-not-allowed disabled:opacity-45", pick === d ? "border-green-dark bg-white shadow-md" : booking?.day === d ? "border-green-dark/40 bg-white" : "border-gold/40 bg-white/70 hover:border-gold-dark")}
                >
                  <span className="block text-sm font-bold text-ink">{oralDayLabel(d)}</span>
                  <span className={cn("block text-xs", ok ? "text-green" : "text-hint")}>{d <= today ? "مضى" : n > 0 ? `${n} مقعداً متبقياً` : "مكتمل"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 text-sm text-maroon">
          <span>لا يوم متاحاً للحجز: انقضت أيام الشفهي أو اكتملت.</span>
          <DemoJump state={oral.op} />
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={!pick} onClick={() => pick && book(pick)}>
          <CalendarCheck className="size-4" /> {pick ? `احجز ${oralDayLabel(pick)}` : "اختر يوماً"}
        </Button>
        {booking && (
          <Button variant="ghost" onClick={() => setChanging(false)}>
            إبقاء {oralDayLabel(booking.day)}
          </Button>
        )}
      </div>
    </div>
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

/** One paper sent: its mark (and, for a role that sits two exams, whether it passed on its own), its sections and the review of its answers */
function PaperDetail({ exam, title, min }: { exam: Exam; title?: string; min: number }) {
  const served = useServed(exam);
  const [review, setReview] = useState(false);
  const correct = served.filter((x) => exam.answers[x.q.id] === x.q.answer).length;
  const tally = exam.tally ?? {};
  const score = exam.score ?? exam.provisional ?? 0;
  return (
    <div className={cn("mt-6", title && "rounded-2xl border border-gold/30 p-4")}>
      {title && (
        <p className="flex flex-wrap items-center justify-between gap-2 font-bold text-green-dark">
          {title} — {score} من 100
          <Badge tone={score >= min ? "green" : "maroon"}>{score >= min ? "اجتزته" : "دون الحد الأدنى"}</Badge>
        </p>
      )}
      <p className={cn("text-sm text-ink-soft", title && "mt-1")}>
        الإجابات الصحيحة: <b className="text-ink">{correct} من {served.length}</b> — المدة: {Math.max(1, Math.round(((exam.submittedAt ?? 0) - exam.startedAt) / 60000))} دقيقة
      </p>
      {(exam.paper?.length ?? 0) > 0 && (
        <ul className="mt-4 space-y-3">
          {exam.paper!.map((s) => {
            const t = tally[s.id] ?? { earned: 0, possible: 0 };
            const pct = t.possible ? Math.round((t.earned / t.possible) * 100) : 0;
            return (
              <li key={s.id}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-bold">{s.name} <span className="font-normal text-hint">— {s.weight}%</span></span>
                  <span className="tabular-nums text-ink-soft">{t.earned} من {t.possible} درجة</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand">
                  <motion.div className="h-full rounded-full bg-green-light" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" onClick={() => setReview((v) => !v)} className="mt-4 flex items-center gap-1.5 text-sm font-bold text-green-dark">
        مراجعة الإجابات <ChevronDown className={cn("size-4 transition", review && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {review && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {served.map(({ q }, i) => {
              const ok = exam.answers[q.id] === q.answer;
              return (
                <li key={q.id} className="mt-3 rounded-2xl border border-gold/30 p-3 text-sm">
                  <p className="flex items-start gap-2 font-semibold">
                    {ok ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-green-light" /> : <CircleX className="mt-0.5 size-5 shrink-0 text-maroon" />}
                    {i + 1}. {q.text}
                  </p>
                  <p className="mr-7 mt-1 text-green">الصحيح: {q.options[q.answer]}</p>
                  <p className="mr-7 mt-0.5 text-xs leading-5 text-ink-soft">{q.explanation}</p>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
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
  const hall = useMyHall(admin.id, p);
  // Every paper he sent: one, or two for a role that sits two exams
  const papers = papersOf(p).flatMap((x) => (x.paper ? [{ role: x.role, exam: x.paper }] : []));
  const sent = papers.length ? papers : p.exam ? [{ role: hall.role, exam: p.exam }] : [];
  const r = resultOf(p, rules);
  const oral = useOral();
  const shown = r.written ?? sent[0]?.exam.provisional ?? 0;
  const [stars, setStars] = useState(0);

  useEffect(() => {
    if (!grading) return;
    const t = setTimeout(onGraded, 2400);
    return () => clearTimeout(t);
  }, [grading, onGraded]);

  /** Demo: the committee's oral, high enough to pass, or low enough that the final falls below the pass mark */
  const simulateOral = (pass: boolean) => {
    const at = Date.now();
    const written = r.written ?? 0;
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

  const retake = () => {
    actions.upsertAdmin(admin.id, { exam: undefined, exams: undefined, oral: undefined, oralBooking: undefined, resultPublishedAt: undefined });
    for (const x of sent) if (x.exam.hall) hallActions.reset(x.exam.hall);
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
          <p className="mt-1 text-hint">كل الأسئلة اختيار أو صح وخطأ، تُصحَّح فور الإرسال</p>
        </div>
      </Card>
    );
  }

  const published = r.published && r.final !== undefined;

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
            <Badge tone={r.writtenPassed ? "green" : "maroon"}>{r.writtenPassed ? "اجتزت الحد الأدنى" : "دون الحد الأدنى"}</Badge>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <ScoreRing value={shown} label={sent.length > 1 ? "متوسط الامتحانين" : "من 100"} tone={r.writtenPassed ? "green" : "maroon"} />
            <dl className="space-y-2 text-sm">
              <div><dt className="inline text-hint">الوزن في النتيجة: </dt><dd className="inline font-bold">{Math.round(rules.writtenWeight * 100)}%</dd></div>
              <div><dt className="inline text-hint">الحد الأدنى: </dt><dd className="inline font-bold">{rules.writtenMin}{sent.length > 1 ? " في كل امتحان منهما" : ""}</dd></div>
              {hall.center && <div><dt className="inline text-hint">القاعة: </dt><dd className="inline font-bold">{hall.center.name}</dd></div>}
            </dl>
          </div>
          {sent.map((x) => (
            <PaperDetail key={x.role} exam={x.exam} title={sent.length > 1 ? `امتحان ${roleLabelOf(x.role)}` : undefined} min={rules.writtenMin} />
          ))}
          {!r.writtenPassed && (
            <div className="mt-6 rounded-2xl bg-maroon/6 p-4">
              <p className="text-sm leading-7 text-maroon">لم تبلغ الحد الأدنى ({rules.writtenMin}) {sent.length > 1 ? "في الامتحانين كليهما" : "في الكتابي"}، فلا تنتقل إلى الشفهي هذا الموسم.</p>
              <SimButton className="mt-3" onClick={retake}><RotateCcw className="size-4" /> إعادة المحاولة (للتجربة فقط)</SimButton>
            </div>
          )}
        </Card>

        {/* oral */}
        <Card className="md:p-8">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark"><Gavel className="size-6 text-gold-dark" /> الامتحان الشفهي</h3>
          <p className="mt-1 text-sm text-hint">خارج المنصة — ونتيجته على المنصة</p>
          <ul className="mt-5 space-y-2 text-sm">
            <li className="flex items-center gap-2"><Landmark className="size-4 text-gold-dark" /> {oral.place}</li>
            <li className="flex items-center gap-2"><UsersRound className="size-4 text-gold-dark" /> ثلاثة أعضاء — 20 دقيقة: حاج غاضب، إغماء في الحافلة، قراءة خريطة المشاعر</li>
          </ul>
          {r.oral !== undefined ? (
            <>
            <p className={cn("mt-6 flex items-center gap-2 rounded-2xl p-3 font-bold", r.passed ? "bg-green-light/10 text-green" : "bg-maroon/6 text-maroon")}>
              {r.passed ? <BadgeCheck className="size-5" /> : <CircleX className="size-5" />}
              {r.passed ? "قُبلت في الامتحان الشفهي، واجتزت التأهيل لموسم 1448" : `أُدخلت نتيجة الشفهي، ولم تبلغ النتيجة النهائية ${rules.passMark}`}
            </p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex flex-wrap items-center gap-6">
              <ScoreRing value={r.oral} label="من 100" tone="gold" size={130} />
              <dl className="space-y-2 text-sm">
                <div><dt className="inline text-hint">أدخلها: </dt><dd className="inline font-bold">{p.oral?.by}</dd></div>
                <div><dt className="inline text-hint">على الورقة الرسمية: </dt><dd className="inline font-bold">{Math.round((r.oral / 100) * 20)} من 20</dd></div>
                {p.oral?.note && <div><dt className="inline text-hint">ملاحظات اللجنة: </dt><dd className="inline font-bold">«{p.oral.note}»</dd></div>}
              </dl>
            </motion.div>
            </>
          ) : r.writtenPassed ? (
            <OralBooking owner={owner} onSimulate={simulateOral} />
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

/**
 * The final result, and what comes next for this role: a group head's group is formed at the office; every
 * other role waits for a cluster's head to invite him to his place.
 */
function FinalResult({ written, oral, final, passed, note, by }: { written: number; oral: number; final: number; passed: boolean; note?: string; by?: string }) {
  const admin = useAdmin()!;
  const role = admin.profile?.positions[0] ?? "";
  const head = role === "group-head";
  const formation = useOperation("group-formation");
  const clusters = useOperation("cluster-formation");
  const next = head
    ? { href: "/administrator/group", label: "التالي: تشكيل مجموعتك في المكتب", when: rangeLabel(formation.start, formation.end) }
    : { href: "/administrator/cluster", label: "التالي: دعوات التكتلات", when: `يدعوك رؤساء التكتلات إلى مكانك ${rangeLabel(clusters.start, clusters.end)}` };
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
            {passed ? `الترتيب: 41 من 1,380 متقدماً — اسمك في قائمة الناجحين لصفة «${positionLabelOf(role)}».` : `الحد الأدنى للنجاح ${rules.passMark}. يبقى سجلك مرجعاً في أي تأهيل لاحق.`}
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
              <ButtonLink href={next.href} variant="gold" size="lg">
                <BadgeCheck className="size-5" /> {next.label}
              </ButtonLink>
              <span className="text-sm text-white/70">{next.when}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
