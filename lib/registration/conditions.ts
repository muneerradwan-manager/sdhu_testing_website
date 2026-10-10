/**
 * The rules engine shared by the pilgrim's screens, the submission service and the staff's editor: what a
 * condition can read (facts), how it is evaluated, how it reads in Arabic, and whether it can ever hold.
 * The same function decides in the browser and when the application is submitted, so hiding a question or
 * a stage in the page is never the only thing standing between a pilgrim and a rule.
 */
import { ageOf, birthYear } from "../registry";
import type { Member } from "../rules";
import type { AnswerValue, Answers, Condition, FactKey, FieldDef, Leaf, Op, Scalar, TrackKey } from "./types";

export type FactContext = {
  track?: TrackKey;
  forWhom?: "me" | "other";
  residence?: string;
  members: Member[];
  answers: Answers;
  memberAnswers: Record<string, Answers>;
  /** The member a member condition is read for */
  member?: Member;
  /** Born in this year or before: needs a dedicated companion (the season's rule) */
  elderlyMaxBirthYear: number;
};

type FactType = "number" | "enum" | "boolean";

export type FactDef = { key: FactKey; label: string; type: FactType; member?: boolean; options?: { value: string; label: string }[] };

export const FACTS: FactDef[] = [
  { key: "track", label: "نوع التسجيل", type: "enum", options: [{ value: "direct", label: "القبول المباشر" }, { value: "lottery", label: "القرعة" }] },
  { key: "forWhom", label: "الطلب لمن", type: "enum", options: [{ value: "me", label: "لصاحب الحساب" }, { value: "other", label: "لشخص آخر" }] },
  { key: "abroad", label: "يقيم خارج سوريا", type: "boolean" },
  { key: "residence", label: "مكان الإقامة", type: "enum", options: ["سوريا", "تركيا", "مصر", "الأردن"].map((v) => ({ value: v, label: v })) },
  { key: "membersCount", label: "عدد أفراد الطلب", type: "number" },
  { key: "companionsCount", label: "عدد المرافقين", type: "number" },
  { key: "applicantAge", label: "عمر صاحب الطلب", type: "number" },
  { key: "applicantBirthYear", label: "سنة ميلاد صاحب الطلب", type: "number" },
  { key: "applicantGender", label: "جنس صاحب الطلب", type: "enum", options: [{ value: "M", label: "ذكر" }, { value: "F", label: "أنثى" }] },
  { key: "hasElderly", label: "في الطلب من يحتاج مرافقاً لعمره", type: "boolean" },
  { key: "member.age", label: "عمر الفرد", type: "number", member: true },
  { key: "member.birthYear", label: "سنة ميلاد الفرد", type: "number", member: true },
  { key: "member.gender", label: "جنس الفرد", type: "enum", member: true, options: [{ value: "M", label: "ذكر" }, { value: "F", label: "أنثى" }] },
  {
    key: "member.relation",
    label: "صلة الفرد بصاحب الطلب",
    type: "enum",
    member: true,
    options: [
      { value: "self", label: "صاحب الطلب" },
      { value: "spouse", label: "زوج/زوجة" },
      { value: "parent", label: "أب/أم" },
      { value: "child", label: "ابن/ابنة" },
      { value: "sibling", label: "أخ/أخت" },
      { value: "grandparent", label: "جد/جدة" },
      { value: "grandchild", label: "حفيد/حفيدة" },
      { value: "other", label: "قريب آخر" },
    ],
  },
  { key: "member.isApplicant", label: "الفرد هو صاحب الطلب", type: "boolean", member: true },
  { key: "member.hajjBefore", label: "أدى الفرد الحج سابقاً", type: "boolean", member: true },
];

export const OPS: Record<Op, string> = {
  eq: "يساوي",
  neq: "لا يساوي",
  gt: "أكبر من",
  gte: "أكبر من أو يساوي",
  lt: "أصغر من",
  lte: "أصغر من أو يساوي",
  in: "أحد",
  nin: "ليس أحد",
  set: "مُجاب عنه",
  unset: "غير مُجاب عنه",
};

export const isLeaf = (c: Condition): c is Leaf => "fact" in c;

export function factDef(key: string, fields: FieldDef[] = []): FactDef | null {
  const known = FACTS.find((f) => f.key === key);
  if (known) return known;
  const [kind, k] = key.split(":");
  if ((kind === "answer" || kind === "manswer") && k) {
    const f = fields.find((x) => x.key === k && (kind === "answer" ? x.scope === "application" : x.scope === "member"));
    if (!f) return null;
    const type: FactType = f.type === "number" ? "number" : f.type === "yesno" || f.type === "consent" ? "boolean" : "enum";
    return { key: key as FactKey, label: f.label, type, member: kind === "manswer", options: f.options?.map((o) => ({ value: o.value, label: o.label })) };
  }
  return null;
}

function applicantOf(members: Member[]) {
  return members.find((m) => m.relation === "self") ?? members[0];
}

