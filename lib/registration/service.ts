/**
 * The registration's trusted operations — the platform's server side. In this demo the "server" runs in the
 * browser over the same store, but it is written as one: every operation takes the whole state and returns
 * the next one, reads only what is recorded (never what a page says it showed), and checks everything again.
 * In production these functions move behind an API unchanged in what they check.
 *
 * - Staff: only the holder of «إدارة التسجيل على الحج» (by the director's grants as recorded) edits a
 *   season's draft, publishes it, restores a version or prepares a season; anyone else is refused and the
 *   attempt is written to the audit trail.
 * - Pilgrims: an application is accepted only when its version's stages and questions are answered, its
 *   gates hold, its members are eligible under the season's rules and the administration's own, every
 *   adult in it approved from his own side, its registration is open, nobody in it is in another
 *   application, and a confirmed payment of exactly the amount computed here backs it — used once.
 */
import { ageOf } from "../registry";
import { directAccepted, outcomeOf, trackOf, applicationNumberFor } from "../journey";
import { publishedDraw } from "../lottery";
import { OPERATIONS, stateOf, type OperationKey } from "../operations";
import { evaluate, withSimulated, type Member } from "../rules";
import { countryOf, officeArea, officeFor } from "../season";
import { mergeSeason } from "../season-live";
import { getStaff } from "../staff";
import type { Application, ApplyDraft, AuditEvent, State } from "../store";
import { withGrants } from "../systems";
import type { FactContext } from "./conditions";
import { ACTIVE_SEASON } from "./defaults";
import { draftOf, failingGate, liveVersion, nowKey, pinnedVersion, prunedAnswers, regOf, seasonsOf, stageErrors, versionById, versionsOf, visibleStages, withConfigured } from "./engine";
import { costLines, linesUpTo, stepReachable, stepsDone } from "./post";
import type { Answers, AppPolicy, PaymentRecord, RegConfig, RegState, RegVersion, StageDef, TrackKey } from "./types";
import { diffConfigs, validateConfig, type Issue } from "./validate";

/** The code the demo's text messages carry */
export const SMS_CODE = "1448";

export type SvcError = { code: string; message: string; stageId?: string };
export type Result<T> = { ok: true; state: State; value: T } | { ok: false; errors: SvcError[]; state?: State; issues?: Issue[] };

const fail = <T>(code: string, message: string, extra: Partial<SvcError> = {}): Result<T> => ({ ok: false, errors: [{ code, message, ...extra }] });

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

function withEvent(s: State, e: Omit<AuditEvent, "id" | "at">, at: number): State {
  return { ...s, events: [...s.events, { ...e, id: uid("E").toLowerCase(), at }] };
}

const setReg = (s: State, reg: RegState): State => ({ ...s, registration: reg });

// ───────────────────────── The season's terms ─────────────────────────

/** The season's thresholds and fees in force now, with the installments of a version: what a submission freezes */
export function policyFor(s: Pick<State, "season">, version: RegVersion): AppPolicy {
  const live = mergeSeason(s.season, version.config.payments);
  return {
    rules: live.rules,
    acceptedDirectAge: live.acceptedDirectAge,
    fees: {
      registrationPerPerson: live.fees.registrationPerPerson,
      hajjCost: live.fees.hajjCost,
      hady: live.fees.hady,
      firstInstallment: live.fees.firstInstallment,
      installmentCount: live.fees.installmentCount,
      schedule: live.fees.schedule,
      extrasStep: live.fees.extrasStep,
    },
  };
}

/** What is paid when the application is filed: the registration fee, and on direct acceptance the first installment */
export function dueAtSubmit(policy: AppPolicy, track: TrackKey, people: number) {
  const fee = people * policy.fees.registrationPerPerson;
  const first = track === "direct" ? people * (policy.fees.schedule[0]?.perPerson ?? policy.fees.firstInstallment) : 0;
  return { fee, first, total: fee + first };
}

function factsOf(s: State, owner: string, d: { track: TrackKey; members: Member[]; residence: string; answers?: Answers; memberAnswers?: Record<string, Answers> }, policy: AppPolicy): FactContext {
  const applicant = d.members.find((m) => m.relation === "self");
  return {
    track: d.track,
    forWhom: applicant && applicant.person.id !== owner ? "other" : "me",
    residence: countryOf(d.residence),
    members: d.members,
    answers: d.answers ?? {},
    memberAnswers: d.memberAnswers ?? {},
    elderlyMaxBirthYear: policy.rules.elderlyNeedsCompanionMaxBirthYear,
  };
}

