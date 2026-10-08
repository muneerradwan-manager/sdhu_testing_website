"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CalendarClock, Eye, ShieldCheck, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PAIRING, type ExamCenter, type ExamDef } from "@/lib/data/admin-exam";
import { dayTimeLabel } from "@/lib/operations";
import type { StaffUser } from "@/lib/staff";
import type { HallRun } from "@/lib/store";
import { cn } from "@/lib/utils";
import { paperOf } from "@/app/administrator/_lib/admin";
import {
  ATTEMPT_LABEL,
  STAGE_LABEL,
  WINDOW_LABEL,
  examRolesOfPosition,
  openWindow,
  roleKeyOf,
  roleLabelOf,
  runKey,
  scheduledAt,
  stageOf,
  targets,
  useDemoNow,
  useHalls,
  type HallStage,
} from "@/app/administrator/_lib/halls";
import type { AdminRow } from "../../_components/data";
import { Drawer, Empty, Panel, Tabs, fmtTime } from "../../_components/kit";
import { useExamDesk, type AttemptRow, type ExamDesk } from "./desk";
import { Records } from "./records";
import { ATTEMPT_TONE, Chip, Switch, alertParts, pct, type ChipTone } from "./ui";

/** The tests one applicant sits this season: his role's, or both of «معاون ومنسق تقني»'s */
export function examRolesOfRow(r: AdminRow) {
  const pos = r.profile.positions[0] ?? r.position;
  const roles = examRolesOfPosition(pos);
  return roles.length ? roles : [roleKeyOf(pos)];
}

/** The test an attempt belongs to: its sitting's, or its role's main test for a paper kept from before the halls */
export const examOfAttempt = (a: Pick<AttemptRow, "examId" | "role">) => a.examId || a.role;

/**
 * One sitting as the administration's platform lists it: one test in one hall at its time, the applicants it
 * lists, its supervisor, how far it went, and the attempts sat in it.
 */
export type SittingRow = {
  key: string;
  exam: ExamDef;
  center: ExamCenter;
  run?: HallRun;
  stage: HallStage;
  /** Its time on the demo's clock */
  at?: number;
  supervisor: StaffUser | null;
  /** The role's applicants whose hall it is (for a make-up test, those it is the next sitting of), and whoever came or sat there */
  listed: AdminRow[];
  attempts: AttemptRow[];
};

/** Where one listed applicant stands in a sitting: his attempt's status, else whether he came — absent once it ended */
export function seatOf(s: SittingRow, id: string): { label: string; tone: ChipTone; present: boolean; absent: boolean } {
  const a = s.attempts.find((x) => x.row.id === id);
  if (a) return { label: ATTEMPT_LABEL[a.status], tone: ATTEMPT_TONE[a.status], present: true, absent: false };
  if (s.run?.requests?.[id]) return { label: "طلب دخول معلّق", tone: "gold", present: true, absent: false };
  if (s.run?.present[id]) return { label: "حاضر", tone: "green", present: true, absent: false };
  if (s.stage === "closed") return { label: "غائب — راسب", tone: "maroon", present: false, absent: true };
  return { label: "لم يحضر", tone: "muted", present: false, absent: false };
}

/**
 * Every sitting of the season: each published or archived test in each active hall it is sat in (and any hall
 * where it already ran). Its applicants are the role's whose hall it is; a main sitting keeps listing whoever
 * missed it and sat the make-up later, so its absentees stay on its record.
 */
export function useSittingRows(desk: ExamDesk): SittingRow[] {
  const halls = useHalls();
  const now = useDemoNow();
  return useMemo(() => {
    const people = desk.rows.map((r) => {
      const p = r.profile;
      return { r, sits: !!p.eligibleAt && !!p.feePaidAt && !p.examExempt, roles: examRolesOfRow(r), at: halls.centerOf(r.id)?.id };
    });
    return halls.exams
      .filter((e) => e.status !== "draft")
      .flatMap((exam) =>
        halls.centers
          .filter((c) => (!c.off && targets(exam, c.id)) || !!halls.runs[runKey(exam.id, c.id)])
          .map<SittingRow>((center) => {
            const key = runKey(exam.id, center.id);
            const run = halls.runs[key];
            const attempts = desk.attempts.filter((a) => a.key === key);
            const listed = people
              .filter(({ r, sits, roles, at }) => {
                if (run?.present[r.id] || run?.requests?.[r.id] || run?.paired?.[r.id] || attempts.some((a) => a.row.id === r.id)) return true;
                if (!sits || at !== center.id || !roles.includes(exam.role)) return false;
                const paper = paperOf(r.profile, exam.role);
                if (paper) {
                  const [sat, satAt] = (paper.hall ?? "").split("@");
                  return exam.kind === "main" && satAt === center.id && halls.examById(sat)?.kind === "makeup";
                }
                return exam.kind === "main" || halls.sittingOf(r.id, exam.role)?.key === key;
              })
              .map((x) => x.r);
            // Sat before its hall's run was kept (the season's seeded papers): once its day is past, it took place
            const at = scheduledAt(exam);
            const stage = run ? stageOf(run) : attempts.length && openWindow(at, now) === "late" ? "closed" : "idle";
            return { key, exam, center, run, stage, at, supervisor: halls.supervisorOf(center.id), listed, attempts };
          }),
      );
  }, [desk, halls, now]);
}

