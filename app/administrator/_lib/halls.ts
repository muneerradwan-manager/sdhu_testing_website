"use client";

import { useMemo } from "react";
import { DEFAULT_BLUEPRINTS, DEFAULT_INSTRUCTIONS, asSection, drawPaper, markPaper, type ExamBlueprint, type ExamCenter, type ExamDef, type ExamQuestion } from "@/lib/data/admin-exam";
import { dateOf, useClockTime, useToday } from "@/lib/operations";
import { getPerson } from "@/lib/registry";
import { getStaff } from "@/lib/staff";
import { getState, setState, useStore, type AdminProfile, type Attempt, type AttemptStatus, type HallRun } from "@/lib/store";
import { APPLIED_ROLES, examRolesFor, paperOf, paperPatch, positionKeyOf, statusOf } from "./admin";

export { statusOf };
import { examRoleOf, examRolesOf } from "./structure";

export type { ExamCenter, ExamDef } from "@/lib/data/admin-exam";

/**
 * The test (الاختبار المؤتمت) is sat in a hall, never at home, as the administration's exam platform runs it.
 * A sitting is one test in one hall at its time («الجلسة = اختبار في قاعة بموعد»): its applicants and its
 * supervisor. The supervisor opens the hall (from an hour before its time to the end of its day), checks each
 * applicant in by his barcode or national id, approves his device's entry (matching the pairing code on his
 * screen), starts the test — each one's time from his own entry — and confirms every submission with his PIN on
 * the applicant's device; ending the sitting sends whatever is still open, voids what never started, and records
 * the absent. An attempt he does not confirm goes to the administration, which approves or voids it.
 * Whoever misses his role's main test sits its make-up test, when the exam system creates one.
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

/** The demo supervisors' confirmation PIN until each sets his own on his panel (the demo's usual code) */
export const DEFAULT_PINS: Record<string, string> = Object.fromEntries(Object.values(DEFAULT_SUPERVISORS).map((s) => [s, "1448"]));

/** Each role's main test: the same day and hour in every hall */
export const DEFAULT_SESSIONS: Record<string, { day: string; date: string; time: string }> = {
  "group-head": { day: "2026-10-07", date: "26 ربيع الآخر 1448", time: "09:00" },
  "group-deputy": { day: "2026-10-06", date: "25 ربيع الآخر 1448", time: "09:00" },
  "guide-m": { day: "2026-10-04", date: "23 ربيع الآخر 1448", time: "09:00" },
  "guide-f": { day: "2026-10-04", date: "23 ربيع الآخر 1448", time: "12:00" },
  tech: { day: "2026-10-08", date: "27 ربيع الآخر 1448", time: "09:00" },
};

/** When a test's sittings are held: its day at its hour, on the demo's clock */
export function scheduledAt(e: Pick<ExamDef, "day" | "time"> | undefined) {
  if (!e?.day) return undefined;
  const [h, m] = (e.time || "09:00").split(":").map(Number);
  const d = dateOf(e.day);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime();
}

/** «now» as the demo's clock has it: its day and its hour (the tester moves both from the date bar) */
export function useDemoNow() {
  const today = useToday();
  const time = useClockTime();
  return useMemo(() => {
    const [h, m] = time.split(":").map(Number);
    const d = dateOf(today);
    d.setHours(h || 0, m || 0, new Date().getSeconds(), 0);
    return d.getTime();
  }, [today, time]);
}

/** A sitting is one exam in one centre */
export const runKey = (exam: string, center: string) => `${exam}@${center}`;

/** The exam of a stored role (the portal stores keys; the seeded files carry Arabic labels) */
export function roleKeyOf(position: string | undefined) {
  // A role tied to another sits that role's exam («موجّه ديني أ» the guide's): its sitting is the family's
  const key = positionKeyOf(position);
  return key ? examRoleOf(key) : "";
}

