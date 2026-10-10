/**
 * The registration engine, pure: which version applies, which stages and questions show, whether answers
 * are valid, what the administration's own eligibility rules say, and what each installment amounts to. The
 * pilgrim's screens, the staff's preview and the submission service all read it, so the page and the check
 * on submission never disagree.
 */
import type { EligibilityResult, Member, RuleCheck } from "../rules";
import { evalCondition, type FactContext } from "./conditions";
import { ACTIVE_SEASON, SEED_SEASONS, SEED_VERSIONS, defaultConfig } from "./defaults";
import type { AnswerValue, Answers, EligibilityRule, FieldDef, InstallmentDef, PostStepDef, RegConfig, RegDraft, RegSeason, RegState, RegVersion, StageDef } from "./types";

export const EMPTY_REG: RegState = { drafts: {}, versions: [], ledger: {} };

/** The registration state as stored, made whole (an older browser has none) */
export function regOf(s: { registration?: Partial<RegState> }): RegState {
  const r = s.registration ?? {};
  return { seasons: r.seasons, drafts: r.drafts ?? {}, versions: r.versions ?? [], ledger: r.ledger ?? {} };
}

/** "YYYY-MM-DDTHH:MM" on the platform's clock (the demo's date and hour when the tester moved them) */
export function nowKey(clock: { today?: string; time?: string }, real = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  const today = clock.today ?? `${real.getFullYear()}-${p(real.getMonth() + 1)}-${p(real.getDate())}`;
  return `${today}T${clock.time ?? `${p(real.getHours())}:${p(real.getMinutes())}`}`;
}

export function seasonsOf(reg: RegState): RegSeason[] {
  return (reg.seasons ?? SEED_SEASONS).slice().sort((a, b) => b.year - a.year);
}

export function allVersions(reg: RegState): RegVersion[] {
  return [...SEED_VERSIONS, ...reg.versions];
}

export function versionsOf(reg: RegState, season: number): RegVersion[] {
  return allVersions(reg)
    .filter((v) => v.season === season)
    .sort((a, b) => b.number - a.number);
}

export function versionById(reg: RegState, id: string | undefined): RegVersion | undefined {
  return id ? allVersions(reg).find((v) => v.id === id) : undefined;
}

/**
 * The version new applications start on: the latest whose time has come. Before the first one takes effect,
 * the earliest one, so the form never runs without a configuration.
 */
export function liveVersion(reg: RegState, season: number = ACTIVE_SEASON, now: string): RegVersion {
  const list = versionsOf(reg, season);
  return list.find((v) => v.effectiveFrom <= now) ?? list[list.length - 1] ?? SEED_VERSIONS.find((v) => v.season === ACTIVE_SEASON)!;
}

/** Published but not in force yet */
export function scheduledVersions(reg: RegState, season: number, now: string): RegVersion[] {
  return versionsOf(reg, season).filter((v) => v.effectiveFrom > now);
}

/** The season's working draft; a season never edited starts from its live version */
export function draftOf(reg: RegState, season: number, now: string): RegDraft {
  const d = reg.drafts[String(season)];
  if (d) return d;
  const live = liveVersion(reg, season, now);
  return { config: structuredClone(live?.config ?? defaultConfig()), baseVersion: live?.id ?? null, updatedAt: 0, updatedBy: "" };
}

/** The version an application or a draft was started on; one from before versions follows the season's first */
export function pinnedVersion(reg: RegState, id: string | undefined, season: number = ACTIVE_SEASON): RegVersion {
  return versionById(reg, id) ?? versionsOf(reg, season).slice(-1)[0] ?? SEED_VERSIONS.find((v) => v.season === ACTIVE_SEASON)!;
}

// ───────────────────────── Text ─────────────────────────

/** «{firstName}» and the other names a text may carry */
export function fill(text: string | undefined, tokens: Record<string, string | number | undefined>) {
  return (text ?? "").replace(/\{(\w+)\}/g, (all, k: string) => (tokens[k] === undefined ? all : String(tokens[k])));
}

export const TOKENS: { key: string; label: string }[] = [
  { key: "firstName", label: "الاسم الأول لصاحب الحساب" },
  { key: "applicantName", label: "الاسم الأول لصاحب الطلب" },
  { key: "fee", label: "رسم التسجيل للفرد" },
  { key: "directAge", label: "عمر القبول المباشر" },
  { key: "maxCompanions", label: "حد المرافقين" },
  { key: "maxCompanionsFamily", label: "حد المرافقين للأسرة" },
  { key: "members", label: "عدد أفراد الطلب" },
];