function operationOpen(s: State, key: OperationKey, now: string) {
  const def = OPERATIONS.find((o) => o.key === key)!;
  const [today, time] = now.split("T");
  return stateOf(def, s.operations[key], today, !!s.clock.allOpen, time).open;
}

/** Every adult except the person filing must approve from his own side */
export function consentPeople(members: Member[], filerId: string) {
  return members.filter((m) => m.person.id !== filerId && ageOf(m.person) >= 17);
}

// ───────────────────────── Pilgrim: before submission ─────────────────────────

/** Filing for someone else: his consent by the code sent to his phone, recorded here, never by the page */
export function confirmApplicantConsent(s: State, owner: string, personId: string, code: string, at: number): Result<null> {
  if (code !== SMS_CODE) return fail("code", "رمز الموافقة غير صحيح");
  if (personId === owner) return fail("self", "صاحب الحساب لا يوافق عن نفسه برمز");
  const prev: ApplyDraft = s.drafts[owner] ?? { updatedAt: at, history: [], track: "direct", members: [], book: null, residence: "سوريا", maxPhase: 0, consents: {} };
  const next = withEvent({ ...s, drafts: { ...s.drafts, [owner]: { ...prev, applicantConsent: { personId, at, via: "sms" } } } }, { actor: owner, role: "حاج", action: "موافقة صاحب الطلب برمز على هاتفه", target: personId, system: "registration", area: "applications", ref: owner }, at);
  return { ok: true, state: next, value: null };
}

/**
 * A payment as the provider confirmed it. Asking again for the same unused amount returns the same record,
 * so a double tap or a retried request never charges twice.
 */
export function recordPayment(s: State, p: Omit<PaymentRecord, "id" | "at" | "usedFor">, at: number): Result<PaymentRecord> {
  if (!(p.amount > 0)) return fail("amount", "مبلغ غير صالح");
  const reg = regOf(s);
  const same = Object.values(reg.ledger).find((r) => r.owner === p.owner && r.purpose === p.purpose && r.amount === p.amount && !r.usedFor);
  if (same) return { ok: true, state: s, value: same };
  const rec: PaymentRecord = { ...p, id: uid("PAY"), at };
  return { ok: true, state: setReg(s, { ...reg, ledger: { ...reg.ledger, [rec.id]: rec } }), value: rec };
}

export type SubmitInput = {
  owner: string;
  track: TrackKey;
  members: Member[];
  residence: string;
  book: string | null;
  answers: Answers;
  memberAnswers: Record<string, Answers>;
  paymentId: string;
  method: "shamcash" | "bank";
  /** The demo's simulated conditions, treated as met (lib/rules withSimulated) */
  simulated?: string[];
};

