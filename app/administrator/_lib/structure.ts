"use client";

import { useMemo } from "react";
import { ageOf, getPerson } from "@/lib/registry";
import { getState, useStore, type State } from "@/lib/store";
import { PEOPLE } from "./people";

/**
 * The season's structure as the Hajj and Umrah administration runs it on its own platform («القوائم
 * المرجعية» of قسم شؤون المجموعات والتكتلات): the administrative roles and what each one does in a cluster,
 * the branches, the clusters' tiers, the groups' categories, and the numbers that tie them together. The
 * platform ships the administration's lists; the holder of «إدارة الإداريين» adds, edits, deactivates and
 * deletes any of them, and every screen reads them through useStructure().
 */

// ───────────────────────── Roles («الصفات») ─────────────────────────

/** Where a role works: the cluster, the group, or either («مشترك») */
export type RoleLevel = "cluster" | "group" | "shared";
export const LEVEL_LABEL: Record<RoleLevel, string> = { cluster: "تكتل", group: "مجموعة", shared: "مشترك (تكتل أو مجموعة)" };

/**
 * A role and its behaviors. Each behavior is independent: a role may sit in a group's assistant seat and be
 * among the cluster's coordinators at once («معاون ومنسق تقني»). `applied`: an administrator applies for it
 * in «التسجيل كإداري» (with its requirements and exams); a role that is not applied for is granted by the
 * administration as a seasonal role («رئيس تكتل»). `examAs`: the role whose exam it sits.
 */
export type RoleDef = {
  key: string;
  name: string;
  level: RoleLevel;
  desc: string;
  /** One of the administration's original roles */
  core?: boolean;
  /** An inactive role is not offered for a new assignment, but stays valid for whoever holds it */
  active: boolean;
  applied: boolean;
  examAs?: string;
  gender?: "M" | "F";
  guideSeat?: boolean;
  assistantSeat?: boolean;
  assistantPool?: boolean;
  coordinatorPool?: boolean;
  guidePool?: boolean;
  clusterLeader?: boolean;
  groupLeader?: boolean;
  guidance?: boolean;
  category?: boolean;
  /** Pilgrims each holder adds to the cluster's count when he is one of its assistants («معاون بعدد») */
  multiplier?: number;
};

export type Behavior = "guideSeat" | "assistantSeat" | "assistantPool" | "coordinatorPool" | "guidePool" | "clusterLeader" | "groupLeader" | "guidance" | "category";

/** The behaviors, worded as on the administration's platform */
export const BEHAVIORS: { key: Behavior; label: string; hint: string }[] = [
  { key: "guideSeat", label: "يشغل مقعد «الموجّه الديني» ضمن المجموعة", hint: "يُحتسب من الموجّهين عند تعبئة مقاعد المجموعة" },
  { key: "assistantSeat", label: "يشغل مقعد «المعاون» ضمن المجموعة", hint: "يُحتسب من المعاونين عند تعبئة مقاعد المجموعة" },
  { key: "assistantPool", label: "ضمن مرشّحي معاوني التكتل", hint: "يظهر خياراً عند اختيار معاون التكتل في طلب التشكيل" },
  { key: "coordinatorPool", label: "ضمن مرشّحي منسّقي التكتل", hint: "يظهر خياراً عند اختيار منسّقي التكتل" },
  { key: "guidePool", label: "ضمن مرشّحي موجّهات التكتل", hint: "يظهر خياراً عند اختيار موجّهات التكتل ومرشداته" },
  { key: "clusterLeader", label: "صفة «قائد التكتل»", hint: "تتيح لصاحبها تقديم طلب تشكيل تكتل ورئاسته" },
  { key: "groupLeader", label: "صفة «قائد المجموعة»", hint: "تجعل صاحبها مرشحاً لرئاسة مجموعة ضمن التكتل" },
  { key: "guidance", label: "تمنح شارة الإرشاد", hint: "وجود شخص واحد بهذه الصفة في التكتل يمنحه شارة الإرشاد" },
  { key: "category", label: "تُظهر حقل «الفئة»", hint: "لصاحبها فئة تحددها الإدارة، وهي فئة المجموعة التي يرأسها" },
];

