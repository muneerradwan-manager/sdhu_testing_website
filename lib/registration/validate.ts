/**
 * What is checked before a configuration may be published, and what changed between two of them. A
 * configuration with any error cannot be published: the trusted parts must all be there and in an order
 * their logic can run in, every condition must refer to something that exists by then, a rule must not
 * contradict itself or another, and the payments must add up.
 */
import { describe, factDef, jointlySatisfiable, leaves, satisfiable } from "./conditions";
import { scheduleAmounts } from "./engine";
import type { Condition, FieldDef, PostSystemStep, RegConfig, RegVersion, StageDef, SystemBlock } from "./types";

export type Issue = { level: "error" | "warning"; where: string; message: string; /** The stage, step or rule it concerns, for a link */ ref?: string };

/** Must be in every configuration, switched on and never hidden: their logic is what makes an application valid */
export const REQUIRED_BLOCKS: SystemBlock[] = ["track", "applicant", "eligibility", "consents", "summary", "payment"];
/** May be switched off: without members it is a one-person application; without residence the office is the registry's */
export const OPTIONAL_BLOCKS: SystemBlock[] = ["residence", "members"];

/** Each block must come after these, because it reads what they decide */
export const BLOCK_AFTER: Partial<Record<SystemBlock, SystemBlock[]>> = {
  residence: ["applicant"],
  members: ["applicant"],
  eligibility: ["track", "applicant", "members"],
  consents: ["eligibility"],
  summary: ["consents", "residence"],
  payment: ["summary"],
};

export const POST_SYSTEM: PostSystemStep[] = ["confirm", "documents", "group", "payment", "passport", "medical", "visa"];

/** The steps after acceptance in the order their logic needs (the operating procedure) */
export const POST_AFTER: Partial<Record<PostSystemStep, PostSystemStep[]>> = {
  documents: ["confirm"],
  group: ["documents"],
  payment: ["group"],
  passport: ["payment"],
  medical: ["group"],
  visa: ["passport", "medical"],
};

export const BLOCK_LABEL: Record<SystemBlock, string> = {
  track: "نوع التسجيل",
  applicant: "صاحب الطلب",
  residence: "مكان الإقامة",
  members: "المرافقون",
  eligibility: "فحص الأهلية",
  consents: "الموافقات",
  summary: "الملخص",
  payment: "الدفع",
};

export const POST_LABEL: Record<PostSystemStep, string> = {
  confirm: "تأكيد القبول",
  documents: "الصورة الشخصية",
  group: "الإلحاق بمجموعة",
  payment: "الدفعة الثانية",
  passport: "جواز السفر",
  medical: "الملف الطبي",
  visa: "التأشيرة والرحلة",
};

const stageWhere = (s: StageDef) => `مرحلة «${s.name || s.title || s.id}»`;

function checkCondition(c: Condition | undefined, where: string, known: FieldDef[], allowMember: boolean, ref: string, out: Issue[]) {
  if (!c) return;
  for (const l of leaves(c)) {
    const def = factDef(l.fact, known);
    if (!def) {
      out.push({ level: "error", where, ref, message: `يشير الشرط إلى «${l.fact.replace(/^m?answer:/, "")}» وهو سؤال غير موجود أو لم يُسأل بعد في هذه المرحلة` });
      continue;
    }
    if (def.member && !allowMember) out.push({ level: "error", where, ref, message: `«${def.label}» صفة لفرد واحد، ولا تُستعمل هنا (لا يُقرأ فيها فرد بعينه)` });
    if (!["set", "unset"].includes(l.op) && (l.value === undefined || l.value === "" || (Array.isArray(l.value) && !l.value.length))) {
      out.push({ level: "error", where, ref, message: `شرط «${def.label}» بلا قيمة يُقارن بها` });
    }
    if (def.type === "number" && ["gt", "gte", "lt", "lte"].includes(l.op) && Number.isNaN(Number(l.value))) {
      out.push({ level: "error", where, ref, message: `«${def.label}» رقم، فيُقارن برقم` });
    }
    if (def.type !== "number" && ["gt", "gte", "lt", "lte"].includes(l.op)) out.push({ level: "error", where, ref, message: `«${def.label}» ليس رقماً، فلا يُقارن بأكبر أو أصغر` });
  }
  if (!satisfiable(c)) out.push({ level: "error", where, ref, message: `الشرط لا يتحقق أبداً: ${describe(c, known)}` });
}

