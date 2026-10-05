"use client";

import { useMemo } from "react";
import { shortageOf } from "@/lib/data/admin-exam";
import { resultOf } from "@/app/administrator/_lib/admin";
import { useExamBank, useExamRules, type ExamRules } from "@/app/administrator/_lib/admin-rules";
import { mustSit, roleKeyOf, runKey, stageOf, targets, useHalls, type ExamCenter, type ExamDef, type Halls, type Sitting } from "@/app/administrator/_lib/halls";
import { awaitsOral, useAdminRows, type AdminRow } from "../../_components/data";
import { useSystemEvents, type Alert } from "../../_components/system";

export type { Alert } from "../../_components/system";

/**
 * The exam system seen whole, for its owner and for the director: who still has to sit and where, where
 * each applicant stands, and what needs doing. Every screen of the system reads from here, so a number
 * is the same on the owner's home, his sections, his dashboard and the director's board.
 */

/** Someone who still has to sit the written: his role, his centre, and the sitting he is expected at */
export type Applicant = { row: AdminRow; role: string; center?: ExamCenter; moved: boolean; sitting?: Sitting };

/** Where one applicant stands, from his sitting to his announced result */
export type Standing = "exempt" | "incomplete" | "waiting" | "absent" | "grading" | "below" | "oral" | "ready" | "published";

export const STANDING: Record<Standing, { label: string; tone: "green" | "gold" | "maroon" | "muted" }> = {
  waiting: { label: "لم يُمتحَن بعد", tone: "muted" },
  absent: { label: "غائب عن جلسته", tone: "maroon" },
  grading: { label: "قيد التصحيح", tone: "gold" },
  oral: { label: "بانتظار الشفهي", tone: "gold" },
  ready: { label: "جاهزة للإعلان", tone: "gold" },
  published: { label: "أُعلنت", tone: "green" },
  below: { label: "دون حد الكتابي", tone: "maroon" },
  exempt: { label: "معفى من الامتحانين", tone: "green" },
  incomplete: { label: "طلبه غير مكتمل", tone: "muted" },
};

export function standingOf(r: AdminRow, rules: ExamRules, halls: Halls): Standing {
  const p = r.profile;
  if (p.examExempt) return "exempt";
  if (p.resultPublishedAt) return "published";
  const res = resultOf(p, rules);
  if (res.final !== undefined) return "ready";
  if (p.exam?.submittedAt && p.exam.score === undefined) return "grading";
  if (awaitsOral(r, rules)) return "oral";
  if (res.written !== undefined) return "below";
  if (!mustSit(p)) return "incomplete";
  const s = halls.sittingOf(r.id, roleKeyOf(p.positions[0] ?? r.position));
  return s?.stage === "closed" && !s.run?.present[r.id] ? "absent" : "waiting";
}


/** The written answers still to grade, paper by paper */
export function usePendingWritten() {
  const rows = useAdminRows();
  return useMemo(
    () =>
      rows.flatMap((r) => {
        const e = r.profile.exam;
        const ids = (e?.toGrade ?? []).filter((id) => e?.marks?.[id] === undefined);
        return e?.submittedAt && ids.length ? [{ row: r, ids }] : [];
      }),
    [rows],
  );
}