/** Every exam a stored role sits: two for «معاون ومنسق تقني» (the assistant's and the coordinator's) */
export function examRolesOfPosition(position: string | undefined) {
  const key = positionKeyOf(position);
  return key ? examRolesOf(key) : [];
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

/** A sitting's state, as the platform's: scheduled, the hall open, the test running, ended */
export type HallStage = "idle" | "open" | "running" | "closed";

export function stageOf(run: HallRun | undefined): HallStage {
  if (!run?.openedAt) return "idle";
  if (run.closedAt || run.endedAt) return "closed";
  if (run.startedAt) return "running";
  return "open";
}

export const STAGE_LABEL: Record<HallStage, string> = { idle: "مجدولة", open: "القاعة مفتوحة", running: "الاختبار جارٍ", closed: "منتهية" };

export const ATTEMPT_LABEL: Record<AttemptStatus, string> = {
  ready: "مقترن — لم يبدأ",
  active: "يختبر",
  submitted: "سلّم — بانتظار التأكيد",
  confirmed: "مؤكَّد",
  unconfirmed: "غير مؤكَّد",
  voided: "ملغى",
};

/** How many signals the device raised during the attempt */
export function alertsOf(a: Attempt | undefined) {
  const x = a?.alerts ?? {};
  return (x.focusLost ?? 0) + (x.reentries ?? 0) + (x.screenshots ?? 0) + (x.ipChanged ? 1 : 0) + (x.deviceChanged ? 1 : 0) + (x.disconnected ? 1 : 0);
}

export type Sitting = { exam: ExamDef; key: string; run: HallRun | undefined; stage: HallStage };

/**
 * The sitting of an applicant of a role in his centre: the one he is present at now; else the first published
 * test of his role (main before make-up) not closed there yet; else the last one he was present at; else the
 * last one closed without him.
 */
export function sittingFor(id: string, role: string, center: string | undefined, exams: ExamDef[], runs: Record<string, HallRun>): Sitting | undefined {
  if (!center) return undefined;
  const mine = exams.filter((e) => e.role === role && targets(e, center));
  const at = (e: ExamDef): Sitting => {
    const key = runKey(e.id, center);
    return { exam: e, key, run: runs[key], stage: stageOf(runs[key]) };
  };
  const all = mine.map(at);
  const there = (s: Sitting) => !!s.run?.present[id];
  return all.find((s) => there(s) && s.stage !== "closed") ?? all.find((s) => isOpen(s.exam) && s.stage !== "closed") ?? all.filter(there).at(-1) ?? all.filter((s) => s.stage === "closed").at(-1);
}

/**
 * Who sits the written this season in a sitting: paid, eligible, not exempt, and not already sent elsewhere
 * — for one exam of his (`examRole`), or for all of them
 */
export function mustSit(p: Pick<AdminProfile, "eligibleAt" | "feePaidAt" | "examExempt" | "exam" | "exams" | "positions"> | undefined, examRole?: string, key?: string) {
  if (!p?.eligibleAt || !p.feePaidAt || p.examExempt) return false;
  const roles = examRole ? [examRole] : examRolesFor(p);
  if (!roles.length) return !p.exam?.submittedAt || (!!key && p.exam.hall === key);
  return roles.some((r) => {
    const paper = paperOf(p, r);
    return !paper?.submittedAt || (!!key && paper.hall === key);
  });
}

/** The five main tests as the season opens, with any change made before tests were kept whole */
function mainExams(sessions: Record<string, { day?: string; date: string; time: string }>, blueprints: Record<string, ExamBlueprint>): ExamDef[] {
  return APPLIED_ROLES.map((r) => ({
    id: r.key,
    name: `الاختبار المؤتمت لصفة ${r.label}`,
    role: r.key,
    kind: "main",
    status: "published",
    showResult: true,
    instructions: DEFAULT_INSTRUCTIONS,
    pairing: "manual",
    network: true,
    ...(DEFAULT_SESSIONS[r.key] ?? { date: "", time: "" }),
    ...sessions[r.key],
    ...(blueprints[r.key] ?? DEFAULT_BLUEPRINTS[r.key]),
  }));
}

/**
 * A test as stored before tests had a status, a result setting, instructions and an entry mode (and before its
 * sections had a draw and a pass mark): the platform's defaults for what it lacks
 */
export function asExam(e: ExamDef): ExamDef {
  return {
    ...e,
    name: e.name.startsWith("امتحان ") && e.kind === "main" ? `الاختبار المؤتمت لصفة ${e.name.slice(7)}` : e.name,
    day: e.day ?? DEFAULT_SESSIONS[e.id]?.day,
    status: e.status ?? (e.off ? "draft" : "published"),
    showResult: e.showResult ?? true,
    instructions: e.instructions ?? DEFAULT_INSTRUCTIONS,
    pairing: e.pairing ?? "manual",
    network: e.network ?? true,
    sections: e.sections.map(asSection),
  };
}

/** A test is sat only while published */
export const isOpen = (e: ExamDef) => e.status === "published";

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
    const mains = mainExams(h?.sessions ?? {}, oldBlueprints ?? {}).map((e) => asExam(stored[e.id] ?? e));
    const exams = [...mains, ...Object.values(stored).filter((e) => !mains.some((m) => m.id === e.id)).map(asExam)];
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
      /** A hall's display screen number: its own, else its place in the list */
      displayOf: (c: ExamCenter) => c.display ?? centers.indexOf(c) + 1,
      centerByDisplay: (n: number) => centers.find((c, i) => (c.display ?? i + 1) === n),
      pins: { ...DEFAULT_PINS, ...h?.pins },
      centerOf: (id: string) => centerFor(id, centers, moved),
      autoCenterOf: (id: string) => autoCenter(id, centers),
      sittingOf: (id: string, role: string) => sittingFor(id, role, centerFor(id, centers, moved)?.id, exams, runs),
      supervisorOf: (center: string) => (supervisors[center] ? getStaff(supervisors[center]) : null),
      centersOf: (staffId: string) => live.filter((c) => supervisors[c.id] === staffId),
    };
  }, [h, oldBlueprints]);
}

