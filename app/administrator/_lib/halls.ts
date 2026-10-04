"use client";

import { useMemo } from "react";
import { drawPaper, markPaper, withMarks, type ExamBlueprint, type ExamQuestion } from "@/lib/data/admin-exam";
import { getPerson } from "@/lib/registry";
import { getStaff } from "@/lib/staff";
import { setState, useStore, type AdminProfile, type HallRun } from "@/lib/store";
import { APPLIED_ROLES, POSITIONS } from "./admin";

/**
 * The written exam is sat in a hall, not at home. Every role sits together: on its day, all the
 * applicants for that role sit at once, each in the hall of his centre, on his own account opened
 * there. The exam desk gives each centre a supervisor; the supervisor opens the hall, confirms who is
 * present, starts the exam for all of them, ends it and closes the hall.
 */

export type ExamCenter = { id: string; name: string; governorates: string[]; hall: string };

/** One centre per governorate or group of governorates; an applicant sits in his registry's governorate's */
export const EXAM_CENTERS: ExamCenter[] = [
  { id: "damascus", name: "مركز دمشق", governorates: ["دمشق", "القنيطرة"], hall: "قاعة الامتحانات — مبنى مديرية الحج، المزة" },
  { id: "rif", name: "مركز ريف دمشق", governorates: ["ريف دمشق"], hall: "القاعة الكبرى — مجمّع دوما الإداري" },
  { id: "aleppo", name: "مركز حلب", governorates: ["حلب"], hall: "قاعة الامتحانات — مديرية أوقاف حلب" },
  { id: "homs", name: "مركز حمص", governorates: ["حمص"], hall: "قاعة الامتحانات — مديرية أوقاف حمص" },
  { id: "hama", name: "مركز حماة", governorates: ["حماة"], hall: "قاعة الامتحانات — مديرية أوقاف حماة" },
  { id: "latakia", name: "مركز اللاذقية", governorates: ["اللاذقية", "طرطوس"], hall: "قاعة الامتحانات — مديرية أوقاف اللاذقية" },
  { id: "idlib", name: "مركز إدلب", governorates: ["إدلب"], hall: "قاعة الامتحانات — مديرية أوقاف إدلب" },
  { id: "daraa", name: "مركز درعا", governorates: ["درعا", "السويداء"], hall: "قاعة الامتحانات — مديرية أوقاف درعا" },
  { id: "deir", name: "مركز دير الزور", governorates: ["دير الزور", "الرقة", "الحسكة"], hall: "قاعة الامتحانات — مديرية أوقاف دير الزور" },
];

/** The supervisors the season opens with; the exam desk assigns the other centres */
export const DEFAULT_SUPERVISORS: Record<string, string> = { damascus: "nisreen", aleppo: "hiba", homs: "rima" };

/** Each role's sitting: the same day and hour in every centre */
export const DEFAULT_SESSIONS: Record<string, { date: string; time: string }> = {
  "group-head": { date: "15 ربيع الآخر 1448", time: "09:00" },
  "group-deputy": { date: "16 ربيع الآخر 1448", time: "09:00" },
  "guide-m": { date: "17 ربيع الآخر 1448", time: "09:00" },
  "guide-f": { date: "17 ربيع الآخر 1448", time: "12:00" },
  tech: { date: "18 ربيع الآخر 1448", time: "09:00" },
};

export const runKey = (role: string, center: string) => `${role}@${center}`;

/** A role key from a stored role (the portal stores keys; the seeded files carry Arabic labels) */
export function roleKeyOf(position: string | undefined) {
  return POSITIONS.find((p) => p.key === position || p.label === position)?.key ?? "";
}

export const centerById = (id: string | undefined) => EXAM_CENTERS.find((c) => c.id === id);

/** The centre an applicant sits in: where the exam desk moved him, else his registry governorate's */
export function centerOf(id: string, moved?: Record<string, string>): ExamCenter | undefined {
  if (moved?.[id]) return centerById(moved[id]);
  const gov = getPerson(id)?.governorate;
  return EXAM_CENTERS.find((c) => !!gov && c.governorates.includes(gov));
}

