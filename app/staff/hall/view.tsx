"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronLeft,
  ClipboardCheck,
  Copy,
  DoorClosed,
  DoorOpen,
  FlaskConical,
  Hourglass,
  Inbox,
  KeyRound,
  Lock,
  MonitorPlay,
  PenLine,
  Play,
  RotateCcw,
  ScanBarcode,
  ShieldCheck,
  Smartphone,
  Square,
  TriangleAlert,
  UserCheck,
  UsersRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { PAIRING, type ExamQuestion } from "@/lib/data/admin-exam";
import { dayTimeLabel } from "@/lib/operations";
import { getState, setState, type Attempt, type AttemptAlerts, type AttemptStatus } from "@/lib/store";
import { asset, cn, maskNationalId } from "@/lib/utils";
import { adminName, paperOf, paperPatch } from "@/app/administrator/_lib/admin";
import { useExamBank } from "@/app/administrator/_lib/admin-rules";
import {
  ATTEMPT_LABEL,
  DEFAULT_PINS,
  STAGE_LABEL,
  WINDOW_LABEL,
  alertsOf,
  barcodeOf,
  hallActions,
  isOpen,
  openWindow,
  runKey,
  scheduledAt,
  sourceOf,
  stageOf,
  statusOf,
  targets,
  useDemoNow,
  useHalls,
  whoIs,
  type ExamCenter,
  type ExamDef,
  type HallStage,
} from "@/app/administrator/_lib/halls";
import { useExamDesk, type AttemptRow } from "../exam/_components/desk";
import type { AdminRow } from "../_components/data";
import { Empty, Kpi, PageHeader, Panel, Tabs, fmtTime, logAs, smallInputClass, textareaClass, useNow, useStaffUser } from "../_components/kit";
import { SearchBox } from "../_components/ops-ui";

const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/50",
  gold: "bg-gold/20 text-gold ring-gold/40",
  maroon: "bg-maroon text-white ring-maroon-light",
  muted: "bg-white/10 text-white/70 ring-white/15",
} as const;

function Chip({ tone = "green", children }: { tone?: keyof typeof CHIP; children: ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 [&_svg]:size-3.5", CHIP[tone])}>{children}</span>;
}

const STAGE_TONE: Record<HallStage, keyof typeof CHIP> = { idle: "muted", open: "gold", running: "green", closed: "muted" };
const WINDOW_TONE: Record<ReturnType<typeof openWindow>, keyof typeof CHIP> = { none: "muted", upcoming: "muted", today: "gold", now: "green", late: "maroon" };
const ATTEMPT_TONE: Record<AttemptStatus, keyof typeof CHIP> = { ready: "muted", active: "gold", submitted: "gold", confirmed: "green", unconfirmed: "maroon", voided: "maroon" };
/** What needs him first: submissions to confirm, then those answering, then the rest */
const ATTEMPT_ORDER: AttemptStatus[] = ["submitted", "active", "ready", "unconfirmed", "confirmed", "voided"];
const VIA: Record<NonNullable<Attempt["confirmVia"]>, string> = { pin: "بالـ PIN على جهازه", panel: "من لوحة المشرف", batch: "تأكيد جماعي", auto: "تلقائياً (بلا PIN)", decision: "بقرار الإدارة" };
/** Submissions stay open to his confirmation this long after the sitting closed, as on the applicant's device */
const CONFIRM_AFTER_CLOSE = 3 * 3_600_000;
const DARK_MODAL = "max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white";

/** «09:41» — hours only when there are some */
function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(s / 3600);
  return h ? `${h}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}` : `${p(Math.floor(s / 60))}:${p(s % 60)}`;
}

const whenOf = (e: ExamDef) => dayTimeLabel(e.day, e.time) || `${e.date} — ${e.time}`;

/** The device's signals on an attempt, as the platform names them («إشارات آلية تدعم القرار وليست إثباتاً») */
function alertLabels(a: Attempt) {
  const x: AttemptAlerts = a.alerts ?? {};
  return [
    a.autoSubmitted && "تسليم تلقائي",
    x.disconnected && "انقطاع اتصال",
    x.ipChanged && "تغيّر IP",
    x.deviceChanged && "تغيّر جهاز",
    !!x.focusLost && `فقدان تركيز ×${x.focusLost}`,
    !!x.screenshots && `لقطة شاشة ×${x.screenshots}`,
    !!x.reentries && `استئناف ×${x.reentries}`,
  ].filter((t): t is string => typeof t === "string");
}

/** Confirmed in a batch only when the device raised nothing: no signal, and not sent by the platform at the end */
const isClean = (a: Attempt) => alertsOf(a) === 0 && !a.autoSubmitted;

const noSubscribe = () => () => {};
function useOrigin() {
  return useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
}

/**
 * The hall supervisor's panel («لوحة مشرف القاعة»), as the administration's exam platform runs it. The exam system's
 * owner makes a staff account a hall's supervisor, and this page appears in its menu whatever its permissions. He sees
 * the sittings of his halls — one test in one hall at its time — and runs each one: he opens the hall from inside it
 * (its network recorded), checks every applicant in by his barcode or national id, approves each device's entry by
 * matching the pairing code on its screen, starts the test (each one's time from his own entry), follows the attempts
 * and their signals, confirms every submission — usually with his PIN on the applicant's device — and ends the sitting.
 */
export function HallView() {
  const user = useStaffUser()!;
  const halls = useHalls();
  const centers = halls.centersOf(user.id);
  if (!centers.length) {
    return (
      <div>
        <PageHeader eyebrow="الاختبار المؤتمت" title="قاعتي الامتحانية" icon={<DoorClosed />} description="تظهر هذه الصفحة لمن يسنده صاحب صلاحية «إدارة الامتحانات» مشرفاً على قاعة." />
        <Empty icon={<Lock />} title="لست مشرف قاعة في أي قاعة" text="يسند صاحب صلاحية «إدارة الامتحانات» مشرف كل قاعة من «القاعات والمحافظات»." />
      </div>
    );
  }
  return <Hall centers={centers} />;
}

type SittingRef = { center: ExamCenter; exam: ExamDef; key: string };

/** His sittings in the order he works them: open or running, then those he can open now, later today, coming, past their time, ended */
const WINDOW_RANK: Record<ReturnType<typeof openWindow>, number> = { now: 1, today: 2, upcoming: 3, none: 4, late: 5 };

