/**
 * The dynamic registration, end to end without a browser: what the holder of «إدارة التسجيل على الحج»
 * configures and publishes, what the pilgrim's flow reads from it, and what the trusted service refuses.
 * Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPerson } from "../lib/registry";
import type { Member } from "../lib/rules";
import { getState, type State } from "../lib/store";
import { evalCondition, satisfiable } from "../lib/registration/conditions";
import { defaultConfig } from "../lib/registration/defaults";
import { draftOf, fieldError, liveVersion, nowKey, pinnedVersion, prunedAnswers, regOf, resolveSchedule, stageErrors, versionsOf, visibleStages } from "../lib/registration/engine";
import { costLines, stepsDone } from "../lib/registration/post";
import {
  completePostStep,
  createSeason,
  dueAtSubmit,
  editDraft,
  payPostLines,
  policyFor,
  publishDraft,
  recordPayment,
  restoreVersion,
  submitApplication,
  type Result,
} from "../lib/registration/service";
import type { FieldDef, RegConfig, StageDef } from "../lib/registration/types";
import { diffConfigs, validateConfig } from "../lib/registration/validate";

const AT = new Date(2026, 7, 27, 10, 0).getTime();
const OWNER = "01012345412"; // محمد الخطيب، 58 عاماً

const member = (id: string, relation: Member["relation"] = "self"): Member => ({ person: getPerson(id)!, relation, relationVerified: true, needs: [] });

/** The state on the lottery's second day, signed in as the holder of «إدارة التسجيل على الحج» */
function base(over: Partial<State> = {}): State {
  return { ...structuredClone(getState()), clock: { today: "2026-08-27", time: "10:00" }, staffSessionId: "hiba", ...over };
}

function ok<T>(r: Result<T>): State & { value: T } {
  if (!r.ok) assert.fail(`expected success, got: ${r.errors.map((e) => e.message).join(" | ")}${r.issues ? ` — ${r.issues.filter((i) => i.level === "error").map((i) => `${i.where}: ${i.message}`).join(" | ")}` : ""}`);
  return Object.assign(r.state, { value: r.value });
}

const textField = (key: string, extra: Partial<FieldDef> = {}): FieldDef => ({ id: `f-${key}`, key, label: `سؤال ${key}`, type: "text", required: true, scope: "application", ...extra });

const formStage = (id: string, fields: FieldDef[], extra: Partial<StageDef> = {}): StageDef => ({
  id,
  kind: "form",
  name: id,
  title: `صفحة ${id}`,
  phase: "صاحب الطلب",
  blocks: [],
  fields,
  enabled: true,
  gates: [],
  ...extra,
});

/** Inserts a stage right after another one */
function insertAfter(c: RegConfig, after: string, st: StageDef): RegConfig {
  const at = c.stages.findIndex((s) => s.id === after);
  c.stages.splice(at + 1, 0, st);
  return c;
}

const errorsOf = (c: RegConfig, hajjCost = 4750) => validateConfig(c, { hajjCost }).filter((i) => i.level === "error");

/** A draft for محمد alone, lottery, with whatever the test sets */
function withDraft(s: State, extra: Partial<State["drafts"][string]> = {}): State {
  const live = liveVersion(regOf(s), 1448, nowKey(s.clock));
  return { ...s, drafts: { ...s.drafts, [OWNER]: { updatedAt: AT, history: [], track: "lottery", members: [member(OWNER)], book: null, residence: "سوريا", maxPhase: 3, consents: {}, configVersion: live.id, ...extra } } };
}

function pay(s: State, amount: number) {
  return ok(recordPayment(s, { owner: OWNER, purpose: "registration", amount, method: "shamcash", reference: "T" }, AT));
}

const submitInput = (paymentId: string, members: Member[] = [member(OWNER)], extra: Partial<Parameters<typeof submitApplication>[1]> = {}) => ({
  owner: OWNER,
  track: "lottery" as const,
  members,
  residence: "سوريا",
  book: null,
  answers: {},
  memberAnswers: {},
  paymentId,
  method: "shamcash" as const,
  ...extra,
});