const STAGE_TONE: Record<HallStage, ChipTone> = { idle: "muted", open: "gold", running: "green", closed: "maroon" };
const STAGE_RANK: Record<HallStage, number> = { running: 0, open: 1, idle: 2, closed: 3 };
/** Scheduled sittings, those that can be opened first: now, later today, coming, then those past their time */
const WINDOW_RANK: Record<ReturnType<typeof openWindow>, number> = { now: 0, today: 1, upcoming: 2, late: 3, none: 4 };

/** A sitting's timing as the platform badges it: when it can be opened — ended once it closed */
export function TimingChip({ s, now }: { s: SittingRow; now: number }) {
  if (s.stage === "closed") return <Chip tone="muted">منتهية</Chip>;
  const w = openWindow(s.at, now);
  return <Chip tone={w === "now" ? "green" : w === "late" ? "maroon" : w === "today" ? "gold" : "muted"}>{WINDOW_LABEL[w]}</Chip>;
}

/**
 * The sittings: one row per test in a hall, with its time, how many it lists, its supervisor, how far it went
 * and when it can be opened. Applicants are put in a hall from «المتقدمون» and the supervisor from «القاعات
 * والمحافظات»; the supervisor opens the sitting from his panel. Each sitting opens read-only on its applicants
 * and its attempts.
 */
