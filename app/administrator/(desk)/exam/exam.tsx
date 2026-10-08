"use client";

import { motion } from "motion/react";
import confetti from "canvas-confetti";
import {
  AlarmClock,
  BadgeCheck,
  CalendarClock,
  Check,
  CircleCheck,
  CircleX,
  Cloud,
  CloudUpload,
  DoorClosed,
  DoorOpen,
  ExternalLink,
  GraduationCap,
  Hand,
  Hourglass,
  KeyRound,
  ListChecks,
  LogIn,
  MapPin,
  MonitorSmartphone,
  RotateCcw,
  ScanLine,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Card } from "@/components/portal/shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Modal, StarRating, useToast } from "@/components/ui/widgets";
import { SECTION_ORDERS, optionOrder, questionCount, type ExamQuestion, type PaperSection } from "@/lib/data/admin-exam";
import { useAllQuestions, useExamBank } from "../../_lib/admin-rules";
import { actions, type AdminProfile } from "@/lib/store";
import { useHolders } from "@/lib/systems";
import { useScrollLock } from "@/lib/scroll-lock";
import { cn } from "@/lib/utils";
import { logAdmin, paperOf, paperPatch, papersOf, positionLabelOf, resultOf, statusOf, useAdmin, type PartResult } from "../../_lib/admin";
import { ATTEMPT_LABEL, barcodeOf, hallActions, openWindow, roleLabelOf, scheduledAt, sourceOf, useDemoNow, useHalls, useMyHall } from "../../_lib/halls";
import { AdminShell, LockedCard, SimButton } from "../../_components/ui";
import { OperationClosed } from "@/components/app/operation-closed";
import { dayLabel, dayTimeLabel, rangeLabel, useOperation } from "@/lib/operations";

type Attempt = NonNullable<AdminProfile["exam"]>;

/** The options' letters, as the exam platform shows them */
const LETTERS = ["أ", "ب", "ج", "د", "هـ", "و"];

/** An attempt's sitting: its test and its hall, from the key it was paired in */
function useSittingOf(a: Attempt | undefined) {
  const halls = useHalls();
  const [examId, centerId] = (a?.hall ?? "").split("@");
  const center = halls.centerById(centerId);
  const supervisor = center ? halls.supervisorOf(center.id) : null;
  return {
    key: a?.hall ?? "",
    exam: halls.examById(examId),
    center,
    supervisor,
    supervisorName: supervisor?.name ?? "مشرف القاعة",
    pin: supervisor ? halls.pins[supervisor.id] : undefined,
  };
}

/** Demo: what the hall's supervisor does on his panel, done from here for a visitor trying the portal alone */
function simLog(by: string, action: string, key: string, target: string, detail?: string) {
  actions.logEvent({ actor: by, role: "موظف", system: "exams", area: "live", ref: key, action: `${action} (محاكاة)`, target, detail });
}

/**
 * The automated test (الاختبار المؤتمت), as the administration's exam platform runs it: in his centre's hall, never
 * at home. The supervisor opens the hall and checks him in by his card; on his device he types his national id, and
 * the supervisor matches the pairing code on his screen and lets him in; the test starts, his time from his own
 * entry; he submits, raises his hand, and the supervisor confirms the submission by typing his PIN on the device. He
 * passes by passing every section at its own pass mark — no overall mark, no weights, no oral.
 */
export function AdminExam() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const hall = useMyHall(admin.id, p);
  const op = useOperation("admin-exams");
  const roles = hall.roles.length ? hall.roles : [hall.role];
  const parts = roles.map((role) => ({ role, a: paperOf(p, role) }));
  const active = parts.find((x) => statusOf(x.a) === "active" && x.a?.paper?.some((s) => s.ids.length));
  const waiting = parts.find((x) => statusOf(x.a) === "submitted");
  const allSent = parts.every((x) => !!x.a?.submittedAt);
  const anyAttempt = parts.some((x) => !!x.a);
  // An attempt kept from before the halls (no sections) cannot be sat: the hall serves a new one
  const stale = parts.find((x) => x.a && !x.a.submittedAt && !x.a.paper)?.role;

  useEffect(() => {
    if (stale) actions.upsertAdmin(admin.id, paperPatch(p, stale, undefined));
  }, [stale, p, admin.id]);

  if (!p?.eligibleAt || !p.feePaidAt) {
    return (
      <AdminShell title="الاختبار المؤتمت" subtitle="في قاعة المركز الامتحاني لمحافظتك، بإشراف مشرف القاعة.">
        <LockedCard title="الاختبار غير متاح بعد" text="يُفتح الاختبار المؤتمت بعد تقديم طلب المشاركة: التحقق من الأهلية للصفة التي اخترتها، ثم تسديد رسم التسجيل. بعدها تظهر هنا قاعتك وموعد اختبار صفتك." href="/administrator/apply" cta="إلى طلب المشاركة" />
      </AdminShell>
    );
  }

  if (p.examExempt) {
    return (
      <AdminShell title="الاختبار المؤتمت" subtitle="لا اختبار هذا الموسم: جدّدت الصفة نفسها بتقييم مستوفٍ وفق شروط الإدارة.">
        <LockedCard title="معفى من الاختبار" text="من يجدد صفته التي شغلها الموسم الماضي بتقييم لا يقل عن الحد الذي حددته الإدارة يُعفى من الاختبار المؤتمت، ويعامَل معاملة الناجح في التأهيل." href="/administrator/group" cta="تشكيل المجموعات" />
      </AdminShell>
    );
  }

  // Nothing sat yet and the tests are not open: his hall waits for their dates
  if (!op.open && !anyAttempt) {
    return (
      <AdminShell title="الاختبار المؤتمت" subtitle={`اختبارات التأهيل ${rangeLabel(op.start, op.end)}: في قاعة مركزك الامتحاني، قبل تشكيل المجموعات.`}>
        <OperationClosed state={op} text={hall.center ? `قاعتك: ${hall.center.name}.` : undefined} />
      </AdminShell>
    );
  }

  if (active) return <ExamRunner key={active.role} role={active.role} />;

  const result = allSent && !waiting;
  return (
    <AdminShell
      image="/images/haram-2022.jpg"
      title={result ? "نتيجتي في الاختبار المؤتمت" : "الاختبار المؤتمت في القاعة"}
      subtitle={result ? "النجاح باجتياز كل قسم من أقسام الاختبار بالنسبة المطلوبة فيه." : "يفتح المشرف القاعة ويسجّل حضورك، وتدخل الاختبار من جهازك برقمك الوطني بموافقته، ويؤكد تسليمك برمزه السري."}
    >
      {waiting ? (
        <Submitted key={waiting.role} role={waiting.role} />
      ) : result ? (
        <Results />
      ) : (
        <div className="space-y-6">
          <TwoTests />
          <HallScreen />
        </div>
      )}
    </AdminShell>
  );
}