describe("the default configuration", () => {
  it("is the platform's flow and passes every check", () => {
    assert.deepEqual(validateConfig(defaultConfig(), { hajjCost: 4750 }), []);
  });
  it("shows the platform's stages in their order", () => {
    const ids = visibleStages(defaultConfig(), { members: [], answers: {}, memberAnswers: {}, elderlyMaxBirthYear: 1957 }, "2026-08-27").map((s) => s.id);
    assert.deepEqual(ids, ["intro", "track", "applicant", "residence", "members", "eligibility", "consents", "summary", "payment"]);
  });
});

describe("1–4. pages, order, questions and content from the panel", () => {
  it("a new page shows in the flow, reordered pages follow the new order", () => {
    const c = insertAfter(defaultConfig(), "residence", formStage("housing", [textField("q1")]));
    assert.equal(errorsOf(c).length, 0);
    const ctx = { members: [member(OWNER)], answers: {}, memberAnswers: {}, elderlyMaxBirthYear: 1957 };
    assert.deepEqual(visibleStages(c, ctx, "2026-08-27").map((s) => s.id).slice(3, 5), ["residence", "housing"]);
    // Move it before the track: allowed, it reads nothing decided later
    const moved = c.stages.filter((s) => s.id !== "housing");
    moved.splice(1, 0, c.stages.find((s) => s.id === "housing")!);
    assert.deepEqual(visibleStages({ ...c, stages: moved }, ctx, "2026-08-27").map((s) => s.id).slice(0, 3), ["intro", "housing", "track"]);
  });

  it("a question with options is validated as the pilgrim answers it", () => {
    const f: FieldDef = { ...textField("room"), type: "radio", options: [{ id: "a", value: "a", label: "مشترك" }, { id: "b", value: "b", label: "خاص" }] };
    assert.equal(fieldError(f, undefined), "هذا السؤال مطلوب");
    assert.equal(fieldError(f, "z"), "اختر من الخيارات");
    assert.equal(fieldError(f, "b"), null);
    assert.equal(fieldError({ ...f, type: "yesno" }, false), null, "«لا» is an answer");
    assert.equal(fieldError({ ...f, type: "consent" }, false), "يلزم الإقرار للمتابعة");
    assert.equal(fieldError({ ...textField("p"), pattern: "^09\\d{8}$", patternMessage: "رقم جوال سوري" }, "123"), "رقم جوال سوري");
  });

  it("a question shown by a condition is required only when it shows, and its stale answer is dropped", () => {
    const f1: FieldDef = { ...textField("abroadCity"), showIf: { fact: "abroad", op: "eq", value: true } };
    const st = formStage("x", [f1]);
    const inSyria = { members: [member(OWNER)], residence: "سوريا", answers: { abroadCity: "إسطنبول" }, memberAnswers: {}, elderlyMaxBirthYear: 1957 };
    assert.equal(stageErrors(st, { ...inSyria, answers: {} }).length, 0);
    assert.equal(stageErrors(st, { ...inSyria, residence: "تركيا", answers: {} }).length, 1);
    assert.deepEqual(prunedAnswers([st], inSyria).answers, {});
  });

  it("a page with a date window is hidden outside it, and a disabled page is skipped", () => {
    const c = insertAfter(defaultConfig(), "residence", formStage("late", [textField("q")], { window: { from: "2026-09-01" } }));
    const ctx = { members: [], answers: {}, memberAnswers: {}, elderlyMaxBirthYear: 1957 };
    assert.ok(!visibleStages(c, ctx, "2026-08-27").some((s) => s.id === "late"));
    assert.ok(visibleStages(c, ctx, "2026-09-02").some((s) => s.id === "late"));
    c.stages.find((s) => s.id === "intro")!.enabled = false;
    assert.equal(visibleStages(c, ctx, "2026-09-02")[0].id, "track");
  });
});

