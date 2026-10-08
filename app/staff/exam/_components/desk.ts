"use client";

import { useMemo } from "react";
import { sectionsOf, shortageOf, type SectionResult } from "@/lib/data/admin-exam";
import { paperOf, resultOf, statusOf } from "@/app/administrator/_lib/admin";
import { useExamBank } from "@/app/administrator/_lib/admin-rules";
import { alertsOf, examRolesOfPosition, isOpen, mustSit, roleKeyOf, runKey, stageOf, targets, useHalls, type ExamCenter, type ExamDef, type Halls, type Sitting } from "@/app/administrator/_lib/halls";
import type { Attempt, AttemptStatus } from "@/lib/store";
import { useAdminRows, type AdminRow } from "../../_components/data";
import { useSystemEvents, type Alert } from "../../_components/system";

export type { Alert } from "../../_components/system";

/**
 * The exam system seen whole, for its owner and for the director, as the administration's exam platform runs it:
 * who still has to sit and where, every attempt and where it stands, and what needs doing. Every screen of the
 * system reads from here, so a number is the same on the owner's home, his sections and the director's board.
 */

/** Someone who still has to sit a test: his role, his hall, and the sitting he is expected at */
export type Applicant = { row: AdminRow; role: string; center?: ExamCenter; moved: boolean; sitting?: Sitting };

/** Where one applicant stands, from his sitting to his confirmed result */
export type Standing = "exempt" | "incomplete" | "waiting" | "absent" | "testing" | "submitted" | "review" | "voided" | "passed" | "failed";

export const STANDING: Record<Standing, { label: string; tone: "green" | "gold" | "maroon" | "muted" }> = {
  waiting: { label: "لم يختبر بعد", tone: "muted" },
  absent: { label: "غائب عن جلسته", tone: "maroon" },
  testing: { label: "في القاعة — يختبر", tone: "gold" },
  submitted: { label: "سلّم — بانتظار التأكيد", tone: "gold" },
  review: { label: "غير مؤكَّد — يحتاج قراراً", tone: "maroon" },
  voided: { label: "محاولة ملغاة", tone: "maroon" },
  passed: { label: "ناجح في كل الأقسام", tone: "green" },
  failed: { label: "راسب", tone: "maroon" },
  exempt: { label: "معفى من الاختبار", tone: "green" },
  incomplete: { label: "طلبه غير مكتمل", tone: "muted" },
};

export function standingOf(r: AdminRow, halls: Halls): Standing {
  const p = r.profile;
  if (p.examExempt) return "exempt";
  const res = resultOf(p);
  if (res.confirmed) return res.passed ? "passed" : "failed";
  const st = res.parts.map((x) => x.status);
  if (st.includes("unconfirmed")) return "review";
  if (st.includes("voided")) return "voided";
  if (st.includes("submitted")) return "submitted";
  if (st.includes("active") || st.includes("ready")) return "testing";
  if (!mustSit(p)) return "incomplete";
  // The test he still has to sit: his role's, or the next of the two of «معاون ومنسق تقني»
  const next = examRolesOfPosition(p.positions[0] ?? r.position).find((x) => !paperOf(p, x)?.submittedAt) ?? roleKeyOf(p.positions[0] ?? r.position);
  const s = halls.sittingOf(r.id, next);
  return s?.stage === "closed" && !s.run?.present[r.id] ? "absent" : "waiting";
}

/** One attempt, wherever it is kept: whose, which test and which sitting, where it stands and how it was marked */
export type AttemptRow = {
  row: AdminRow;
  role: string;
  attempt: Attempt;
  status: AttemptStatus;
  /** The sitting it was sat in, `${test}@${hall}` */
  key: string;
  examId: string;
  centerId: string;
  sections: SectionResult[];
  passed: boolean;
  alerts: number;
  /** Sent in a sitting that ended without its confirmation: the administration decides */
  stale: boolean;
};