// ───────────────────────── The hall ─────────────────────────

const STEPS = [
  { icon: DoorOpen, t: "يفتح المشرف القاعة" },
  { icon: ScanLine, t: "يسجّل حضورك ببطاقتك" },
  { icon: MonitorSmartphone, t: "تدخل برقمك ويوافق المشرف" },
  { icon: Hourglass, t: "يبدأ الاختبار" },
  { icon: KeyRound, t: "تسلّم ويؤكده المشرف برمزه" },
];

/** A role that sits two tests: each with its day, and how he stands in it — he must pass both */
function TwoTests() {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const halls = useHalls();
  const hall = useMyHall(admin.id, p);
  const r = resultOf(p);
  if (hall.roles.length < 2) return null;
  return (
    <Card className="md:p-6">
      <p className="font-display text-lg font-bold text-green-dark">صفتك «{positionLabelOf(p.positions[0] ?? "")}» تختبر اختبارين، ويلزمك اجتيازهما معاً</p>
      <p className="mt-1 text-sm text-ink-soft">لكل اختبار يومه وقاعته وأقسامه، وتنجح في كلٍّ منهما باجتياز أقسامه كلها بالنسبة المطلوبة فيها.</p>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {hall.roles.map((role) => {
          const a = paperOf(p, role);
          const st = statusOf(a);
          const part = r.parts.find((x) => x.role === role);
          const sitting = halls.sittingOf(admin.id, role);
          const now = role === hall.role && !a?.submittedAt;
          const shown = st === "confirmed" && part?.showResult;
          return (
            <li key={role} className={cn("rounded-2xl border-2 p-3", shown ? (part?.passed ? "border-green-light/50 bg-green-light/5" : "border-maroon/30 bg-maroon/5") : now ? "border-gold-dark/50 bg-gold/10" : "border-gold/30")}>
              <p className="font-bold">اختبار {roleLabelOf(role)}</p>
              <p className="text-xs text-ink-soft">{sitting ? `${sitting.exam.date} — ${sitting.exam.time}` : "يُحدَّد موعده"}</p>
              <p className="mt-1 text-sm font-bold">{shown ? (part?.passed ? "ناجح — اجتزت أقسامه كلها" : "راسب — لم تجتز كل أقسامه") : st ? ATTEMPT_LABEL[st] : now ? "اختبارك الآن" : "بعده"}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** A clock time some minutes earlier («09:00» → «08:30») */
function earlier(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const x = Math.max(0, (h || 0) * 60 + (m || 0) - minutes);
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
}

function HallScreen() {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const hall = useMyHall(admin.id, p);
  const bank = useExamBank();
  const toast = useToast();
  const now = useDemoNow();
  const role = hall.role;
  const exam = hall.exam;
  const run = hall.run;
  const a = paperOf(p, role);
  // His attempt in this sitting (one voided in another sitting before a make-up is not this one's)
  const mine = a?.hall === hall.key ? a : undefined;
  const st = statusOf(mine);
  const present = !!run?.present[admin.id];
  const request = run?.requests?.[admin.id];
  const supervisorName = hall.supervisor?.name ?? "مشرف القاعة";
  const target = `${hall.center?.name ?? ""} — ${exam?.name ?? `اختبار ${roleLabelOf(role)}`}`;
  const slot = openWindow(scheduledAt(exam), now);
  const othersWaiting = Object.keys(run?.requests ?? {}).filter((x) => x !== admin.id).length;

  const state = !hall.center
    ? "nocenter"
    : !exam
      ? "noexam"
      : st === "voided"
        ? "voided"
        : hall.stage === "idle"
          ? "idle"
          : hall.stage === "closed"
            ? "absent"
            : !present
              ? "checkin"
              : st === "ready"
                ? "ready"
                : request
                  ? "request"
                  : "entry";
  const step = { idle: 0, checkin: 1, entry: 2, request: 2, ready: 3 }[state as string] ?? -1;

  const sim = (action: string, f: () => void) => {
    f();
    simLog(supervisorName, action, hall.key, admin.name, target);
  };

  const reset = () => {
    hallActions.reset(hall.key);
    if (a && a.hall !== hall.key) actions.upsertAdmin(admin.id, paperPatch(p, role, undefined));
    logAdmin(admin.id, "إعادة جلسة الاختبار (نسخة تجريبية)", target);
    toast({ title: "أُعيدت الجلسة", body: "القاعة مغلقة من جديد كما قبل فتحها.", icon: "↩️", tone: "info" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <div className="flex items-center gap-4">
          <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-green-dark to-green text-gold">{hall.stage === "idle" ? <DoorClosed className="size-8" /> : <DoorOpen className="size-8" />}</span>
          <div className="min-w-0">
            <p className="text-sm text-hint">{exam?.kind === "makeup" ? `${exam.name} — لمن غاب عن الاختبار الأساسي` : (exam?.name ?? `الاختبار المؤتمت لصفة ${positionLabelOf(role)}`)}</p>
            <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">{hall.center ? hall.center.name : "مركزك الامتحاني"}</h2>
          </div>
        </div>

        {hall.center && (
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
              { icon: AlarmClock, k: "الموعد", v: exam ? `${exam.date}${exam.day ? ` (${dayLabel(exam.day)})` : ""} — ${exam.time}` : "يُحدَّد" },
              { icon: ShieldCheck, k: "مشرف القاعة", v: hall.supervisor?.name ?? "لم يُسند بعد" },
            ].map((x) => (
              <div key={x.k} className="rounded-2xl bg-sand p-3">
                <dt className="flex items-center gap-1.5 text-xs text-hint"><x.icon className="size-3.5" /> {x.k}</dt>
                <dd className="mt-1 text-sm font-bold leading-6 text-ink">{x.v}</dd>
              </div>
            ))}
          </dl>
        )}

        {step >= 0 && (
          <ol className="mt-6 grid grid-cols-5 gap-2 text-center">
            {STEPS.map((s, i) => (
              <li key={s.t} className={cn("rounded-2xl p-2 text-[11px] font-bold leading-5 ring-1 transition md:p-3 md:text-xs", i < step ? "bg-green-dark text-white ring-green-dark" : i === step ? "bg-gold/20 text-green-dark ring-gold-dark" : "bg-white text-hint ring-gold/30")}>
                {i < step ? <Check className="mx-auto mb-1 size-5" /> : <s.icon className="mx-auto mb-1 size-5" />}
                {s.t}
              </li>
            ))}
          </ol>
        )}

        <motion.div key={state} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-3xl border-2 border-dashed border-gold-dark/50 bg-gold/10 p-5">
          {state === "nocenter" && (
            <p className="text-sm leading-7 text-ink-soft">لم يُحدَّد مركزك الامتحاني بعد: محافظة قيدك لا تتبع أياً من القاعات. تُسندك إدارة الامتحانات إلى قاعة، فتظهر هنا قاعتك وموعدك.</p>
          )}
          {state === "noexam" && <p className="text-sm leading-7 text-ink-soft">لم يُنشر اختبار صفتك بعد: حين تنشره إدارة الامتحانات وتحدد جلسته في قاعتك يظهر هنا موعده.</p>}

          {state === "idle" && exam && (
            <>
              <p className="font-display text-lg font-bold text-green-dark">القاعة لم تُفتح بعد</p>
              <p className="mt-1 text-sm leading-7 text-ink-soft">
                احضر إلى القاعة يوم {exam.date} قبل الساعة {exam.time} ومعك بطاقتك وهويتك الشخصية. يفتح المشرف القاعة قبل الموعد بساعة، ويؤدي كل المتقدمين لصفتك الاختبار في الوقت نفسه، كلٌّ في قاعة مركزه، ولا يُؤدّى من البيت.
              </p>
              {exam.day && (slot === "upcoming" || slot === "today" || slot === "late") ? (
                <Button size="sm" variant="outline" className="mt-4 bg-white" onClick={() => actions.setToday(exam.day, earlier(exam.time, 30))}>
                  <CalendarClock className="size-4" /> جرّبها الآن: انقل تاريخ التجربة إلى {dayTimeLabel(exam.day, earlier(exam.time, 30))}
                </Button>
              ) : (
                <SimButton className="mt-4" onClick={() => sim("فتح القاعة", () => hallActions.open(hall.key, supervisorName))}>محاكاة: يفتح المشرف القاعة</SimButton>
              )}
            </>
          )}

          {state === "checkin" && (
            <>
              <p className="font-display text-lg font-bold text-green-dark">{hall.stage === "running" ? "بدأ الاختبار في قاعتك" : "القاعة مفتوحة"}: سجّل حضورك عند الباب</p>
              <p className="mt-1 text-sm leading-7 text-ink-soft">
                سلّم مشرف القاعة بطاقتك ليمسح رمزها، أو أعطه رقمك الوطني، فيسجّل حضورك ويطابق هويتك.
                {hall.stage === "running" && " ما زال بإمكانك الدخول: وقتك يبدأ من لحظة دخولك الاختبار."}
              </p>
              <div className="mt-4 flex w-fit items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-gold/40">
                <ScanLine className="size-6 text-gold-dark" />
                <div>
                  <p className="text-xs text-hint">رمز بطاقتك</p>
                  <p className="font-mono text-lg font-bold tracking-widest text-ink" dir="ltr">{barcodeOf(admin.id)}</p>
                </div>
              </div>
              <SimButton className="mt-4" onClick={() => sim("تسجيل حضور", () => hallActions.checkIn(hall.key, admin.id))}>محاكاة: يمسح المشرف بطاقتك</SimButton>
            </>
          )}

          {state === "entry" && exam && <DeviceEntry onEnter={() => {
            hallActions.request(hall.key, admin.id, exam, sourceOf(exam, bank));
            logAdmin(admin.id, "طلب الدخول إلى الاختبار من الجهاز", target);
          }} />}

          {state === "request" && request && exam && (
            <div className="text-center">
              <p className="font-display text-lg font-bold text-green-dark">ابقَ في مقعدك</p>
              <p className="mt-1 text-sm leading-7 text-ink-soft">يأتيك مشرف القاعة فيطابق هذا الرمز مع بطاقتك، ثم يوافق على دخولك.</p>
              <p className="mt-4 text-xs font-bold text-hint">رمز الاقتران</p>
              <p className="font-mono text-5xl font-bold tracking-[0.3em] text-green-dark" dir="ltr">{request.code}</p>
              <p className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-gold-dark">
                <motion.span className="size-2 rounded-full bg-gold-dark" animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
                بانتظار موافقة المشرف…
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <SimButton onClick={() => sim("موافقة اقتران", () => hallActions.approve(hall.key, admin.id, sourceOf(exam, bank)))}>محاكاة: يوافق المشرف على دخولك</SimButton>
                <SimButton onClick={() => sim("رفض اقتران", () => hallActions.reject(hall.key, admin.id))}>محاكاة: يرفض المشرف الطلب</SimButton>
              </div>
            </div>
          )}

          {state === "ready" && (
            <div className="text-center">
              <CircleCheck className="mx-auto size-10 text-green" />
              <p className="mt-2 font-display text-lg font-bold text-green-dark">تمت الموافقة على دخولك</p>
              <p className="mt-1 text-sm leading-7 text-ink-soft">بانتظار أن يبدأ المشرف الاختبار…</p>
              <p className="mx-auto mt-3 w-fit rounded-full bg-green-dark px-4 py-1.5 text-sm font-bold text-white">أنت جاهز — لا تغلق هذه الصفحة</p>
              <SimButton className="mx-auto mt-4" disabled={othersWaiting > 0} onClick={() => sim("بدء الاختبار", () => hallActions.start(hall.key))}>محاكاة: يبدأ المشرف الاختبار</SimButton>
              {othersWaiting > 0 && <p className="mt-2 text-xs text-maroon">لا يبدأ الاختبار وفي القاعة طلبات دخول معلّقة ({othersWaiting}).</p>}
            </div>
          )}

          {state === "absent" && (
            <>
              <p className="font-display text-lg font-bold text-maroon">انتهت جلسة اختبار صفتك في قاعتك</p>
              <p className="mt-1 text-sm leading-7 text-ink-soft">
                {present ? "أنهى المشرف الجلسة قبل أن تدخل الاختبار" : "أُغلقت القاعة ولم تحضر"}، فسُجّلت غائباً. تواصل مع إدارة الامتحانات: يظهر لك هنا الاختبار الاستدراكي حين تحدد موعده.
              </p>
              <SimButton className="mt-4" onClick={reset}><RotateCcw className="size-4" /> إعادة التجربة: الجلسة من بدايتها</SimButton>
            </>
          )}

          {state === "voided" && (
            <>
              <p className="font-display text-lg font-bold text-maroon">أُلغيت محاولتك</p>
              <p className="mt-1 text-sm leading-7 text-ink-soft">
                أنهى المشرف الجلسة قبل أن يبدأ اختبارك. راجع مشرف القاعة؛ يظهر لك هنا الاختبار الاستدراكي حين تحدده إدارة الامتحانات.
              </p>
              <SimButton className="mt-4" onClick={reset}><RotateCcw className="size-4" /> إعادة التجربة: الجلسة من بدايتها</SimButton>
            </>
          )}
        </motion.div>

        <ul className="mt-6 space-y-3">
          {[
            { icon: MonitorSmartphone, t: "تدخل الاختبار من جهازك في القاعة برقمك الوطني، ويطابق المشرف رمز الاقتران على شاشتك قبل أن يوافق." },
            { icon: Hourglass, t: "يبدأ وقتك من لحظة دخولك الاختبار، والعدّاد أمامك طوال الوقت." },
            { icon: CloudUpload, t: "تُحفظ كل إجابة فور اختيارها." },
            { icon: ShieldAlert, t: "لا تغادر شاشة الاختبار: كل خروج منها إشارة يراها المشرف." },
            { icon: Hand, t: "بعد التسليم ارفع يدك: يكتب المشرف رمزه السري على جهازك فيؤكد تسليمك." },
          ].map((r) => (
            <li key={r.t} className="flex items-center gap-3 rounded-2xl border border-gold/30 p-3">
              <r.icon className="size-5 shrink-0 text-gold-dark" /> <span className="leading-7">{r.t}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="md:p-8">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><ListChecks className="size-5 text-gold-dark" /> أقسام اختبار صفتك</h3>
        <p className="text-xs text-hint">{exam ? `${exam.name} — ${questionCount(exam)} سؤالاً في ${exam.minutes} دقيقة` : `الاختبار المؤتمت لصفة ${positionLabelOf(role)}`}</p>
        <ul className="mt-5 space-y-4">
          {exam?.sections.map((s, i) => (
            <li key={s.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-bold">{s.name}</span>
                <span className="text-xs text-hint">{s.draw} سؤالاً — {SECTION_ORDERS[s.order]}</span>
              </div>
              <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-sand">
                <motion.div className="h-full rounded-full bg-gradient-to-l from-green-dark to-green-light" initial={{ width: 0 }} animate={{ width: `${s.pass}%` }} transition={{ delay: 0.2 + i * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
              </div>
              <p className="mt-1 text-xs font-bold text-maroon">النجاح فيه من {s.pass}%</p>
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-2xl bg-gold/15 p-4 text-xs leading-6 text-ink-soft">
          تنجح في الاختبار باجتياز كل قسم من أقسامه بالنسبة المطلوبة فيه: لا علامة إجمالية تُجمع ولا أوزان. لكل سؤال خياراته وإجابة واحدة صحيحة، تُعرض خياراته بترتيب خاص بك، ويُصحَّح آلياً.
        </p>
        {!!exam?.instructions.length && (
          <div className="mt-6 rounded-2xl border border-gold/40 p-4 text-sm leading-7">
            <p className="font-bold text-green-dark">تعليمات القاعة</p>
            <ul className="mt-1 list-disc space-y-1 pr-5 text-ink-soft">
              {exam.instructions.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <p className="mt-2 text-xs text-hint">تظهر على شاشة القاعة طوال الاختبار.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

/** «الاختبار الإلكتروني»: his device in the hall, entered by his national id */
function DeviceEntry({ onEnter }: { onEnter: () => void }) {
  const admin = useAdmin()!;
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const enter = (typed: string) => {
    if (!/^\d{11}$/.test(typed)) return setError("الرقم الوطني 11 رقماً.");
    if (typed !== admin.id) return setError("غير موجود في هذه القاعة.");
    setError("");
    onEnter();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    enter(value.trim());
  };
  return (
    <form onSubmit={submit}>
      <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><MonitorSmartphone className="size-5 text-gold-dark" /> الاختبار الإلكتروني</p>
      <p className="mt-1 text-sm leading-7 text-ink-soft">حضورك مسجَّل. امسح رمز QR على شاشة القاعة بجهازك (أو افتح هذه الصفحة)، واكتب رقمك الوطني للدخول إلى الاختبار.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 11))}
          inputMode="numeric"
          dir="ltr"
          aria-label="الرقم الوطني"
          placeholder="الرقم الوطني (11 رقماً)"
          className="h-12 w-56 rounded-2xl border-2 border-gold/40 bg-white px-4 text-center font-mono text-lg tracking-widest outline-none focus:border-green-dark"
        />
        <Button type="submit" size="lg"><LogIn className="size-5" /> دخول</Button>
      </div>
      {error && <p className="mt-2 text-sm font-bold text-maroon" role="alert">{error}</p>}
      <SimButton className="mt-4" onClick={() => enter(admin.id)}>محاكاة: أكتب رقمي الوطني</SimButton>
    </form>
  );
}

// ───────────────────────── The test ─────────────────────────

type Served = { q: ExamQuestion; section: PaperSection };

/** The paper as served, question by question with its section, from the bank as it stands (withdrawn ones included) */
function useServed(a: Attempt | undefined): Served[] {
  const all = useAllQuestions();
  return useMemo(() => {
    const byId = new Map(all.map((q) => [q.id, q]));
    return (a?.paper ?? []).flatMap((s) => s.ids.flatMap((id) => (byId.has(id) ? [{ q: byId.get(id)!, section: s }] : [])));
  }, [all, a?.paper]);
}

/** Pages loaded in this tab that already entered a test: entering it again after leaving is a signal */
const entered = new Set<string>();

/**
 * The test on his device, every question on one page under its section's heading, numbered straight through: the
 * time left, «أجبت عن X من Y» for each section, the list of questions and the first one unanswered. When the time
 * is over the answers stay as they are: he may look over them until the supervisor ends the test, or submit now.
 */
function ExamRunner({ role }: { role: string }) {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const all = useAllQuestions();
  const a = paperOf(p, role)!;
  const sitting = useSittingOf(a);
  const served = useServed(a);
  const answers = a.answers;
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [confirm, setConfirm] = useState(false);
  const sent = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);

  const total = (a.minutes ?? sitting.exam?.minutes ?? 25) * 60_000;
  const remaining = Math.max(0, total - (now - (a.startedAt ?? now)));
  const over = remaining <= 0;
  const answeredCount = served.filter((x) => answers[x.q.id] !== undefined).length;
  const firstOpen = served.find((x) => answers[x.q.id] === undefined);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(t);
      window.clearTimeout(saveTimer.current);
    };
  }, []);
  useScrollLock(true);

  // Leaving the test's screen is a signal the supervisor sees; so is coming back into it after the page was left
  useEffect(() => {
    const mark = `sdhu-test-${admin.id}-${role}-${a.startedAt ?? 0}`;
    if (!entered.has(mark)) {
      entered.add(mark);
      try {
        if (sessionStorage.getItem(mark)) hallActions.alert(admin.id, role, "reentries");
        sessionStorage.setItem(mark, "1");
      } catch {
        // no session storage: no re-entry signal
      }
    }
    const onHide = () => {
      if (document.visibilityState === "hidden") hallActions.alert(admin.id, role, "focusLost");
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [admin.id, role, a.startedAt]);

  const submit = () => {
    if (sent.current) return;
    sent.current = true;
    hallActions.submit(admin.id, role, all, false);
    logAdmin(admin.id, "تسليم الاختبار المؤتمت", sitting.center?.name, `${sitting.exam?.name ?? ""} — أجاب عن ${answeredCount} من ${served.length}`);
  };

  const save = (id: number, value: number) => {
    if (over) return;
    actions.upsertAdmin(admin.id, paperPatch(p, role, { ...a, answers: { ...answers, [id]: value } }));
    setSaving("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaving("saved"), 650);
  };

  /** Demo: every question answered at once, then the submission to confirm. To fail: the largest section below its mark */
  const simulate = (pass: boolean) => {
    const paper = a.paper ?? [];
    const big = paper.reduce((x, s) => (s.ids.length > x.ids.length ? s : x), paper[0]);
    const filled: Record<number, number> = {};
    served.forEach(({ q }, i) => {
      const wrong = !pass && !!big?.ids.includes(q.id) && i % 3 !== 0;
      filled[q.id] = wrong ? (q.answer + 1) % q.options.length : q.answer;
    });
    actions.upsertAdmin(admin.id, paperPatch(p, role, { ...a, answers: filled }));
    setConfirm(true);
  };

  const end = () => {
    hallActions.end(sitting.key, all, () => sitting.pin);
    simLog(sitting.supervisorName, "إنهاء الجلسة", sitting.key, sitting.center?.name ?? "", sitting.exam?.name);
  };

  const jump = (id: number) => document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const low = remaining < 2 * 60_000;
  const sections = (a.paper ?? [])
    .map((s) => {
      const mineIn = served.filter((x) => x.section.id === s.id);
      return { ...s, first: served.findIndex((x) => x.section.id === s.id), count: mineIn.length, done: mineIn.filter((x) => answers[x.q.id] !== undefined).length };
    })
    .filter((s) => s.count > 0);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-sand" aria-label="الاختبار المؤتمت">
      {/* top bar */}
      <div className="sticky top-0 z-10 border-b border-gold/30 bg-green-dark text-white shadow-lg">
        <div className="bg-pattern pointer-events-none absolute inset-0 opacity-10" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gold text-ink"><GraduationCap className="size-5" /></span>
            <div>
              <p className="font-display font-bold">{sitting.exam?.name ?? "الاختبار المؤتمت"}</p>
              <p className="text-xs text-white/70">
                {admin.name} — {sitting.center?.name ?? ""} — أجبت عن {answeredCount} من {served.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-white/75 sm:flex" aria-live="polite">
              {saving === "saving" ? <CloudUpload className="size-4 animate-pulse" /> : <Cloud className="size-4" />}
              {saving === "saving" ? "جارٍ الحفظ..." : saving === "saved" ? "حُفظت إجابتك" : "تُحفظ كل إجابة فور اختيارها"}
            </span>
            <motion.span
              animate={low && !over ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={low && !over ? { repeat: Infinity, duration: 1 } : undefined}
              className={cn("flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-lg font-bold tabular-nums", low ? "bg-maroon text-white" : "bg-white/10 text-gold")}
              dir="ltr"
              role="timer"
              aria-label="الوقت المتبقي"
            >
              <Hourglass className="size-4" />
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </motion.span>
            <Button variant="gold" size="sm" onClick={() => setConfirm(true)}>
              <Send className="size-4" /> إنهاء وتسليم
            </Button>
          </div>
        </div>
        <div className="h-1 bg-white/10">
          <motion.div className="h-full bg-gold" animate={{ width: `${served.length ? (answeredCount / served.length) * 100 : 0}%` }} />
        </div>
      </div>

      {over && (
        <div className="mx-auto mt-6 max-w-6xl px-4 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-maroon p-5 text-white">
            <p className="font-bold leading-7">انتهى الوقت. يمكنك مراجعة إجاباتك حتى ينهي المشرف الاختبار، أو التسليم الآن.</p>
            <Button variant="gold" onClick={() => setConfirm(true)}><Send className="size-4" /> سلّم الآن</Button>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-8 md:px-8 lg:grid-cols-[1fr_17rem]">
        <div className="min-w-0 space-y-6">
          {sections.map((s) => (
            <section key={s.id} className="overflow-hidden rounded-[2rem] border border-gold/30 bg-white shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)]">
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gold/30 bg-green-dark/5 px-6 py-4 md:px-10">
                <h2 className="font-display text-xl font-bold text-green-dark">{s.name}</h2>
                <p className="text-sm font-bold text-gold-dark">أجبت عن {s.done} من {s.count}</p>
              </header>
              <ol className="divide-y divide-gold/20">
                {served.map((x, i) =>
                  x.section.id !== s.id ? null : <QuestionBlock key={x.q.id} n={i + 1} q={x.q} seed={admin.id} value={answers[x.q.id]} locked={over} onSave={(v) => save(x.q.id, v)} />,
                )}
              </ol>
            </section>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-gold/30 bg-white p-6 md:px-10">
            <p className="text-sm text-ink-soft">
              أجبت عن <b className="text-ink">{answeredCount}</b> من {served.length} سؤالاً. راجع إجاباتك قبل التسليم.
            </p>
            <Button variant="maroon" size="lg" onClick={() => setConfirm(true)}>
              إنهاء وتسليم <Send className="size-5" />
            </Button>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-3xl border-2 border-dashed border-maroon/30 bg-white p-4">
            <p className="text-sm font-bold text-maroon">للتجربة فقط</p>
            <p className="mt-1 text-xs leading-5 text-ink-soft">تُجاب الأسئلة كلها دفعة واحدة، ثم يُطلب تأكيد التسليم.</p>
            <div className="mt-3 grid gap-2">
              <SimButton className="justify-center" onClick={() => simulate(true)}>محاكاة: إجابات ناجحة</SimButton>
              <SimButton className="justify-center" onClick={() => simulate(false)}>محاكاة: إجابات راسبة</SimButton>
              <SimButton className="justify-center" onClick={end}>محاكاة: ينهي المشرف الجلسة</SimButton>
            </div>
          </div>
          <div className="rounded-3xl border border-gold/30 bg-white p-5">
            <p className="text-sm font-bold text-green-dark">الأسئلة</p>
            {sections.map((s) => (
              <div key={s.id} className="mt-3">
                <p className="text-xs font-bold text-hint">{s.name} — {s.done} من {s.count}</p>
                <div className="mt-1.5 grid grid-cols-5 gap-2">
                  {served.map((x, i) =>
                    x.section.id !== s.id ? null : (
                      <button
                        key={x.q.id}
                        type="button"
                        onClick={() => jump(x.q.id)}
                        aria-label={`السؤال ${i + 1}${answers[x.q.id] !== undefined ? " — مُجاب" : ""}`}
                        className={cn("grid aspect-square place-items-center rounded-xl text-sm font-bold transition", answers[x.q.id] !== undefined ? "bg-green-dark text-white" : "bg-sand text-ink-soft hover:bg-gold/30")}
                      >
                        {i + 1}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ))}
            <ul className="mt-4 space-y-1.5 text-xs text-ink-soft">
              <li className="flex items-center gap-2"><span className="size-3 rounded bg-green-dark" /> مُجاب ({answeredCount})</li>
              <li className="flex items-center gap-2"><span className="size-3 rounded bg-sand ring-1 ring-gold" /> بلا إجابة ({served.length - answeredCount})</li>
            </ul>
            {firstOpen && (
              <Button variant="outline" size="sm" className="mt-4 w-full justify-center" onClick={() => jump(firstOpen.q.id)}>
                أول سؤال بلا إجابة
              </Button>
            )}
          </div>
          <p className="rounded-3xl bg-green-dark/6 p-4 text-xs leading-6 text-green-dark">لا تغادر هذه الشاشة حتى تسلّم: كل خروج منها إشارة يراها مشرف القاعة. حين ينهي المشرف الاختبار يُسلَّم كما هو.</p>
        </aside>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)}>
        <div className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-maroon/10 text-maroon"><Send className="size-8" /></span>
          <h3 className="mt-4 font-display text-2xl font-bold text-green-dark">تأكيد التسليم</h3>
          <p className="mt-2 text-ink-soft">
            {answeredCount === served.length ? "أجبت عن جميع الأسئلة." : `أجبت عن ${answeredCount} من ${served.length}، وبقي ${served.length - answeredCount} بلا إجابة.`} بعد التسليم لا يمكنك العودة.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => setConfirm(false)}>{over ? "مراجعة إجاباتي" : "متابعة الإجابة"}</Button>
            <Button
              variant="maroon"
              onClick={() => {
                setConfirm(false);
                submit();
              }}
            >
              نعم، سلّم <Send className="size-4" />
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** One question of the paper, in its place on the page: its scenario, its text, and its options in his own order */
function QuestionBlock({ n, q, seed, value, locked, onSave }: { n: number; q: ExamQuestion; seed: string; value: number | string | undefined; locked: boolean; onSave: (v: number) => void }) {
  const order = optionOrder(q, seed);
  return (
    <li id={`question-${q.id}`} className="scroll-mt-28 p-6 md:px-10">
      {q.scenario && (
        <div className="rounded-2xl border-r-4 border-maroon bg-maroon/5 p-4 text-sm leading-7 text-ink">
          <span className="font-bold text-maroon">سيناريو تشغيلي: </span>
          {q.scenario}
        </div>
      )}
      <h3 className={cn("font-display text-lg font-bold leading-[1.7] text-ink md:text-xl", q.scenario && "mt-4")}>
        <span className="text-maroon">{n}.</span> {q.text}
      </h3>
      <ul className="mt-4 grid gap-2 md:grid-cols-2" role="radiogroup" aria-label={`السؤال ${n}: الخيارات`}>
        {order.map((i, k) => {
          const on = value === i;
          return (
            <li key={i}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                disabled={locked}
                onClick={() => onSave(i)}
                className={cn("flex h-full w-full items-center gap-3 rounded-2xl border-2 p-3 text-right transition disabled:cursor-not-allowed", on ? "border-green-dark bg-green-dark/5 shadow-md" : "border-gold/40 enabled:hover:border-gold-dark enabled:hover:bg-sand", locked && !on && "opacity-60")}
              >
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl text-sm font-bold transition", on ? "bg-green-dark text-gold" : "bg-sand text-ink-soft")}>{LETTERS[k]}</span>
                <span className="leading-7">{q.options[i]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

// ───────────────────────── After submitting ─────────────────────────

/**
 * Submitted, not confirmed yet: he raises his hand and waits in his seat; the supervisor types his own PIN on the
 * device. Five wrong tries lock it for ten minutes — the supervisor confirms from his panel instead.
 */
function Submitted({ role }: { role: string }) {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const toast = useToast();
  const a = paperOf(p, role)!;
  const sitting = useSittingOf(a);
  const served = useServed(a);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const lockedUntil = a.pinLockedUntil && a.pinLockedUntil > now ? a.pinLockedUntil : undefined;
  const tries = a.pinLockedUntil && a.pinLockedUntil <= now ? 0 : (a.pinTries ?? 0);
  const answered = served.filter((x) => a.answers[x.q.id] !== undefined).length;
  const by = sitting.supervisorName;

  const confirmed = (action: string, demo: boolean) => {
    actions.logEvent({ actor: by, role: "موظف", system: "exams", area: "live", ref: sitting.key, action: demo ? `${action} (محاكاة)` : action, target: admin.name, detail: sitting.exam?.name });
    logAdmin(admin.id, "تأكيد تسليم الاختبار", by, sitting.exam?.name);
    toast({ title: "تم تأكيد تسليمك", body: sitting.exam?.name, icon: "✅", tone: "success" });
  };

  const typePin = (typed: string, demo = false) => {
    if (!sitting.pin || lockedUntil) return;
    const ok = typed === sitting.pin;
    hallActions.pinConfirm(admin.id, role, ok, by);
    setValue("");
    if (ok) {
      setError("");
      return confirmed("تأكيد تسليم برمز المشرف", demo);
    }
    actions.logEvent({ actor: admin.name, role: "إداري", system: "exams", area: "live", ref: sitting.key, action: "PIN خاطئ على جهاز المتقدم", target: by, detail: `المحاولة ${tries + 1} من 5` });
    setError(tries + 1 >= 5 ? "أُوقف التأكيد من هذا الجهاز 10 دقائق بعد خمس محاولات خاطئة." : `رمز غير صحيح — بقيت ${5 - tries - 1} محاولات.`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card className="text-center md:p-10">
        <motion.span initial={{ rotate: -20, scale: 0.6 }} animate={{ rotate: [0, -12, 12, -8, 0], scale: 1 }} transition={{ duration: 1.2 }} className="mx-auto grid size-20 place-items-center rounded-3xl bg-gold/20 text-gold-dark">
          <Hand className="size-10" />
        </motion.span>
        <h2 className="mt-4 font-display text-3xl font-bold text-green-dark">انتهى الاختبار</h2>
        <p className="mx-auto mt-2 max-w-md leading-8 text-ink-soft">ارفع يدك وانتظر مشرف القاعة في مقعدك؛ سيكتب رمزه السري هنا ليؤكد تسليمك.</p>
        {a.autoSubmitted && <p className="mx-auto mt-2 w-fit rounded-full bg-maroon/8 px-4 py-1.5 text-sm font-bold text-maroon">سُلّم اختبارك تلقائياً حين أنهى المشرف الجلسة</p>}

        <div className="mx-auto mt-8 max-w-sm rounded-3xl border-2 border-green-dark/30 bg-green-dark/5 p-5 text-right">
          {sitting.pin ? (
            lockedUntil ? (
              <p className="text-sm leading-7 text-maroon">
                أُوقف التأكيد من هذا الجهاز حتى الساعة {new Date(lockedUntil).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" })} بعد خمس محاولات خاطئة. يمكن للمشرف أن يؤكد تسليمك من لوحته.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  typePin(value);
                }}
              >
                <label htmlFor="pin" className="flex items-center gap-2 text-sm font-bold text-green-dark"><KeyRound className="size-4" /> للمشرف: الرمز السري (PIN)</label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="pin"
                    type="password"
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setError("");
                    }}
                    inputMode="numeric"
                    autoComplete="off"
                    dir="ltr"
                    className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-gold/40 bg-white px-4 text-center font-mono text-xl tracking-[0.4em] outline-none focus:border-green-dark"
                  />
                  <Button type="submit" disabled={value.length < 4}>تأكيد</Button>
                </div>
                {error && <p className="mt-2 text-sm font-bold text-maroon" role="alert">{error}</p>}
              </form>
            )
          ) : (
            <p className="text-sm leading-7 text-ink-soft">لم يضبط مشرف القاعة رمزه السري بعد: يؤكد تسليمك من لوحته.</p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {sitting.pin && !lockedUntil ? (
            <SimButton onClick={() => typePin(sitting.pin!, true)}>محاكاة: يكتب المشرف رمزه</SimButton>
          ) : (
            <SimButton
              onClick={() => {
                hallActions.confirm(sitting.key, [admin.id], by, "panel");
                confirmed("تأكيد تسليم من لوحة المشرف", true);
              }}
            >
              محاكاة: يؤكد المشرف تسليمك من لوحته
            </SimButton>
          )}
          <SimButton
            onClick={() => {
              const reason = "لم يطابق الحاضرُ صاحبَ المحاولة";
              hallActions.unconfirm(sitting.key, admin.id, reason);
              simLog(by, "عدم تأكيد", sitting.key, admin.name, reason);
            }}
          >
            محاكاة: لا يؤكد المشرف تسليمك
          </SimButton>
        </div>
      </Card>

      <Card className="md:p-8">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><Send className="size-5 text-gold-dark" /> ما سلّمته</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-hint">الاختبار</dt><dd className="font-bold">{sitting.exam?.name ?? "الاختبار المؤتمت"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-hint">القاعة</dt><dd className="font-bold">{sitting.center?.name ?? "—"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-hint">أجبت عن</dt><dd className="font-bold">{answered} من {served.length}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-hint">مشرف القاعة</dt><dd className="font-bold">{by}</dd></div>
        </dl>
        <p className="mt-6 rounded-2xl bg-gold/15 p-4 text-xs leading-6 text-ink-soft">
          لا تُحتسب النتيجة قبل تأكيد التسليم. يؤكده المشرف برمزه على جهازك، أو من لوحته. إن لم يؤكده أُحيلت محاولتك إلى إدارة الامتحانات فتعتمدها أو تلغيها.
        </p>
      </Card>
    </div>
  );
}

// ───────────────────────── The result ─────────────────────────

const VIA: Record<string, string> = { pin: "برمزه على جهازك", panel: "من لوحته", batch: "ضمن التأكيد الجماعي", auto: "عند إنهاء الجلسة", decision: "باعتماد الإدارة" };

/** One test he sat, as it stands: confirmed (with its result when the test shows it), not confirmed, or voided */
function PartCard({ part, two }: { part: PartResult; two: boolean }) {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const a = paperOf(p, part.role)!;
  const sitting = useSittingOf(a);
  const owner = useHolders().exams[0]?.staff.name ?? "إدارة الامتحانات";
  const title = sitting.exam?.name ?? (two ? `اختبار ${roleLabelOf(part.role)}` : "الاختبار المؤتمت");
  const st = part.status;
  const decide = (kind: "approve" | "void") => {
    const note = kind === "approve" ? "طابقت الإدارة هويته مع سجل الحضور" : "تعذّر التحقق من صاحب المحاولة";
    hallActions.decide(admin.id, part.role, kind, owner, note);
    actions.logEvent({ actor: owner, role: "موظف", system: "exams", area: "review", ref: admin.id, action: kind === "approve" ? "اعتماد إداري (محاكاة)" : "إلغاء إداري (محاكاة)", target: admin.name, detail: `${title} — ${note}` });
  };

  return (
    <Card className="md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark"><GraduationCap className="size-6 text-gold-dark" /> {title}</h3>
        {st === "confirmed" && part.showResult ? <Badge tone={part.passed ? "green" : "maroon"}>{part.passed ? "ناجح" : "راسب"}</Badge> : st && <Badge tone={st === "confirmed" ? "green" : "maroon"}>{ATTEMPT_LABEL[st]}</Badge>}
      </div>
      <p className="mt-1 text-sm text-hint">
        {sitting.center?.name ?? ""}
        {a.submittedAt && a.startedAt ? ` — المدة ${Math.max(1, Math.round((a.submittedAt - a.startedAt) / 60000))} دقيقة` : ""}
      </p>

      {st === "confirmed" && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-green-light/10 p-3 text-sm font-bold text-green">
          <BadgeCheck className="size-5" /> تم تأكيد تسليمك{a.confirmVia ? ` ${VIA[a.confirmVia]}` : ""}{a.confirmedBy ? ` — ${a.confirmedBy}` : ""}
        </p>
      )}

      {st === "confirmed" && part.showResult && (
        part.sections.length ? (
          <>
            <p className="mt-5 font-bold text-green-dark">نتيجتك</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gold/30 text-right text-xs text-hint">
                    <th className="py-2 font-semibold">القسم</th>
                    <th className="py-2 font-semibold">الدرجة</th>
                    <th className="py-2 font-semibold">النسبة</th>
                    <th className="py-2 font-semibold">المطلوب</th>
                  </tr>
                </thead>
                <tbody>
                  {part.sections.map((s) => (
                    <tr key={s.id} className="border-b border-gold/15">
                      <td className="py-2.5 font-bold">
                        <span className="flex items-center gap-1.5">{s.passed ? <CircleCheck className="size-4 text-green-light" /> : <CircleX className="size-4 text-maroon" />} {s.name}</span>
                      </td>
                      <td className="py-2.5 tabular-nums">{s.earned} من {s.possible}</td>
                      <td className={cn("py-2.5 font-bold tabular-nums", s.passed ? "text-green" : "text-maroon")}>{s.percent}%</td>
                      <td className="py-2.5 tabular-nums text-ink-soft">{s.pass}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-hint">شرط النجاح: تحقيق النسبة المطلوبة في كل قسم.</p>
          </>
        ) : (
          <p className="mt-5 text-sm text-ink-soft">نتيجتك: <b className="text-ink">{part.score ?? "—"}%</b> — {part.passed ? "ناجح" : "راسب"}</p>
        )
      )}

      {st === "confirmed" && !part.showResult && (
        <p className="mt-5 rounded-2xl bg-sand p-4 text-sm leading-7 text-ink-soft">لا يعرض هذا الاختبار نتيجته على المتقدم: تعلنها إدارة الامتحانات، فتظهر هنا حين تعرضها.</p>
      )}

      {st === "unconfirmed" && (
        <div className="mt-5 rounded-2xl bg-maroon/6 p-4">
          <p className="font-bold text-maroon">لم يُؤكَّد تسليمك بعد — يرجى مراجعة مشرف القاعة</p>
          <p className="mt-1 text-sm leading-7 text-ink-soft">
            أحال المشرف محاولتك إلى إدارة الامتحانات{a.unconfirmedReason ? `: «${a.unconfirmedReason}»` : ""}. تعتمدها الإدارة أو تلغيها بقرار مكتوب، ولا تُحتسب نتيجتك قبل ذلك.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SimButton onClick={() => decide("approve")}>محاكاة: تعتمد الإدارة محاولتك</SimButton>
            <SimButton onClick={() => decide("void")}>محاكاة: تلغي الإدارة محاولتك</SimButton>
          </div>
        </div>
      )}

      {st === "voided" && (
        <div className="mt-5 rounded-2xl bg-maroon/6 p-4">
          <p className="font-bold text-maroon">أُلغيت محاولتك</p>
          <p className="mt-1 text-sm leading-7 text-ink-soft">
            {a.decision ? `ألغتها إدارة الامتحانات (${a.decision.by}): «${a.decision.note}».` : "أُلغيت في القاعة."} راجع مشرف القاعة أو إدارة الامتحانات.
          </p>
        </div>
      )}

      {a.decision?.kind === "approve" && <p className="mt-3 text-xs text-hint">اعتمدتها الإدارة ({a.decision.by}): «{a.decision.note}»</p>}
    </Card>
  );
}

function Results() {
  const admin = useAdmin()!;
  const toast = useToast();
  const p = admin.profile!;
  const r = resultOf(p);
  const [stars, setStars] = useState(0);
  const two = r.parts.length > 1;
  const failedIn = r.parts.flatMap((x) => x.sections.filter((s) => !s.passed).map((s) => (two ? `${s.name} (${roleLabelOf(x.role)})` : s.name)));

  const retake = () => {
    for (const x of papersOf(p)) if (x.paper?.hall) hallActions.reset(x.paper.hall);
    actions.upsertAdmin(admin.id, { exam: undefined, exams: undefined });
    logAdmin(admin.id, "إعادة الاختبار المؤتمت (نسخة تجريبية)");
  };

  return (
    <div className="space-y-6">
      {r.published && <Verdict passed={r.passed} failedIn={failedIn} two={two} />}

      <div className={cn("grid gap-6", two && "lg:grid-cols-2")}>
        {r.parts.map((x) => (
          <PartCard key={x.role} part={x} two={two} />
        ))}
      </div>

      {r.published && (
        <Card className="text-center md:p-8">
          <p className="font-bold">هل كانت إجراءات الاختبار ونتيجتك واضحة؟</p>
          <div className="mt-3 flex justify-center">
            <StarRating
              value={stars}
              size="lg"
              onChange={(v) => {
                setStars(v);
                logAdmin(admin.id, "تقييم مرحلة الاختبار المؤتمت", "تجربة الإداري", `${v} من 5`);
                toast({ title: "شكراً لتقييمك", icon: "⭐", tone: "gold" });
              }}
            />
          </div>
        </Card>
      )}

      <div className="flex justify-center">
        <SimButton onClick={retake}><RotateCcw className="size-4" /> إعادة التجربة: الاختبار من بدايته</SimButton>
      </div>
    </div>
  );
}

/**
 * Passed or not, and what comes next for this role: a group head's group is formed at the office; every other role
 * waits for a cluster's head to invite him to his place.
 */
function Verdict({ passed, failedIn, two }: { passed: boolean; failedIn: string[]; two: boolean }) {
  const admin = useAdmin()!;
  const role = admin.profile?.positions[0] ?? "";
  const head = role === "group-head";
  const formation = useOperation("group-formation");
  const clusters = useOperation("cluster-formation");
  const next = head
    ? { href: "/administrator/group", label: "التالي: تشكيل مجموعتك في المكتب", when: rangeLabel(formation.start, formation.end) }
    : { href: "/administrator/cluster", label: "التالي: دعوات التكتلات", when: `يدعوك رؤساء التكتلات إلى مكانك ${rangeLabel(clusters.start, clusters.end)}` };
  const fired = useRef(false);
  useEffect(() => {
    if (!passed || fired.current) return;
    fired.current = true;
    const colors = ["#D9C89E", "#AD9E6E", "#00594F", "#672146"];
    const t1 = setTimeout(() => confetti({ particleCount: 120, spread: 90, origin: { x: 0.2, y: 0.5 }, colors }), 600);
    const t2 = setTimeout(() => confetti({ particleCount: 120, spread: 90, origin: { x: 0.8, y: 0.5 }, colors }), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [passed]);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className={cn("relative overflow-hidden rounded-[2rem] p-7 text-white shadow-2xl md:p-10", passed ? "bg-gradient-to-br from-green-dark via-green to-maroon" : "bg-ink")}>
      <div className="bg-pattern absolute inset-0 opacity-15" />
      {passed && <motion.div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-gold/25 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 5, repeat: Infinity }} />}
      <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <motion.div initial={{ rotate: -120, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", damping: 11, delay: 0.2 }} className="mx-auto grid size-32 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-ink shadow-2xl ring-8 ring-white/10">
          <div className="text-center">
            {passed ? <Trophy className="mx-auto size-10" /> : <CircleX className="mx-auto size-10" />}
            <p className="mt-1 font-display text-xl font-bold">{passed ? "ناجح" : "راسب"}</p>
          </div>
        </motion.div>
        <div>
          <p className="text-sm text-gold">نتيجة الاختبار المؤتمت — موسم 1448</p>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">{passed ? "تهانينا، اجتزت الاختبار المؤتمت!" : "لم تجتز الاختبار المؤتمت هذا الموسم"}</h2>
          <p className="mt-2 leading-8 text-white/80">
            {passed
              ? `اجتزت كل أقسام ${two ? "الاختبارين" : "الاختبار"} بالنسبة المطلوبة فيها، واسمك في قائمة الناجحين لصفة «${positionLabelOf(role)}».`
              : `لم تبلغ النسبة المطلوبة في: ${failedIn.join("، ")}. النجاح باجتياز كل قسم، ويبقى سجلك مرجعاً في أي تأهيل لاحق.`}
          </p>
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