function Hall({ centers }: { centers: ExamCenter[] }) {
  const halls = useHalls();
  const demoNow = useDemoNow();
  const rank = (s: SittingRef) => {
    const stage = stageOf(halls.runs[s.key]);
    return stage === "open" || stage === "running" ? 0 : stage === "closed" ? 6 : WINDOW_RANK[openWindow(scheduledAt(s.exam), demoNow)];
  };
  // His sittings in a hall: every published test sat there, and any test already sat there (its record stays)
  const sittingsOf = (c: ExamCenter): SittingRef[] =>
    halls.exams
      .filter((e) => targets(e, c.id) && (isOpen(e) || !!halls.runs[runKey(e.id, c.id)]?.openedAt))
      .map((e) => ({ center: c, exam: e, key: runKey(e.id, c.id) }))
      .sort((a, b) => rank(a) - rank(b) || (scheduledAt(a.exam) ?? Number.MAX_SAFE_INTEGER) - (scheduledAt(b.exam) ?? Number.MAX_SAFE_INTEGER));
  const liveIn = (list: SittingRef[]) => list.find((s) => ["open", "running"].includes(stageOf(halls.runs[s.key])))?.key;
  const [centerId, setCenterId] = useState(() => centers.find((c) => liveIn(sittingsOf(c)))?.id ?? centers[0].id);
  const center = centers.find((c) => c.id === centerId) ?? centers[0];
  const items = sittingsOf(center);
  // A sitting already open or running opens straight away: he is in the middle of it
  const [openKey, setOpenKey] = useState<string | null>(() => liveIn(items) ?? null);
  const current = items.find((s) => s.key === openKey);

  return (
    <div>
      <PageHeader
        eyebrow="الاختبار المؤتمت — لوحة مشرف القاعة"
        title="قاعتي الامتحانية"
        icon={<DoorOpen />}
        description={`${center.name} — ${center.hall}. الجلسة اختبار في قاعة بموعد: تفتح القاعة، وتسجّل الحضور، وتوافق على دخول كل جهاز بمطابقة رمزه، وتبدأ الاختبار، وتؤكد كل تسليم، ثم تنهي الجلسة.`}
      />
      {centers.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="القاعة">
          {centers.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={c.id === center.id}
              onClick={() => {
                setCenterId(c.id);
                setOpenKey(null);
              }}
              className={cn("rounded-full px-3 py-1.5 text-xs font-bold ring-1", c.id === center.id ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white/80 ring-white/15")}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      <AnimatePresence mode="wait">
        {current ? (
          <motion.div key={current.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            <SittingPage center={current.center} exam={current.exam} onBack={() => setOpenKey(null)} />
          </motion.div>
        ) : (
          <motion.div key={`list-${center.id}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="space-y-4">
            <Sittings items={items} onOpen={setOpenKey} />
            <PinCard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Sittings({ items, onOpen }: { items: SittingRef[]; onOpen: (key: string) => void }) {
  const halls = useHalls();
  const demoNow = useDemoNow();
  return (
    <Panel icon={<CalendarClock />} title="جلساتي">
      <p className="-mt-2 mb-4 text-sm text-white/70">اختر الجلسة المسندة إليك لإدارتها.</p>
      {!items.length ? (
        <Empty icon={<CalendarClock />} title="لا توجد جلسات اختبار مسندة إليك." text="تظهر هنا جلسة كل اختبار منشور في قاعتك حين ينشره صاحب صلاحية «إدارة الامتحانات»." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map(({ exam, center, key }) => {
            const run = halls.runs[key];
            const stage = stageOf(run);
            const win = openWindow(scheduledAt(exam), demoNow);
            const pending = Object.keys(run?.requests ?? {}).length;
            return (
              <motion.button
                key={key}
                type="button"
                onClick={() => onOpen(key)}
                whileHover={{ y: -2 }}
                className={cn("rounded-2xl p-4 text-right ring-1 transition hover:bg-white/10", stage === "open" || stage === "running" ? "bg-gold/15 ring-gold/60" : "bg-white/[.06] ring-white/10")}
              >
                <p className="font-bold text-white">{exam.name}</p>
                <p className="mt-1 text-xs text-white/70">
                  {center.name} — {center.hall}
                </p>
                <p className="mt-1 text-xs text-white/70">
                  {whenOf(exam)} · {exam.minutes} دقيقة
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage]}</Chip>
                  {stage === "idle" && <Chip tone={WINDOW_TONE[win]}>{WINDOW_LABEL[win]}</Chip>}
                  {pending > 0 && <Chip tone="maroon">{pending} طلبات دخول معلّقة</Chip>}
                </div>
                <p className="mt-3 flex items-center gap-1 text-sm font-bold text-gold">
                  إدارة الجلسة <ChevronLeft className="size-4" />
                </p>
              </motion.button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ───────────────────────── One sitting ─────────────────────────

/** Someone in a sitting: listed for it, or already in its run (present, asking to enter, or with an attempt there) */
type Sitter = { id: string; name: string; row?: AdminRow; attempt?: AttemptRow };

/**
 * Who a sitting lists: whoever still has this test's role to sit in this hall and is expected at this test (a closed
 * sitting keeps its absentees though they now wait for a make-up), and anyone already checked in, asking to enter,
 * paired or with an attempt there.
 */
function useSitting(center: ExamCenter, exam: ExamDef) {
  const desk = useExamDesk();
  const halls = useHalls();
  const key = runKey(exam.id, center.id);
  const run = halls.runs[key];
  const stage = stageOf(run);
  const attempts = desk.attempts.filter((a) => a.key === key);
  const byId = new Map(desk.rows.map((r) => [r.id, r]));
  const ids = new Set<string>();
  for (const a of desk.applicants) if (a.center?.id === center.id && a.role === exam.role && (a.sitting?.exam.id === exam.id || stage === "closed")) ids.add(a.row.id);
  for (const id of [...Object.keys(run?.present ?? {}), ...Object.keys(run?.requests ?? {}), ...Object.keys(run?.paired ?? {}), ...attempts.map((a) => a.row.id)]) ids.add(id);
  const sitters: Sitter[] = [...ids]
    .map((id) => ({ id, name: byId.get(id)?.name ?? adminName(id), row: byId.get(id), attempt: attempts.find((a) => a.row.id === id) }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const by = (st: AttemptStatus) => attempts.filter((a) => a.status === st).length;
  const present = Object.keys(run?.present ?? {}).length;
  return {
    key,
    run,
    stage,
    sitters,
    attempts,
    rows: desk.rows,
    counts: {
      listed: sitters.length,
      present,
      absent: sitters.filter((x) => !run?.present[x.id]).length,
      pending: Object.keys(run?.requests ?? {}).length,
      paired: Object.keys(run?.paired ?? {}).length,
      ready: by("ready"),
      active: by("active"),
      submitted: by("submitted"),
      confirmed: by("confirmed"),
      unconfirmed: by("unconfirmed"),
      voided: by("voided"),
    },
  };
}

type SittingData = ReturnType<typeof useSitting>;
type Tab = "attendance" | "requests" | "monitor";

function SittingPage({ center, exam, onBack }: { center: ExamCenter; exam: ExamDef; onBack: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const halls = useHalls();
  const bank = useExamBank();
  const demoNow = useDemoNow();
  const s = useSitting(center, exam);
  const { key, run, stage, counts } = s;
  const pin = halls.pins[user.id];
  const target = `${exam.name} — ${center.name}`;
  const [tab, setTab] = useState<Tab>(stage === "running" ? "monitor" : "attendance");
  const [ask, setAsk] = useState<null | "open" | "start" | "end" | "network" | "mobile">(null);
  const [net, setNet] = useState("");
  const win = openWindow(scheduledAt(exam), demoNow);
  const outside = win !== "now";
  const close = () => setAsk(null);
  const log = (action: string, detail?: string) => logAs(user, { action, target, detail, system: "exams", area: "sittings", ref: key });

  const open = (reason: string) => {
    hallActions.open(key, user.name, outside ? reason : undefined);
    log("فتح قاعة", outside ? `خارج موعدها (${WINDOW_LABEL[win]}) — ${reason}` : `${counts.listed} مدرجين`);
    toast({ title: "فُتحت القاعة", body: "سجّل حضور المتقدمين، ثم وافق على طلبات دخول أجهزتهم.", tone: "success", icon: "🚪" });
    setTab("attendance");
  };
  const start = () => {
    hallActions.start(key);
    log("بدء اختبار", `${counts.ready} مقترنين — ${exam.minutes} دقيقة لكل منهم من لحظة دخوله`);
    toast({ title: "بدأ الاختبار", body: "بدأ المقترنون الآن، ومن يدخل لاحقاً يبدأ وقته من دخوله.", tone: "success", icon: "▶️" });
    setTab("monitor");
  };
  const end = () => {
    hallActions.end(key, bank, () => pin);
    log("إنهاء جلسة", `${counts.present} حاضرين، ${counts.absent} غائبين — سُلّم تلقائياً ${counts.active}، وأُلغي ${counts.ready}`);
    toast({ title: "انتهت الجلسة وأُغلقت القاعة", body: target, tone: "success", icon: "🏁" });
  };
  const pickNetwork = () => {
    // The demo's «current network»: the address the supervisor's device is on as he records it
    setNet(`10.48.${12 + Math.floor(Math.random() * 40)}.0/24`);
    setAsk("network");
  };

  const closedAt = run?.closedAt ?? run?.endedAt;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-gold hover:text-white">
        <ArrowRight className="size-4" /> كل جلساتي
      </button>

      <Panel icon={<DoorOpen />} title={exam.name} action={<Chip tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage]}</Chip>}>
        <p className="text-sm text-white/75">
          {center.name} — {center.hall} · {whenOf(exam)} · المدة {exam.minutes} دقيقة
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip tone={run?.network ? "green" : "muted"}>
            {run?.network ? <Wifi /> : <WifiOff />}
            {run?.network ? (
              <>
                شبكة القاعة محددة <span dir="ltr">{run.network}</span>
              </>
            ) : (
              "شبكة القاعة غير محددة"
            )}
          </Chip>
          {run?.mobileData && (
            <Chip tone="gold">
              <Smartphone /> بيانات الجوال مسموحة
            </Chip>
          )}
          <Chip tone={pin ? "green" : "maroon"}>
            <KeyRound /> {pin ? "PIN التأكيد مضبوط" : "بلا PIN — التأكيد تلقائي"}
          </Chip>
          <Chip tone="muted">الدخول: {PAIRING[exam.pairing].label}</Chip>
          {stage === "idle" && (
            <Chip tone={WINDOW_TONE[win]}>
              <CalendarClock /> {WINDOW_LABEL[win]}
            </Chip>
          )}
        </div>
        {run?.openedAt && (
          <p className="mt-3 text-xs leading-6 text-white/65">
            فُتحت {fmtTime(run.openedAt)}
            {run.openedBy && ` بيد ${run.openedBy}`}
            {run.openedReason && ` — خارج موعدها: ${run.openedReason}`}
            {run.startedAt && ` · بدأ الاختبار ${fmtTime(run.startedAt)}`}
            {closedAt && ` · انتهت ${fmtTime(closedAt)}`}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {stage === "idle" && (
            <Button variant="gold" onClick={() => setAsk("open")}>
              <DoorOpen className="size-4" /> فتح القاعة
            </Button>
          )}
          {stage === "open" && (
            <Button variant="gold" onClick={() => setAsk("start")}>
              <Play className="size-4" /> بدء الاختبار
            </Button>
          )}
          {stage === "running" && (
            <Button variant="maroon" onClick={() => setAsk("end")}>
              <Square className="size-4" /> إنهاء الاختبار وإغلاق القاعة
            </Button>
          )}
          {(stage === "open" || stage === "running") && (
            <>
              <Button variant="glass" size="sm" onClick={pickNetwork}>
                <Wifi className="size-4" /> تحديد شبكة القاعة
              </Button>
              {!run?.mobileData && (
                <Button variant="glass" size="sm" onClick={() => setAsk("mobile")}>
                  <Smartphone className="size-4" /> السماح ببيانات الجوال (طوارئ)
                </Button>
              )}
            </>
          )}
          {stage === "running" && run?.startedAt && <TimeLeft startedAt={run.startedAt} minutes={exam.minutes} />}
        </div>
        <p className="mt-3 text-sm leading-7 text-white/70">
          {stage === "idle" && (outside ? `تُفتح القاعة من ساعة قبل موعدها حتى نهاية يومها${win === "late" ? "، وقد فات موعدها" : ""}: خارج ذلك تكتب سبب الفتح.` : "يمكنك فتح القاعة الآن، من داخلها وعلى شبكتها.")}
          {stage === "open" && "سجّل حضور كل متقدم بالباركود أو الرقم الوطني، ثم يطلب الدخول من جهازه فتطابق رمز الاقتران على شاشته وتوافق. حين لا يبقى طلب معلّق ابدأ الاختبار."}
          {stage === "running" && "الاختبار جارٍ، ووقت كل متقدم من لحظة دخوله: من يصل متأخراً تسجّل حضوره وتوافق على طلبه فيدخل بوقته كاملاً. أكّد كل تسليم بكتابة الـ PIN على جهاز صاحبه."}
          {stage === "closed" && `انتهت الجلسة: حضر ${counts.present} وغاب ${counts.absent}. المؤكَّدة ${counts.confirmed}، وبانتظار التأكيد ${counts.submitted}، وغير المؤكَّدة ${counts.unconfirmed}، والملغاة ${counts.voided}.`}
        </p>
        {stage === "closed" && (
          <Sim className="mt-3" onClick={() => hallActions.reset(key)}>
            <RotateCcw className="size-4" /> إعادة التجربة: الجلسة من بدايتها
          </Sim>
        )}
      </Panel>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi label="مدرجون" value={counts.listed} icon={<UsersRound />} />
        <Kpi label="حاضرون" value={counts.present} icon={<UserCheck />} tone="teal" delay={0.04} />
        <Kpi label="طلبات معلّقة" value={counts.pending} icon={<Inbox />} tone="gold" delay={0.08} pulse={counts.pending > 0} />
        <Kpi label="يختبرون" value={counts.active} icon={<PenLine />} tone="teal" delay={0.12} />
        <Kpi label="بانتظار التأكيد" value={counts.submitted} icon={<Hourglass />} tone="gold" delay={0.16} pulse={counts.submitted > 0} />
        <Kpi label="مؤكَّدون" value={counts.confirmed} icon={<ShieldCheck />} delay={0.2} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={<MonitorPlay />} title="الروابط" bodyClass="space-y-2">
          <CopyLink icon={<MonitorPlay />} label="شاشة عرض القاعة" hint="افتحها على شاشة القاعة أو جهاز العرض: رمز الدخول قبل البدء، ثم التعليمات والوقت." path={`/exam-display/${halls.displayOf(center)}`} />
          <CopyLink icon={<Smartphone />} label="رابط دخول المتقدمين" hint="يفتحه المتقدم على جهازه (أو يمسح رمزه من الشاشة) ويُدخل رقمه الوطني." path="/administrator/exam" />
        </Panel>
        <PinCard refKey={key} />
      </div>

      <Tabs
        id={`hall-${key}`}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "attendance", label: "الحضور", count: counts.present },
          { value: "requests", label: "طلبات الدخول", count: counts.pending },
          { value: "monitor", label: "المراقبة والتأكيد", count: counts.submitted },
        ]}
      />
      {tab === "attendance" && <Attendance s={s} exam={exam} center={center} />}
      {tab === "requests" && <Requests s={s} exam={exam} center={center} />}
      {tab === "monitor" && <Monitor s={s} exam={exam} center={center} />}

      <Ask open={ask === "open"} onClose={close} eyebrow={outside ? "فتح القاعة خارج موعدها" : "فتح القاعة"} title={target} reason={outside ? "required" : undefined} confirm="فتح القاعة" onConfirm={open}>
        <p>سيُسجَّل عنوان شبكتك الحالية كشبكة القاعة. نفّذ هذا من داخل القاعة وعلى شبكتها. بعد الفتح تبدأ بتسجيل الحضور واستقبال طلبات الدخول.</p>
        {outside && (
          <Warn>
            موعد الجلسة {whenOf(exam)} — {WINDOW_LABEL[win]}. تُفتح القاعة من ساعة قبل موعدها حتى نهاية يومها؛ خارج ذلك اكتب سبب الفتح، ويُسجَّل في سجل التدقيق.
          </Warn>
        )}
      </Ask>

      <Ask open={ask === "start"} onClose={close} eyebrow="بدء الاختبار" title={target} confirm="بدء الاختبار" disabled={counts.pending > 0} onConfirm={start}>
        <Stats
          items={[
            ["مدرجون", counts.listed],
            ["حاضرون", counts.present],
            ["غائبون", counts.absent],
            ["دخلوا", counts.paired],
            ["طلبات معلّقة", counts.pending],
          ]}
        />
        {counts.pending > 0 ? <Warn>توجد طلبات دخول معلّقة. عالجها (وافق أو ارفض) قبل بدء الاختبار.</Warn> : <p>بعد البدء يبدأ المقترنون الاختبار فوراً ويُحتسب الوقت لكل منهم من لحظة دخوله.</p>}
      </Ask>

      <Ask open={ask === "end"} onClose={close} eyebrow="إنهاء الاختبار وإغلاق القاعة" title={target} tone="maroon" confirm="إنهاء الجلسة نهائياً" onConfirm={end}>
        <Stats
          items={[
            ["يختبرون الآن", counts.active],
            ["مقترنون لم يبدؤوا", counts.ready],
            ["غائبون", counts.absent],
            ["بانتظار التأكيد", counts.submitted],
          ]}
        />
        <p>
          {counts.active
            ? `${counts.active} ما زالوا يجيبون: تُسلَّم محاولاتهم تلقائياً${pin ? " وتبقى بانتظار تأكيدك" : "، وتُؤكَّد تلقائياً لأنك بلا PIN"}.`
            : "لا أحد يجيب الآن."}
        </p>
        <p>المقترنون الذين لم يبدؤوا تُلغى محاولاتهم، والغائبون يُسجَّلون غياباً. لا يمكن التراجع.</p>
      </Ask>

      <Ask
        open={ask === "network"}
        onClose={close}
        eyebrow="تحديد شبكة القاعة"
        title={target}
        confirm="تسجيلها شبكة القاعة"
        onConfirm={() => {
          hallActions.setNetwork(key, net);
          log("تحديد شبكة القاعة", `${run?.network ?? "—"} ← ${net}`);
          toast({ title: "سُجّلت شبكة القاعة", body: net, tone: "success", icon: "📶" });
        }}
      >
        <p>
          سيُسجَّل عنوان شبكتك الحالية <b dir="ltr">{net}</b> كشبكة القاعة{run?.network ? <> بدل <span dir="ltr">{run.network}</span></> : null}. نفّذه من داخل القاعة وعلى شبكتها، حين تتغير شبكتها أو يُعاد تشغيل موجّهها: طلبات الدخول من غيرها تُعدّ «من خارج شبكة القاعة».
        </p>
      </Ask>

      <Ask
        open={ask === "mobile"}
        onClose={close}
        eyebrow="السماح ببيانات الجوال (طوارئ)"
        title={target}
        confirm="السماح ببيانات الجوال"
        onConfirm={() => {
          hallActions.allowMobileData(key);
          log("سماح ببيانات الجوال", "تعطّلت شبكة القاعة");
          toast({ title: "سُمح ببيانات الجوال", body: "حتى نهاية الجلسة.", tone: "warning", icon: "📱" });
        }}
      >
        <p>للطوارئ حين تتعطل شبكة القاعة: تُقبل طلبات الدخول من بيانات جوالات المتقدمين حتى نهاية الجلسة، وتبقى موافقتك على كل طلب. يُسجَّل ذلك في سجل التدقيق.</p>
      </Ask>
    </div>
  );
}

function TimeLeft({ startedAt, minutes }: { startedAt: number; minutes: number }) {
  const now = useNow(1000);
  const left = startedAt + minutes * 60_000 - now;
  return (
    <span
      role="timer"
      aria-label="الوقت المتبقي من بدء الاختبار"
      className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-lg font-bold tabular-nums", left <= 0 ? "bg-maroon text-white" : left < 5 * 60_000 ? "bg-maroon/70 text-white" : "bg-white/10 text-gold")}
    >
      <Hourglass className="size-4" />
      {left > 0 ? (
        <span className="font-mono" dir="ltr">
          {clock(left)}
        </span>
      ) : (
        "انتهى الوقت"
      )}
    </span>
  );
}

// ───────────────────────── الحضور ─────────────────────────

type ScanMode = "all" | "barcode" | "id";
const SCAN_MODES: { value: ScanMode; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "barcode", label: "الباركود فقط" },
  { value: "id", label: "الرقم الوطني فقط" },
];
const SCAN_TONE = { ok: "bg-green-light/20 text-white ring-green-light/50", warn: "bg-gold/20 text-gold ring-gold/50", bad: "bg-maroon/50 text-white ring-maroon-light" } as const;

function Attendance({ s, exam, center }: { s: SittingData; exam: ExamDef; center: ExamCenter }) {
  const user = useStaffUser()!;
  const input = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<ScanMode>("all");
  const [msg, setMsg] = useState<{ tone: keyof typeof SCAN_TONE; text: string; at: number } | null>(null);
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"all" | "absent" | "present">("all");
  const [undo, setUndo] = useState<Sitter | null>(null);
  const live = s.stage === "open" || s.stage === "running";
  const isPresent = (id: string) => !!s.run?.present[id];
  const where = `${exam.name} — ${center.name}`;
  const log = (action: string, x: Sitter, detail: string) => logAs(user, { action, target: x.name, detail: `${detail} — ${where}`, system: "exams", area: "sittings", ref: s.key });

  const checkIn = (x: Sitter, how: string) => {
    hallActions.checkIn(s.key, x.id);
    log("تسجيل حضور", x, how);
  };

  const scan = () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setCode("");
    input.current?.focus();
    const ids = s.sitters.map((x) => x.id);
    const id = mode === "all" ? whoIs(c, ids) : mode === "barcode" ? ids.find((x) => barcodeOf(x) === c) : ids.find((x) => x === c);
    const at = Date.now();
    if (!id) {
      // Known to the platform but listed for another sitting, or not known at all
      const known = s.rows.find((r) => (mode !== "barcode" && r.id === c) || (mode !== "id" && barcodeOf(r.id) === c));
      setMsg({ tone: "bad", at, text: known ? `«${known.name}» غير مُسند إلى هذه الجلسة.` : mode === "id" || (mode === "all" && /^\d{11}$/.test(c)) ? "رقم وطني غير معروف." : "رقم باركود غير معروف." });
      return;
    }
    const x = s.sitters.find((y) => y.id === id)!;
    if (isPresent(id)) {
      setMsg({ tone: "warn", at, text: `«${x.name}» مسجَّل حاضراً مسبقاً.` });
      return;
    }
    checkIn(x, id === c ? "بالرقم الوطني" : "بالباركود");
    setMsg({ tone: "ok", at, text: `تم تسجيل حضور ${x.name}.` });
  };

  const next = s.sitters.find((x) => !isPresent(x.id) && !x.attempt);
  const needle = q.trim();
  const shown = s.sitters.filter((x) => (show === "all" || (show === "present") === isPresent(x.id)) && (!needle || x.name.includes(needle) || x.id.includes(needle)));
  const locked = (x: Sitter) => (x.attempt ? "له محاولة في هذه الجلسة: لا يُتراجع عن حضوره." : s.run?.requests?.[x.id] ? "له طلب دخول معلّق: ارفضه أولاً." : s.run?.paired?.[x.id] ? "اقترن جهازه بالجلسة: لا يُتراجع عن حضوره." : "");

  return (
    <div className="space-y-4">
      <Panel icon={<ScanBarcode />} title="تسجيل الحضور">
        {live ? (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                scan();
              }}
              className="flex flex-wrap gap-2"
            >
              <input
                ref={input}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="الباركود أو الرقم الوطني"
                aria-label="الباركود أو الرقم الوطني"
                autoFocus
                autoComplete="off"
                dir="ltr"
                className={cn(smallInputClass, "h-14 min-w-[14rem] flex-1 text-center font-mono text-xl tracking-widest placeholder:font-sans placeholder:text-base placeholder:tracking-normal")}
              />
              <Button type="submit" variant="gold" size="lg" disabled={!code.trim()}>
                <UserCheck className="size-5" /> تسجيل
              </Button>
            </form>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-white/70">طريقة المسح</span>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="طريقة المسح">
                {SCAN_MODES.map((m) => (
                  <button key={m.value} type="button" role="radio" aria-checked={mode === m.value} onClick={() => setMode(m.value)} className={cn("rounded-full px-3 py-1 text-xs font-bold ring-1", mode === m.value ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white/80 ring-white/15")}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Replaced at once, never waiting for the last one to fade: the next card is already at the reader */}
            {msg && (
              <motion.p key={msg.at} role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-3 rounded-2xl px-4 py-3 text-base font-bold ring-1", SCAN_TONE[msg.tone])}>
                {msg.text}
              </motion.p>
            )}
            <p className="mt-3 text-xs text-white/55">امسح بطاقة المتقدم بالقارئ، أو اكتب رقمه واضغط Enter. يُطلب الرقم الوطني من بطاقته الشخصية.</p>
            <Sim
              className="mt-3"
              disabled={!next}
              onClick={() => {
                if (!next) return;
                setCode(barcodeOf(next.id));
                input.current?.focus();
              }}
            >
              محاكاة: يمرر المتقدم التالي بطاقته على القارئ
            </Sim>
          </>
        ) : (
          <p className="text-sm text-white/70">{s.stage === "idle" ? "افتح القاعة أولاً: يبدأ تسجيل الحضور بعد فتحها." : "انتهت الجلسة: لا يُسجَّل حضور بعد إغلاق القاعة."}</p>
        )}
      </Panel>

      <Panel
        icon={<UsersRound />}
        title="المدرجون في الجلسة"
        action={
          <span className="text-sm text-white/70">
            {s.counts.present} حاضرون من {s.counts.listed}
          </span>
        }
        bodyClass="space-y-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="ابحث بالاسم أو الرقم الوطني" label="بحث في المدرجين" className="min-w-[14rem] flex-1" />
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="عرض">
            {(
              [
                ["all", "الكل", s.counts.listed],
                ["absent", "لم يحضر", s.counts.absent],
                ["present", "حاضر", s.counts.present],
              ] as const
            ).map(([v, label, n]) => (
              <button key={v} type="button" role="radio" aria-checked={show === v} onClick={() => setShow(v)} className={cn("rounded-full px-3 py-1.5 text-xs font-bold ring-1", show === v ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white/80 ring-white/15")}>
                {label} ({n})
              </button>
            ))}
          </div>
        </div>
        {!s.sitters.length && <Empty icon={<UsersRound />} title="لا مدرجين في هذه الجلسة" text="يُدرج هنا كل من سدّد رسم التسجيل لصفة هذا الاختبار وقاعته هذه، أو نقله إليها صاحب صلاحية «إدارة الامتحانات»." />}
        {!!s.sitters.length && !shown.length && <p className="rounded-2xl bg-white/5 p-4 text-center text-sm text-white/65">لا أحد يطابق البحث.</p>}
        {shown.map((x) => {
          const present = isPresent(x.id);
          const why = locked(x);
          return (
            <motion.div key={x.id} layout className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/20 font-display font-bold text-gold ring-1 ring-gold/40">{x.name.replace("الشيخ ", "")[0]}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white">{x.name}</p>
                <p className="text-xs text-white/70">
                  الرقم الوطني <span dir="ltr">{maskNationalId(x.id)}</span>
                  {present && ` · حضر ${fmtTime(s.run!.present[x.id])}`}
                </p>
              </div>
              {x.attempt ? (
                <Chip tone={ATTEMPT_TONE[x.attempt.status]}>{ATTEMPT_LABEL[x.attempt.status]}</Chip>
              ) : s.run?.requests?.[x.id] ? (
                <Chip tone="gold">طلب دخول معلّق</Chip>
              ) : present ? (
                <Chip tone="green">حاضر</Chip>
              ) : (
                <Chip tone={s.stage === "closed" ? "maroon" : "muted"}>{s.stage === "closed" ? "غائب" : "لم يحضر"}</Chip>
              )}
              {live && !present && (
                <Button size="sm" variant="gold" onClick={() => checkIn(x, "يدوياً من القائمة")}>
                  <UserCheck className="size-4" /> تسجيل حضور
                </Button>
              )}
              {live && present && (
                <Button size="sm" variant="glass" disabled={!!why} title={why || undefined} onClick={() => setUndo(x)}>
                  تراجع عن الحضور
                </Button>
              )}
            </motion.div>
          );
        })}
      </Panel>

      <Ask
        open={!!undo}
        onClose={() => setUndo(null)}
        eyebrow="تراجع عن الحضور"
        title={undo?.name ?? ""}
        reason="required"
        confirm="تراجع عن الحضور"
        onConfirm={(reason) => {
          if (!undo) return;
          hallActions.undoCheckIn(s.key, undo.id);
          log("تراجع عن حضور", undo, reason);
        }}
      >
        <p>يُرفع من قائمة الحاضرين، ويُسجَّل التراجع وسببه في سجل التدقيق. لا يُتراجع عن حضور من له محاولة.</p>
      </Ask>
    </div>
  );
}

// ───────────────────────── طلبات الدخول ─────────────────────────

type EntryRequest = NonNullable<NonNullable<SittingData["run"]>["requests"]>[string];

function Requests({ s, exam, center }: { s: SittingData; exam: ExamDef; center: ExamCenter }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const bank = useExamBank();
  const [approving, setApproving] = useState<{ x: Sitter; r: EntryRequest } | null>(null);
  const [rejecting, setRejecting] = useState<{ x: Sitter; r: EntryRequest } | null>(null);
  const [suspicious, setSuspicious] = useState(false);
  const live = s.stage === "open" || s.stage === "running";
  const where = `${exam.name} — ${center.name}`;
  const log = (action: string, x: Sitter, detail: string, important?: boolean) => logAs(user, { action, target: x.name, detail: `${detail} — ${where}`, important, system: "exams", area: "sittings", ref: s.key });
  const requests = Object.entries(s.run?.requests ?? {})
    .sort(([, a], [, b]) => a.at - b.at)
    .map(([id, r]) => ({ x: s.sitters.find((y) => y.id === id) ?? { id, name: adminName(id) }, r }));

  const approve = (x: Sitter, r: EntryRequest, reason?: string) => {
    hallActions.approve(s.key, x.id, sourceOf(exam, bank));
    log("موافقة اقتران", x, [`رمز ${r.code}`, r.offNetwork && "من خارج شبكة القاعة", r.resume && "استئناف / إعادة دخول", reason].filter(Boolean).join(" — "));
    toast({ title: `دخل ${x.name.split(" ")[0]}`, body: s.stage === "running" ? "بدأ وقته من الآن." : "يبدأ حين تبدأ الاختبار.", tone: "success", icon: "📱" });
  };

  // Demo: those checked in who have not asked yet type their national id on their own devices
  const waiting = s.sitters.filter((x) => s.run?.present[x.id] && !s.run.requests?.[x.id] && !s.run.paired?.[x.id] && !x.attempt);
  const simulate = () => {
    const src = sourceOf(exam, bank);
    // The last of several asks from outside the hall's network, so the flag and its reason can be tried
    waiting.forEach((x, i) => hallActions.request(s.key, x.id, exam, src, { offNetwork: exam.network && !s.run?.mobileData && waiting.length > 1 && i === waiting.length - 1 }));
    const after = getState().examHalls?.runs?.[s.key];
    const queued = waiting.filter((x) => after?.requests?.[x.id]).length;
    toast({
      title: `${waiting.length} طلبات دخول من أجهزة الحاضرين`,
      body: queued < waiting.length ? `دخل ${waiting.length - queued} تلقائياً (${PAIRING[exam.pairing].label})، وينتظر ${queued} موافقتك.` : "اذهب إلى مقعد كل منهم وطابق الرمز ثم وافق.",
      tone: "info",
      icon: "📱",
    });
  };

  return (
    <Panel icon={<Inbox />} title="طلبات الدخول" action={<Chip tone={requests.length ? "maroon" : "muted"}>{requests.length} معلّقة</Chip>} bodyClass="space-y-3">
      <p className="text-sm leading-7 text-white/75">اذهب إلى مقعد المتقدم وطابق الرمز الظاهر على شاشته مع الرمز في البطاقة، ثم وافق. لا توافق على رمز لا تراه بعينك على جهازه.</p>
      {live ? (
        <Sim disabled={!waiting.length} onClick={simulate}>
          محاكاة: يطلب الحاضرون الدخول من أجهزتهم{waiting.length ? ` (${waiting.length})` : ""}
        </Sim>
      ) : (
        <p className="text-sm text-white/60">{s.stage === "idle" ? "تصل الطلبات بعد فتح القاعة وتسجيل الحضور." : "انتهت الجلسة: لا طلبات دخول بعد إغلاق القاعة."}</p>
      )}
      {!requests.length && live && <Empty icon={<Inbox />} title="لا طلبات معلّقة" text="يطلب كل حاضر الدخول من جهازه بعد أن يُدخل رقمه الوطني، فيظهر طلبه هنا برمز الاقتران." />}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence>
          {requests.map(({ x, r }) => (
            <motion.div key={x.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className={cn("rounded-2xl p-4 ring-1", r.offNetwork || r.resume ? "bg-maroon/20 ring-maroon-light/60" : "bg-white/[.06] ring-white/10")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-white">{x.name}</p>
                  <p className="text-xs text-white/70">
                    الرقم الوطني <span dir="ltr">{maskNationalId(x.id)}</span> · طلب {fmtTime(r.at)}
                  </p>
                </div>
                <Smartphone className="size-5 shrink-0 text-gold" />
              </div>
              <p className="my-3 rounded-2xl bg-black/25 py-3 text-center font-mono text-5xl font-bold tracking-[.3em] text-gold" dir="ltr" aria-label={`رمز الاقتران ${r.code}`}>
                {r.code}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {r.offNetwork && (
                  <Chip tone="maroon">
                    <WifiOff /> من خارج شبكة القاعة
                  </Chip>
                )}
                {r.resume && (
                  <Chip tone="gold">
                    <RotateCcw /> استئناف / إعادة دخول
                  </Chip>
                )}
                {!r.offNetwork && !r.resume && (
                  <Chip tone="green">
                    <Wifi /> من شبكة القاعة
                  </Chip>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="gold" className="flex-1" disabled={!live} onClick={() => (r.offNetwork || r.resume ? setApproving({ x, r }) : approve(x, r))}>
                  <Check className="size-4" /> موافقة
                </Button>
                <Button
                  size="sm"
                  variant="glass"
                  className="flex-1"
                  disabled={!live}
                  onClick={() => {
                    setSuspicious(false);
                    setRejecting({ x, r });
                  }}
                >
                  رفض
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Ask
        open={!!approving}
        onClose={() => setApproving(null)}
        eyebrow="موافقة اقتران"
        title={approving?.x.name ?? ""}
        reason="required"
        confirm="موافقة"
        onConfirm={(reason) => approving && approve(approving.x, approving.r, reason)}
      >
        <p>
          تحقق أن الرمز على شاشته <b dir="ltr">{approving?.r.code}</b> وأنه في مقعده، ثم اكتب سبب الموافقة.
        </p>
        {approving?.r.offNetwork && <Warn>الطلب من خارج شبكة القاعة: قد يكون جهازه على بيانات الجوال أو خارج القاعة.</Warn>}
        {approving?.r.resume && <Warn>إعادة دخول: له محاولة في هذه الجلسة، فيعود إليها بإجاباته ووقته (انقطاع اتصال، تبديل جهاز…).</Warn>}
      </Ask>

      <Ask
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        eyebrow="رفض طلب الدخول"
        title={rejecting?.x.name ?? ""}
        reason="optional"
        tone="maroon"
        confirm="رفض الطلب"
        onConfirm={(reason) => {
          if (!rejecting) return;
          hallActions.reject(s.key, rejecting.x.id);
          log(suspicious ? "رفض مشبوه" : "رفض اقتران", rejecting.x, [`رمز ${rejecting.r.code}`, reason].filter(Boolean).join(" — "), suspicious || undefined);
          toast({ title: suspicious ? "رُفض الطلب وسُجّل مشبوهاً" : "رُفض الطلب", body: rejecting.x.name, tone: "warning", icon: "⛔" });
        }}
      >
        <p>يعود جهازه إلى إدخال الرقم الوطني، ويمكنه أن يطلب من جديد.</p>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white/5 px-3 py-2 font-bold text-white ring-1 ring-white/10">
          <input type="checkbox" checked={suspicious} onChange={(e) => setSuspicious(e.target.checked)} className="size-4 accent-[#D9C89E]" />
          طلب مشبوه (انتحال محتمل)
        </label>
      </Ask>
    </Panel>
  );
}

// ───────────────────────── المراقبة والتأكيد ─────────────────────────

/** Demo: an applicant answers his whole paper on his device (mostly right), and may leave the test's screen */
function fillAnswers(id: string, role: string, bank: ExamQuestion[], alerts?: AttemptAlerts) {
  setState((st) => {
    const p = st.admins[id];
    const a = p && paperOf(p, role);
    if (!p || !a || statusOf(a) !== "active") return st;
    const byId = new Map(bank.map((q) => [q.id, q]));
    const answers = { ...a.answers };
    for (const sec of a.paper ?? []) {
      for (const qid of sec.ids) {
        const q = byId.get(qid);
        if (!q || answers[qid] !== undefined) continue;
        answers[qid] = Math.random() < 0.8 ? q.answer : (q.answer + 1 + Math.floor(Math.random() * (q.options.length - 1))) % q.options.length;
      }
    }
    const next: Attempt = { ...a, answers, alerts: alerts ? { ...a.alerts, ...alerts } : a.alerts };
    return { ...st, admins: { ...st.admins, [id]: { ...p, ...paperPatch(p, role, next) } } };
  });
}

function Monitor({ s, exam, center }: { s: SittingData; exam: ExamDef; center: ExamCenter }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const bank = useExamBank();
  const halls = useHalls();
  const pin = halls.pins[user.id];
  const now = useNow(15_000);
  const [picked, setPicked] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<AttemptRow | null>(null);
  const [refusing, setRefusing] = useState<AttemptRow | null>(null);
  const where = `${exam.name} — ${center.name}`;
  const closedAt = s.run?.closedAt ?? s.run?.endedAt;
  const canConfirm = s.stage === "open" || s.stage === "running" || (s.stage === "closed" && !!closedAt && now - closedAt < CONFIRM_AFTER_CLOSE);
  const rows = [...s.attempts].sort((a, b) => ATTEMPT_ORDER.indexOf(a.status) - ATTEMPT_ORDER.indexOf(b.status) || a.row.name.localeCompare(b.row.name, "ar"));
  const clean = rows.filter((a) => a.status === "submitted" && isClean(a.attempt)).map((a) => a.row.id);
  const chosen = picked.filter((id) => clean.includes(id));
  const active = rows.filter((a) => a.status === "active");
  const log = (action: string, target: string, detail: string) => logAs(user, { action, target, detail: `${detail} — ${where}`, system: "exams", area: "sittings", ref: s.key });

  const confirmBatch = () => {
    hallActions.confirm(s.key, chosen, user.name, "batch");
    log("تأكيد جماعي", where, `${chosen.length} محاولات بلا تنبيهات`);
    toast({ title: `أُكّدت ${chosen.length} محاولات`, body: "المحاولات ذات التنبيهات تُؤكَّد واحدة واحدة.", tone: "success", icon: "✅" });
    setPicked([]);
  };

  const simulate = () => {
    active.forEach((a, i) => {
      // The second leaves the test's screen twice, so a signal can be tried
      fillAnswers(a.row.id, a.role, bank, i === 1 ? { focusLost: 2 } : undefined);
      hallActions.submit(a.row.id, a.role, bank, !pin, user.name);
    });
    toast({ title: `سلّم ${active.length} متقدمين`, body: pin ? "اكتب الـ PIN على جهاز كل منهم، أو أكّد من هنا." : "بلا PIN: أُكّدت تسليماتهم تلقائياً.", tone: "info", icon: "📝" });
  };

  return (
    <Panel icon={<ClipboardCheck />} title="المراقبة والتأكيد" bodyClass="space-y-3">
      <p className="rounded-2xl bg-white/5 p-3 text-sm leading-7 text-white/80 ring-1 ring-white/10">
        الطريقة المعتادة: اكتب الـ PIN على جهاز المتقدم بعد تسليمه فيتأكد التسليم فوراً. التأكيد من هنا بديل (مثلاً إن تعطّل جهازه)، والتأكيد الجماعي يخص المحاولات التي بلا تنبيهات فقط.
      </p>
      {!pin && <Warn>بلا PIN — التأكيد تلقائي: كل تسليم يُؤكَّد لحظة إرساله. اضبط الـ PIN لتتحقق من صاحب كل محاولة قبل تأكيدها.</Warn>}
      {s.stage === "closed" && <p className="text-sm text-white/65">{canConfirm ? "انتهت الجلسة: يبقى التأكيد متاحاً 3 ساعات من إغلاقها، ثم تقرر الإدارة في كل تسليم لم يُؤكَّد." : "انتهت الجلسة ومضت مهلة التأكيد: تقرر الإدارة في كل تسليم لم يُؤكَّد."}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {s.stage === "running" && (
          <Sim disabled={!active.length} onClick={simulate}>
            محاكاة: يسلّم من يختبرون{active.length ? ` (${active.length})` : ""}
          </Sim>
        )}
        {canConfirm && clean.length > 0 && (
          <>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-bold ring-1 ring-white/10">
              <input type="checkbox" checked={chosen.length === clean.length} onChange={(e) => setPicked(e.target.checked ? clean : [])} className="size-4 accent-[#D9C89E]" />
              تحديد كل المحاولات السليمة ({clean.length})
            </label>
            <Button size="sm" variant="gold" disabled={!chosen.length} onClick={confirmBatch}>
              <ShieldCheck className="size-4" /> تأكيد المحدَّد ({chosen.length})
            </Button>
          </>
        )}
      </div>

      {!rows.length && <Empty icon={<ClipboardCheck />} title="لا محاولات بعد" text="تظهر هنا محاولة كل من وافقت على دخول جهازه: حالتها ووقتها وتنبيهاتها." />}
      {rows.map((a) => {
        const alerts = alertLabels(a.attempt);
        const selectable = canConfirm && a.status === "submitted" && isClean(a.attempt);
        const total = a.attempt.paper?.reduce((n, sec) => n + sec.ids.length, 0) ?? 0;
        const answered = Object.keys(a.attempt.answers ?? {}).length;
        return (
          <motion.div key={a.row.id} layout className={cn("flex flex-wrap items-center gap-3 rounded-2xl p-3 ring-1", a.status === "submitted" ? "bg-gold/10 ring-gold/40" : "bg-white/[.06] ring-white/10")}>
            {selectable ? (
              <input type="checkbox" aria-label={`تحديد ${a.row.name}`} checked={chosen.includes(a.row.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, a.row.id] : picked.filter((id) => id !== a.row.id))} className="size-4 accent-[#D9C89E]" />
            ) : (
              <span className="size-4" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white">{a.row.name}</p>
              <p className="text-xs leading-6 text-white/70">
                {a.attempt.pairedAt && `اقترن ${fmtTime(a.attempt.pairedAt)}`}
                {a.attempt.startedAt && ` · بدأ ${fmtTime(a.attempt.startedAt)}`}
                {a.status === "active" && ` · أجاب ${answered} من ${total}`}
                {a.attempt.submittedAt && ` · سلّم ${fmtTime(a.attempt.submittedAt)}`}
                {a.status === "confirmed" && a.attempt.confirmVia && ` · أُكّد ${VIA[a.attempt.confirmVia]}`}
                {a.status === "unconfirmed" && ` · لم يؤكَّد: ${a.attempt.unconfirmedReason ?? ""} — أُحيل إلى الإدارة`}
                {a.status === "voided" && (a.attempt.decision ? ` · ألغته الإدارة: ${a.attempt.decision.note}` : " · أُلغيت: اقترن ولم يبدأ قبل إنهاء الجلسة")}
              </p>
              {alerts.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {alerts.map((t) => (
                    <Chip key={t} tone="maroon">
                      <TriangleAlert /> {t}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
            <Chip tone={ATTEMPT_TONE[a.status]}>{ATTEMPT_LABEL[a.status]}</Chip>
            {a.status === "active" && a.attempt.startedAt && <Remaining startedAt={a.attempt.startedAt} minutes={a.attempt.minutes ?? exam.minutes} />}
            {a.status === "submitted" && canConfirm && (
              <div className="flex gap-2">
                <Button size="sm" variant="gold" onClick={() => setConfirming(a)}>
                  <ShieldCheck className="size-4" /> تأكيد
                </Button>
                <Button size="sm" variant="glass" onClick={() => setRefusing(a)}>
                  لا أؤكد
                </Button>
              </div>
            )}
          </motion.div>
        );
      })}

      <Ask
        open={!!confirming}
        onClose={() => setConfirming(null)}
        eyebrow="تأكيد التسليم"
        title={confirming?.row.name ?? ""}
        confirm="تأكيد التسليم"
        onConfirm={() => {
          if (!confirming) return;
          const alerts = alertLabels(confirming.attempt);
          hallActions.confirm(s.key, [confirming.row.id], user.name, "panel");
          log("تأكيد تسليم", confirming.row.name, `من لوحة المشرف${alerts.length ? ` — مع تنبيهات: ${alerts.join("، ")}` : ""}`);
          toast({ title: "أُكّد التسليم", body: confirming.row.name, tone: "success", icon: "✅" });
        }}
      >
        <p>تحقق أن الشخص أمامك هو صاحب الاسم قبل التأكيد.</p>
        {confirming && alertLabels(confirming.attempt).length > 0 && (
          <Warn>
            لهذه المحاولة تنبيهات: {alertLabels(confirming.attempt).join("، ")}. هي إشارات آلية تدعم القرار وليست إثباتاً؛ إن شككت فاختر «لا أؤكد» لتحيلها إلى الإدارة.
          </Warn>
        )}
      </Ask>

      <Ask
        open={!!refusing}
        onClose={() => setRefusing(null)}
        eyebrow="لا أؤكد"
        title={refusing?.row.name ?? ""}
        reason="required"
        tone="maroon"
        confirm="إحالة إلى الإدارة"
        onConfirm={(reason) => {
          if (!refusing) return;
          hallActions.unconfirm(s.key, refusing.row.id, reason);
          log("عدم تأكيد", refusing.row.name, reason);
          toast({ title: "أُحيلت المحاولة إلى الإدارة", body: refusing.row.name, tone: "warning", icon: "📨" });
        }}
      >
        <p>لا تُؤكَّد المحاولة: تُحال إلى الإدارة لتعتمدها أو تلغيها، ويُكتب سببك معها.</p>
      </Ask>
    </Panel>
  );
}

function Remaining({ startedAt, minutes }: { startedAt: number; minutes: number }) {
  const now = useNow(1000);
  const left = startedAt + minutes * 60_000 - now;
  return (
    <span className={cn("rounded-lg px-2 py-1 text-xs font-bold tabular-nums", left <= 0 ? "bg-maroon text-white" : "bg-white/10 text-gold")}>
      {left > 0 ? (
        <>
          بقي <span dir="ltr">{clock(left)}</span>
        </>
      ) : (
        "انتهى وقته"
      )}
    </span>
  );
}

// ───────────────────────── PIN التأكيد ─────────────────────────

function PinCard({ refKey }: { refKey?: string }) {
  const user = useStaffUser()!;
  const halls = useHalls();
  const toast = useToast();
  const pin = halls.pins[user.id];
  const [open, setOpen] = useState(false);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const savedAt = useRef(0);
  const valid = /^\d{4,10}$/.test(a) && a === b;
  const error = a && !/^\d{4,10}$/.test(a) ? "من 4 إلى 10 أرقام." : b && a !== b ? "الرقمان غير متطابقين." : "";
  const close = () => {
    setOpen(false);
    setA("");
    setB("");
  };
  const save = () => {
    // The form keeps its last look while the dialog fades out: saved once
    if (Date.now() - savedAt.current < 1500) return;
    savedAt.current = Date.now();
    hallActions.setPin(user.id, a);
    logAs(user, { action: "ضبط PIN", target: user.name, detail: pin ? "غيّر رمز التأكيد" : "ضبط رمز التأكيد أول مرة", system: "exams", area: "sittings", ref: refKey });
    toast({ title: pin ? "تغيّر الـ PIN" : "ضُبط الـ PIN", body: "تكتبه على جهاز المتقدم بعد تسليمه.", tone: "success", icon: "🔑" });
    close();
  };
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 10);

  return (
    <Panel icon={<KeyRound />} title="PIN التأكيد" action={<Chip tone={pin ? "green" : "maroon"}>{pin ? "مضبوط" : "بلا PIN — التأكيد تلقائي"}</Chip>}>
      {!pin && <Warn>لم تضبط رمز التأكيد بعد، وتحتاجه لتأكيد التسليمات على أجهزة المتقدمين. بلا PIN يُؤكَّد كل تسليم تلقائياً لحظة إرساله دون تحقق منك.</Warn>}
      <p className="mt-3 text-sm leading-7 text-white/75">تكتب هذا الرقم السري على جهاز المتقدم بعد تسليمه لتأكيد التسليم. لا تُعلِمه لأحد، ويمكنك تغييره في أي وقت؛ التأكيدات السابقة تبقى صحيحة.</p>
      {pin && pin === DEFAULT_PINS[user.id] && <p className="mt-2 text-xs text-white/55">للتجربة: الرمز الذي يبدأ به حسابك {pin}، وتغييره من هنا.</p>}
      <Button className="mt-4" size="sm" variant={pin ? "glass" : "gold"} onClick={() => setOpen(true)}>
        <KeyRound className="size-4" /> {pin ? "تغيير الـ PIN" : "ضبط الـ PIN"}
      </Button>
      <Modal open={open} onClose={close} className={cn(DARK_MODAL, "max-w-md")}>
        <p className="text-xs font-bold text-gold">PIN التأكيد</p>
        <h3 className="mt-1 font-display text-xl font-bold">{pin ? "تغيير الـ PIN" : "ضبط الـ PIN"}</h3>
        <p className="mt-1 text-sm leading-7 text-white/70">من 4 إلى 10 أرقام، تكتبه مرتين.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) save();
          }}
          className="mt-4 space-y-3"
        >
          <input type="password" inputMode="numeric" autoComplete="new-password" value={a} onChange={(e) => setA(digits(e.target.value))} placeholder="الـ PIN الجديد" aria-label="الـ PIN الجديد" dir="ltr" className={cn(smallInputClass, "text-center font-mono tracking-[.4em]")} />
          <input type="password" inputMode="numeric" autoComplete="new-password" value={b} onChange={(e) => setB(digits(e.target.value))} placeholder="أعد كتابته" aria-label="أعد كتابة الـ PIN" dir="ltr" className={cn(smallInputClass, "text-center font-mono tracking-[.4em]")} />
          {error && <p className="text-sm font-bold text-gold">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="gold" disabled={!valid}>
              حفظ
            </Button>
            <Button type="button" variant="glass" onClick={close}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}

// ───────────────────────── Small pieces ─────────────────────────

function CopyLink({ icon, label, hint, path }: { icon: ReactNode; label: string; hint?: string; path: string }) {
  const origin = useOrigin();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const url = `${origin}${asset(path)}`;
  const copy = () => {
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => toast({ title: "تعذّر النسخ", body: url, tone: "warning" }),
    );
  };
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold ring-1 ring-gold/40 [&_svg]:size-5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-white">{label}</p>
        <Link href={path} target="_blank" className="block truncate text-xs text-gold hover:underline" dir="ltr">
          {url}
        </Link>
        {hint && <p className="mt-0.5 text-xs leading-5 text-white/60">{hint}</p>}
      </div>
      <Button size="sm" variant="glass" onClick={copy}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "نُسخ" : "نسخ"}
      </Button>
    </div>
  );
}

/** A clearly-labelled simulation control (the dark panels' version of the administrator portal's), so nobody takes it for the real flow */
function Sim({ children, onClick, disabled, className }: { children: ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn("inline-flex items-center gap-2 rounded-2xl border-2 border-dashed border-gold/50 bg-white/5 px-4 py-2.5 text-sm font-bold text-gold transition hover:border-gold hover:bg-white/10 disabled:opacity-50", className)}
    >
      <FlaskConical className="size-4" /> {children}
    </button>
  );
}

function Warn({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-maroon/35 p-3 text-sm leading-7 text-white ring-1 ring-maroon-light/60">
      <TriangleAlert className="mt-1 size-4 shrink-0 text-gold" />
      <span>{children}</span>
    </p>
  );
}

function Stats({ items }: { items: [string, number][] }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map(([label, n]) => (
        <div key={label} className="rounded-xl bg-white/[.06] px-3 py-2 ring-1 ring-white/10">
          <dt className="text-xs text-white/65">{label}</dt>
          <dd className="font-display text-2xl font-bold text-white tabular-nums">{n}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A confirmation in the dark staff look: what happens, and the reason when one is asked (required, or optional) */
function Ask({
  open,
  onClose,
  eyebrow,
  title,
  children,
  reason,
  confirm,
  tone = "gold",
  disabled,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  children: ReactNode;
  reason?: "required" | "optional";
  confirm: string;
  tone?: "gold" | "maroon";
  disabled?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [text, setText] = useState("");
  // The dialog keeps its last look while it fades out: a second click on it then must not act twice
  const firedAt = useRef(0);
  const ok = !disabled && (reason !== "required" || text.trim().length >= 3);
  const close = () => {
    setText("");
    onClose();
  };
  return (
    <Modal open={open} onClose={close} className={DARK_MODAL}>
      <p className="text-xs font-bold text-gold">{eyebrow}</p>
      <h3 className="mt-1 font-display text-xl font-bold">{title}</h3>
      <div className="mt-3 space-y-3 text-sm leading-7 text-white/75">{children}</div>
      {reason && <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} className={cn(textareaClass, "mt-4")} placeholder={reason === "required" ? "السبب (إلزامي)" : "السبب (اختياري)"} aria-label="السبب" />}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant={tone}
          disabled={!ok}
          onClick={() => {
            if (Date.now() - firedAt.current < 1500) return;
            firedAt.current = Date.now();
            onConfirm(text.trim());
            close();
          }}
        >
          {confirm}
        </Button>
        <Button variant="glass" onClick={close}>
          إلغاء
        </Button>
      </div>
    </Modal>
  );
}