function checkField(f: FieldDef, where: string, ref: string, out: Issue[]) {
  if (!f.label.trim()) out.push({ level: "error", where, ref, message: "سؤال بلا نص" });
  if (["select", "radio", "checkboxes"].includes(f.type)) {
    const opts = f.options ?? [];
    if (opts.length < 2) out.push({ level: "error", where, ref, message: `السؤال «${f.label}» يحتاج خيارين على الأقل` });
    if (opts.some((o) => !o.label.trim())) out.push({ level: "error", where, ref, message: `في السؤال «${f.label}» خيار بلا نص` });
    const vals = opts.map((o) => o.value);
    if (new Set(vals).size !== vals.length) out.push({ level: "error", where, ref, message: `في السؤال «${f.label}» خياران بالقيمة نفسها` });
  }
  if (f.min !== undefined && f.max !== undefined && f.min > f.max) out.push({ level: "error", where, ref, message: `في السؤال «${f.label}» أقل قيمة أكبر من أعلاها` });
  if (f.minLength !== undefined && f.maxLength !== undefined && f.minLength > f.maxLength) out.push({ level: "error", where, ref, message: `في السؤال «${f.label}» أقل طول أكبر من أكبره` });
  if (f.pattern) {
    try {
      new RegExp(f.pattern);
    } catch {
      out.push({ level: "error", where, ref, message: `صيغة التحقق في «${f.label}» غير صالحة` });
    }
  }
}

/**
 * Everything wrong with a configuration. `previous`: the season's published versions, so a question key keeps
 * its meaning across them; `hajjCost`: the season's cost, which the installments must fit in.
 */