export type HallStage = "idle" | "open" | "running" | "ended" | "closed";

export function stageOf(run: HallRun | undefined): HallStage {
  if (!run?.openedAt) return "idle";
  if (run.closedAt) return "closed";
  if (run.endedAt) return "ended";
  if (run.startedAt) return "running";
  return "open";
}

export const STAGE_LABEL: Record<HallStage, string> = { idle: "لم تُفتح", open: "القاعة مفتوحة", running: "الامتحان جارٍ", ended: "انتهى الامتحان", closed: "أُغلقت القاعة" };

/** Who sits the written this season in a sitting: paid, eligible, not exempt, and not already sent elsewhere */
export function mustSit(p: Pick<AdminProfile, "eligibleAt" | "feePaidAt" | "examExempt" | "exam"> | undefined, key?: string) {
  return !!p?.eligibleAt && !!p.feePaidAt && !p.examExempt && (!p.exam?.submittedAt || (!!key && p.exam.hall === key));
}

/** The halls as the exam desk left them, over the season's defaults */
export function useHalls() {
  const h = useStore((s) => s.examHalls);
  return useMemo(() => {
    const supervisors: Record<string, string> = { ...DEFAULT_SUPERVISORS, ...h?.supervisors };
    const sessions = { ...DEFAULT_SESSIONS, ...h?.sessions };
    return {
      supervisors,
      sessions,
      moved: h?.moved ?? {},
      runs: h?.runs ?? {},
      supervisorOf: (center: string) => (supervisors[center] ? getStaff(supervisors[center]) : null),
      centersOf: (staffId: string) => EXAM_CENTERS.filter((c) => supervisors[c.id] === staffId),
    };
  }, [h]);
}

/** An administrator's own sitting: his centre, its hall, his role's day, and the hall as its supervisor runs it */
export function useMyHall(id: string, p: AdminProfile | undefined) {
  const halls = useHalls();
  const role = roleKeyOf(p?.positions[0]);
  const center = centerOf(id, halls.moved);
  const key = center ? runKey(role, center.id) : "";
  const run = key ? halls.runs[key] : undefined;
  return { role, center, key, run, stage: stageOf(run), session: halls.sessions[role], supervisor: center ? halls.supervisorOf(center.id) : null };
}

export const roleLabelOf = (role: string) => APPLIED_ROLES.find((r) => r.key === role)?.label ?? role;

// ───────────────────────── The supervisor's actions ─────────────────────────

const emptyRun = (): HallRun => ({ joined: {}, present: {} });

function patchRun(key: string, f: (r: HallRun) => HallRun) {
  setState((s) => {
    const runs = s.examHalls?.runs ?? {};
    return { ...s, examHalls: { ...s.examHalls, runs: { ...runs, [key]: f(runs[key] ?? emptyRun()) } } };
  });
}

/** What a paper needs: the bank and the role's exam as built this season */
export type PaperSource = { bank: ExamQuestion[]; blueprint: ExamBlueprint };

/** A fresh paper for one applicant, timed from the hall's start so a late arrival keeps only what is left */
function freshExam(id: string, role: string, key: string, startedAt: number, src: PaperSource) {
  return { startedAt, hall: key, minutes: src.blueprint.minutes, paper: drawPaper(src.bank, src.blueprint, role, id), answers: {} };
}

/** A paper sent: the automated questions marked at once, the written ones left to a grader */
export function sentExam(exam: NonNullable<AdminProfile["exam"]>, bank: ExamQuestion[], at = Date.now()): NonNullable<AdminProfile["exam"]> {
  const { tally, toGrade, score } = markPaper(exam.paper ?? [], bank, exam.answers);
  return { ...exam, submittedAt: at, tally, toGrade, provisional: score, score: toGrade.length ? undefined : score };
}