describe("validation before publishing", () => {
  it("refuses a trusted stage removed, disabled, hidden or out of order", () => {
    const noPay = defaultConfig();
    noPay.stages = noPay.stages.filter((s) => s.id !== "payment");
    assert.ok(errorsOf(noPay).some((e) => e.where === "الدفع"));
    const off = defaultConfig();
    off.stages.find((s) => s.id === "eligibility")!.enabled = false;
    assert.ok(errorsOf(off).some((e) => e.message.includes("معطّلة")));
    const hidden = defaultConfig();
    hidden.stages.find((s) => s.id === "consents")!.showIf = { fact: "track", op: "eq", value: "direct" };
    assert.ok(errorsOf(hidden).some((e) => e.message.includes("لا تُخفى")));
    const swapped = defaultConfig();
    const [e, m] = [swapped.stages.findIndex((s) => s.id === "eligibility"), swapped.stages.findIndex((s) => s.id === "members")];
    [swapped.stages[e], swapped.stages[m]] = [swapped.stages[m], swapped.stages[e]];
    assert.ok(errorsOf(swapped).some((x) => x.message.includes("بعد «المرافقون»")));
    const after = insertAfter(defaultConfig(), "payment", formStage("tail", [textField("q")]));
    assert.ok(errorsOf(after).some((x) => x.message.includes("بعد الدفع")));
  });

  it("refuses a progress-bar part split in two", () => {
    const c = insertAfter(defaultConfig(), "residence", formStage("x", [textField("q")], { phase: "الأهلية" }));
    assert.ok(errorsOf(c).some((e) => e.message.includes("مقسومة")));
    c.stages.find((s) => s.id === "x")!.phase = "صاحب الطلب";
    assert.ok(!errorsOf(c).some((e) => e.message.includes("مقسومة")));
  });

  it("refuses conditions that refer to nothing, and gates that can never be passed", () => {
    const c = insertAfter(defaultConfig(), "residence", formStage("g", [textField("q")], { showIf: { fact: "answer:nope", op: "eq", value: "x" } }));
    assert.ok(errorsOf(c).some((x) => x.message.includes("nope")));
    const g = insertAfter(defaultConfig(), "residence", formStage("g", [{ ...textField("n"), type: "number" }], { gates: [{ id: "g1", when: { all: [{ fact: "answer:n", op: "gt", value: 10 }, { fact: "answer:n", op: "lt", value: 5 }] }, message: "…" }] }));
    assert.ok(errorsOf(g).some((x) => x.message.includes("لا يتحقق أبداً")));
  });

  it("finds contradicting eligibility rules, and a rule nobody can meet", () => {
    const c = defaultConfig();
    c.eligibility = [
      { id: "r1", label: "عمر أدنى", scope: "member", require: { fact: "member.age", op: "gte", value: 70 }, severity: "fail", message: "…", fix: "remove", enabled: true },
      { id: "r2", label: "عمر أعلى", scope: "member", require: { fact: "member.age", op: "lt", value: 60 }, severity: "fail", message: "…", fix: "remove", enabled: true },
    ];
    assert.ok(errorsOf(c).some((x) => x.message.includes("متعارضتان")));
    // Applying to different people, they do not conflict
    c.eligibility[1].when = { fact: "member.gender", op: "eq", value: "F" };
    c.eligibility[0].when = { fact: "member.gender", op: "eq", value: "M" };
    assert.ok(!errorsOf(c).some((x) => x.message.includes("متعارضتان")));
    c.eligibility = [{ id: "r3", label: "مستحيلة", scope: "member", when: { fact: "member.age", op: "gte", value: 80 }, require: { fact: "member.age", op: "lt", value: 70 }, severity: "fail", message: "…", fix: "none", enabled: true }];
    assert.ok(errorsOf(c).some((x) => x.message.includes("لا يستوفيها أحد")));
    assert.equal(satisfiable({ all: [{ fact: "track", op: "eq", value: "direct" }, { fact: "track", op: "eq", value: "lottery" }] }), false);
  });

  it("keeps a question key's meaning across the season's versions", () => {
    const v1 = insertAfter(defaultConfig(), "residence", formStage("x", [textField("blood")]));
    const v2 = insertAfter(defaultConfig(), "residence", formStage("x", [{ ...textField("blood"), type: "number" }]));
    const issues = validateConfig(v2, { hajjCost: 4750, previous: [{ id: "1448-v9", season: 1448, number: 9, config: v1, publishedAt: 0, publishedBy: "", effectiveFrom: "", note: "" }] });
    assert.ok(issues.some((i) => i.level === "error" && i.message.includes("blood")));
  });
});

