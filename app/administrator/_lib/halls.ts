"use client";

import { useMemo } from "react";
import { DEFAULT_BLUEPRINTS, drawPaper, markPaper, withMarks, type ExamBlueprint, type ExamCenter, type ExamDef, type ExamQuestion } from "@/lib/data/admin-exam";
import { getPerson } from "@/lib/registry";
import { getStaff } from "@/lib/staff";
import { setState, useStore, type AdminProfile, type HallRun } from "@/lib/store";
import { APPLIED_ROLES, POSITIONS } from "./admin";
import { examRoleOf, structureNow } from "./structure";

export type { ExamCenter, ExamDef } from "@/lib/data/admin-exam";

/**
 * The written exam is sat in a hall, not at home. Every role sits together: on its exam's day, all the
 * applicants for that role sit at once, each in the hall of his centre, on his own account opened there.
 * The exam system's owner keeps the centres and the exams and gives each centre a supervisor; the
 * supervisor opens the hall, confirms who is present, starts the exam for all of them, ends it and closes
 * the hall. Whoever misses his role's main exam sits its make-up exam, when the owner creates one.
 */

/** One centre per governorate or group of governorates; an applicant sits in his registry's governorate's */
export const EXAM_CENTERS: ExamCenter[] = [
  { id: "damascus", name: "مركز دمشق", governorates: ["دمشق", "القنيطرة"], hall: "قاعة الامتحانات — مبنى مديرية الحج، المزة", at: { lat: 33.5003, lng: 36.2445 }, capacity: 120 },
  { id: "rif", name: "مركز ريف دمشق", governorates: ["ريف دمشق"], hall: "القاعة الكبرى — مجمّع دوما الإداري", at: { lat: 33.5711, lng: 36.4019 }, capacity: 80 },
  { id: "aleppo", name: "مركز حلب", governorates: ["حلب"], hall: "قاعة الامتحانات — مديرية أوقاف حلب", at: { lat: 36.2021, lng: 37.1343 }, capacity: 100 },
  { id: "homs", name: "مركز حمص", governorates: ["حمص"], hall: "قاعة الامتحانات — مديرية أوقاف حمص", at: { lat: 34.7324, lng: 36.7137 }, capacity: 60 },
  { id: "hama", name: "مركز حماة", governorates: ["حماة"], hall: "قاعة الامتحانات — مديرية أوقاف حماة", at: { lat: 35.1318, lng: 36.7578 }, capacity: 60 },
  { id: "latakia", name: "مركز اللاذقية", governorates: ["اللاذقية", "طرطوس"], hall: "قاعة الامتحانات — مديرية أوقاف اللاذقية", at: { lat: 35.5317, lng: 35.79 }, capacity: 60 },
  { id: "idlib", name: "مركز إدلب", governorates: ["إدلب"], hall: "قاعة الامتحانات — مديرية أوقاف إدلب", at: { lat: 35.9306, lng: 36.6339 }, capacity: 50 },
  { id: "daraa", name: "مركز درعا", governorates: ["درعا", "السويداء"], hall: "قاعة الامتحانات — مديرية أوقاف درعا", at: { lat: 32.6189, lng: 36.1021 }, capacity: 50 },
  { id: "deir", name: "مركز دير الزور", governorates: ["دير الزور", "الرقة", "الحسكة"], hall: "قاعة الامتحانات — مديرية أوقاف دير الزور", at: { lat: 35.3359, lng: 40.1408 }, capacity: 50 },
];

/** The supervisors the season opens with; the owner assigns the other centres */
export const DEFAULT_SUPERVISORS: Record<string, string> = { damascus: "nisreen", aleppo: "hiba", homs: "rima" };

/** Each role's main exam: the same day and hour in every centre */
export const DEFAULT_SESSIONS: Record<string, { date: string; time: string }> = {
  "group-head": { date: "26 ربيع الآخر 1448", time: "09:00" },
  "group-deputy": { date: "25 ربيع الآخر 1448", time: "09:00" },
  "guide-m": { date: "23 ربيع الآخر 1448", time: "09:00" },
  "guide-f": { date: "23 ربيع الآخر 1448", time: "12:00" },
  tech: { date: "27 ربيع الآخر 1448", time: "09:00" },
};

/** A sitting is one exam in one centre */
export const runKey = (exam: string, center: string) => `${exam}@${center}`;

/** A role key from a stored role (the portal stores keys; the seeded files carry Arabic labels) */
export function roleKeyOf(position: string | undefined) {
  // A role tied to another sits that role's exam («مرشد ديني» the guide's): its sitting is the family's
  const key = structureNow().roles.find((r) => r.key === position || r.name === position)?.key ?? POSITIONS.find((p) => p.key === position || p.label === position)?.key ?? "";
  return key ? examRoleOf(key) : "";
}

