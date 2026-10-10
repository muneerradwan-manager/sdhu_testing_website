/**
 * The steps after acceptance, pure: what each family owes and when, which documents each step asks for, and
 * whether each step is complete. Completion is read from what the services recorded (approvals, payments,
 * the office's contract decision, the coordinator's health file) — never from a flag the page could set — so
 * reordering or rewording the steps in the configuration cannot open a step early.
 */
import { installmentsOf, seasonPlan } from "../installments";
import { ageOf } from "../registry";
import { accommodationCost, costBreakdown, describeRooms } from "../rooms";
import type { Member } from "../rules";
import { SEASON } from "../season";
import type { Application, DocStatus, HealthFile, PostAcceptance } from "../store";
import type { PostStepDef, PostSystemStep } from "./types";

export type DocKey = "photo" | "passport";

/**
 * The identity documents, each in its own step: the personal photo after the first payment, the passport only
 * after the second. Every medical document (vaccines included) waits until the pilgrim has joined a group.
 */
export const DOCS: { key: DocKey; label: string; emoji: string; reviewer: string; reviewMs: number; hint: string }[] = [
  { key: "photo", label: "الصورة الشخصية", emoji: "🖼️", reviewer: "رنا حداد", reviewMs: 2200, hint: "خلفية بيضاء، حديثة، دون نظارات" },
  { key: "passport", label: "جواز السفر", emoji: "🛂", reviewer: "رنا حداد", reviewMs: 3200, hint: "صفحة البيانات كاملة وواضحة" },
];
export const docKey = (m: Member, d: DocKey) => `${m.person.id}-${d}`;

/** Which documents each step asks for */
export const STEP_DOCS: Record<"documents" | "passport", DocKey[]> = { documents: ["photo"], passport: ["passport"] };

export function docStatus(post: PostAcceptance, m: Member, d: DocKey): DocStatus {
  return post.documents[docKey(m, d)] ?? "missing";
}

/** Every document of these kinds (all of them unless told) approved for this member */
export function memberDocsDone(post: PostAcceptance, m: Member, keys: DocKey[] = DOCS.map((d) => d.key)) {
  return keys.every((k) => docStatus(post, m, k) === "approved");
}

export type MedicalDoc = (typeof SEASON.medicalDocuments)[number];

/** The medical documents this member must upload (the administration's list: vaccines, report; flu for 60+, a prescription only if on medication) */
export function medicalDocsFor(m: Member, health?: HealthFile): MedicalDoc[] {
  const rec = health?.members[m.person.id];
  return SEASON.medicalDocuments.filter(
    (d) => (!("onlyIfMedications" in d && d.onlyIfMedications) || !!rec?.medications.trim()) && (!("minAge" in d && d.minAge) || ageOf(m.person) >= d.minAge),
  );
}

export const medicalKey = (m: Member, d: MedicalDoc) => `${m.person.id}-${d.key}`;

export function medicalDone(post: PostAcceptance, app: Application) {
  const h = post.health;
  if (!h?.confirmedAt) return false;
  return app.members.every((m) => !!h.members[m.person.id] && medicalDocsFor(m, h).every((d) => post.medical?.[medicalKey(m, d)] === "approved"));
}

// ───────────────────────── Costs ─────────────────────────

export function receiptBase(app: Application) {
  return `1448-P-${app.number.padStart(6, "0")}`;
}

/** `dueStep`: the post-acceptance step it is paid at; none for the first installment (paid at registration or at the draw) */
export type CostLine = { key: string; title: string; detail: string; amount: number; receipt: string; due: string; installment?: number; dueStep?: string };

type FeesArg = { hajjCost: number; firstInstallment: number; installmentCount?: 1 | 2; hady: number; schedule?: { key: string; label: string; perPerson: number; dueLabel: string; dueStep?: string }[]; extrasStep?: string };

/**
 * The Hajj cost by the season's installments (the first is already paid at registration or at the lottery
 * result), then the sacrifice and, when the request asked for private rooms, their price. An application
 * keeps the terms it was submitted under (`app.policy`); one from before that follows the season's.
 */