describe("5. the number of installments", () => {
  it("three installments: the last takes the rest, each due at a payment step in order", () => {
    const c = defaultConfig();
    c.postSteps.splice(c.postSteps.findIndex((p) => p.id === "passport") + 1, 0, { id: "third", kind: "installment", title: "الدفعة الثالثة", short: "", emoji: "💳", question: "؟", enabled: true, fields: [] });
    c.payments.installments = [
      { key: "i1", label: "الأولى", amount: 2000, dueLabel: "مع التسجيل" },
      { key: "i2", label: "الثانية", amount: 1500, dueStep: "payment", dueLabel: "عند الانضمام" },
      { key: "i3", label: "الثالثة", amount: null, dueStep: "third", dueLabel: "بعد الجواز" },
    ];
    assert.deepEqual(errorsOf(c), []);
    assert.deepEqual(resolveSchedule(c.payments.installments, 4750).map((i) => i.perPerson), [2000, 1500, 1250]);
    // More fixed than the cost: refused
    c.payments.installments[1].amount = 3000;
    assert.ok(errorsOf(c).some((e) => e.message.includes("يتجاوزها")));
    // An installment due at a step that takes no payment: refused
    c.payments.installments[1].amount = 1500;
    c.payments.installments[2].dueStep = "medical";
    assert.ok(errorsOf(c).some((e) => e.message.includes("لا تأخذ دفعاً")));
  });

  it("a single payment of the whole cost", () => {
    const c = defaultConfig();
    c.payments.installments = [{ key: "i1", label: "تكلفة الحج كاملة", amount: null, dueLabel: "مع التسجيل" }];
    assert.deepEqual(errorsOf(c), []);
    assert.deepEqual(resolveSchedule(c.payments.installments, 4750).map((i) => i.perPerson), [4750]);
  });
});