// ───────────────────────── Stages ─────────────────────────

/** A stage the pilgrim goes through now: switched on, in its dates, and its condition holding */
export function stageVisible(stage: StageDef, ctx: FactContext, today: string): boolean {
  if (!stage.enabled) return false;
  if (stage.window?.from && today < stage.window.from) return false;
  if (stage.window?.to && today > stage.window.to) return false;
  return evalCondition(stage.showIf, ctx);
}

export function visibleStages(config: RegConfig, ctx: FactContext, today: string) {
  return config.stages.filter((s) => stageVisible(s, ctx, today));
}

export function allFields(config: RegConfig): FieldDef[] {
  return [...config.stages.flatMap((s) => s.fields), ...config.postSteps.flatMap((p) => p.fields)];
}

/** No answer: a «لا» to a yes/no question is an answer; an unticked acknowledgement is not */
const blank = (f: FieldDef, v: AnswerValue | undefined) => v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || (f.type === "consent" && v !== true);

/** What is wrong with one answer, or null */
export function fieldError(f: FieldDef, v: AnswerValue | undefined): string | null {
  if (blank(f, v)) {
    if (!f.required) return null;
    return f.type === "consent" ? "يلزم الإقرار للمتابعة" : "هذا السؤال مطلوب";
  }
  if (f.type === "number") {
    const n = Number(v);
    if (Number.isNaN(n)) return "أدخل رقماً";
    if (f.min !== undefined && n < f.min) return `أقل قيمة ${f.min}`;
    if (f.max !== undefined && n > f.max) return `أعلى قيمة ${f.max}`;
  }
  if (f.type === "text" || f.type === "textarea") {
    const s = String(v).trim();
    if (f.minLength !== undefined && s.length < f.minLength) return `${f.minLength} أحرف على الأقل`;
    if (f.maxLength !== undefined && s.length > f.maxLength) return `${f.maxLength} حرفاً على الأكثر`;
    if (f.pattern) {
      try {
        if (!new RegExp(f.pattern).test(s)) return f.patternMessage || "الصيغة غير صحيحة";
      } catch {
        /* a pattern that does not compile is caught before publishing */
      }
    }
  }
  if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return "أدخل تاريخاً";
  if (f.type === "yesno" && typeof v !== "boolean") return "اختر نعم أو لا";
  if (f.type === "select" || f.type === "radio") {
    if (!f.options?.some((o) => o.value === v)) return "اختر من الخيارات";
  }
  if (f.type === "checkboxes") {
    const vals = Array.isArray(v) ? v : [String(v)];
    if (!vals.every((x) => f.options?.some((o) => o.value === x))) return "اختر من الخيارات";
  }
  return null;
}

export type AnswerError = { key: string; memberId?: string; message: string };

/** The members a member question is asked of: each one its condition holds for */
export function membersAsked(f: FieldDef, ctx: FactContext): Member[] {
  return ctx.members.filter((m) => evalCondition(f.showIf, { ...ctx, member: m }));
}

/** Every answer a stage needs, checked against its questions and their conditions */
export function stageErrors(stage: StageDef, ctx: FactContext): AnswerError[] {
  const out: AnswerError[] = [];
  for (const f of stage.fields) {
    if (f.scope === "application") {
      if (!evalCondition(f.showIf, ctx)) continue;
      const e = fieldError(f, ctx.answers[f.key]);
      if (e) out.push({ key: f.key, message: e });
    } else {
      for (const m of membersAsked(f, ctx)) {
        const e = fieldError(f, ctx.memberAnswers[m.person.id]?.[f.key]);
        if (e) out.push({ key: f.key, memberId: m.person.id, message: e });
      }
    }
  }
  return out;
}

/** The first gate that does not hold, if any */
export function failingGate(stage: StageDef, ctx: FactContext) {
  return stage.gates.find((g) => !evalCondition(g.when, ctx)) ?? null;
}