export function validateConfig(config: RegConfig, opts: { previous?: RegVersion[]; hajjCost: number }): Issue[] {
  const out: Issue[] = [];
  const stages = config.stages;

  // ── Ids and keys ──
  const ids = stages.map((s) => s.id);
  if (new Set(ids).size !== ids.length) out.push({ level: "error", where: "المراحل", message: "مرحلتان بالمعرّف نفسه" });
  const allFields = [...stages.flatMap((s) => s.fields), ...config.postSteps.flatMap((p) => p.fields)];
  const keys = allFields.map((f) => f.key);
  const dupKey = keys.find((k, i) => keys.indexOf(k) !== i);
  if (dupKey) out.push({ level: "error", where: "الأسئلة", message: `مفتاح الإجابة «${dupKey}» مستعمل في سؤالين` });

  // A key keeps one meaning in a season: answers already stored under it are read by it
  for (const v of opts.previous ?? []) {
    for (const old of [...v.config.stages.flatMap((s) => s.fields), ...v.config.postSteps.flatMap((p) => p.fields)]) {
      const now = allFields.find((f) => f.key === old.key);
      if (now && (now.type !== old.type || now.scope !== old.scope)) {
        out.push({ level: "error", where: `السؤال «${now.label}»`, message: `مفتاحه «${old.key}» استُعمل في الإصدار ${v.number} لسؤال من نوع آخر، وإجابات الطلبات القائمة محفوظة به. أنشئ سؤالاً جديداً بدل تغيير نوعه` });
      }
    }
  }

  // ── The trusted blocks ──
  const enabled = stages.filter((s) => s.enabled);
  const pos = (b: SystemBlock) => enabled.findIndex((s) => s.kind === "system" && s.system === b);
  for (const b of [...REQUIRED_BLOCKS, ...OPTIONAL_BLOCKS]) {
    const all = stages.filter((s) => s.kind === "system" && s.system === b);
    if (all.length > 1) out.push({ level: "error", where: BLOCK_LABEL[b], message: "موجودة أكثر من مرة" });
    if (REQUIRED_BLOCKS.includes(b)) {
      if (!all.length) out.push({ level: "error", where: BLOCK_LABEL[b], message: "مرحلة أساسية محذوفة: منطقها شرط لصحة الطلب ولا يُستغنى عنها" });
      else if (!all[0].enabled) out.push({ level: "error", where: BLOCK_LABEL[b], message: "مرحلة أساسية معطّلة: لا يُقدَّم طلب دونها", ref: all[0].id });
      else if (all[0].showIf || all[0].window) out.push({ level: "error", where: BLOCK_LABEL[b], message: "مرحلة أساسية لا تُخفى بشرط ولا تُقيَّد بمواعيد", ref: all[0].id });
    }
  }
  for (const [b, before] of Object.entries(BLOCK_AFTER) as [SystemBlock, SystemBlock[]][]) {
    const at = pos(b);
    if (at < 0) continue;
    for (const p of before) {
      const pAt = pos(p);
      if (pAt >= 0 && pAt > at) out.push({ level: "error", where: BLOCK_LABEL[b], message: `يجب أن تأتي بعد «${BLOCK_LABEL[p]}» لأنها تقرأ ما يُحدَّد فيها`, ref: enabled[at].id });
    }
  }
  const payAt = pos("payment");
  if (payAt >= 0 && payAt !== enabled.length - 1) out.push({ level: "error", where: BLOCK_LABEL.payment, message: "الدفع آخر مرحلة: بعده يُقدَّم الطلب، فلا مرحلة تليه", ref: enabled[payAt].id });

  // ── Each stage ──
  const membersAt = pos("members");
  const applicantAt = pos("applicant");
  const askedSoFar: FieldDef[] = [];
  stages.forEach((s) => {
    const where = stageWhere(s);
    const at = enabled.indexOf(s);
    if (s.kind !== "system") {
      if (!s.title.trim()) out.push({ level: "error", where, ref: s.id, message: "صفحة بلا عنوان" });
      if (!s.phase.trim()) out.push({ level: "error", where, ref: s.id, message: "لم تُحدَّد مرحلتها في شريط التقدم" });
      if (s.kind === "form" && !s.fields.length) out.push({ level: "error", where, ref: s.id, message: "صفحة أسئلة بلا أسئلة" });
      if (s.enabled && payAt >= 0 && at > payAt) out.push({ level: "error", where, ref: s.id, message: "لا صفحة بعد الدفع" });
    }
    if (s.window?.from && s.window?.to && s.window.from > s.window.to) out.push({ level: "error", where, ref: s.id, message: "تاريخ البدء بعد تاريخ الانتهاء" });
    // Member questions and member conditions need the members to be known by then
    const readsMembers = s.fields.some((f) => f.scope === "member") || leaves(s.showIf).some((l) => l.fact.startsWith("member.") || ["membersCount", "companionsCount", "hasElderly"].includes(l.fact));
    if (s.enabled && readsMembers && membersAt >= 0 && at >= 0 && at < membersAt) out.push({ level: "error", where, ref: s.id, message: "تسأل عن أفراد الطلب أو تقرؤهم قبل مرحلة «المرافقون»" });
    const readsApplicant = leaves(s.showIf).some((l) => l.fact.startsWith("applicant"));
    if (s.enabled && readsApplicant && applicantAt >= 0 && at >= 0 && at < applicantAt) out.push({ level: "error", where, ref: s.id, message: "تقرأ صاحب الطلب قبل تحديده" });

    checkCondition(s.showIf, `${where} — شرط الظهور`, askedSoFar, false, s.id, out);
    s.fields.forEach((f) => {
      checkField(f, where, s.id, out);
      checkCondition(f.showIf, `${where} — شرط ظهور «${f.label}»`, [...askedSoFar, ...s.fields.filter((x) => x !== f && x.scope === "application")], f.scope === "member", s.id, out);
    });
    askedSoFar.push(...s.fields);
    s.gates.forEach((g) => {
      if (!g.message.trim()) out.push({ level: "error", where, ref: s.id, message: "شرط انتقال بلا رسالة تشرح للحاج ما يفعل" });
      checkCondition(g.when, `${where} — شرط الانتقال`, askedSoFar, false, s.id, out);
    });
    if (s.showIf && s.gates.length && s.enabled && !jointlySatisfiable(s.showIf, ...s.gates.map((g) => g.when))) {
      out.push({ level: "error", where, ref: s.id, message: "كلما ظهرت هذه المرحلة تعذّر تجاوزها: شرط ظهورها يناقض شروط الانتقال" });
    }
  });
  if (!enabled.some((s) => s.kind !== "system" || s.system !== "payment")) out.push({ level: "error", where: "المراحل", message: "لا مراحل" });
  // Each part of the progress bar is one run of stages: a part split in two would show twice, out of order
  const seenPhases: string[] = [];
  enabled.forEach((s, i) => {
    if (i > 0 && enabled[i - 1].phase === s.phase) return;
    if (seenPhases.includes(s.phase)) out.push({ level: "error", where: stageWhere(s), ref: s.id, message: `مرحلة شريط التقدم «${s.phase}» مقسومة: صفحاتها غير متتالية. انقل الصفحة أو غيّر مرحلتها في الشريط` });
    seenPhases.push(s.phase);
  });

  // ── Tracks ──
  if (!config.tracks.some((t) => t.enabled)) out.push({ level: "error", where: "مسارات التسجيل", message: "كل المسارات معطّلة: لا يمكن تقديم أي طلب" });
  config.tracks.forEach((t) => !t.label.trim() && out.push({ level: "error", where: "مسارات التسجيل", message: "مسار بلا اسم" }));

  // ── Eligibility rules: each one, then every pair ──
  const fieldsForRules = allFields;
  const rules = config.eligibility.filter((r) => r.enabled);
  config.eligibility.forEach((r) => {
    const where = `قاعدة «${r.label || "بلا اسم"}»`;
    if (!r.label.trim()) out.push({ level: "error", where, ref: r.id, message: "قاعدة بلا اسم" });
    if (!r.message.trim()) out.push({ level: "error", where, ref: r.id, message: "قاعدة بلا رسالة تشرح سبب عدم الاستيفاء" });
    if (isEmpty(r.require)) out.push({ level: "error", where, ref: r.id, message: "قاعدة بلا شرط" });
    checkCondition(r.when, `${where} — متى تنطبق`, fieldsForRules, r.scope === "member", r.id, out);
    checkCondition(r.require, `${where} — الشرط`, fieldsForRules, r.scope === "member", r.id, out);
    if (r.enabled && satisfiable(r.when) && !jointlySatisfiable(r.when, r.require)) {
      out.push({ level: "error", where, ref: r.id, message: "لا يستوفيها أحد ممن تنطبق عليهم: كل طلب تنطبق عليه يُرفض" });
    }
    if (r.scope === "application" && leaves(r.require).some((l) => l.fact.startsWith("member."))) out.push({ level: "error", where, ref: r.id, message: "قاعدة على الطلب ككل لا تقرأ صفات فرد بعينه" });
  });
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i];
      const b = rules[j];
      if (a.scope !== b.scope) continue;
      if (!jointlySatisfiable(a.when, b.when)) continue;
      if (!jointlySatisfiable(a.when, b.when, a.require, b.require)) {
        out.push({ level: "error", where: `القاعدتان «${a.label}» و«${b.label}»`, ref: b.id, message: "متعارضتان: من تنطبقان عليه معاً لا يمكنه استيفاؤهما معاً" });
      } else if (JSON.stringify(a.require) === JSON.stringify(b.require) && JSON.stringify(a.when ?? null) === JSON.stringify(b.when ?? null)) {
        out.push({ level: "warning", where: `القاعدتان «${a.label}» و«${b.label}»`, ref: b.id, message: "مكررتان: الشرط نفسه على الأشخاص أنفسهم" });
      }
    }
  }

  // ── Steps after acceptance ──
  const post = config.postSteps;
  const postEnabled = post.filter((p) => p.enabled);
  const postPos = (k: PostSystemStep) => postEnabled.findIndex((p) => p.kind === "system" && p.system === k);
  const postIds = post.map((p) => p.id);
  if (new Set(postIds).size !== postIds.length) out.push({ level: "error", where: "الخطوات بعد القبول", message: "خطوتان بالمعرّف نفسه" });
  for (const k of POST_SYSTEM) {
    const all = post.filter((p) => p.kind === "system" && p.system === k);
    if (!all.length) out.push({ level: "error", where: POST_LABEL[k], message: "خطوة أساسية محذوفة: اكتمالها شرط لما بعدها" });
    else if (all.length > 1) out.push({ level: "error", where: POST_LABEL[k], message: "موجودة أكثر من مرة" });
    else if (!all[0].enabled) out.push({ level: "error", where: POST_LABEL[k], message: "خطوة أساسية معطّلة", ref: all[0].id });
  }
  for (const [k, before] of Object.entries(POST_AFTER) as [PostSystemStep, PostSystemStep[]][]) {
    const at = postPos(k);
    if (at < 0) continue;
    for (const p of before) if (postPos(p) > at) out.push({ level: "error", where: POST_LABEL[k], message: `يجب أن تأتي بعد «${POST_LABEL[p]}»`, ref: postEnabled[at].id });
  }
  if (postEnabled[0] && !(postEnabled[0].kind === "system" && postEnabled[0].system === "confirm")) out.push({ level: "error", where: "الخطوات بعد القبول", message: "أول خطوة تأكيد القبول: لا شيء قبل أن يؤكد الحاج قبوله" });
  const visaAt = postPos("visa");
  if (visaAt >= 0 && visaAt !== postEnabled.length - 1) out.push({ level: "error", where: POST_LABEL.visa, message: "التأشيرة والرحلة آخر خطوة: بعدها ينتقل الحاج إلى ملف الرحلة" });
  post.forEach((p) => {
    const where = `خطوة «${p.title || p.id}»`;
    if (!p.title.trim()) out.push({ level: "error", where, ref: p.id, message: "خطوة بلا عنوان" });
    if (p.kind === "acknowledge" && !p.ackText?.trim()) out.push({ level: "error", where, ref: p.id, message: "خطوة إقرار بلا نص يُقَرّ به" });
    if (p.kind === "form" && !p.fields.length) out.push({ level: "error", where, ref: p.id, message: "خطوة أسئلة بلا أسئلة" });
    if (p.kind === "form" && p.fields.some((f) => f.scope === "member" && f.showIf && leaves(f.showIf).some((l) => !l.fact.startsWith("member.") && !l.fact.startsWith("manswer:"))))
      out.push({ level: "warning", where, ref: p.id, message: "شروط أسئلة الأفراد هنا تقرأ صفات الفرد فقط" });
    p.fields.forEach((f) => checkField(f, where, p.id, out));
    if (p.kind === "installment" && !config.payments.installments.some((i) => i.dueStep === p.id)) out.push({ level: "warning", where, ref: p.id, message: "خطوة دفع لا تستحق فيها أي دفعة" });
  });

  // ── Payments ──
  const inst = config.payments.installments;
  const where = "الدفعات";
  if (!inst.length) out.push({ level: "error", where, message: "لا دفعات: تكلفة الحج تُدفع بدفعة واحدة على الأقل" });
  if (inst.length > 4) out.push({ level: "error", where, message: "تدعم المنصة حتى أربع دفعات" });
  const instKeys = inst.map((i) => i.key);
  if (new Set(instKeys).size !== instKeys.length) out.push({ level: "error", where, message: "دفعتان بالمفتاح نفسه" });
  if (inst[0]?.dueStep) out.push({ level: "error", where, message: "الدفعة الأولى تُدفع مع التسجيل على القبول المباشر أو عند تثبيت القبول بالقرعة، لا في خطوة لاحقة" });
  if (inst.length && inst[inst.length - 1].amount !== null) out.push({ level: "error", where, message: "آخر دفعة هي «باقي التكلفة»، فيبقى مجموع الدفعات مساوياً لتكلفة الحج إن تغيّرت" });
  if (inst.slice(0, -1).some((i) => i.amount === null)) out.push({ level: "error", where, message: "«باقي التكلفة» للدفعة الأخيرة وحدها" });
  if (inst.some((i) => i.amount !== null && i.amount <= 0)) out.push({ level: "error", where, message: "دفعة بمبلغ صفر أو أقل" });
  const fixed = inst.reduce((n, i) => n + (i.amount ?? 0), 0);
  if (inst.length > 1 && fixed >= opts.hajjCost) out.push({ level: "error", where, message: `مجموع الدفعات المحددة (${fixed.toLocaleString("en-US")} $) يبلغ تكلفة الحج (${opts.hajjCost.toLocaleString("en-US")} $) أو يتجاوزها، فلا يبقى شيء للدفعة الأخيرة` });
  if (inst.some((i) => !i.label.trim() || !i.dueLabel.trim())) out.push({ level: "error", where, message: "دفعة بلا اسم أو بلا موعد يُعرض على الحاج" });
  let lastStepAt = -1;
  inst.slice(1).forEach((i) => {
    const at = postEnabled.findIndex((p) => p.id === i.dueStep);
    const step = postEnabled[at];
    if (!step) out.push({ level: "error", where, message: `«${i.label}» تستحق في خطوة غير موجودة أو معطّلة` });
    else if (!(step.kind === "installment" || (step.kind === "system" && step.system === "payment"))) out.push({ level: "error", where, message: `«${i.label}» تستحق في خطوة لا تأخذ دفعاً («${step.title}»)` });
    else if (at < lastStepAt) out.push({ level: "error", where, message: `«${i.label}» تستحق قبل الدفعة التي تسبقها` });
    else if (at < postPos("group")) out.push({ level: "warning", where, message: `«${i.label}» تستحق قبل الإلحاق بمجموعة` });
    if (at >= 0) lastStepAt = at;
  });
  if (!config.payments.methods.shamcash && !config.payments.methods.bank) out.push({ level: "error", where, message: "لا طريقة دفع: فعّل شام كاش أو المصرف المعتمد" });
  const extras = postEnabled.find((p) => p.id === config.payments.extrasStep);
  if (!extras || !(extras.kind === "installment" || (extras.kind === "system" && extras.system === "payment"))) out.push({ level: "error", where, message: "الهدي والسكن الخاص يُدفعان في خطوة دفع موجودة ومفعّلة" });
  const amounts = scheduleAmounts(inst, opts.hajjCost);
  if (inst.length && amounts.reduce((a, b) => a + b, 0) !== opts.hajjCost) out.push({ level: "error", where, message: "مجموع الدفعات لا يساوي تكلفة الحج" });

  return out;
}