/** The ten roles of the administration's platform, in its order, with the behaviors it gives each */
export const DEFAULT_ROLES: RoleDef[] = [
  { key: "cluster-head", name: "رئيس تكتل", level: "cluster", core: true, active: true, applied: false, clusterLeader: true, desc: "تمنحه الإدارة صفةً موسمية: يقدّم طلب تشكيل التكتل، ويختار مجموعاته وكادره، ويدير التكتل كاملاً بعد اعتماده." },
  { key: "group-head", name: "رئيس مجموعة", level: "group", core: true, active: true, applied: true, groupLeader: true, category: true, desc: "يشكّل مجموعته ويقودها. فئته (الأولى… الرابعة) تحددها الإدارة، وهي فئة مجموعته: عدد حجاجها ومقاعد فريقها." },
  { key: "guide-m", name: "موجّه ديني", level: "group", core: true, active: true, applied: true, gender: "M", guideSeat: true, desc: "يشغل مقعد الموجّه في مجموعة: الدروس والمناسك والإجابة عن الأسئلة الشرعية." },
  { key: "guide-f", name: "موجّهة دينية", level: "cluster", core: true, active: true, applied: true, gender: "F", guidePool: true, desc: "للتكتل لا لمجموعة: التوجيه الديني لحاجّات التكتل كله. عددها بمجموع فئات مجموعاته." },
  { key: "group-deputy", name: "معاون", level: "shared", core: true, active: true, applied: true, assistantSeat: true, assistantPool: true, desc: "يشغل مقعد المعاون في مجموعة، أو يكون معاون التكتل: الحضور والتجمّع والمطارات والمستلزمات." },
  { key: "tech", name: "منسق تقني", level: "cluster", core: true, active: true, applied: true, coordinatorPool: true, desc: "للتكتل لا لمجموعة: برنامج المنسقين وبيانات الحجاج وأوراقهم. يوزّع رئيس التكتل المجموعات على منسقيه." },
  { key: "assistant-tech", name: "معاون ومنسق تقني", level: "shared", core: true, active: true, applied: true, examAs: "tech", assistantSeat: true, assistantPool: true, coordinatorPool: true, desc: "يجمع الصفتين: يشغل مقعد معاون، أو يكون من منسقي التكتل. لا بد أن يكون أحد منسقي كل تكتل بهذه الصفة." },
  { key: "assistant-count", name: "معاون بعدد", level: "shared", core: true, active: true, applied: true, examAs: "group-deputy", assistantSeat: true, assistantPool: true, multiplier: 20, desc: "معاون يُختار من معاوني التكتل بلا حد أقصى، ويضيف كل واحد منهم 20 حاجاً إلى عدد حجاج التكتل." },
  { key: "murshid", name: "مرشد ديني", level: "group", core: true, active: true, applied: true, examAs: "guide-m", gender: "M", guideSeat: true, guidance: true, desc: "يشغل مقعد الموجّه في مجموعة، ويمنح التكتل شارة الإرشاد." },
  { key: "murshida", name: "مرشدة دينية", level: "cluster", core: true, active: true, applied: true, examAs: "guide-f", gender: "F", guidePool: true, guidance: true, desc: "من موجّهات التكتل، وتمنحه شارة الإرشاد." },
];

/** Roles a cluster gives that are not anyone's role for the season («الصفات الثانوية») */
export const SECONDARY: Record<string, string> = {
  "cluster-deputy": "نائب رئيس التكتل",
  "cluster-accountant": "محاسب التكتل",
};

/** Ready names for a seasonal role, each proposed for one of the roles («التسميات الموسمية الجاهزة») */
export type RoleLabel = { id: string; label: string; base: string; active: boolean };
export const DEFAULT_LABELS: RoleLabel[] = [
  { id: "l-office", label: "معاون - مكتب سياحي", base: "group-deputy", active: true },
  { id: "l-guide-b", label: "موجّه ب", base: "guide-m", active: true },
  { id: "l-merged", label: "معاون متحد", base: "group-head", active: true },
];

/**
 * A role the administration gives one person for this season, over the one he applied for: a group head
 * who merged his group with another serves as «معاون» (and keeps his role for the seasons after), a group
 * head becomes «رئيس تكتل» for the numbers' increase. With its reason and who granted it.
 */
export type SeasonalRole = { role: string; label?: string; reason: string; by: string; at: number };

// ───────────────────────── Branches, tiers, categories ─────────────────────────

export type Branch = { id: string; name: string; active: boolean };