export function getFact(ctx: FactContext, fact: FactKey): AnswerValue | undefined {
  const a = applicantOf(ctx.members);
  const m = ctx.member;
  switch (fact) {
    case "track":
      return ctx.track;
    case "forWhom":
      return ctx.forWhom;
    case "residence":
      return ctx.residence;
    case "abroad":
      return ctx.residence !== undefined ? ctx.residence !== "سوريا" : undefined;
    case "membersCount":
      return ctx.members.length;
    case "companionsCount":
      return ctx.members.filter((x) => x.relation !== "self").length;
    case "applicantAge":
      return a ? ageOf(a.person) : undefined;
    case "applicantBirthYear":
      return a ? birthYear(a.person) : undefined;
    case "applicantGender":
      return a?.person.gender;
    case "hasElderly":
      return ctx.members.some((x) => birthYear(x.person) <= ctx.elderlyMaxBirthYear);
    case "member.age":
      return m ? ageOf(m.person) : undefined;
    case "member.birthYear":
      return m ? birthYear(m.person) : undefined;
    case "member.gender":
      return m?.person.gender;
    case "member.relation":
      return m?.relation;
    case "member.isApplicant":
      return m ? m.relation === "self" : undefined;
    case "member.hajjBefore":
      return m ? !!m.person.hajjBefore : undefined;
  }
  const [kind, key] = fact.split(":");
  if (kind === "answer") return ctx.answers[key];
  if (kind === "manswer") return m ? ctx.memberAnswers[m.person.id]?.[key] : undefined;
  return undefined;
}

const empty = (v: AnswerValue | undefined) => v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** Numbers typed as text compare as numbers */
function norm(v: Scalar): Scalar {
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return v;
}