/** Every attempt of the season: the papers of every role's test, and the second test of whoever sits two */
export function attemptRows(rows: AdminRow[], halls: Halls): AttemptRow[] {
  return rows.flatMap((r) => {
    const roles = examRolesOfPosition(r.profile.positions[0] ?? r.position);
    return (roles.length ? roles : [roleKeyOf(r.profile.positions[0] ?? r.position)]).flatMap((role) => {
      const a = paperOf(r.profile, role);
      const status = statusOf(a);
      if (!a || !status) return [];
      const key = a.hall ?? "";
      const [examId, centerId] = key.split("@");
      const sections = a.paper && a.tally ? sectionsOf(a.paper, a.tally) : [];
      const passed = sections.length ? sections.every((x) => x.passed) : (a.score ?? -1) >= 50;
      const stale = status === "submitted" && stageOf(halls.runs[key]) === "closed";
      return [{ row: r, role, attempt: a, status, key, examId: examId ?? role, centerId: centerId ?? "", sections, passed, alerts: alertsOf(a), stale }];
    });
  });
}

export function useExamDesk() {
  const rows = useAdminRows();
  const halls = useHalls();
  const bank = useExamBank();

  return useMemo(() => {
    // One entry per test still to sit: «معاون ومنسق تقني» is expected at both of his tests
    const applicants: Applicant[] = rows
      .filter((r) => mustSit(r.profile))
      .flatMap((r) => {
        const pos = r.profile.positions[0] ?? r.position;
        const roles = examRolesOfPosition(pos);
        const todo = (roles.length ? roles : [roleKeyOf(pos)]).filter((x) => !paperOf(r.profile, x)?.submittedAt);
        const center = halls.centerOf(r.id);
        return todo.map((role) => ({ row: r, role, center, moved: !!center && halls.moved[r.id] === center.id, sitting: center ? halls.sittingOf(r.id, role) : undefined }));
      });
    const standings = new Map(rows.map((r) => [r.id, standingOf(r, halls)]));
    const count = (s: Standing) => [...standings.values()].filter((x) => x === s).length;
    const attempts = attemptRows(rows, halls);

    // Expected at a sitting that has not ended yet
    const expected = applicants.filter((a) => a.sitting && a.sitting.stage !== "closed");
    const noCenter = applicants.filter((a) => !a.center);
    // In a hall, but no test left to sit there: absent with no make-up, or his test not published
    const noSitting = applicants.filter((a) => a.center && (!a.sitting || a.sitting.stage === "closed") && !a.row.profile.exam?.status);
    const unsupervised = halls.live.filter((c) => !halls.supervisors[c.id] && expected.some((a) => a.center?.id === c.id));
    const short = halls.exams.filter(isOpen).map((exam) => ({ exam, missing: shortageOf(bank, exam) })).filter((x) => x.missing > 0);
    const crowded = halls.live.flatMap((c) =>
      c.capacity
        ? halls.exams
            .map((exam) => ({ center: c, exam, n: expected.filter((a) => a.center?.id === c.id && a.sitting?.exam.id === exam.id).length }))
            .filter((x) => x.n > c.capacity!)
        : [],
    );
    const live = Object.entries(halls.runs).filter(([, r]) => r.openedAt && !r.closedAt && !r.endedAt);
    // What the administration has to decide: not confirmed by the supervisor, or sent in a sitting that ended unconfirmed
    const decisions = attempts.filter((a) => a.status === "unconfirmed" || a.stale);
    const suspicious = attempts.filter((a) => a.alerts > 0);

    // Blockers first, then the rest; each group in the order the work is done: halls, tests and bank, applicants, review
    const alerts: Alert[] = [
      ...unsupervised.map((c) => ({
        id: `sup-${c.id}`,
        level: "high" as const,
        title: `${c.name} بلا مشرف قاعة`,
        hint: `فيه ${expected.filter((a) => a.center?.id === c.id).length} متقدمين ينتظرون اختبارهم، ولا تُفتح قاعته دون مشرف.`,
        href: "/staff/exam/manage",
        action: "أسند مشرفاً",
      })),
      ...crowded.map(({ center, exam, n }) => ({
        id: `full-${center.id}-${exam.id}`,
        level: "high" as const,
        title: `${center.name}: ${n} متقدماً في ${exam.name}، والمقاعد ${center.capacity}`,
        hint: "انقل بعضهم إلى قاعة أخرى، أو عدّل سعة القاعة.",
        href: `/staff/exam/manage/people?c=${center.id}`,
        action: "وزّع المتقدمين",
      })),
      ...short.map(({ exam, missing }) => ({
        id: `short-${exam.id}`,
        level: "high" as const,
        title: `${exam.name}: ينقص البنك ${missing} أسئلة`,
        hint: "يسحب الاختبار من أقسامه أكثر مما في بنك صفته، فتخرج الأوراق ناقصة: أضف أسئلة إلى البنك أو خفّف عدد ما يُسحب.",
        href: "/staff/exam/manage/exams",
        action: "راجع الاختبار",
      })),
      ...(noCenter.length
        ? [{ id: "no-center", level: "high" as const, title: `${noCenter.length} متقدمين بلا قاعة`, hint: "محافظة قيدهم لا تخدمها أي قاعة فعّالة.", href: "/staff/exam/manage/people?c=none", action: "أسندهم إلى قاعة" }]
        : []),
      ...(decisions.length
        ? [{ id: "decide", level: "high" as const, title: `${decisions.length} محاولات تحتاج قراراً`, hint: "لم يؤكد المشرف تسليمها، أو انتهت جلستها دون تأكيدها: اعتمدها أو ألغها مع ملاحظة.", href: "/staff/exam/manage/review", action: "راجعها" }]
        : []),
      ...(noSitting.length
        ? [{ id: "no-sitting", level: "work" as const, title: `${noSitting.length} متقدمين بلا اختبار باقٍ لهم`, hint: "غابوا عن جلستهم ولا اختبار استدراكي لصفتهم في قاعاتهم بعد.", href: "/staff/exam/manage/exams", action: "أنشئ اختباراً استدراكياً" }]
        : []),
      ...(suspicious.length
        ? [{ id: "suspicious", level: "work" as const, title: `${suspicious.length} محاولات بتنبيهات`, hint: "إشارات آلية تدعم القرار وليست إثباتاً: قد تظهر بسبب انقطاع شبكة أو تبديل تطبيق.", href: "/staff/exam/manage/review?t=suspicious", action: "اعرضها" }]
        : []),
    ];

    return {
      rows,
      applicants,
      expected,
      standings,
      count,
      attempts,
      decisions,
      suspicious,
      noCenter,
      noSitting,
      unsupervised,
      short,
      crowded,
      live,
      alerts,
      high: alerts.filter((a) => a.level === "high"),
      passed: rows.filter((r) => resultOf(r.profile).passed && !r.profile.examExempt).length,
      badges: {
        centers: unsupervised.length + new Set(crowded.map((c) => c.center.id)).size,
        people: noCenter.length,
        exams: short.length + (noSitting.length ? 1 : 0),
        live: live.length,
        review: decisions.length,
      },
    };
  }, [rows, halls, bank]);
}