const isEmpty = (c: Condition | undefined) => !c || ("all" in c && !c.all.length) || ("any" in c && !c.any.length);

// ───────────────────────── What changed ─────────────────────────

export type Change = { kind: "added" | "removed" | "changed" | "moved"; area: string; text: string };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function stageChanges(a: StageDef, b: StageDef): string[] {
  const out: string[] = [];
  if (a.title !== b.title || a.hint !== b.hint || a.name !== b.name || a.nextLabel !== b.nextLabel) out.push("النص");
  if (!same(a.blocks, b.blocks)) out.push("المحتوى");
  if (!same(a.fields, b.fields)) {
    const ak = new Set(a.fields.map((f) => f.key));
    const bk = new Set(b.fields.map((f) => f.key));
    const add = b.fields.filter((f) => !ak.has(f.key)).map((f) => `+«${f.label}»`);
    const del = a.fields.filter((f) => !bk.has(f.key)).map((f) => `−«${f.label}»`);
    out.push(`الأسئلة${add.length || del.length ? ` (${[...add, ...del].join("، ")})` : ""}`);
  }
  if (a.enabled !== b.enabled) out.push(b.enabled ? "فُعّلت" : "عُطّلت");
  if (!same(a.window, b.window)) out.push("مواعيد الإتاحة");
  if (!same(a.showIf, b.showIf)) out.push("شرط الظهور");
  if (!same(a.gates, b.gates)) out.push("شروط الانتقال");
  if (a.phase !== b.phase) out.push("مرحلة شريط التقدم");
  return out;
}