/** A grader's mark on one written answer; the written mark is final once none is left */
export function markedExam(exam: NonNullable<AdminProfile["exam"]>, qid: number, mark: number, by: string): NonNullable<AdminProfile["exam"]> {
  const marks = { ...exam.marks, [qid]: mark };
  const { score, pending } = withMarks(exam.paper ?? [], exam.tally ?? {}, exam.toGrade ?? [], marks);
  return { ...exam, marks, provisional: score, score: pending.length ? undefined : score, gradedBy: by, gradedAt: Date.now() };
}

export const hallActions = {
  open(key: string, by: string) {
    patchRun(key, (r) => ({ ...r, openedAt: Date.now(), openedBy: by }));
  },
  /** The applicant opened his account in the open hall */
  join(key: string, id: string) {
    patchRun(key, (r) => (r.joined[id] ? r : { ...r, joined: { ...r.joined, [id]: Date.now() } }));
  },
  /** The supervisor matched him with his identity card. After the start, his paper opens with the time left */
  confirm(key: string, id: string, src: PaperSource) {
    const role = key.split("@")[0];
    setState((s) => {
      const run = s.examHalls?.runs?.[key] ?? emptyRun();
      const runs = { ...s.examHalls.runs, [key]: { ...run, present: { ...run.present, [id]: Date.now() } } };
      const p = s.admins[id];
      const admins = run.startedAt && p && !p.exam ? { ...s.admins, [id]: { ...p, exam: freshExam(id, role, key, run.startedAt, src) } } : s.admins;
      return { ...s, admins, examHalls: { ...s.examHalls, runs } };
    });
  },
  /** Everyone present starts at the same moment, each on a paper drawn for him */
  start(key: string, src: PaperSource) {
    const role = key.split("@")[0];
    const at = Date.now();
    setState((s) => {
      const run = s.examHalls?.runs?.[key] ?? emptyRun();
      const admins = { ...s.admins };
      for (const id of Object.keys(run.present)) if (admins[id] && !admins[id].exam) admins[id] = { ...admins[id], exam: freshExam(id, role, key, at, src) };
      return { ...s, admins, examHalls: { ...s.examHalls, runs: { ...s.examHalls.runs, [key]: { ...run, startedAt: at } } } };
    });
  },
  /** Time is up for the hall: every paper still open is sent as it stands */
  end(key: string, bank: ExamQuestion[]) {
    const at = Date.now();
    setState((s) => {
      const run = s.examHalls?.runs?.[key] ?? emptyRun();
      const admins = { ...s.admins };
      for (const id of Object.keys(run.present)) {
        const e = admins[id]?.exam;
        if (e && !e.submittedAt && e.hall === key) admins[id] = { ...admins[id], exam: sentExam(e, bank, at) };
      }
      return { ...s, admins, examHalls: { ...s.examHalls, runs: { ...s.examHalls.runs, [key]: { ...run, endedAt: at } } } };
    });
  },
  close(key: string) {
    patchRun(key, (r) => ({ ...r, closedAt: Date.now() }));
  },
  /** Demo only: the sitting back to before it opened */
  reset(key: string) {
    setState((s) => {
      const runs = { ...s.examHalls.runs };
      delete runs[key];
      return { ...s, examHalls: { ...s.examHalls, runs } };
    });
  },
  // ── the exam desk ──
  assignSupervisor(center: string, staffId: string) {
    setState((s) => ({ ...s, examHalls: { ...s.examHalls, supervisors: { ...s.examHalls.supervisors, [center]: staffId } } }));
  },
  move(id: string, center: string | undefined) {
    setState((s) => {
      const moved = { ...s.examHalls.moved };
      if (center) moved[id] = center;
      else delete moved[id];
      return { ...s, examHalls: { ...s.examHalls, moved } };
    });
  },
  setSession(role: string, v: { date: string; time: string }) {
    setState((s) => ({ ...s, examHalls: { ...s.examHalls, sessions: { ...s.examHalls.sessions, [role]: v } } }));
  },
};