/** Everything that keeps an application from being submitted, checked against the stored draft and the season */
export function submissionErrors(s: State, input: Omit<SubmitInput, "paymentId" | "method">, at: number): { errors: SvcError[]; version: RegVersion; policy: AppPolicy; previous: Application | null } {
  const reg = regOf(s);
  const now = nowKey(s.clock, new Date(at));
  const today = now.slice(0, 10);
  const draft = s.drafts[input.owner];
  const version = pinnedVersion(reg, draft?.configVersion, ACTIVE_SEASON);
  const policy = policyFor(s, version);
  const errors: SvcError[] = [];
  const existing = s.applications[input.owner];
  const previous = existing && input.track === "lottery" && trackOf(existing) === "direct" && !directAccepted(existing, existing.policy?.acceptedDirectAge ?? policy.acceptedDirectAge) ? existing : null;

  if (!draft) errors.push({ code: "draft", message: "لا طلب محفوظاً بهذا الحساب" });
  if (version.season !== ACTIVE_SEASON || version.effectiveFrom > now) errors.push({ code: "version", message: "إصدار الإعدادات المحفوظ مع الطلب غير صالح لهذا الموسم" });
  if (existing && !previous) errors.push({ code: "duplicate", message: `لديك طلب مقدَّم بالفعل (${existing.number})` });

  const track = version.config.tracks.find((t) => t.key === input.track);
  if (!track?.enabled) errors.push({ code: "track", message: "هذا المسار غير متاح هذا الموسم" });
  if (!operationOpen(s, input.track === "direct" ? "hajj-direct" : "hajj-lottery", now)) errors.push({ code: "closed", message: "باب هذا التسجيل غير مفتوح الآن" });

  const applicant = input.members.find((m) => m.relation === "self");
  if (!applicant) errors.push({ code: "applicant", message: "لم يُحدَّد صاحب الطلب" });
  const ids = input.members.map((m) => m.person.id);
  if (new Set(ids).size !== ids.length) errors.push({ code: "members", message: "شخص مكرر في الطلب" });

  // The version's stages, as they show for this application now
  const ctx = factsOf(s, input.owner, input, policy);
  for (const st of visibleStages(version.config, ctx, today)) {
    const e = stageErrors(st, ctx);
    if (e.length) errors.push({ code: "answers", message: `أكمل «${st.title || st.name}»: ${e[0].message}`, stageId: st.id });
    const g = failingGate(st, ctx);
    if (g) errors.push({ code: "gate", message: g.message, stageId: st.id });
  }

  // Eligibility: the season's rules and the administration's own, enforced here and not only shown
  const base = evaluate(input.members, policy.rules, input.track === "direct" ? { minAge: policy.acceptedDirectAge } : undefined);
  const result = withSimulated(withConfigured(base, version.config.eligibility, ctx), input.simulated);
  if (!result.eligible) {
    const first = [...result.members.flatMap((m) => m.checks.map((c) => ({ ...c, who: m.name.split(" ")[0] }))), ...result.general.map((c) => ({ ...c, who: "" }))].find((c) => c.status === "fail");
    errors.push({ code: "eligibility", message: first ? `${first.label}${first.who ? ` — ${first.who}` : ""}: ${first.detail}` : "الطلب غير مستوفٍ للشروط", stageId: "eligibility" });
  }

  // Nobody in two applications of the season
  for (const [other, app] of Object.entries(s.applications)) {
    if (other === input.owner || (app.season ?? ACTIVE_SEASON) !== ACTIVE_SEASON) continue;
    const both = app.members.find((m) => ids.includes(m.person.id));
    if (both) errors.push({ code: "duplicate-person", message: `${both.person.firstName} مدرج في الطلب ${app.number}`, stageId: "eligibility" });
  }

  // One path a season: whoever serves as an administrator this season is not a pilgrim in it (lib/account.ts)
  for (const m of input.members) {
    const id = m.person.id;
    const p = s.admins[id];
    const chosen = s.accounts[id]?.seasons?.[ACTIVE_SEASON]?.path;
    const serving = chosen === "admin" || (!chosen && !!p && (p.season ?? ACTIVE_SEASON) === ACTIVE_SEASON && (p.positions.length > 0 || !!p.eligibleAt || !!p.feePaidAt));
    if (serving) errors.push({ code: "admin-season", message: `${m.person.firstName} إداري في موسم ${ACTIVE_SEASON}: لا يكون حاجاً في الموسم نفسه`, stageId: "eligibility" });
  }

  // Every adult approved from his own side, as recorded
  for (const m of consentPeople(input.members, input.owner)) {
    const c = draft?.consents[m.person.id];
    if (c?.status !== "approved" || !c.respondedAt) errors.push({ code: "consent", message: `لم يوافق ${m.person.firstName} بعد`, stageId: "consents" });
  }
  return { errors, version, policy, previous };
}

