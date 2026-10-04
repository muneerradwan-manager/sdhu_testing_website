"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, DoorClosed, DoorOpen, Hourglass, IdCard, Lock, PenLine, Play, Square, UserCheck, UserX, UsersRound } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { typeOf } from "@/lib/data/admin-exam";
import { cn, maskNationalId } from "@/lib/utils";
import { APPLIED_ROLES } from "@/app/administrator/_lib/admin";
import { useAllQuestions, useBlueprints, useExamBank } from "@/app/administrator/_lib/admin-rules";
import { centerOf, hallActions, mustSit, roleKeyOf, runKey, STAGE_LABEL, stageOf, useHalls, type ExamCenter, type HallStage } from "@/app/administrator/_lib/halls";
import { useAdminRows, type AdminRow } from "../_components/data";
import { Empty, Kpi, PageHeader, Panel, fmtTime, logAs, useNow, useStaffUser } from "../_components/kit";

const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/50",
  gold: "bg-gold/20 text-gold ring-gold/40",
  maroon: "bg-maroon text-white ring-maroon-light",
  muted: "bg-white/10 text-white/70 ring-white/15",
} as const;

function Chip({ tone = "green", children }: { tone?: keyof typeof CHIP; children: ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", CHIP[tone])}>{children}</span>;
}

const STAGE_TONE: Record<HallStage, keyof typeof CHIP> = { idle: "muted", open: "gold", running: "green", ended: "gold", closed: "muted" };

/**
 * The hall supervisor's page. The exam desk assigns a staff account to a centre's hall, and the page
 * appears in that account's menu whatever its permissions. Every role sits on its own day; for each
 * sitting the supervisor opens the hall, confirms each applicant who opened his account there against
 * his identity card, starts the exam for all of them at once, ends it, and closes the hall.
 */
export function HallView() {
  const user = useStaffUser()!;
  const halls = useHalls();
  const centers = halls.centersOf(user.id);
  if (!centers.length) {
    return (
      <div>
        <PageHeader eyebrow="الامتحان الكتابي" title="قاعتي الامتحانية" icon={<DoorClosed />} description="تظهر هذه الصفحة لمن يسنده قسم الامتحانات مشرفاً على قاعة مركز امتحاني." />
        <Empty icon={<Lock />} title="لست مشرف قاعة في أي مركز" text="يسند قسم الامتحانات مشرفي القاعات من «إدارة الامتحان»، تبويب «المراكز والجلسات»." />
      </div>
    );
  }
  return <Hall centers={centers} />;
}

function Hall({ centers }: { centers: ExamCenter[] }) {
  const halls = useHalls();
  const [centerId, setCenterId] = useState(centers[0].id);
  const center = centers.find((c) => c.id === centerId) ?? centers[0];
  // The sitting to run: the first one of the schedule not closed yet
  const [role, setRole] = useState<string>(() => APPLIED_ROLES.find((r) => stageOf(halls.runs[runKey(r.key, center.id)]) !== "closed")?.key ?? APPLIED_ROLES[0].key);

  return (
    <div>
      <PageHeader
        eyebrow="الامتحان الكتابي — إشراف القاعة"
        title="قاعتي الامتحانية"
        icon={<DoorOpen />}
        description={`${center.name} — ${center.hall}. الامتحان جماعي لكل صفة في يومها: تفتح القاعة، وتؤكد حضور كل متقدم بعد أن يفتح حسابه أمامك وتطابق هويته، ثم تبدأ الامتحان للجميع معاً، وتنهيه، وتغلق القاعة.`}
      />
      {centers.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="المركز">
          {centers.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={c.id === center.id} onClick={() => setCenterId(c.id)} className={cn("rounded-full px-3 py-1.5 text-xs font-bold ring-1", c.id === center.id ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white/80 ring-white/15")}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      <Sessions center={center} role={role} setRole={setRole} />
      <AnimatePresence mode="wait">
        <motion.div key={`${center.id}-${role}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="mt-4">
          <Sitting center={center} role={role} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Who sits a sitting in a centre: those who must, and anyone already in its run */
function useSitters(center: ExamCenter, role: string) {
  const rows = useAdminRows();
  const halls = useHalls();
  const key = runKey(role, center.id);
  const run = halls.runs[key];
  return useMemo(
    () =>
      rows.filter(
        (r) =>
          (roleKeyOf(r.profile.positions[0] ?? r.position) === role && centerOf(r.id, halls.moved)?.id === center.id && mustSit(r.profile, key)) ||
          !!run?.joined[r.id] ||
          !!run?.present[r.id],
      ),
    [rows, halls.moved, center.id, role, key, run],
  );
}

function Sessions({ center, role, setRole }: { center: ExamCenter; role: string; setRole: (r: string) => void }) {
  const halls = useHalls();
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" role="radiogroup" aria-label="جلسة الامتحان">
      {APPLIED_ROLES.map((r) => {
        const stage = stageOf(halls.runs[runKey(r.key, center.id)]);
        const s = halls.sessions[r.key];
        const on = r.key === role;
        return (
          <button
            key={r.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setRole(r.key)}
            className={cn("rounded-2xl p-3 text-right ring-1 transition", on ? "bg-gold/20 ring-gold" : "bg-white/[.06] ring-white/10 hover:bg-white/10")}
          >
            <p className="font-bold text-white">امتحان {r.label}</p>
            <p className="text-xs text-white/65">
              {s?.date} — {s?.time}
            </p>
            <p className="mt-2">
              <Chip tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage]}</Chip>
            </p>
          </button>
        );
      })}
    </div>
  );
}

const STEPS: { stage: HallStage; label: string; icon: ReactNode }[] = [
  { stage: "idle", label: "فتح القاعة", icon: <DoorOpen className="size-4" /> },
  { stage: "open", label: "بدء الامتحان", icon: <Play className="size-4" /> },
  { stage: "running", label: "إنهاء الامتحان", icon: <Square className="size-4" /> },
  { stage: "ended", label: "إغلاق القاعة", icon: <DoorClosed className="size-4" /> },
];

function Sitting({ center, role }: { center: ExamCenter; role: string }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const halls = useHalls();
  const bank = useExamBank();
  const all = useAllQuestions();
  const blueprint = useBlueprints()[role];
  const now = useNow(1000);
  const key = runKey(role, center.id);
  const run = halls.runs[key];
  const stage = stageOf(run);
  const sitters = useSitters(center, role);
  const label = APPLIED_ROLES.find((r) => r.key === role)!.label;
  const target = `${center.name} — امتحان ${label}`;
  const [confirmEnd, setConfirmEnd] = useState(false);
  const types = useMemo(() => new Map(all.map((q) => [q.id, typeOf(q)])), [all]);

  const joined = sitters.filter((r) => run?.joined[r.id]);
  const present = sitters.filter((r) => run?.present[r.id]);
  const sent = sitters.filter((r) => r.profile.exam?.submittedAt && r.profile.exam.hall === key);
  const absent = stage === "closed" || stage === "ended" ? sitters.filter((r) => !run?.present[r.id]) : [];
  const minutes = blueprint?.minutes ?? 25;
  const left = run?.startedAt ? Math.max(0, minutes * 60_000 - (now - run.startedAt)) : 0;

  const step = (action: string, detail: string | undefined, f: () => void, toastTitle: string) => {
    f();
    logAs(user, { action, target, detail });
    toast({ title: toastTitle, body: target, tone: "success", icon: "🏛️" });
  };

  const run1 = () => {
    if (stage === "idle") step("فتح القاعة الامتحانية", `${sitters.length} متقدمين متوقعين`, () => hallActions.open(key, user.name), "فُتحت القاعة");
    else if (stage === "open") {
      if (!present.length) {
        toast({ title: "لا حاضرين بعد", body: "أكّد حضور متقدم واحد على الأقل قبل البدء.", tone: "warning", icon: "🪪" });
        return;
      }
      step("بدء الامتحان في القاعة", `${present.length} حاضرين — ${minutes} دقيقة`, () => hallActions.start(key, { bank, blueprint }), "بدأ الامتحان للجميع");
    } else if (stage === "running") {
      if (!confirmEnd) {
        setConfirmEnd(true);
        return;
      }
      setConfirmEnd(false);
      step("إنهاء الامتحان في القاعة", `أُرسلت كل الأوراق — ${present.length} حاضرين`, () => hallActions.end(key, all), "انتهى الامتحان، وأُرسلت الأوراق");
    } else if (stage === "ended") step("إغلاق القاعة الامتحانية", `${present.length} حاضرين، ${absent.length} غائبين`, () => hallActions.close(key), "أُغلقت القاعة");
  };

  const confirm = (r: AdminRow) => {
    hallActions.confirm(key, r.id, { bank, blueprint });
    logAs(user, { action: "تأكيد حضور متقدم في القاعة", target: r.name, detail: `${target} — طابق الهوية ${maskNationalId(r.id)}${stage === "running" ? " — دخل بعد البدء بالوقت المتبقي" : ""}` });
    toast({ title: `تأكد حضور ${r.name.split(" ")[0]}`, body: stage === "running" ? "تُفتح له الورقة بالوقت المتبقي." : "يبدأ مع الجميع.", tone: "success", icon: "🪪" });
  };

  const current = STEPS.findIndex((s) => s.stage === stage);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="المتوقعون" value={sitters.length} icon={<UsersRound />} hint={`امتحان ${label} — ${center.name}`} />
        <Kpi label="دخلوا حساباتهم" value={joined.length} icon={<IdCard />} tone="gold" delay={0.05} pulse={joined.length > present.length && stage !== "closed"} hint={joined.length > present.length ? `${joined.length - present.length} بانتظار تأكيدك` : "لا أحد ينتظر"} />
        <Kpi label="الحاضرون" value={present.length} icon={<UserCheck />} tone="teal" delay={0.1} />
        <Kpi label={stage === "closed" ? "الغائبون" : "سلّموا"} value={stage === "closed" ? absent.length : sent.length} icon={stage === "closed" ? <UserX /> : <CheckCircle2 />} tone="maroon" delay={0.15} />
      </div>

      <Panel
        icon={<DoorOpen />}
        title={`جلسة امتحان ${label}`}
        action={<Chip tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage]}</Chip>}
      >
        <ol className="grid gap-2 sm:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.stage} className={cn("flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold ring-1", i < current || stage === "closed" ? "bg-green-light/20 text-white ring-green-light/40" : i === current ? "bg-gold/20 text-gold ring-gold/50" : "text-white/40 ring-white/10")}>
              {i < current || stage === "closed" ? <CheckCircle2 className="size-4" /> : s.icon} {s.label}
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {stage !== "closed" && (
            <Button variant={stage === "running" ? "maroon" : "gold"} onClick={run1}>
              {STEPS[current].icon} {stage === "running" && confirmEnd ? "تأكيد الإنهاء: تُرسل كل الأوراق كما هي" : STEPS[current].label}
            </Button>
          )}
          {confirmEnd && (
            <Button variant="ghost" className="text-white" onClick={() => setConfirmEnd(false)}>
              تراجع
            </Button>
          )}
          {stage === "running" && (
            <span className={cn("flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-lg font-bold tabular-nums", left < 2 * 60_000 ? "bg-maroon text-white" : "bg-white/10 text-gold")} dir="ltr" role="timer" aria-label="الوقت المتبقي للقاعة">
              <Hourglass className="size-4" />
              {String(Math.floor(left / 60000)).padStart(2, "0")}:{String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}
            </span>
          )}
          <p className="text-sm text-white/70">
            {stage === "idle" && `افتح القاعة يوم ${halls.sessions[role]?.date} قبل ${halls.sessions[role]?.time} ليفتح المتقدمون حساباتهم فيها.`}
            {stage === "open" && "يفتح كل متقدم حسابه في القاعة فيظهر عندك: طابق هويته ثم أكّد حضوره. حين يحضر الجميع ابدأ الامتحان."}
            {stage === "running" && (left ? `الامتحان جارٍ (${minutes} دقيقة). من يصل متأخراً تؤكد حضوره فيدخل بالوقت المتبقي.` : "انتهى الوقت: أُرسلت الأوراق تلقائياً. أنهِ الامتحان.")}
            {stage === "ended" && "أُرسلت كل الأوراق. أغلق القاعة: من لم يحضر يُسجَّل غائباً."}
            {stage === "closed" && `أُغلقت القاعة ${run?.closedAt ? fmtTime(run.closedAt) : ""}. الحاضرون: ${present.length}، والغائبون: ${absent.length}.`}
          </p>
        </div>
      </Panel>

      <Panel icon={<UsersRound />} title="المتقدمون في القاعة" bodyClass="space-y-2">
        {!sitters.length && <Empty icon={<UsersRound />} title="لا متقدمين لهذه الجلسة في مركزك" text="يظهر هنا كل من دفع رسم التسجيل لصفة هذه الجلسة وتتبع محافظة قيده مركزك، أو نقله قسم الامتحانات إليه." />}
        {sitters.map((r) => {
          const e = r.profile.exam?.hall === key ? r.profile.exam : undefined;
          const isJoined = !!run?.joined[r.id];
          const isPresent = !!run?.present[r.id];
          const ids = e?.paper?.flatMap((s) => s.ids) ?? [];
          const answered = ids.filter((id) => (types.get(id) === "written" ? String(e?.answers[id] ?? "").trim() : e?.answers[id] !== undefined)).length;
          const pending = (e?.toGrade ?? []).filter((id) => e?.marks?.[id] === undefined).length;
          let status: ReactNode;
          if (e?.submittedAt) status = <Chip tone="green"><CheckCircle2 className="size-3" /> سلّم — {e.score !== undefined ? `${e.score} من 100` : `مبدئية ${e.provisional}، ${pending} تحريري للتصحيح`}</Chip>;
          else if (e) status = <Chip tone="gold"><PenLine className="size-3" /> يجيب — {answered} من {ids.length}</Chip>;
          else if (isPresent) status = <Chip tone="green"><UserCheck className="size-3" /> حاضر</Chip>;
          else if (isJoined && stage !== "ended" && stage !== "closed") status = <Chip tone="gold"><IdCard className="size-3" /> دخل حسابه — بانتظار التأكيد</Chip>;
          else if (stage === "ended" || stage === "closed") status = <Chip tone="maroon"><UserX className="size-3" /> غائب</Chip>;
          else status = <Chip tone="muted">لم يدخل بعد</Chip>;
          return (
            <motion.div key={r.id} layout className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/20 font-display font-bold text-gold ring-1 ring-gold/40">{r.name.replace("الشيخ ", "")[0]}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white">{r.name}</p>
                <p className="text-xs text-white/70">
                  الرقم الوطني <span dir="ltr">{maskNationalId(r.id)}</span>
                  {run?.joined[r.id] && ` · فتح حسابه ${fmtTime(run.joined[r.id])}`}
                </p>
              </div>
              {status}
              {isJoined && !isPresent && (stage === "open" || stage === "running") && (
                <Button size="sm" variant="gold" onClick={() => confirm(r)}>
                  <IdCard className="size-4" /> طابقت الهوية — تأكيد الحضور
                </Button>
              )}
            </motion.div>
          );
        })}
      </Panel>
    </div>
  );
}