describe("6, 8. publishing versions, and applications already started", () => {
  it("publishes a change, and a draft started before it keeps its version", () => {
    let s = withDraft(base());
    const v1 = liveVersion(regOf(s), 1448, nowKey(s.clock));
    s = ok(editDraft(s, 1448, (c) => insertAfter(c, "residence", formStage("housing", [textField("q1")])), { action: "إضافة مرحلة", area: "stages" }, AT));
    // Editing the draft changes nothing live
    assert.equal(liveVersion(regOf(s), 1448, nowKey(s.clock)).id, v1.id);
    s = ok(publishDraft(s, 1448, { note: "صفحة السكن" }, AT));
    const v2 = liveVersion(regOf(s), 1448, nowKey(s.clock));
    assert.equal(v2.number, v1.number + 1);
    assert.ok(v2.config.stages.some((x) => x.id === "housing"));
    // The draft started on v1 stays on v1: no new page appears in it
    const pinned = pinnedVersion(regOf(s), s.drafts[OWNER].configVersion);
    assert.equal(pinned.id, v1.id);
    assert.ok(!pinned.config.stages.some((x) => x.id === "housing"));
    // …and it is still submitted under v1's stages
    const paid = pay(s, 25);
    s = paid;
    const sub = ok(submitApplication(s, submitInput(paid.value.id), AT));
    assert.equal(sub.value.configVersion, v1.id);
    assert.ok(diffConfigs(v1.config, v2.config).some((d) => d.kind === "added"));
  });

  it("refuses publishing with errors, or with nothing changed", () => {
    let s = base();
    let r = publishDraft(s, 1448, { note: "لا شيء" }, AT);
    assert.equal(r.ok, false);
    s = ok(editDraft(s, 1448, (c) => ({ ...c, stages: c.stages.filter((x) => x.id !== "payment") }), { action: "حذف", area: "stages" }, AT));
    r = publishDraft(s, 1448, { note: "خطأ" }, AT);
    assert.equal(r.ok, false);
    assert.ok(!r.ok && r.issues?.some((i) => i.level === "error"));
  });

  it("a scheduled version takes effect at its time, and an old version can be restored", () => {
    let s = base();
    s = ok(editDraft(s, 1448, (c) => ({ ...c, messages: { ...c.messages, helpLine: "رقم جديد" } }), { action: "نص", area: "stages" }, AT));
    s = ok(publishDraft(s, 1448, { note: "رقم المساعدة", effectiveFrom: "2026-08-30T08:00" }, AT));
    assert.notEqual(liveVersion(regOf(s), 1448, "2026-08-27T10:00").config.messages.helpLine, "رقم جديد");
    assert.equal(liveVersion(regOf(s), 1448, "2026-08-30T08:00").config.messages.helpLine, "رقم جديد");
    s = ok(restoreVersion(s, "1448-v1", AT));
    assert.notEqual(draftOf(regOf(s), 1448, "2026-08-31T00:00").config.messages.helpLine, "رقم جديد");
  });

  it("a new season copies a version; editing it never touches another season", () => {
    let s: State = ok(createSeason(base(), 1449, "1448-v1", AT));
    s = ok(editDraft(s, 1449, (c) => ({ ...c, tracks: c.tracks.map((t) => ({ ...t, enabled: t.key === "lottery" })) }), { action: "مسار", area: "payments" }, AT));
    s = ok(publishDraft(s, 1449, { note: "قرعة فقط" }, AT));
    assert.equal(versionsOf(regOf(s), 1449).length, 1);
    assert.ok(liveVersion(regOf(s), 1448, nowKey(s.clock)).config.tracks.every((t) => t.enabled));
    // An archived season is read only
    assert.equal(editDraft(s, 1447, (c) => c, { action: "x", area: "x" }, AT).ok, false);
  });
});

describe("10. only the holder of the permission edits", () => {
  for (const who of ["suha", "rana", null]) {
    it(`refuses ${who ?? "nobody signed in"}, and records the attempt`, () => {
      const s = base({ staffSessionId: who });
      const r = editDraft(s, 1448, (c) => c, { action: "تعديل", area: "stages" }, AT);
      assert.equal(r.ok, false);
      assert.ok(!r.ok && r.state?.events.at(-1)?.action === "محاولة تعديل غير مصرح بها");
      assert.equal(publishDraft(s, 1448, { note: "x" }, AT).ok, false);
    });
  }
  it("follows the director's grants: taken back, refused", () => {
    const s = base({ systems: { grants: { registration: [] } } });
    assert.equal(editDraft(s, 1448, (c) => c, { action: "تعديل", area: "stages" }, AT).ok, false);
  });
});