export function submitApplication(s: State, input: SubmitInput, at: number): Result<Application> {
  const { errors, version, policy, previous } = submissionErrors(s, input, at);
  const due = dueAtSubmit(policy, input.track, input.members.length);
  const reg = regOf(s);
  const pay = reg.ledger[input.paymentId];
  if (!pay || pay.owner !== input.owner || pay.purpose !== "registration") errors.push({ code: "payment", message: "لا دفعة مؤكَّدة لهذا الطلب" });
  else if (pay.usedFor) errors.push({ code: "payment-used", message: "هذه الدفعة استُعملت لطلب آخر" });
  else if (pay.amount !== due.total) errors.push({ code: "payment-amount", message: `المبلغ المدفوع (${pay.amount} $) لا يساوي المستحق (${due.total} $)` });
  if (errors.length) return { ok: false, errors };

  const applicant = input.members.find((m) => m.relation === "self")!;
  const ctx = factsOf(s, input.owner, input, policy);
  const kept = prunedAnswers(visibleStages(version.config, ctx, nowKey(s.clock, new Date(at)).slice(0, 10)), ctx);
  const number = applicationNumberFor(previous ? `${input.owner}-L` : input.owner);
  const area = officeArea(applicant.person.governorate, input.residence);
  const credit = input.track === "lottery" && previous?.firstPaid ? { ...previous.firstPaid, creditFrom: previous.number } : undefined;
  const app: Application = {
    number,
    applicantId: input.owner,
    createdAt: at,
    submittedAt: at,
    mode: input.members.length === 1 ? "solo" : input.book ? "booklet" : "national",
    track: input.track,
    ...(input.simulated?.length && { simulated: input.simulated }),
    previous: previous ? { number: previous.number, track: "direct", submittedAt: previous.submittedAt, closedAt: at } : undefined,
    forWhom: applicant.person.id === input.owner ? "me" : "other",
    members: input.members,
    governorate: area,
    office: officeFor(area),
    receipt: `1448-R-${number.padStart(6, "0")}`,
    paid: due.total,
    plan: input.track === "direct" ? policy.fees.installmentCount : credit ? previous?.plan : undefined,
    firstPaid: due.first ? { amount: due.first, at, receipt: `1448-P-${number.padStart(6, "0")}-1` } : credit,
    payMethod: input.method,
    ratings: {},
    season: ACTIVE_SEASON,
    configVersion: version.id,
    policy,
    answers: kept.answers,
    memberAnswers: kept.memberAnswers,
    paymentRef: pay!.id,
  };
  const drafts = Object.fromEntries(Object.entries(s.drafts).filter(([id]) => id !== input.owner));
  let next: State = { ...s, drafts, applications: { ...s.applications, [input.owner]: app } };
  next = setReg(next, { ...reg, ledger: { ...reg.ledger, [pay!.id]: { ...pay!, usedFor: number } } });
  next = withEvent(
    next,
    {
      actor: `${applicant.person.firstName} ${applicant.person.lastName}`,
      role: "حاج",
      action: input.track === "lottery" ? "تقديم طلب حج — التسجيل الأولي على القرعة" : "تقديم طلب حج — التسجيل على القبول المباشر",
      target: `طلب ${number}`,
      detail: `${input.members.length} أفراد — الإصدار ${version.number} — الإيصال ${app.receipt}`,
      system: "registration",
      area: "applications",
      ref: input.owner,
    },
    at,
  );
  return { ok: true, state: next, value: app };
}

// ───────────────────────── Pilgrim: after acceptance ─────────────────────────

type RoomCost = Parameters<typeof costLines>[2];

function acceptedApp(s: State, owner: string): { app: Application; error?: undefined } | { app?: undefined; error: SvcError } {
  const app = s.applications[owner];
  if (!app) return { error: { code: "none", message: "لا طلب" } };
  const out = outcomeOf(app, publishedDraw(s), app.policy?.acceptedDirectAge ?? mergeSeason(s.season).acceptedDirectAge);
  if (!out.accepted) return { error: { code: "not-accepted", message: "الطلب غير مقبول" } };
  if (s.reviews[owner]?.status === "rejected") return { error: { code: "rejected", message: "الطلب موقوف بقرار المراجعة" } };
  return { app };
}

function postContext(s: State, owner: string, app: Application, room: RoomCost) {
  const reg = regOf(s);
  const version = pinnedVersion(reg, app.configVersion, app.season ?? ACTIVE_SEASON);
  const steps = version.config.postSteps.filter((p) => p.enabled);
  const post = s.post[owner] ?? { documents: {}, payments: {}, ratings: {} };
  const lines = costLines(app, mergeSeason(s.season, version.config.payments).fees, room);
  const done = stepsDone(post, app, lines, steps);
  return { version, steps, post, lines, done };
}