/** What `to` changes from `from`, in the staff's words */
export function diffConfigs(from: RegConfig, to: RegConfig): Change[] {
  const out: Change[] = [];
  const name = (s: StageDef) => s.name || s.title || s.id;
  const fromIds = from.stages.map((s) => s.id);
  const toIds = to.stages.map((s) => s.id);
  for (const s of to.stages) {
    const old = from.stages.find((x) => x.id === s.id);
    if (!old) out.push({ kind: "added", area: "المراحل", text: `مرحلة جديدة «${name(s)}»` });
    else {
      const c = stageChanges(old, s);
      if (c.length) out.push({ kind: "changed", area: "المراحل", text: `«${name(s)}»: ${c.join("، ")}` });
    }
  }
  for (const s of from.stages) if (!toIds.includes(s.id)) out.push({ kind: "removed", area: "المراحل", text: `حُذفت «${name(s)}»` });
  const common = toIds.filter((id) => fromIds.includes(id));
  const oldOrder = fromIds.filter((id) => common.includes(id));
  if (!same(common, oldOrder)) out.push({ kind: "moved", area: "المراحل", text: `ترتيب جديد: ${common.map((id) => name(to.stages.find((s) => s.id === id)!)).join(" ← ")}` });

  for (const t of to.tracks) {
    const old = from.tracks.find((x) => x.key === t.key);
    if (old && !same(old, t)) out.push({ kind: "changed", area: "مسارات التسجيل", text: `«${t.label}»${old.enabled !== t.enabled ? (t.enabled ? ": فُعّل" : ": عُطّل") : ""}` });
  }

  for (const r of to.eligibility) {
    const old = from.eligibility.find((x) => x.id === r.id);
    if (!old) out.push({ kind: "added", area: "قواعد الأهلية", text: `«${r.label}»: ${describe(r.require)}` });
    else if (!same(old, r)) out.push({ kind: "changed", area: "قواعد الأهلية", text: `«${r.label}»${old.enabled !== r.enabled ? (r.enabled ? ": فُعّلت" : ": عُطّلت") : ""}` });
  }
  for (const r of from.eligibility) if (!to.eligibility.some((x) => x.id === r.id)) out.push({ kind: "removed", area: "قواعد الأهلية", text: `حُذفت «${r.label}»` });

  if (!same(from.payments, to.payments)) {
    const a = from.payments.installments;
    const b = to.payments.installments;
    const amount = (i: (typeof a)[number]) => (i.amount === null ? "الباقي" : `${i.amount.toLocaleString("en-US")} $`);
    if (a.length !== b.length) out.push({ kind: "changed", area: "الدفعات", text: `عدد الدفعات ${a.length} ← ${b.length}: ${b.map((i) => `${i.label} (${amount(i)})`).join("، ")}` });
    else if (!same(a, b)) out.push({ kind: "changed", area: "الدفعات", text: b.map((i) => `${i.label} (${amount(i)})`).join("، ") });
    if (!same(from.payments.methods, to.payments.methods)) out.push({ kind: "changed", area: "الدفعات", text: `طرق الدفع: ${[to.payments.methods.shamcash && "شام كاش", to.payments.methods.bank && "المصرف المعتمد"].filter(Boolean).join(" و")}` });
    if (from.payments.extrasStep !== to.payments.extrasStep) out.push({ kind: "changed", area: "الدفعات", text: "خطوة دفع الهدي والسكن" });
  }

  const pf = from.postSteps.map((p) => p.id);
  const pt = to.postSteps.map((p) => p.id);
  for (const p of to.postSteps) {
    const old = from.postSteps.find((x) => x.id === p.id);
    if (!old) out.push({ kind: "added", area: "الخطوات بعد القبول", text: `خطوة جديدة «${p.title}»` });
    else if (!same(old, p)) out.push({ kind: "changed", area: "الخطوات بعد القبول", text: `«${p.title}»${old.enabled !== p.enabled ? (p.enabled ? ": فُعّلت" : ": عُطّلت") : ""}` });
  }
  for (const p of from.postSteps) if (!pt.includes(p.id)) out.push({ kind: "removed", area: "الخطوات بعد القبول", text: `حُذفت «${p.title}»` });
  const pc = pt.filter((id) => pf.includes(id));
  if (!same(pc, pf.filter((id) => pc.includes(id)))) out.push({ kind: "moved", area: "الخطوات بعد القبول", text: "ترتيب جديد للخطوات" });

  if (!same(from.messages, to.messages)) out.push({ kind: "changed", area: "الرسائل", text: "نصوص الرسائل العامة" });
  return out;
}