describe("7, 9. submission cannot skip eligibility, consents or payment", () => {
  it("a complete, paid application is accepted once", () => {
    let s = withDraft(base());
    const due = dueAtSubmit(policyFor(s, liveVersion(regOf(s), 1448, nowKey(s.clock))), "lottery", 1);
    assert.equal(due.total, 25);
    const paid = pay(s, 25);
    s = paid;
    const id = paid.value.id;
    const done = ok(submitApplication(s, submitInput(id), AT));
    assert.equal(done.value.policy?.fees.registrationPerPerson, 25);
    assert.equal(done.drafts[OWNER], undefined, "the draft is cleared");
    // The same payment, again: refused (the application exists, and the payment is used)
    const again = submitApplication(done, submitInput(id), AT);
    assert.equal(again.ok, false);
    assert.ok(!again.ok && again.errors.some((e) => e.code === "duplicate" || e.code === "payment-used"));
  });

  it("refuses without a confirmed payment, or for the wrong amount", () => {
    const s = withDraft(base());
    assert.ok(!submitApplication(s, submitInput("PAY-FAKE"), AT).ok);
    const low = pay(s, 5);
    const r = submitApplication(low, submitInput(low.value.id), AT);
    assert.ok(!r.ok && r.errors.some((e) => e.code === "payment-amount"));
  });

  it("asking to pay twice records one payment", () => {
    const s = pay(withDraft(base()), 25);
    const again = recordPayment(s, { owner: OWNER, purpose: "registration", amount: 25, method: "shamcash", reference: "T" }, AT);
    assert.ok(again.ok && again.value.id === s.value.id);
  });

  it("refuses an ineligible member however the page was changed", () => {
    const rim = "02033300552"; // a woman under 44 without a mahram
    let s = withDraft(base(), { members: [member(rim)] });
    s = { ...s, drafts: { ...s.drafts, [OWNER]: { ...s.drafts[OWNER], members: [member(rim)] } } };
    const paid = pay(s, 25);
    s = paid;
    const r = submitApplication(s, submitInput(paid.value.id, [member(rim)]), AT);
    assert.ok(!r.ok && r.errors.some((e) => e.code === "eligibility"));
  });

  it("refuses until every adult approved from his own side", () => {
    const family = [member(OWNER), member("01012345413", "spouse")];
    let s = withDraft(base(), { members: family, consents: { "01012345413": { status: "pending", sentAt: AT, via: "sms" } } });
    const paid = pay(s, 50);
    s = paid;
    const r = submitApplication(s, submitInput(paid.value.id, family), AT);
    assert.ok(!r.ok && r.errors.some((e) => e.code === "consent"));
    const approved = { ...s, drafts: { ...s.drafts, [OWNER]: { ...s.drafts[OWNER], consents: { "01012345413": { status: "approved" as const, sentAt: AT, respondedAt: AT, via: "sms" as const } } } } };
    ok(submitApplication(approved, submitInput(paid.value.id, family), AT));
  });

  it("enforces the administration's own eligibility rule, and a page's required answers and gates", () => {
    let s = base();
    s = ok(
      editDraft(
        s,
        1448,
        (c) => {
          c.eligibility = [{ id: "under60", label: "دون الستين هذا الموسم", scope: "member", require: { fact: "member.age", op: "lt", value: 55 }, severity: "fail", message: "للتجربة", fix: "remove", enabled: true }];
          return insertAfter(c, "residence", formStage("q", [{ ...textField("agree"), type: "yesno" }], { gates: [{ id: "g", when: { fact: "answer:agree", op: "eq", value: true }, message: "يجب الموافقة" }] }));
        },
        { action: "قواعد", area: "rules" },
        AT,
      ),
    );
    s = ok(publishDraft(s, 1448, { note: "قاعدة وسؤال" }, AT));
    const paid = pay(withDraft(s), 25);
    s = paid;
    const r = submitApplication(s, submitInput(paid.value.id), AT);
    assert.ok(!r.ok);
    const codes = !r.ok ? r.errors.map((e) => e.code) : [];
    assert.ok(codes.includes("eligibility"), "the configured rule fails محمد (58)");
    assert.ok(codes.includes("answers"), "the required question is unanswered");
    const r2 = submitApplication(s, submitInput(paid.value.id, undefined, { answers: { agree: false } }), AT);
    assert.ok(!r2.ok && r2.errors.some((e) => e.code === "gate"));
  });

  it("refuses when the registration is closed or its track switched off", () => {
    const closed = pay(withDraft(base({ clock: { today: "2026-09-20", time: "10:00" } })), 25);
    assert.ok(!submitApplication(closed, submitInput(closed.value.id), AT).ok);
    let s: State = ok(editDraft(base(), 1448, (c) => ({ ...c, tracks: c.tracks.map((t) => (t.key === "lottery" ? { ...t, enabled: false } : t)) }), { action: "مسار", area: "payments" }, AT));
    s = ok(publishDraft(s, 1448, { note: "إيقاف القرعة" }, AT));
    const paid = pay(withDraft(s), 25);
    s = paid;
    const r = submitApplication(s, submitInput(paid.value.id), AT);
    assert.ok(!r.ok && r.errors.some((e) => e.code === "track"));
  });
});