export function costLines(app: Application, live: FeesArg, room?: ReturnType<typeof accommodationCost>): CostLine[] {
  const fees: FeesArg = app.policy?.fees ?? live;
  const n = app.members.length;
  const base = receiptBase(app);
  const plan = app.plan ?? seasonPlan(fees);
  const inst = installmentsOf(plan, n, app.number, fees);
  const lastDue = inst[inst.length - 1].due;
  const extrasStep = fees.extrasStep ?? "payment";
  const lines: CostLine[] = inst.map((i) => ({
    key: i.key,
    title: i.title,
    detail: `${n} × ${i.perPerson.toLocaleString("en-US")} $`,
    amount: i.amount,
    receipt: i.receipt,
    due: i.due,
    installment: i.index + 1,
    dueStep: i.index === 0 ? undefined : (i.dueStep ?? "payment"),
  }));
  const tail = plan === 1 ? SEASON.installments.windows[1] : lastDue;
  lines.push({ key: "hady", title: "الهدي", detail: `${n} × ${fees.hady.toLocaleString("en-US")} $`, amount: n * fees.hady, receipt: `${base}-H`, due: tail, dueStep: extrasStep });
  if (room) {
    lines.push({ key: "room", title: "السكن الخاص", detail: `${describeRooms(room.rooms)} — ${costBreakdown(room.parts)}`, amount: room.amount, receipt: `${base}-R`, due: tail, dueStep: extrasStep });
  }
  return lines;
}

/** When a line was paid: the first installment comes from the application (paid at registration or at the draw) */
export function paidAt(line: CostLine, app: Application, post: PostAcceptance) {
  if (line.key === "i1") return app.firstPaid?.at;
  return post.payments[line.key];
}

/** The lines a payment step takes: those due at it or at a step before it still unpaid, and the first installment */
export function linesUpTo(stepId: string, steps: PostStepDef[], lines: CostLine[]) {
  const order = steps.map((s) => s.id);
  const at = order.indexOf(stepId);
  return lines.filter((l) => !l.dueStep || (order.indexOf(l.dueStep) !== -1 ? order.indexOf(l.dueStep) <= at : true));
}

/** Lines due exactly at this step */
export function linesAt(stepId: string, lines: CostLine[]) {
  return lines.filter((l) => l.dueStep === stepId);
}

/**
 * Whether each step is complete, by its id. The platform's steps by what was recorded; a payment step when
 * everything due up to it is paid; an acknowledgement or a form when the service recorded it.
 */
export type StepsDone = Record<PostSystemStep, boolean> & Record<string, boolean>;

export function stepsDone(post: PostAcceptance, app: Application, lines: CostLine[], steps?: PostStepDef[]): StepsDone {
  const all = lines.every((l) => !!paidAt(l, app, post));
  const out: StepsDone = {
    confirm: !!post.confirmedAt && !!app.firstPaid,
    documents: !!post.confirmedAt && app.members.every((m) => memberDocsDone(post, m, STEP_DOCS.documents)),
    group: !!post.groupApprovedAt && !!post.contractSignedAt,
    payment: all,
    passport: app.members.every((m) => memberDocsDone(post, m, STEP_DOCS.passport)),
    medical: medicalDone(post, app),
    visa: !!post.visaAt,
  };
  if (!steps) return out;
  const enabled = steps.filter((s) => s.enabled);
  for (const s of enabled) {
    if (s.kind === "system" && s.system === "payment") out[s.id] = linesUpTo(s.id, enabled, lines).every((l) => !!paidAt(l, app, post));
    else if (s.kind === "system" && s.system) out[s.id] = out[s.system];
    else if (s.kind === "installment") out[s.id] = linesUpTo(s.id, enabled, lines).every((l) => !!paidAt(l, app, post));
    else out[s.id] = !!post.custom?.[s.id];
  }
  return out;
}

/** The first step not complete, in order: the one the pilgrim works on; every step after it stays locked */
export function firstOpenStep(steps: PostStepDef[], done: Record<string, boolean>) {
  return steps.findIndex((s) => !done[s.id]);
}

/** May this step be worked on now: every step before it is complete */
export function stepReachable(steps: PostStepDef[], done: Record<string, boolean>, stepId: string) {
  const at = steps.findIndex((s) => s.id === stepId);
  return at >= 0 && steps.slice(0, at).every((s) => done[s.id]);
}