/** The administration's branches and offices: a cluster head picks his groups and people from his branches */
export const DEFAULT_BRANCHES: Branch[] = ["إدلب", "اسطنبول", "الرقة", "اللاذقية", "حلب", "حماة", "حمص", "درعا", "دمشق", "دير الزور", "غازي عنتاب", "مصر"].map((name) => ({ id: name, name, active: true }));

/** A cluster's tier («مستوى التكتل»): it sets the pilgrims and the seats of each category of group */
export type Tier = { id: string; name: string };
export const DEFAULT_TIERS: Tier[] = [
  { id: "eco", name: "اقتصادي" },
  { id: "eco-plus", name: "اقتصادي محسن" },
  { id: "five", name: "خمس نجوم" },
];

export { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_RULES, DEFAULT_COMPOSITION, type Category, type CategoryRule, type Composition } from "./structure-defaults";
import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_RULES, DEFAULT_COMPOSITION, type Category, type CategoryRule, type Composition } from "./structure-defaults";

/** The default tier a group's numbers are read in before it is in a cluster */
export const DEFAULT_TIER = "eco";

/** Before this day a request sent earns the cluster «شارة الالتزام بالمواعيد» (the early deadline) */
export const DEFAULT_EARLY_DEADLINE = "2026-11-19";

// ───────────────────────── The structure, as the administration left it ─────────────────────────

export type Structure = {
  roles: RoleDef[];
  labels: RoleLabel[];
  branches: Branch[];
  tiers: Tier[];
  categories: Category[];
  categoryRules: Record<string, Record<string, CategoryRule>>;
  composition: Record<string, Composition>;
  earlyDeadline: string;
};

type Saved = Pick<State["adminRules"], "roles" | "roleLabels" | "branches" | "tiers" | "categories" | "categoryRules" | "composition" | "earlyDeadline">;

export function structureOf(r: Saved): Structure {
  return {
    roles: r.roles ?? DEFAULT_ROLES,
    labels: r.roleLabels ?? DEFAULT_LABELS,
    branches: r.branches ?? DEFAULT_BRANCHES,
    tiers: r.tiers ?? DEFAULT_TIERS,
    categories: r.categories ?? DEFAULT_CATEGORIES,
    categoryRules: r.categoryRules ?? DEFAULT_CATEGORY_RULES,
    composition: r.composition ?? DEFAULT_COMPOSITION,
    earlyDeadline: r.earlyDeadline ?? DEFAULT_EARLY_DEADLINE,
  };
}

export function useStructure(): Structure {
  const r = useStore((s) => s.adminRules);
  return useMemo(() => structureOf(r), [r]);
}

/** Outside React (labels in logs and notices): the structure as it stands now */
export function structureNow(): Structure {
  return structureOf(getState().adminRules);
}

// ───────────────────────── Reading it ─────────────────────────

export function roleOf(s: Structure, key: string | undefined) {
  return key ? s.roles.find((r) => r.key === key) : undefined;
}

/** A role's name, a secondary role's, or the key itself when the administration deleted it */
export function roleName(key: string, s: Structure = structureNow()) {
  return roleOf(s, key)?.name ?? SECONDARY[key] ?? DEFAULT_ROLES.find((r) => r.key === key)?.name ?? key;
}

/** Does the role behave so? */
export function does(s: Structure, key: string | undefined, b: Behavior) {
  return !!roleOf(s, key)?.[b];
}

/** The roles an administrator applies for this season (active and applied for) */
export function appliedRoles(s: Structure) {
  return s.roles.filter((r) => r.applied && r.active);
}

/** The exam a role sits: its own, or the one the administration tied it to */
export function examRoleOf(key: string, s: Structure = structureNow()) {
  return roleOf(s, key)?.examAs ?? key;
}

export function tierOf(s: Structure, id: string | undefined) {
  return s.tiers.find((t) => t.id === id);
}

export function categoryOfId(s: Structure, id: string | undefined) {
  return s.categories.find((c) => c.id === id);
}

export function weightOf(s: Structure, categoryId: string | undefined) {
  return categoryOfId(s, categoryId)?.weight ?? 0;
}

/** A group's seats and pilgrims: its category under the cluster's tier (or the default tier before one) */
export function seatsOf(s: Structure, tierId: string | undefined, categoryId: string | undefined) {
  const r = s.categoryRules[tierId ?? DEFAULT_TIER]?.[categoryId ?? ""] ?? s.categoryRules[DEFAULT_TIER]?.[categoryId ?? ""];
  const guides = r?.guides ?? 0;
  const assistants = r?.assistants ?? 0;
  const free = r?.free ?? 0;
  return { guides, assistants, free, total: guides + assistants + free, withHead: 1 + guides + assistants + free, pilgrims: r?.pilgrims ?? 0 };
}