/** An acknowledgement or a form step the administration added: recorded only when it is reachable and answered */
export function completePostStep(s: State, owner: string, stepId: string, payload: { ack?: boolean; answers?: Answers; memberAnswers?: Record<string, Answers> }, room: RoomCost, at: number): Result<null> {
  const a = acceptedApp(s, owner);
  if (a.error) return { ok: false, errors: [a.error] };
  const app = a.app;
  const { steps, post, done } = postContext(s, owner, app, room);
  const step = steps.find((p) => p.id === stepId);
  if (!step || (step.kind !== "acknowledge" && step.kind !== "form")) return fail("step", "خطوة غير موجودة");
  if (!stepReachable(steps, done, stepId)) return fail("locked", "أكمل الخطوات التي قبلها أولاً");
  if (step.kind === "acknowledge" && payload.ack !== true) return fail("ack", "يلزم الإقرار");
  if (step.kind === "form") {
    const pseudo: StageDef = { id: step.id, kind: "form", name: step.title, title: step.title, phase: "", blocks: [], fields: step.fields, enabled: true, gates: [] };
    const ctx: FactContext = { members: app.members, answers: payload.answers ?? {}, memberAnswers: payload.memberAnswers ?? {}, track: trackOf(app), elderlyMaxBirthYear: (app.policy?.rules ?? mergeSeason(s.season).rules).elderlyNeedsCompanionMaxBirthYear };
    const errs = stageErrors(pseudo, ctx);
    if (errs.length) return { ok: false, errors: errs.map((e) => ({ code: "answers", message: e.message })) };
  }
  const next = { ...post, custom: { ...post.custom, [stepId]: { at, answers: payload.answers, memberAnswers: payload.memberAnswers } } };
  const self = app.members.find((m) => m.relation === "self") ?? app.members[0];
  return {
    ok: true,
    state: withEvent({ ...s, post: { ...s.post, [owner]: next } }, { actor: `${self.person.firstName} ${self.person.lastName}`, role: "حاج", action: `إكمال خطوة «${step.title}»`, target: `طلب ${app.number}`, system: "registration", area: "applications", ref: owner }, at),
    value: null,
  };
}

/** Paying lines after acceptance: each one must be owed and due at a step the pilgrim has reached */
export function payPostLines(s: State, owner: string, keys: string[], method: "shamcash" | "bank", room: RoomCost, at: number): Result<PaymentRecord> {
  const a = acceptedApp(s, owner);
  if (a.error) return { ok: false, errors: [a.error] };
  const app = a.app;
  const { steps, post, lines, done } = postContext(s, owner, app, room);
  const chosen = lines.filter((l) => keys.includes(l.key));
  if (!chosen.length || chosen.length !== keys.length) return fail("lines", "بنود غير موجودة في كشف التكاليف");
  for (const l of chosen) {
    if (l.key === "i1" || post.payments[l.key]) return fail("paid", `«${l.title}» مسدَّد`);
    const step = l.dueStep ?? "payment";
    if (!stepReachable(steps, done, step)) return fail("locked", `لم يحن موعد «${l.title}» بعد`);
    if (!linesUpTo(step, steps, lines).some((x) => x.key === l.key)) return fail("lines", `«${l.title}» لا يستحق في هذه الخطوة`);
  }
  const amount = chosen.reduce((n, l) => n + l.amount, 0);
  const rec: PaymentRecord = { id: uid("PAY"), owner, purpose: "post", amount, method, reference: chosen.map((l) => l.receipt).join("،"), at, usedFor: `${app.number}:${chosen.map((l) => l.key).join("+")}` };
  const reg = regOf(s);
  const next: State = setReg({ ...s, post: { ...s.post, [owner]: { ...post, payments: { ...post.payments, ...Object.fromEntries(chosen.map((l) => [l.key, at])) } } } }, { ...reg, ledger: { ...reg.ledger, [rec.id]: rec } });
  return { ok: true, state: next, value: rec };
}

/** A lottery acceptance confirmed by its first installment, at the amount the application's terms set */
export function payFirstInstallment(s: State, owner: string, method: "shamcash" | "bank", at: number): Result<Application> {
  const a = acceptedApp(s, owner);
  if (a.error) return { ok: false, errors: [a.error] };
  const app = a.app;
  if (app.firstPaid) return fail("paid", "الدفعة الأولى مسدَّدة");
  if (!s.post[owner]?.confirmedAt) return fail("confirm", "أكّد القبول أولاً");
  const version = pinnedVersion(regOf(s), app.configVersion, app.season ?? ACTIVE_SEASON);
  const policy = app.policy ?? policyFor(s, version);
  const per = policy.fees.schedule[0]?.perPerson ?? policy.fees.firstInstallment;
  const amount = per * app.members.length;
  const receipt = `1448-P-${app.number.padStart(6, "0")}-1`;
  const rec: PaymentRecord = { id: uid("PAY"), owner, purpose: "first", amount, method, reference: receipt, at, usedFor: app.number };
  const next: Application = { ...app, policy, plan: policy.fees.installmentCount, firstPaid: { amount, at, receipt }, paid: app.paid + amount };
  const reg = regOf(s);
  return { ok: true, state: setReg({ ...s, applications: { ...s.applications, [owner]: next } }, { ...reg, ledger: { ...reg.ledger, [rec.id]: rec } }), value: next };
}