export const roleLabelOf = (role: string) => APPLIED_ROLES.find((r) => r.key === role)?.label ?? role;

/** The centre of an applicant's registry governorate, among the active centres */
export function autoCenter(id: string, centers: ExamCenter[]) {
  const gov = getPerson(id)?.governorate;
  return centers.find((c) => !c.off && !!gov && c.governorates.includes(gov));
}

/** The centre an applicant sits in: where the owner moved him, if that centre is active, else his governorate's */
export function centerFor(id: string, centers: ExamCenter[], moved?: Record<string, string>) {
  const to = moved?.[id] ? centers.find((c) => c.id === moved[id] && !c.off) : undefined;
  return to ?? autoCenter(id, centers);
}

export const targets = (e: ExamDef, center: string) => !e.centers?.length || e.centers.includes(center);

export type HallStage = "idle" | "open" | "running" | "ended" | "closed";

export function stageOf(run: HallRun | undefined): HallStage {
  if (!run?.openedAt) return "idle";
  if (run.closedAt) return "closed";
  if (run.endedAt) return "ended";
  if (run.startedAt) return "running";
  return "open";
}

export const STAGE_LABEL: Record<HallStage, string> = { idle: "لم تُفتح", open: "القاعة مفتوحة", running: "الامتحان جارٍ", ended: "انتهى الامتحان", closed: "أُغلقت القاعة" };

export type Sitting = { exam: ExamDef; key: string; run: HallRun | undefined; stage: HallStage };

/**
 * The sitting of an applicant of a role in his centre: the one he was present at; else the first active
 * exam of his role (main before make-up) not closed there yet; else the last one closed without him.
 */
export function sittingFor(id: string, role: string, center: string | undefined, exams: ExamDef[], runs: Record<string, HallRun>): Sitting | undefined {
  if (!center) return undefined;
  const mine = exams.filter((e) => e.role === role && targets(e, center));
  const at = (e: ExamDef): Sitting => {
    const key = runKey(e.id, center);
    return { exam: e, key, run: runs[key], stage: stageOf(runs[key]) };
  };
  const all = mine.map(at);
  return all.find((s) => !!s.run?.present[id]) ?? all.find((s) => !s.exam.off && s.stage !== "closed") ?? all.filter((s) => s.stage === "closed").at(-1);
}

/** Who sits the written this season in a sitting: paid, eligible, not exempt, and not already sent elsewhere */
export function mustSit(p: Pick<AdminProfile, "eligibleAt" | "feePaidAt" | "examExempt" | "exam"> | undefined, key?: string) {
  return !!p?.eligibleAt && !!p.feePaidAt && !p.examExempt && (!p.exam?.submittedAt || (!!key && p.exam.hall === key));
}

/** The five main exams as the season opens, with any change made before exams were kept whole */
function mainExams(sessions: Record<string, { date: string; time: string }>, blueprints: Record<string, ExamBlueprint>): ExamDef[] {
  return APPLIED_ROLES.map((r) => ({
    id: r.key,
    name: `امتحان ${r.label}`,
    role: r.key,
    kind: "main",
    ...(DEFAULT_SESSIONS[r.key] ?? { date: "", time: "" }),
    ...sessions[r.key],
    ...(blueprints[r.key] ?? DEFAULT_BLUEPRINTS[r.key]),
  }));
}

/** The halls, centres and exams as the exam system's owner left them, over the season's defaults */
export function useHalls() {
  const h = useStore((s) => s.examHalls);
  const oldBlueprints = useStore((s) => s.adminRules.blueprints);
  return useMemo(() => {
    const supervisors: Record<string, string> = { ...DEFAULT_SUPERVISORS, ...h?.supervisors };
    const centers = h?.centers ?? EXAM_CENTERS;
    const live = centers.filter((c) => !c.off);
    const moved = h?.moved ?? {};
    const runs = h?.runs ?? {};
    const stored = h?.exams ?? {};
    const mains = mainExams(h?.sessions ?? {}, oldBlueprints ?? {}).map((e) => stored[e.id] ?? e);
    const exams = [...mains, ...Object.values(stored).filter((e) => !mains.some((m) => m.id === e.id))];
    const byId = new Map(exams.map((e) => [e.id, e]));
    return {
      supervisors,
      centers,
      live,
      moved,
      runs,
      exams,
      examById: (id: string) => byId.get(id),
      centerById: (id: string | undefined) => centers.find((c) => c.id === id),
      centerOf: (id: string) => centerFor(id, centers, moved),
      autoCenterOf: (id: string) => autoCenter(id, centers),
      sittingOf: (id: string, role: string) => sittingFor(id, role, centerFor(id, centers, moved)?.id, exams, runs),
      supervisorOf: (center: string) => (supervisors[center] ? getStaff(supervisors[center]) : null),
      centersOf: (staffId: string) => live.filter((c) => supervisors[c.id] === staffId),
    };
  }, [h, oldBlueprints]);
}