export type ExamDesk = ReturnType<typeof useExamDesk>;

/** Where a test stands across the halls it is sat in, and how its applicants fared */
export function useExamProgress() {
  const halls = useHalls();
  const desk = useExamDesk();
  return (e: ExamDef) => {
    const centers = halls.live.filter((c) => targets(e, c.id));
    const stages = centers.map((c) => stageOf(halls.runs[runKey(e.id, c.id)]));
    const closed = stages.filter((s) => s === "closed").length;
    const live = stages.filter((s) => s === "open" || s === "running").length;
    const expected = desk.expected.filter((a) => a.sitting?.exam.id === e.id).length;
    const runs = Object.entries(halls.runs).filter(([k]) => k.startsWith(`${e.id}@`));
    const mine = desk.attempts.filter((a) => a.examId === e.id);
    const confirmed = mine.filter((a) => a.status === "confirmed");
    const absent = desk.rows.filter((r) => desk.standings.get(r.id) === "absent" && halls.sittingOf(r.id, e.role)?.exam.id === e.id).length;
    const label = e.status === "archived" ? "مؤرشف" : e.status === "draft" ? "مسودة — لا يُجلس له" : live ? `جارٍ في ${live} قاعات` : closed === centers.length && closed > 0 ? "انتهى في كل القاعات" : closed ? `انتهى في ${closed} من ${centers.length}` : "لم يبدأ";
    const tone = e.status !== "published" ? ("maroon" as const) : live ? ("green" as const) : closed ? ("gold" as const) : ("muted" as const);
    return {
      centers: centers.length,
      closed,
      live,
      expected,
      present: runs.reduce((a, [, r]) => a + Object.keys(r.present).length, 0),
      absent,
      sat: mine.filter((a) => a.attempt.submittedAt).length,
      confirmed: confirmed.length,
      passed: confirmed.filter((a) => a.passed).length,
      label,
      tone,
    };
  };
}

/** The exam system's events, newest first: its records, and the director's when `important` */
export function useExamEvents(importantOnly = false) {
  return useSystemEvents("exams", importantOnly);
}