function test(actual: AnswerValue | undefined, op: Op, value: Leaf["value"]): boolean {
  if (op === "set") return !empty(actual);
  if (op === "unset") return empty(actual);
  if (empty(actual)) return op === "neq" || op === "nin";
  const list = (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(norm);
  const vals = (Array.isArray(actual) ? actual : [actual!]).map(norm);
  const one = norm(Array.isArray(value) ? value[0] : (value as Scalar));
  switch (op) {
    case "eq":
      return vals.some((v) => v === one);
    case "neq":
      return !vals.some((v) => v === one);
    case "in":
      return vals.some((v) => list.includes(v));
    case "nin":
      return !vals.some((v) => list.includes(v));
    case "gt":
      return vals.some((v) => typeof v === "number" && typeof one === "number" && v > one);
    case "gte":
      return vals.some((v) => typeof v === "number" && typeof one === "number" && v >= one);
    case "lt":
      return vals.some((v) => typeof v === "number" && typeof one === "number" && v < one);
    case "lte":
      return vals.some((v) => typeof v === "number" && typeof one === "number" && v <= one);
  }
}

export function evalCondition(c: Condition | undefined, ctx: FactContext): boolean {
  if (!c) return true;
  if ("all" in c) return c.all.every((x) => evalCondition(x, ctx));
  if ("any" in c) return c.any.length === 0 || c.any.some((x) => evalCondition(x, ctx));
  if ("not" in c) return !evalCondition(c.not, ctx);
  return test(getFact(ctx, c.fact), c.op, c.value);
}

/** Every leaf of a condition, for checking what it refers to */
export function leaves(c: Condition | undefined): Leaf[] {
  if (!c) return [];
  if ("all" in c) return c.all.flatMap(leaves);
  if ("any" in c) return c.any.flatMap(leaves);
  if ("not" in c) return leaves(c.not);
  return [c];
}

function valueLabel(def: FactDef | null, v: Scalar) {
  const o = def?.options?.find((x) => String(x.value) === String(v));
  if (o) return o.label;
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  return String(v);
}

/** «عمر صاحب الطلب أكبر من أو يساوي 66 و نوع التسجيل يساوي القرعة» */
export function describe(c: Condition | undefined, fields: FieldDef[] = []): string {
  if (!c) return "دائماً";
  if ("all" in c) return c.all.length ? c.all.map((x) => describe(x, fields)).join(" و ") : "دائماً";
  if ("any" in c) return c.any.length ? `(${c.any.map((x) => describe(x, fields)).join(" أو ")})` : "دائماً";
  if ("not" in c) return `ليس (${describe(c.not, fields)})`;
  const def = factDef(c.fact, fields);
  const label = def?.label ?? c.fact;
  if (c.op === "set" || c.op === "unset") return `${label} ${OPS[c.op]}`;
  const value = Array.isArray(c.value) ? c.value.map((v) => valueLabel(def, v)).join("، ") : c.value === undefined ? "—" : valueLabel(def, c.value);
  return `${label} ${OPS[c.op]} ${value}`;
}

// ───────────────────────── Can it ever hold? ─────────────────────────

type Range = { lo: number; loIn: boolean; hi: number; hiIn: boolean };
type Box = { ranges: Map<string, Range>; allowed: Map<string, Set<string>>; denied: Map<string, Set<string>>; set: Set<string>; unset: Set<string> };

function newBox(): Box {
  return { ranges: new Map(), allowed: new Map(), denied: new Map(), set: new Set(), unset: new Set() };
}

const NEGATE: Partial<Record<Op, Op>> = { eq: "neq", neq: "eq", gt: "lte", gte: "lt", lt: "gte", lte: "gt", in: "nin", nin: "in", set: "unset", unset: "set" };

/** Adds one leaf's constraint; false when the box becomes empty */
function constrain(b: Box, l: Leaf): boolean {
  const f = l.fact;
  const v = Array.isArray(l.value) ? l.value.map(norm) : l.value === undefined ? undefined : norm(l.value);
  if (l.op === "set") b.set.add(f);
  else if (l.op === "unset") b.unset.add(f);
  else if (["gt", "gte", "lt", "lte"].includes(l.op) && typeof v === "number") {
    const r = b.ranges.get(f) ?? { lo: -Infinity, loIn: false, hi: Infinity, hiIn: false };
    if (l.op === "gt" && (v > r.lo || (v === r.lo && r.loIn))) Object.assign(r, { lo: v, loIn: false });
    if (l.op === "gte" && v > r.lo) Object.assign(r, { lo: v, loIn: true });
    if (l.op === "lt" && (v < r.hi || (v === r.hi && r.hiIn))) Object.assign(r, { hi: v, hiIn: false });
    if (l.op === "lte" && v < r.hi) Object.assign(r, { hi: v, hiIn: true });
    b.ranges.set(f, r);
  } else if (l.op === "eq" || l.op === "in") {
    const vals = (Array.isArray(v) ? v : [v]).filter((x) => x !== undefined).map(String);
    const prev = b.allowed.get(f);
    b.allowed.set(f, new Set(prev ? vals.filter((x) => prev.has(x)) : vals));
    if (typeof v === "number" && l.op === "eq") {
      const r = b.ranges.get(f) ?? { lo: -Infinity, loIn: false, hi: Infinity, hiIn: false };
      if (v > r.lo || (v === r.lo && !r.loIn)) Object.assign(r, { lo: v, loIn: true });
      if (v < r.hi || (v === r.hi && !r.hiIn)) Object.assign(r, { hi: v, hiIn: true });
      b.ranges.set(f, r);
    }
  } else if (l.op === "neq" || l.op === "nin") {
    const vals = (Array.isArray(v) ? v : [v]).filter((x) => x !== undefined).map(String);
    const s = b.denied.get(f) ?? new Set<string>();
    vals.forEach((x) => s.add(x));
    b.denied.set(f, s);
  }
  return consistent(b, f);
}

function consistent(b: Box, f: string): boolean {
  if (b.set.has(f) && b.unset.has(f)) return false;
  const r = b.ranges.get(f);
  if (r && (r.lo > r.hi || (r.lo === r.hi && !(r.loIn && r.hiIn)))) return false;
  const allowed = b.allowed.get(f);
  if (allowed) {
    const denied = b.denied.get(f);
    const left = [...allowed].filter((x) => !denied?.has(x) && (!r || typeof norm(x) !== "number" || inRange(norm(x) as number, r)));
    if (left.length === 0) return false;
    if (b.unset.has(f)) return false;
  }
  return true;
}

const inRange = (x: number, r: Range) => (x > r.lo || (x === r.lo && r.loIn)) && (x < r.hi || (x === r.hi && r.hiIn));

/** Conjunctive branches a condition can be split into (bounded, so a long «أو» never explodes) */
function branches(c: Condition, negated = false): Leaf[][] {
  if (isLeaf(c)) return [[negated ? { ...c, op: NEGATE[c.op] ?? c.op } : c]];
  if ("not" in c) return branches(c.not, !negated);
  const isAll = "all" in c !== negated;
  const kids = "all" in c ? c.all : c.any;
  if (kids.length === 0) return [[]];
  if (isAll) {
    return kids.reduce<Leaf[][]>((acc, k) => acc.flatMap((a) => branches(k, negated).map((b) => [...a, ...b])).slice(0, 64), [[]]);
  }
  return kids.flatMap((k) => branches(k, negated)).slice(0, 64);
}

/**
 * Can anything satisfy the condition? Exact for comparisons of numbers and choices joined by «و» and «أو»;
 * a condition it cannot analyse is assumed satisfiable, so the check only ever reports a real contradiction.
 */
export function satisfiable(c: Condition | undefined): boolean {
  if (!c) return true;
  return branches(c).some((leafs) => {
    const b = newBox();
    return leafs.every((l) => constrain(b, l));
  });
}

/** Satisfiable together */
export function jointlySatisfiable(...cs: (Condition | undefined)[]): boolean {
  return satisfiable({ all: cs.filter((x): x is Condition => !!x) });
}