describe("after acceptance", () => {
  /** محمد's lottery application, accepted by the published draw of his birth year */
  function accepted(config?: (c: RegConfig) => RegConfig) {
    let s = base();
    if (config) {
      s = ok(editDraft(s, 1448, config, { action: "خطوات", area: "steps" }, AT));
      s = ok(publishDraft(s, 1448, { note: "خطوات" }, AT));
    }
    const paid = pay(withDraft(s), 25);
    s = paid;
    s = ok(submitApplication(s, submitInput(paid.value.id), AT));
    return { ...s, lottery: { published: { picks: [{ year: 1968, months: "all" as const }], by: "", at: AT } } } as State;
  }

  it("an added step stays locked until the steps before it are complete", () => {
    const s = accepted((c) => {
      c.postSteps.splice(1, 0, { id: "ack", kind: "acknowledge", title: "إقرار", short: "", emoji: "📝", ackText: "أقرّ", question: "؟", enabled: true, fields: [] });
      return c;
    });
    let r = completePostStep(s, OWNER, "ack", { ack: true }, undefined, AT);
    assert.ok(!r.ok && r.errors[0].code === "locked", "confirm is not done yet");
    // Confirmed and the first installment paid: now it opens
    const app = s.applications[OWNER];
    const confirmed: State = { ...s, applications: { ...s.applications, [OWNER]: { ...app, firstPaid: { amount: 3500, at: AT, receipt: "x" } } }, post: { [OWNER]: { documents: {}, payments: {}, ratings: {}, confirmedAt: AT } } };
    r = completePostStep(confirmed, OWNER, "ack", { ack: false }, undefined, AT);
    assert.ok(!r.ok && r.errors[0].code === "ack");
    const done = ok(completePostStep(confirmed, OWNER, "ack", { ack: true }, undefined, AT));
    const steps = pinnedVersion(regOf(done), done.applications[OWNER].configVersion).config.postSteps;
    const d = stepsDone(done.post[OWNER], done.applications[OWNER], costLines(done.applications[OWNER], { hajjCost: 4750, firstInstallment: 3500, hady: 180 }), steps);
    assert.equal(d.ack, true);
  });

  it("an installment cannot be paid before its step is reached", () => {
    const s = accepted();
    const app = s.applications[OWNER];
    const confirmed: State = { ...s, applications: { ...s.applications, [OWNER]: { ...app, firstPaid: { amount: 3500, at: AT, receipt: "x" } } }, post: { [OWNER]: { documents: {}, payments: {}, ratings: {}, confirmedAt: AT } } };
    const r = payPostLines(confirmed, OWNER, ["i2"], "shamcash", undefined, AT);
    assert.ok(!r.ok && r.errors[0].code === "locked");
  });

  it("the application keeps its terms when the season's cost changes later", () => {
    const s = accepted();
    const app = s.applications[OWNER];
    const before = costLines(app, { hajjCost: 4750, firstInstallment: 3500, hady: 180 }).map((l) => l.amount);
    const after = costLines(app, { hajjCost: 9999, firstInstallment: 9000, hady: 999 }).map((l) => l.amount);
    assert.deepEqual(after, before);
  });
});

describe("the condition engine", () => {
  it("reads members, answers and the application", () => {
    const ctx = { members: [member(OWNER), member("01012340078", "parent")], answers: { n: 3, tags: ["a", "b"] }, memberAnswers: {}, elderlyMaxBirthYear: 1957, track: "lottery" as const };
    assert.equal(evalCondition({ fact: "hasElderly", op: "eq", value: true }, ctx), true);
    assert.equal(evalCondition({ fact: "applicantAge", op: "gte", value: 58 }, ctx), true);
    assert.equal(evalCondition({ fact: "answer:tags", op: "in", value: ["b", "c"] }, ctx), true);
    assert.equal(evalCondition({ any: [{ fact: "track", op: "eq", value: "direct" }, { fact: "answer:n", op: "gt", value: "2" }] }, ctx), true);
    assert.equal(evalCondition({ not: { fact: "membersCount", op: "eq", value: 2 } }, ctx), false);
  });
});