export type Halls = ReturnType<typeof useHalls>;

/**
 * An administrator's own sitting: his centre, its hall, his exam's day, and the hall as its supervisor runs it.
 * A role that sits two exams sits them one after the other: this is the first not sent yet (or the last).
 */
export function useMyHall(id: string, p: AdminProfile | undefined) {
  const halls = useHalls();
  const roles = examRolesFor(p);
  const rolesKey = roles.join(",");
  const pending = roles.find((r) => !paperOf(p, r)?.submittedAt);
  const role = pending ?? roles.at(-1) ?? roleKeyOf(p?.positions[0]);
  return useMemo(() => {
    const center = halls.centerOf(id);
    const sitting = center ? halls.sittingOf(id, role) : undefined;
    const exam = sitting?.exam;
    return {
      role,
      /** Every exam he sits, in order */
      roles,
      exam,
      center,
      key: sitting?.key ?? "",
      run: sitting?.run,
      stage: sitting?.stage ?? ("idle" as HallStage),
      session: exam ? { date: exam.date, time: exam.time } : undefined,
      supervisor: center ? halls.supervisorOf(center.id) : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the exams' list by its value (rolesKey), not its identity
  }, [halls, id, role, rolesKey]);
}

// ───────────────────────── The sitting, step by step ─────────────────────────

const emptyRun = (): HallRun => ({ joined: {}, present: {} });

function patchRun(key: string, f: (r: HallRun) => HallRun) {
  setState((s) => {
    const runs = s.examHalls?.runs ?? {};
    return { ...s, examHalls: { ...s.examHalls, runs: { ...runs, [key]: f(runs[key] ?? emptyRun()) } } };
  });
}

/** What a paper needs: the bank, the test as built this season, and the role whose questions it draws */
export type PaperSource = { bank: ExamQuestion[]; blueprint: ExamBlueprint & { showResult?: boolean }; role: string };

/** What a test's papers are drawn from: the season's bank, the test as built, its role's questions */
export function sourceOf(exam: ExamDef, bank: ExamQuestion[]): PaperSource {
  return { bank, blueprint: { minutes: exam.minutes, sections: exam.sections, showResult: exam.showResult }, role: exam.role };
}

/**
 * The barcode on an applicant's card, scanned at the hall's door to check him in (his national id works too). Not
 * shown in lists: the demo's is fixed by his national id.
 */
export const barcodeOf = (id: string) => `HJ48${id.slice(-7)}`;

/** Who a barcode or a typed national id is, among a sitting's listed applicants */
export function whoIs(code: string, ids: string[]) {
  const c = code.trim().toUpperCase();
  return ids.find((id) => id === c || barcodeOf(id) === c);
}

/** A hall's sitting can be opened from an hour before its time to the end of its day */
export function openWindow(scheduledAt: number | undefined, now = Date.now()) {
  if (!scheduledAt) return "none" as const;
  const from = scheduledAt - 3_600_000;
  const end = new Date(scheduledAt);
  end.setHours(23, 59, 59, 999);
  if (now < from) return new Date(now).toDateString() === new Date(scheduledAt).toDateString() ? ("today" as const) : ("upcoming" as const);
  return now > end.getTime() ? ("late" as const) : ("now" as const);
}

export const WINDOW_LABEL: Record<ReturnType<typeof openWindow>, string> = { none: "بلا موعد", upcoming: "قادمة", today: "اليوم", now: "يمكن فتحها الآن", late: "متأخرة — فات موعدها" };

/** The pairing code an applicant's device shows: the supervisor matches it with his own list */
const pairingCode = () => String(1000 + Math.floor(Math.random() * 9000));

/** A paired applicant's attempt: his paper drawn, his time starting with the test (or at once after it began) */
function pairedAttempt(id: string, key: string, src: PaperSource, startedAt?: number): Attempt {
  return {
    status: startedAt ? "active" : "ready",
    startedAt,
    pairedAt: Date.now(),
    hall: key,
    minutes: src.blueprint.minutes,
    paper: drawPaper(src.bank, src.blueprint, src.role, id),
    answers: {},
    showResult: src.blueprint.showResult ?? true,
  };
}

/** An attempt marked as it is sent: each section's points, his share of all of them */
export function sentAttempt(a: Attempt, bank: ExamQuestion[], at = Date.now(), auto = false): Attempt {
  const { tally, score } = markPaper(a.paper ?? [], bank, a.answers);
  return { ...a, status: "submitted", submittedAt: at, tally, score, autoSubmitted: auto || undefined };
}

/** Every attempt an applicant has in a sitting, with where it is kept (his own test's, or the second's) */
function attemptsIn(p: AdminProfile, key: string) {
  const out: { role: string | null; a: Attempt }[] = [];
  if (p.exam?.hall === key) out.push({ role: null, a: p.exam });
  for (const [role, a] of Object.entries(p.exams ?? {})) if (a.hall === key) out.push({ role, a });
  return out;
}

function withAttempt(p: AdminProfile, role: string | null, a: Attempt): AdminProfile {
  return role ? { ...p, exams: { ...p.exams, [role]: a } } : { ...p, exam: a };
}

/** Change the attempts of one sitting, applicant by applicant */
function mapAttempts(key: string, ids: string[] | null, f: (a: Attempt, id: string) => Attempt | null) {
  setState((s) => {
    const admins = { ...s.admins };
    for (const [id, p] of Object.entries(admins)) {
      if (ids && !ids.includes(id)) continue;
      let next = p;
      for (const { role, a } of attemptsIn(p, key)) {
        const b = f(a, id);
        if (b && b !== a) next = withAttempt(next, role, b);
      }
      if (next !== p) admins[id] = next;
    }
    return { ...s, admins };
  });
}

export const hallActions = {
  // ── the hall supervisor ──
  /** Opened from inside the hall: its network recorded as the hall's */
  open(key: string, by: string, reason?: string) {
    patchRun(key, (r) => ({ ...r, openedAt: Date.now(), openedBy: by, openedReason: reason, network: r.network ?? "10.48.12.0/24" }));
  },
  /** The hall's network recorded again (replaced), or phones' mobile data let in when it fails */
  setNetwork(key: string, network: string) {
    patchRun(key, (r) => ({ ...r, network }));
  },
  allowMobileData(key: string) {
    patchRun(key, (r) => ({ ...r, mobileData: true }));
  },
  /** Checked in by his barcode or national id */
  checkIn(key: string, id: string) {
    patchRun(key, (r) => (r.present[id] ? r : { ...r, present: { ...r.present, [id]: Date.now() } }));
  },
  /** Back out of the list of the present (never once he has an attempt) */
  undoCheckIn(key: string, id: string) {
    patchRun(key, (r) => {
      const present = { ...r.present };
      delete present[id];
      return { ...r, present };
    });
  },
  /**
   * The applicant typed his national id on his device in the hall: an entry request with a pairing code — let in at
   * once when the test lets everyone in (or everyone on the hall's network), else waiting for the supervisor
   */
  request(key: string, id: string, exam: ExamDef, src: PaperSource, opts: { offNetwork?: boolean } = {}) {
    const run = getState().examHalls?.runs?.[key];
    const p = getState().admins[id];
    const has = p ? attemptsIn(p, key).length > 0 : false;
    const auto = !has && (exam.pairing === "auto_all" || (exam.pairing === "auto_clean" && !opts.offNetwork));
    if (auto) return hallActions.approve(key, id, src);
    patchRun(key, (r) => ({ ...r, requests: { ...r.requests, [id]: { at: Date.now(), code: pairingCode(), offNetwork: opts.offNetwork, resume: has || undefined } } }));
    return run;
  },
  /** The supervisor matched the code on his screen: his device paired, his attempt ready (or begun, if the test is running) */
  approve(key: string, id: string, src: PaperSource) {
    setState((s) => {
      const run = s.examHalls?.runs?.[key] ?? emptyRun();
      const requests = { ...run.requests };
      delete requests[id];
      const paired = { ...run.paired, [id]: Date.now() };
      const p = s.admins[id];
      // His first attempt at this role's test, or a new one after one voided in another sitting (a make-up)
      const prev = p && paperOf(p, src.role);
      const mine = p && (!prev?.paper || (statusOf(prev) === "voided" && !prev.submittedAt && prev.hall !== key));
      const admins = mine ? { ...s.admins, [id]: { ...p, ...paperPatch(p, src.role, pairedAttempt(id, key, src, run.startedAt ? Date.now() : undefined)) } } : s.admins;
      return { ...s, admins, examHalls: { ...s.examHalls, runs: { ...s.examHalls.runs, [key]: { ...run, requests, paired } } } };
    });
  },
  reject(key: string, id: string) {
    patchRun(key, (r) => {
      const requests = { ...r.requests };
      delete requests[id];
      return { ...r, requests };
    });
  },
  /** Everyone paired starts now; whoever is let in later starts on his own entry. Never with requests still waiting */
  start(key: string) {
    const at = Date.now();
    patchRun(key, (r) => ({ ...r, startedAt: at }));
    mapAttempts(key, null, (a) => (statusOf(a) === "ready" ? { ...a, status: "active", startedAt: at } : null));
  },
  /** The supervisor's own PIN, typed on applicants' devices to confirm their submissions */
  setPin(staffId: string, pin: string) {
    setState((s) => ({ ...s, examHalls: { ...s.examHalls, pins: { ...s.examHalls.pins, [staffId]: pin } } }));
  },
  /** Confirmed from the supervisor's panel (one, or every clean one at once) */
  confirm(key: string, ids: string[], by: string, via: "panel" | "batch") {
    const at = Date.now();
    mapAttempts(key, ids, (a) => (statusOf(a) === "submitted" ? { ...a, status: "confirmed", confirmedAt: at, confirmedBy: by, confirmVia: via } : null));
  },
  /** «لا أؤكد»: the one present is not whose answers these are, or the submission is in doubt — the administration decides */
  unconfirm(key: string, id: string, reason: string) {
    mapAttempts(key, [id], (a) => (statusOf(a) === "submitted" ? { ...a, status: "unconfirmed", unconfirmedReason: reason } : null));
  },
  /**
   * The sitting ended: whoever is still answering is sent as he stands, whoever was paired and never began is
   * voided, and whoever was listed and never came is absent. Cannot be undone.
   */
  end(key: string, bank: ExamQuestion[], pinFor: (key: string) => string | undefined) {
    const at = Date.now();
    const auto = !pinFor(key);
    mapAttempts(key, null, (a) => {
      const st = statusOf(a);
      if (st === "active") {
        const sent = sentAttempt(a, bank, at, true);
        return auto ? { ...sent, status: "confirmed", confirmedAt: at, confirmVia: "auto" } : sent;
      }
      if (st === "ready") return { ...a, status: "voided" };
      return null;
    });
    patchRun(key, (r) => ({ ...r, endedAt: at, closedAt: at, requests: {} }));
  },
  /** Demo only: the sitting back to before it opened, and its attempts gone */
  reset(key: string) {
    setState((s) => {
      const runs = { ...s.examHalls.runs };
      delete runs[key];
      const admins = { ...s.admins };
      for (const [id, p] of Object.entries(admins)) {
        let next = p;
        if (p.exam?.hall === key) next = { ...next, exam: undefined };
        if (p.exams && Object.values(p.exams).some((a) => a.hall === key)) next = { ...next, exams: Object.fromEntries(Object.entries(p.exams).filter(([, a]) => a.hall !== key)) };
        if (next !== p) admins[id] = next;
      }
      return { ...s, admins, examHalls: { ...s.examHalls, runs } };
    });
  },
  // ── the applicant's device ──
  /** He sent his test: marked at once; without a PIN set by the supervisor it is confirmed as it is sent */
  submit(id: string, role: string, bank: ExamQuestion[], autoConfirm: boolean, by?: string) {
    setState((s) => {
      const p = s.admins[id];
      const a = p && paperOf(p, role);
      if (!p || !a) return s;
      const sent = sentAttempt(a, bank);
      const next = autoConfirm ? { ...sent, status: "confirmed" as const, confirmedAt: sent.submittedAt, confirmedBy: by, confirmVia: "auto" as const } : sent;
      return { ...s, admins: { ...s.admins, [id]: { ...p, ...paperPatch(p, role, next) } } };
    });
  },
  /** The supervisor typed his PIN on the device: confirmed — or a wrong try, and after five the device locks for 10 minutes */
  pinConfirm(id: string, role: string, ok: boolean, by: string) {
    setState((s) => {
      const p = s.admins[id];
      const a = p && paperOf(p, role);
      if (!p || !a) return s;
      // Once a lock has run out, five tries again
      const lapsed = !!a.pinLockedUntil && a.pinLockedUntil <= Date.now();
      const tries = (lapsed ? 0 : (a.pinTries ?? 0)) + (ok ? 0 : 1);
      const next: Attempt = ok ? { ...a, status: "confirmed", confirmedAt: Date.now(), confirmedBy: by, confirmVia: "pin", pinTries: 0 } : { ...a, pinTries: tries, pinLockedUntil: tries >= 5 ? Date.now() + 600_000 : lapsed ? undefined : a.pinLockedUntil };
      return { ...s, admins: { ...s.admins, [id]: { ...p, ...paperPatch(p, role, next) } } };
    });
  },
  /** A signal the device raised: he left the test's screen, or came back into it */
  alert(id: string, role: string, kind: "focusLost" | "reentries") {
    setState((s) => {
      const p = s.admins[id];
      const a = p && paperOf(p, role);
      if (!p || !a || statusOf(a) !== "active") return s;
      const alerts = { ...a.alerts, [kind]: (a.alerts?.[kind] ?? 0) + 1 };
      return { ...s, admins: { ...s.admins, [id]: { ...p, ...paperPatch(p, role, { ...a, alerts }) } } };
    });
  },
  // ── the administration ──
  /** An attempt referred to it (not confirmed, or sent in a sitting that ended unconfirmed): approved or voided, with a note */
  decide(id: string, role: string, kind: "approve" | "void", by: string, note: string) {
    setState((s) => {
      const p = s.admins[id];
      const a = p && paperOf(p, role);
      if (!p || !a) return s;
      const at = Date.now();
      const next: Attempt = { ...a, status: kind === "approve" ? "confirmed" : "voided", decision: { kind, by, at, note }, ...(kind === "approve" && { confirmedAt: at, confirmedBy: by, confirmVia: "decision" as const }) };
      return { ...s, admins: { ...s.admins, [id]: { ...p, ...paperPatch(p, role, next) } } };
    });
  },
  assignSupervisor(center: string, staffId: string) {
    setState((s) => ({ ...s, examHalls: { ...s.examHalls, supervisors: { ...s.examHalls.supervisors, [center]: staffId } } }));
  },
  /** Applicants to another hall than their governorate's; no hall sends them back to it */
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
  /** A hall saved: a governorate it takes is no longer served by any other hall */
  saveCenter(c: ExamCenter, current: ExamCenter[]) {
    const strip = (x: ExamCenter) => ({ ...x, governorates: x.governorates.filter((g) => !c.governorates.includes(g)) });
    const centers = current.some((x) => x.id === c.id) ? current.map((x) => (x.id === c.id ? c : strip(x))) : [...current.map(strip), c];
    setState((s) => ({ ...s, examHalls: { ...s.examHalls, centers } }));
  },
  /** A test saved; whether it shows results reaches the attempts already sat */
  saveExam(e: ExamDef) {
    setState((s) => {
      const admins = { ...s.admins };
      const keyOf = (hall: string | undefined) => hall?.split("@")[0];
      for (const [id, p] of Object.entries(admins)) {
        let next = p;
        if (p.exam && keyOf(p.exam.hall) === e.id && p.exam.showResult !== e.showResult) next = { ...next, exam: { ...p.exam, showResult: e.showResult } };
        for (const [role, a] of Object.entries(p.exams ?? {})) if (keyOf(a.hall) === e.id && a.showResult !== e.showResult) next = { ...next, exams: { ...next.exams, [role]: { ...a, showResult: e.showResult } } };
        if (next !== p) admins[id] = next;
      }
      return { ...s, admins, examHalls: { ...s.examHalls, exams: { ...s.examHalls.exams, [e.id]: e } } };
    });
  },
  /** Only a test the exam system created, and never sat anywhere */
  deleteExam(id: string) {
    setState((s) => {
      const exams = { ...s.examHalls.exams };
      delete exams[id];
      return { ...s, examHalls: { ...s.examHalls, exams } };
    });
  },
  /** Demo: the main tests back to what the platform ships, the created ones gone */
  resetExams() {
    setState((s) => ({ ...s, examHalls: { ...s.examHalls, exams: undefined, sessions: undefined } }));
  },
};