export function Sittings() {
  const desk = useExamDesk();
  const rows = useSittingRows(desk);
  const now = useDemoNow();
  const [showClosed, setShowClosed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const closed = rows.filter((s) => s.stage === "closed").length;
  const shown = rows
    .filter((s) => showClosed || s.stage !== "closed")
    .sort((a, b) => STAGE_RANK[a.stage] - STAGE_RANK[b.stage] || (a.stage === "idle" ? WINDOW_RANK[openWindow(a.at, now)] - WINDOW_RANK[openWindow(b.at, now)] : 0) || (a.at ?? Infinity) - (b.at ?? Infinity) || a.center.name.localeCompare(b.center.name, "ar"));
  const current = rows.find((s) => s.key === open);

  return (
    <div className="space-y-4">
      <Panel
        icon={<CalendarClock />}
        title="جلسات الاختبار"
        action={
          <label className="flex items-center gap-2 text-xs font-bold text-white/80">
            إظهار المنتهية ({closed})
            <Switch on={showClosed} onChange={setShowClosed} label="إظهار الجلسات المنتهية" />
          </label>
        }
      >
        <p className="text-sm leading-7 text-white/70">
          الجلسة = اختبار في قاعة بموعد. أسند لها متقدمين ومشرفاً، ثم يفتحها المشرف من لوحته. يُسند المتقدمون إلى القاعات من{" "}
          <Link href="/staff/exam/manage/people" className="font-bold text-gold hover:underline">
            «المتقدمون»
          </Link>
          ، والمشرف من{" "}
          <Link href="/staff/exam/manage" className="font-bold text-gold hover:underline">
            «القاعات والمحافظات»
          </Link>
          . تُفتح القاعة من قبل موعدها بساعة إلى آخر يومه، وتظهر هنا كل جلسة لاختبار منشور أو مؤرشف في كل قاعة يُجلس له فيها.
        </p>
      </Panel>

      <Panel bodyClass="-mx-5 md:-mx-6">
        {shown.length === 0 ? (
          <div className="px-5 md:px-6">
            <Empty icon={<CalendarClock />} title="لا جلسات قادمة أو جارية" text={closed ? "كل الجلسات منتهية: اعرضها من «إظهار المنتهية»." : "انشر اختباراً ليصير له جلسة في كل قاعة يُجلس له فيها."} />
          </div>
        ) : (
          <div className="overflow-x-auto px-5 md:px-6">
            <table className="w-full min-w-[58rem] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-right text-xs text-gold">
                  {["الاختبار", "القاعة", "الموعد", "المسندون", "المشرف", "الحالة", "التوقيت", ""].map((h, i) => (
                    <th key={i} className="pb-2 font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {shown.map((s, i) => (
                  <motion.tr key={s.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 15) * 0.02 }} className="text-white">
                    <td className="py-2.5 font-bold">
                      {s.exam.name}
                      {s.exam.status === "archived" && <span className="ms-1 text-[11px] font-normal text-white/55">(مؤرشف)</span>}
                    </td>
                    <td className="py-2.5">{s.center.name}</td>
                    <td className="py-2.5 text-white/80">
                      {dayTimeLabel(s.exam.day, s.exam.time) || "بلا موعد"}
                      {s.exam.date && <span className="block text-[11px] text-white/50">{s.exam.date}</span>}
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {s.listed.length}
                      {s.run && <span className="block text-[11px] text-white/55">حضر {Object.keys(s.run.present).length}</span>}
                    </td>
                    <td className="py-2.5">{s.supervisor ? s.supervisor.name : <span className="font-bold text-gold">بلا مشرف</span>}</td>
                    <td className="py-2.5">
                      <Chip tone={STAGE_TONE[s.stage]}>{STAGE_LABEL[s.stage]}</Chip>
                    </td>
                    <td className="py-2.5">
                      <TimingChip s={s} now={now} />
                    </td>
                    <td className="py-2.5 text-left">
                      <Button size="sm" variant="glass" onClick={() => setOpen(s.key)}>
                        <Eye className="size-4" /> فتح
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Records area="sittings" />

      <Drawer open={!!current} onClose={() => setOpen(null)} title={current ? `${current.exam.name} — ${current.center.name}` : ""} width="max-w-3xl">
        {current && <SittingSheet s={current} now={now} />}
      </Drawer>
    </div>
  );
}

/** One sitting, read-only: its time, supervisor and entry mode, then its applicants and its attempts */
function SittingSheet({ s, now }: { s: SittingRow; now: number }) {
  const [tab, setTab] = useState<"people" | "attempts">("people");
  const run = s.run;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone={STAGE_TONE[s.stage]}>{STAGE_LABEL[s.stage]}</Chip>
        <TimingChip s={s} now={now} />
        <Chip tone="muted">{PAIRING[s.exam.pairing].label}</Chip>
        {s.exam.network && <Chip tone="muted">شبكة القاعة مطلوبة</Chip>}
        {run?.mobileData && <Chip tone="gold">بيانات الجوال مسموحة (طوارئ)</Chip>}
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {[
          ["الموعد", dayTimeLabel(s.exam.day, s.exam.time) || "بلا موعد"],
          ["المشرف", s.supervisor?.name ?? "بلا مشرف"],
          ["فُتحت القاعة", run?.openedAt ? `${fmtTime(run.openedAt)}${run.openedBy ? ` — ${run.openedBy}` : ""}` : "—"],
          ["بدأ الاختبار", run?.startedAt ? fmtTime(run.startedAt) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-black/15 p-2">
            <dt className="text-[11px] text-white/60">{k}</dt>
            <dd className="font-bold leading-6 text-white">{v}</dd>
          </div>
        ))}
      </dl>
      {run?.openedReason && <p className="rounded-2xl bg-gold/10 p-3 text-xs leading-6 text-gold ring-1 ring-gold/40">فُتحت خارج موعدها: {run.openedReason}</p>}

      <Tabs
        id={`sitting-${s.key}`}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "people", label: "المتقدمون", count: s.listed.length },
          { value: "attempts", label: "المحاولات", count: s.attempts.length },
        ]}
      />

      {tab === "people" ? (
        s.listed.length === 0 ? (
          <Empty icon={<UsersRound />} title="لا متقدمين في هذه الجلسة" text="يُسند المتقدمون إلى القاعة من «المتقدمون»." />
        ) : (
          <ul className="space-y-1.5">
            {s.listed.map((r) => {
              const seat = seatOf(s, r.id);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/[.05] px-3 py-2 ring-1 ring-white/10">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-white">{r.name}</span>
                    <span className="block text-xs text-white/60">
                      <span dir="ltr">{r.id}</span> · {roleLabelOf(s.exam.role)}
                      {run?.present[r.id] ? ` · حضر ${fmtTime(run.present[r.id])}` : ""}
                    </span>
                  </span>
                  <Chip tone={seat.tone}>{seat.label}</Chip>
                </li>
              );
            })}
          </ul>
        )
      ) : s.attempts.length === 0 ? (
        <Empty icon={<ShieldCheck />} title="لا محاولات بعد" text="تبدأ المحاولة حين يوافق المشرف على دخول جهاز المتقدم." />
      ) : (
        <ul className="space-y-1.5">
          {s.attempts.map((a) => {
            const parts = alertParts(a.attempt);
            return (
              <li key={`${a.row.id}-${a.role}`} className={cn("rounded-xl px-3 py-2 ring-1", a.alerts ? "bg-gold/10 ring-gold/30" : "bg-white/[.05] ring-white/10")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 font-bold text-white">{a.row.name}</span>
                  <Chip tone={ATTEMPT_TONE[a.status]}>{ATTEMPT_LABEL[a.status]}</Chip>
                </div>
                <p className="mt-1 text-xs text-white/65">
                  بدأ {a.attempt.startedAt ? fmtTime(a.attempt.startedAt) : "—"} · سلّم {a.attempt.submittedAt ? fmtTime(a.attempt.submittedAt) : "—"}
                  {a.attempt.submittedAt ? ` · ${pct(a.attempt.score)}` : ""} · التنبيهات {a.alerts}
                </p>
                {parts.length > 0 && (
                  <p className="mt-1 flex flex-wrap gap-1">
                    {parts.map((p) => (
                      <Chip key={p} tone="gold">
                        {p}
                      </Chip>
                    ))}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