// ───────────────────────── Staff: the configuration ─────────────────────────

/** The signed-in employee, if he holds «إدارة التسجيل على الحج» as the director's grants stand now */
export function managerOf(s: State) {
  const u = getStaff(s.staffSessionId);
  if (!u) return null;
  const g = withGrants(u, s.systems?.grants);
  return g.permissions.includes("registration.manage") ? g : null;
}

function refuse<T>(s: State, what: string, at: number): Result<T> {
  const u = getStaff(s.staffSessionId);
  return {
    ok: false,
    errors: [{ code: "forbidden", message: "هذا الإجراء لحامل صلاحية «إدارة التسجيل على الحج» وحده" }],
    state: withEvent(s, { actor: u?.name ?? "غير مسجّل", role: u?.title ?? "—", action: "محاولة تعديل غير مصرح بها", target: "إدارة التسجيل على الحج", detail: what, system: "registration", important: true }, at),
  };
}

function seasonOf(reg: RegState, year: number) {
  return seasonsOf(reg).find((x) => x.year === year);
}

export type DraftMeta = { action: string; area: string; detail?: string; ref?: string };

/** One edit to a season's draft: the published versions and every application stay as they are */
export function editDraft(s: State, season: number, change: (c: RegConfig) => RegConfig, meta: DraftMeta, at: number): Result<RegConfig> {
  const m = managerOf(s);
  if (!m) return refuse(s, meta.action, at);
  const reg = regOf(s);
  const ss = seasonOf(reg, season);
  if (!ss) return fail("season", "موسم غير موجود");
  if (ss.status === "archived") return fail("archived", "موسم مؤرشف: إعداداته للاطلاع فقط");
  const draft = draftOf(reg, season, nowKey(s.clock, new Date(at)));
  const config = change(structuredClone(draft.config));
  const next = setReg(s, { ...reg, drafts: { ...reg.drafts, [String(season)]: { config, baseVersion: draft.baseVersion, updatedAt: at, updatedBy: m.name } } });
  return { ok: true, state: withEvent(next, { actor: m.name, role: m.title, action: meta.action, target: `مسودة ${ss.label}`, detail: meta.detail, system: "registration", area: meta.area, ref: meta.ref }, at), value: config };
}

/** The draft back to the season's live version */
export function discardDraft(s: State, season: number, at: number): Result<null> {
  const m = managerOf(s);
  if (!m) return refuse(s, "إلغاء تعديلات المسودة", at);
  const reg = regOf(s);
  const drafts = { ...reg.drafts };
  delete drafts[String(season)];
  return { ok: true, state: withEvent(setReg(s, { ...reg, drafts }), { actor: m.name, role: m.title, action: "إلغاء تعديلات المسودة", target: `موسم ${season}`, system: "registration", area: "publish" }, at), value: null };
}

/** An earlier version's configuration into the draft, to be checked and published as a new version */
export function restoreVersion(s: State, versionId: string, at: number): Result<null> {
  const m = managerOf(s);
  if (!m) return refuse(s, "استعادة إصدار", at);
  const reg = regOf(s);
  const v = versionById(reg, versionId);
  if (!v) return fail("version", "إصدار غير موجود");
  const ss = seasonOf(reg, v.season);
  if (!ss || ss.status === "archived") return fail("archived", "موسم مؤرشف: إعداداته للاطلاع فقط");
  const next = setReg(s, { ...reg, drafts: { ...reg.drafts, [String(v.season)]: { config: structuredClone(v.config), baseVersion: liveVersion(reg, v.season, nowKey(s.clock, new Date(at))).id, updatedAt: at, updatedBy: m.name } } });
  return { ok: true, state: withEvent(next, { actor: m.name, role: m.title, action: "استعادة إصدار إلى المسودة", target: `الإصدار ${v.number}`, system: "registration", area: "seasons", ref: v.id }, at), value: null };
}

/**
 * Publishes the draft as a new immutable version, in force from `effectiveFrom` (now when earlier). Refused
 * while any error stands. Applications already started keep their version; new ones start on this one.
 */