/** «موجّه، ومعاون، ومقعد حر» — a category's seats in words */
export function seatsLabel(x: { guides: number; assistants: number; free: number }) {
  const part = (n: number, one: string, two: string, many: string) => (n === 0 ? "" : n === 1 ? one : n === 2 ? two : `${n} ${many}`);
  const parts = [part(x.guides, "موجّه", "موجّهان", "موجّهين"), part(x.assistants, "معاون", "معاونان", "معاونين"), part(x.free, "مقعد حر", "مقعدان حرّان", "مقاعد حرة")].filter(Boolean);
  return parts.length ? parts.join(" و") : "رئيسها وحده";
}

export function compositionOf(s: Structure, tierId: string | undefined): Composition {
  return s.composition[tierId ?? DEFAULT_TIER] ?? DEFAULT_COMPOSITION[DEFAULT_TIER];
}

/** What a cluster of this weight needs under its tier */
export function needsOf(s: Structure, tierId: string | undefined, weight: number) {
  const c = compositionOf(s, tierId);
  const per = (n: number) => (n <= 0 ? 0 : Math.round(weight / n));
  return { ...c, coordinators: per(c.perCoordinator), femaleGuides: per(c.perGuide) };
}

// ───────────────────────── The people's season: seasonal role, category, branches ─────────────────────────

/**
 * What the administration set on each person this season, for whoever is not on this device as well as
 * whoever is: his seasonal role, his category (a group head's), his branch and extra branches. The demo's
 * people start with the season's story (./people); what the staff change here wins.
 */
export type Cadre = State["cadre"];


export function seasonalOf(id: string, cadre: Cadre): SeasonalRole | undefined {
  const saved = cadre.seasonal[id];
  return saved === null ? undefined : (saved ?? PEOPLE[id]?.seasonal);
}

export function categoryOf(id: string, cadre: Cadre): string | undefined {
  return cadre.category[id] ?? PEOPLE[id]?.category;
}

export function branchOf(id: string, cadre: Cadre): string {
  return cadre.branches[id]?.branch ?? PEOPLE[id]?.branch ?? "دمشق";
}

/** His branch first, then the extra branches the administration opened to him */
export function branchesOf(id: string, cadre: Cadre): string[] {
  const extra = cadre.branches[id]?.extra ?? PEOPLE[id]?.extra ?? [];
  return [branchOf(id, cadre), ...extra.filter((b) => b !== branchOf(id, cadre))];
}

/** The role he works in this season: the seasonal one the administration granted, else the one he applied for */
export function seasonRoleKey(id: string, applied: string | undefined, cadre: Cadre) {
  return seasonalOf(id, cadre)?.role ?? applied ?? "";
}

/** «محمد — معاون (معاون متحد)» — a seasonal role with its displayed label */
export function seasonalText(x: SeasonalRole, s: Structure) {
  return x.label ? `${roleName(x.role, s)} (${x.label})` : roleName(x.role, s);
}

export function useCadre() {
  return useStore((s) => s.cadre);
}

/** A person's age: from the civil registry for whoever is in it, else the season's records */
export function ageOfId(id: string): number | undefined {
  const p = getPerson(id);
  return p ? ageOf(p) : PEOPLE[id]?.age;
}

/** Average age, and whether it earns «شارة العمر» (40 or less) */
export function ageBadge(ages: number[]) {
  if (!ages.length) return { avg: null as number | null, ok: false };
  const avg = ages.reduce((n, a) => n + a, 0) / ages.length;
  return { avg: Math.round(avg * 10) / 10, ok: avg <= 40 };
}

export const BADGES = {
  age: { label: "شارة العمر", icon: "🌟", hint: "متوسط أعمار كادر التكتل 40 سنة أو أقل" },
  guidance: { label: "شارة الإرشاد", icon: "🧭", hint: "في التكتل مرشد ديني أو مرشدة دينية واحد على الأقل" },
  timeliness: { label: "شارة الالتزام بالمواعيد", icon: "⏱️", hint: "أُرسل الطلب قبل الموعد الأول" },
} as const;