export type Halls = ReturnType<typeof useHalls>;

/** An administrator's own sitting: his centre, its hall, his exam's day, and the hall as its supervisor runs it */
export function useMyHall(id: string, p: AdminProfile | undefined) {
  const halls = useHalls();
  const role = roleKeyOf(p?.positions[0]);
  return useMemo(() => {
    const center = halls.centerOf(id);
    const sitting = center ? halls.sittingOf(id, role) : undefined;
    const exam = sitting?.exam;
    return {
      role,
      exam,
      center,
      key: sitting?.key ?? "",
      run: sitting?.run,
      stage: sitting?.stage ?? ("idle" as HallStage),
      session: exam ? { date: exam.date, time: exam.time } : undefined,
      supervisor: center ? halls.supervisorOf(center.id) : null,
    };
  }, [halls, id, role]);
}

// ───────────────────────── The supervisor's actions ─────────────────────────

const emptyRun = (): HallRun => ({ joined: {}, present: {} });

function patchRun(key: string, f: (r: HallRun) => HallRun) {
  setState((s) => {
    const runs = s.examHalls?.runs ?? {};
    return { ...s, examHalls: { ...s.examHalls, runs: { ...runs, [key]: f(runs[key] ?? emptyRun()) } } };
  });
}

/** What a paper needs: the bank, the exam as built this season, and the role whose questions it draws */
export type PaperSource = { bank: ExamQuestion[]; blueprint: ExamBlueprint; role: string };

/** A fresh paper for one applicant, timed from the hall's start so a late arrival keeps only what is left */
function freshExam(id: string, key: string, startedAt: number, src: PaperSource) {
  return { startedAt, hall: key, minutes: src.blueprint.minutes, paper: drawPaper(src.bank, src.blueprint, src.role, id), answers: {} };
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
    setState((s) => {
      const run = s.examHalls?.runs?.[key] ?? emptyRun();
      const runs = { ...s.examHalls.runs, [key]: { ...run, present: { ...run.present, [id]: Date.now() } } };
      const p = s.admins[id];
      const admins = run.startedAt && p && !p.exam ? { ...s.admins, [id]: { ...p, exam: freshExam(id, key, run.startedAt, src) } } : s.admins;
      return { ...s, admins, examHalls: { ...s.examHalls, runs } };
    });
  },
  /** Everyone present starts at the same moment, each on a paper drawn for him */
  start(key: string, src: PaperSource) {
    const at = Date.now();
    setState((s) => {
      const run = s.examHalls?.runs?.[key] ?? emptyRun();
      const admins = { ...s.admins };
      for (const id of Object.keys(run.present)) if (admins[id] && !admins[id].exam) admins[id] = { ...admins[id], exam: freshExam(id, key, at, src) };
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
  // ── the exam system's owner ──
  assignSupervisor(center: string, staffId: string) {
    setState((s) => ({ ...s, examHalls: { ...s.examHalls, supervisors: { ...s.examHalls.supervisors, [center]: staffId } } }));
  },
  /** Applicants to another centre than their governorate's; no centre sends them back to it */
  move(ids: string[], center: string | undefined) {
    setState((s) => {
      const moved = { ...s.examHalls.moved };
      for (const id of ids) {
        if (center) moved[id] = center;
        else delete moved[id];
      }
      return { ...s, examHalls: { ...s.examHalls, moved } };
    });
  },
  /** A centre saved: a governorate it takes is no longer served by any other centre */
  saveCenter(c: ExamCenter, current: ExamCenter[]) {
    const strip = (x: ExamCenter) => ({ ...x, governorates: x.governorates.filter((g) => !c.governorates.includes(g)) });
    const centers = current.some((x) => x.id === c.id) ? current.map((x) => (x.id === c.id ? c : strip(x))) : [...current.map(strip), c];
    setState((s) => ({ ...s, examHalls: { ...s.examHalls, centers } }));
  },
  saveExam(e: ExamDef) {
    setState((s) => ({ ...s, examHalls: { ...s.examHalls, exams: { ...s.examHalls.exams, [e.id]: e } } }));
  },
  /** Only an exam the owner created, and never sat anywhere */
  deleteExam(id: string) {
    setState((s) => {
      const exams = { ...s.examHalls.exams };
      delete exams[id];
      return { ...s, examHalls: { ...s.examHalls, exams } };
    });
  },
  /** Demo: the main exams back to what the platform ships, the created ones gone */
  resetExams() {
    setState((s) => ({ ...s, examHalls: { ...s.examHalls, exams: undefined, sessions: undefined } }));
  },
};