export function publishDraft(s: State, season: number, opts: { effectiveFrom?: string; note: string }, at: number): Result<RegVersion> {
  const m = managerOf(s);
  if (!m) return refuse(s, "نشر إصدار", at);
  const reg = regOf(s);
  const ss = seasonOf(reg, season);
  if (!ss) return fail("season", "موسم غير موجود");
  if (ss.status === "archived") return fail("archived", "موسم مؤرشف: إعداداته للاطلاع فقط");
  const now = nowKey(s.clock, new Date(at));
  const draft = draftOf(reg, season, now);
  const previous = versionsOf(reg, season);
  const issues = validateConfig(draft.config, { previous, hajjCost: mergeSeason(s.season).fees.hajjCost });
  if (issues.some((i) => i.level === "error")) return { ok: false, errors: [{ code: "invalid", message: "في الإعدادات أخطاء تمنع النشر" }], issues };
  const live = previous.length ? liveVersion(reg, season, now) : null;
  const changes = live ? diffConfigs(live.config, draft.config) : [];
  if (live && !changes.length && !previous.some((v) => v.effectiveFrom > now)) return fail("nochange", "لا تغيير عن الإصدار المعمول به");
  if (!opts.note.trim()) return fail("note", "اكتب ما الذي يغيّره هذا الإصدار");
  const effectiveFrom = !opts.effectiveFrom || opts.effectiveFrom < now ? now : opts.effectiveFrom;
  const number = Math.max(0, ...previous.map((v) => v.number)) + 1;
  const version: RegVersion = { id: `${season}-v${number}`, season, number, config: structuredClone(draft.config), publishedAt: at, publishedBy: m.name, effectiveFrom, note: opts.note.trim(), basedOn: draft.baseVersion ?? undefined };
  const next = setReg(s, { ...reg, versions: [...reg.versions, version], drafts: { ...reg.drafts, [String(season)]: { config: structuredClone(draft.config), baseVersion: version.id, updatedAt: at, updatedBy: m.name } } });
  return {
    ok: true,
    state: withEvent(
      next,
      {
        actor: m.name,
        role: m.title,
        action: effectiveFrom > now ? "جدولة إصدار من إعدادات التسجيل" : "نشر إصدار من إعدادات التسجيل",
        target: `${ss.label} — الإصدار ${number}`,
        detail: `${opts.note.trim()} — ${changes.length} تغييرات${effectiveFrom > now ? ` — يسري من ${effectiveFrom.replace("T", " ")}` : ""}`,
        system: "registration",
        area: "publish",
        ref: version.id,
        important: true,
      },
      at,
    ),
    value: version,
  };
}

/** A new season prepared from a published version: its draft is a copy, edited and published on its own */
export function createSeason(s: State, year: number, fromVersion: string, at: number): Result<null> {
  const m = managerOf(s);
  if (!m) return refuse(s, "إنشاء موسم تسجيل", at);
  const reg = regOf(s);
  if (seasonOf(reg, year)) return fail("exists", "الموسم موجود");
  if (!Number.isInteger(year) || year < ACTIVE_SEASON) return fail("year", "سنة غير صالحة");
  const from = versionById(reg, fromVersion);
  if (!from) return fail("version", "إصدار غير موجود");
  const seasons = [...seasonsOf(reg), { year, label: `موسم ${year}هـ`, status: "preparing" as const, createdAt: at, createdBy: m.name, copiedFrom: from.id }];
  const next = setReg(s, { ...reg, seasons, drafts: { ...reg.drafts, [String(year)]: { config: structuredClone(from.config), baseVersion: null, updatedAt: at, updatedBy: m.name } } });
  return { ok: true, state: withEvent(next, { actor: m.name, role: m.title, action: "إنشاء موسم تسجيل بنسخ إعدادات", target: `موسم ${year}هـ`, detail: `من ${from.id}`, system: "registration", area: "seasons", important: true }, at), value: null };
}

// ───────────────────────── For the editor ─────────────────────────

/** Answers kept for a field across versions: its label wherever the application's version has it */
export function answerLabel(reg: RegState, versionId: string | undefined, key: string) {
  const v = pinnedVersion(reg, versionId);
  return [...v.config.stages.flatMap((st) => st.fields), ...v.config.postSteps.flatMap((p) => p.fields)].find((f) => f.key === key);
}