/** Answers kept only for questions still asked: a question hidden later must not carry a stale answer */
export function prunedAnswers(stages: StageDef[], ctx: FactContext): { answers: Answers; memberAnswers: Record<string, Answers> } {
  const answers: Answers = {};
  const memberAnswers: Record<string, Answers> = {};
  for (const s of stages) {
    for (const f of s.fields) {
      if (f.scope === "application") {
        if (evalCondition(f.showIf, ctx) && ctx.answers[f.key] !== undefined) answers[f.key] = ctx.answers[f.key];
      } else {
        for (const m of membersAsked(f, ctx)) {
          const v = ctx.memberAnswers[m.person.id]?.[f.key];
          if (v !== undefined) (memberAnswers[m.person.id] ??= {})[f.key] = v;
        }
      }
    }
  }
  return { answers, memberAnswers };
}

export function formatAnswer(f: FieldDef | undefined, v: AnswerValue | undefined): string {
  if (v === undefined || v === "") return "—";
  if (!f) return Array.isArray(v) ? v.join("، ") : String(v);
  if (f.type === "yesno") return v === true || v === "yes" ? "نعم" : "لا";
  if (f.type === "consent") return v ? "أقرّ" : "—";
  if (f.options?.length) {
    const vals = Array.isArray(v) ? v : [String(v)];
    return vals.map((x) => f.options!.find((o) => o.value === x)?.label ?? x).join("، ");
  }
  return Array.isArray(v) ? v.join("، ") : String(v);
}

// ───────────────────────── The administration's eligibility rules ─────────────────────────

/** Each rule read for every member it applies to (or for the application), as rows of the eligibility check */
export function configuredChecks(rules: EligibilityRule[], ctx: FactContext): { members: Record<string, RuleCheck[]>; general: RuleCheck[] } {
  const members: Record<string, RuleCheck[]> = {};
  const general: RuleCheck[] = [];
  for (const r of rules) {
    if (!r.enabled) continue;
    if (r.scope === "member") {
      for (const m of ctx.members) {
        const c = { ...ctx, member: m };
        if (!evalCondition(r.when, c)) continue;
        const ok = evalCondition(r.require, c);
        (members[m.person.id] ??= []).push({ key: `cfg:${r.id}`, label: r.label, status: ok ? "pass" : r.severity, detail: ok ? "مستوفى" : r.message });
      }
    } else {
      if (!evalCondition(r.when, ctx)) continue;
      const ok = evalCondition(r.require, ctx);
      general.push({ key: `cfg:${r.id}`, label: r.label, status: ok ? "pass" : r.severity, detail: ok ? "مستوفى" : r.message });
    }
  }
  return { members, general };
}

/** The platform's checks with the administration's rules added: a failed rule makes the application ineligible */
export function withConfigured(base: EligibilityResult, rules: EligibilityRule[], ctx: FactContext): EligibilityResult {
  if (!rules.some((r) => r.enabled)) return base;
  const extra = configuredChecks(rules, ctx);
  const members = base.members.map((m) => {
    const checks = [...m.checks, ...(extra.members[m.id] ?? [])];
    return { ...m, checks, eligible: checks.every((c) => c.status !== "fail") };
  });
  const general = [...base.general, ...extra.general];
  return { members, general, eligible: members.every((m) => m.eligible) && general.every((g) => g.status !== "fail") };
}

/** The fix a failed configured rule offers, by its row key */
export function ruleOfCheck(rules: EligibilityRule[], key: string) {
  return key.startsWith("cfg:") ? (rules.find((r) => `cfg:${r.id}` === key) ?? null) : null;
}

// ───────────────────────── Installments ─────────────────────────

/** Each installment's amount per person, the open one taking the rest of the Hajj cost */
export function scheduleAmounts(installments: InstallmentDef[], hajjCost: number): number[] {
  const fixed = installments.reduce((n, i) => n + (i.amount ?? 0), 0);
  const rest = Math.max(0, hajjCost - fixed);
  return installments.map((i) => (i.amount === null ? rest : Math.min(i.amount, hajjCost)));
}

export type ScheduleItem = InstallmentDef & { perPerson: number };

export function resolveSchedule(installments: InstallmentDef[], hajjCost: number): ScheduleItem[] {
  const amounts = scheduleAmounts(installments, hajjCost);
  return installments.map((i, n) => ({ ...i, perPerson: amounts[n] }));
}

// ───────────────────────── Steps after acceptance ─────────────────────────

/** The steps an application goes through, in its version's order: those switched on */
export function postStepsOf(config: RegConfig): PostStepDef[] {
  return config.postSteps.filter((p) => p.enabled);
}