export function useExamDesk() {
  const rows = useAdminRows();
  const halls = useHalls();
  const rules = useExamRules();
  const bank = useExamBank();
  const pendingWritten = usePendingWritten();

  return useMemo(() => {
    const applicants: Applicant[] = rows
      .filter((r) => mustSit(r.profile))
      .map((r) => {
        const role = roleKeyOf(r.profile.positions[0] ?? r.position);
        const center = halls.centerOf(r.id);
        return { row: r, role, center, moved: !!center && halls.moved[r.id] === center.id, sitting: center ? halls.sittingOf(r.id, role) : undefined };
      });
    const standings = new Map(rows.map((r) => [r.id, standingOf(r, rules, halls)]));
    const count = (s: Standing) => [...standings.values()].filter((x) => x === s).length;

    // Expected at a sitting that has not closed yet
    const expected = applicants.filter((a) => a.sitting && a.sitting.stage !== "closed");
    const noCenter = applicants.filter((a) => !a.center);
    // In a centre, but no exam left to sit there: absent with no make-up, or his exam stopped
    const noSitting = applicants.filter((a) => a.center && (!a.sitting || a.sitting.stage === "closed"));
    const unsupervised = halls.live.filter((c) => !halls.supervisors[c.id] && expected.some((a) => a.center?.id === c.id));
    const short = halls.exams.filter((e) => !e.off).map((exam) => ({ exam, missing: shortageOf(bank, exam) })).filter((x) => x.missing > 0);
    const crowded = halls.live.flatMap((c) =>
      c.capacity
        ? halls.exams
            .map((exam) => ({ center: c, exam, n: expected.filter((a) => a.center?.id === c.id && a.sitting?.exam.id === exam.id).length }))
            .filter((x) => x.n > c.capacity!)
        : [],
    );
    const live = Object.entries(halls.runs).filter(([, r]) => r.openedAt && !r.endedAt);
    const answers = pendingWritten.reduce((a, p) => a + p.ids.length, 0);
    const oral = count("oral");
    const ready = count("ready");

    // Blockers first, then the rest; each group in the order the work is done: centres, bank and exams, applicants, results
    const alerts: Alert[] = [
      ...unsupervised.map((c) => ({
        id: `sup-${c.id}`,
        level: "high" as const,
        title: `${c.name} بلا مشرف قاعة`,
        hint: `فيه ${expected.filter((a) => a.center?.id === c.id).length} متقدمين ينتظرون امتحانهم، ولا تُفتح قاعته دون مشرف.`,
        href: "/staff/exam/manage",
        action: "أسند مشرفاً",
      })),
      ...crowded.map(({ center, exam, n }) => ({
        id: `full-${center.id}-${exam.id}`,
        level: "high" as const,
        title: `${center.name}: ${n} متقدماً في ${exam.name}، والمقاعد ${center.capacity}`,
        hint: "انقل بعضهم إلى مركز آخر، أو عدّل سعة المركز.",
        href: `/staff/exam/manage/people?c=${center.id}`,
        action: "وزّع المتقدمين",
      })),
      ...short.map(({ exam, missing }) => ({
        id: `short-${exam.id}`,
        level: "high" as const,
        title: `${exam.name}: ينقص البنك ${missing} أسئلة`,
        hint: "يطلب الامتحان أسئلة أكثر مما في بنك صفته، فتخرج الأوراق ناقصة: أضف أسئلة إلى البنك أو خفّف العدد.",
        href: "/staff/exam/manage/exams",
        action: "راجع الامتحان",
      })),
      ...(noCenter.length
        ? [{ id: "no-center", level: "high" as const, title: `${noCenter.length} متقدمين بلا مركز امتحاني`, hint: "محافظة قيدهم لا يخدمها أي مركز فعّال.", href: "/staff/exam/manage/people?c=none", action: "أسندهم إلى مركز" }]
        : []),
      ...(noSitting.length
        ? [{ id: "no-sitting", level: "work" as const, title: `${noSitting.length} متقدمين بلا امتحان باقٍ لهم`, hint: "غابوا عن امتحانهم ولا امتحان استدراكي لصفتهم في مراكزهم بعد.", href: "/staff/exam/manage/exams", action: "أنشئ امتحاناً استدراكياً" }]
        : []),
      ...(answers
        ? [{ id: "grade", level: "work" as const, title: `${answers} إجابات تحريرية تنتظر التصحيح`, hint: `في ${pendingWritten.length} أوراق.`, href: "/staff/exam/manage/results?s=grading", action: "صحّح" }]
        : []),
      ...(oral ? [{ id: "oral", level: "work" as const, title: `${oral} متقدمين بانتظار نتيجة الشفهي`, hint: `بلغوا حد الكتابي (${rules.writtenMin}).`, href: "/staff/exam/manage/results?s=oral", action: "أدخل النتائج" }] : []),
      ...(ready ? [{ id: "ready", level: "work" as const, title: `${ready} نتائج جاهزة للإعلان`, hint: "لا يراها أصحابها قبل إعلانها.", href: "/staff/exam/manage/results?s=ready", action: "أعلنها" }] : []),
    ];

    return {
      rows,
      applicants,
      expected,
      standings,
      count,
      noCenter,
      noSitting,
      unsupervised,
      short,
      crowded,
      live,
      answers,
      papers: pendingWritten,
      alerts,
      high: alerts.filter((a) => a.level === "high"),
      passed: rows.filter((r) => resultOf(r.profile, rules).passed).length,
      badges: {
        centers: unsupervised.length + new Set(crowded.map((c) => c.center.id)).size,
        people: noCenter.length,
        exams: short.length + (noSitting.length ? 1 : 0),
        results: (answers ? 1 : 0) + (oral ? 1 : 0) + (ready ? 1 : 0),
      },
    };
  }, [rows, halls, rules, bank, pendingWritten]);
}

export type ExamDesk = ReturnType<typeof useExamDesk>;

/** Where an exam stands across the centres it is sat in, and how its applicants fared */
export function useExamProgress() {
  const halls = useHalls();
  const desk = useExamDesk();
  const rules = useExamRules();
  return (e: ExamDef) => {
    const centers = halls.live.filter((c) => targets(e, c.id));
    const stages = centers.map((c) => stageOf(halls.runs[runKey(e.id, c.id)]));
    const closed = stages.filter((s) => s === "closed").length;
    const live = stages.filter((s) => s === "open" || s === "running").length;
    const expected = desk.expected.filter((a) => a.sitting?.exam.id === e.id).length;
    const runs = Object.entries(halls.runs).filter(([k]) => k.startsWith(`${e.id}@`));
    const sat = desk.rows.filter((r) => r.profile.exam?.submittedAt && r.profile.exam.hall?.startsWith(`${e.id}@`));
    const absent = desk.rows.filter((r) => desk.standings.get(r.id) === "absent" && halls.sittingOf(r.id, roleKeyOf(r.profile.positions[0] ?? r.position))?.exam.id === e.id).length;
    const label = e.off ? "موقوف" : live ? `جارٍ في ${live} مراكز` : closed === centers.length && closed > 0 ? "انتهى في كل المراكز" : closed ? `انتهى في ${closed} من ${centers.length}` : "لم يبدأ";
    const tone = e.off ? ("maroon" as const) : live ? ("green" as const) : closed ? ("gold" as const) : ("muted" as const);
    return {
      centers: centers.length,
      closed,
      live,
      expected,
      present: runs.reduce((a, [, r]) => a + Object.keys(r.present).length, 0),
      absent,
      sat: sat.length,
      passed: sat.filter((r) => resultOf(r.profile, rules).passed).length,
      label,
      tone,
    };
  };
}

/** The exam system's events, newest first: its records, and the director's when `important` */
export function useExamEvents(importantOnly = false) {
  return useSystemEvents("exams", importantOnly);
}
