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
 * administration as a seasonal role («رئيس تكتل»). `examAs`: the role whose exam it sits (and whose
 * requirements and permissions it holds). `exams`: every exam it sits when more than one — «معاون ومنسق
 * تقني» sits the assistant's and the technical coordinator's, and must pass both.
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
  exams?: string[];
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
  /**
   * «عمر مثبَّت»: the age the cluster's average counts for its holder instead of his own — a grade of guides
   * («موجّه ديني أ» at 40, «ب» at 45, «موجّهة دينية ب» at 48) is not held against the cluster's age badge
   */
  fixedAge?: number;
  /** The name of the exam it qualifies by, when other roles sit it too («امتحان الموجّه الديني» for the guides' grades) */
  examName?: string;
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
  { key: "guidance", label: "تمنح شارة التميّز في التوجيه الديني", hint: "وجود شخص واحد بهذه الصفة في التكتل يمنحه شارة التميّز في التوجيه الديني" },
  { key: "category", label: "تُظهر حقل «الفئة»", hint: "لصاحبها فئة تحددها الإدارة، وهي فئة المجموعة التي يرأسها" },
];

/**
 * The twelve roles of the administration's platform, in its order, with the behaviors it gives each. The religious
 * guides come in three grades each, men's and women's: «أ» grants the cluster the excellence badge and counts at a
 * fixed age of 40 in its average, «ب» at 45 (a woman guide at 48), «ج» at her own age. A grade is its own role
 * (its key kept from the platform's first lists: «أ» was «مرشد ديني»), and every grade sits the guide's exam.
 */
export const DEFAULT_ROLES: RoleDef[] = [
  { key: "cluster-head", name: "رئيس تكتل", level: "cluster", core: true, active: true, applied: false, clusterLeader: true, desc: "صفة تمنحها الإدارة، أساسيةً لمن ثبت فيها أو موسميةً لموسم واحد: يقدّم طلب تشكيل التكتل، ويختار مجموعاته وكادره، ويدير التكتل كاملاً بعد اعتماده." },
  { key: "group-head", name: "رئيس مجموعة", level: "group", core: true, active: true, applied: true, groupLeader: true, category: true, desc: "يشكّل مجموعته ويقودها. فئته (الأولى… الرابعة) تحددها الإدارة، وهي فئة مجموعته: عدد حجاجها ومقاعد فريقها." },
  { key: "group-deputy", name: "معاون", level: "shared", core: true, active: true, applied: true, assistantSeat: true, assistantPool: true, desc: "يشغل مقعد المعاون في مجموعة، أو يكون معاون التكتل: الحضور والتجمّع والمطارات والمستلزمات." },
  { key: "tech", name: "منسق تقني", level: "cluster", core: true, active: true, applied: true, coordinatorPool: true, desc: "للتكتل لا لمجموعة: برنامج المنسقين وبيانات الحجاج وأوراقهم. يوزّع رئيس التكتل المجموعات على منسقيه." },
  { key: "assistant-tech", name: "معاون ومنسق تقني", level: "shared", core: true, active: true, applied: true, examAs: "tech", exams: ["group-deputy", "tech"], assistantSeat: true, assistantPool: true, coordinatorPool: true, desc: "يجمع الصفتين: يمتحن امتحانَي المعاون والمنسق التقني ويلزمه اجتيازهما معاً، ويشغل مقعد معاون، أو يكون من منسقي التكتل. لا بد أن يكون أحد منسقي كل تكتل بهذه الصفة." },
  { key: "murshid", name: "موجّه ديني أ", level: "group", core: true, active: true, applied: true, examAs: "guide-m", gender: "M", guideSeat: true, guidance: true, fixedAge: 40, desc: "أعلى درجات الموجّهين: يشغل مقعد الموجّه في مجموعة، ويمنح التكتل شارة التميّز في التوجيه الديني. يُحتسب عمره في متوسط التكتل 40." },
  { key: "guide-m", name: "موجّه ديني ب", level: "group", core: true, active: true, applied: true, gender: "M", guideSeat: true, fixedAge: 45, examName: "الموجّه الديني", desc: "يشغل مقعد الموجّه في مجموعة: الدروس والمناسك والإجابة عن الأسئلة الشرعية. يُحتسب عمره في متوسط التكتل 45." },
  { key: "guide-m-c", name: "موجّه ديني ج", level: "group", active: true, applied: true, examAs: "guide-m", gender: "M", guideSeat: true, desc: "أولى درجات الموجّهين: يشغل مقعد الموجّه في مجموعة، ويُحتسب في متوسط أعمار التكتل بعمره." },
  { key: "murshida", name: "موجّهة دينية أ", level: "cluster", core: true, active: true, applied: true, examAs: "guide-f", gender: "F", guidePool: true, guidance: true, fixedAge: 40, desc: "أعلى درجات الموجّهات: من موجّهات التكتل، وتمنحه شارة التميّز في التوجيه الديني. يُحتسب عمرها في متوسط التكتل 40." },
  { key: "guide-f", name: "موجّهة دينية ب", level: "cluster", core: true, active: true, applied: true, gender: "F", guidePool: true, fixedAge: 48, examName: "الموجّهة الدينية", desc: "للتكتل لا لمجموعة: التوجيه الديني لحاجّات التكتل كله، وعددها بمجموع فئات مجموعاته. يُحتسب عمرها في متوسط التكتل 48." },
  { key: "guide-f-c", name: "موجّهة دينية ج", level: "cluster", active: true, applied: true, examAs: "guide-f", gender: "F", guidePool: true, desc: "أولى درجات الموجّهات: من موجّهات التكتل، وتُحتسب في متوسط أعمار التكتل بعمرها." },
  { key: "assistant-count", name: "معاون بعدد", level: "shared", core: true, active: true, applied: true, examAs: "group-deputy", assistantSeat: true, assistantPool: true, multiplier: 20, desc: "معاون يُختار من معاوني التكتل بلا حد أقصى، ويضيف كل واحد منهم 20 حاجاً إلى عدد حجاج التكتل." },
];

/** The roles' names before the guides came in grades, as records written then still say them */
export const LEGACY_ROLE_NAMES: Record<string, string> = { "موجّه ديني": "guide-m", "مرشد ديني": "murshid", "موجّهة دينية": "guide-f", "مرشدة دينية": "murshida" };

/** A role's key from its key or its name, today's or an earlier one */
export function roleKeyByName(s: Structure, position: string | undefined) {
  if (!position) return undefined;
  return s.roles.find((r) => r.key === position || r.name === position)?.key ?? LEGACY_ROLE_NAMES[position];
}

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

/** Until this day and hour a request sent earns the cluster «شارة الالتزام بالمواعيد» (the early deadline) */
export const DEFAULT_EARLY_DEADLINE = "2026-11-19";
export const DEFAULT_EARLY_TIME = "23:59";

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
  earlyTime: string;
};

type Saved = Pick<State["adminRules"], "roles" | "roleLabels" | "branches" | "tiers" | "categories" | "categoryRules" | "composition" | "earlyDeadline" | "earlyTime">;

export function structureOf(r: Saved): Structure {
  return {
    // A role list saved before a role sat more than one exam keeps the platform's exams for that role
    roles: r.roles ? r.roles.map((x) => (x.exams || !x.core ? x : { ...x, exams: DEFAULT_ROLES.find((d) => d.key === x.key)?.exams })) : DEFAULT_ROLES,
    labels: r.roleLabels ?? DEFAULT_LABELS,
    branches: r.branches ?? DEFAULT_BRANCHES,
    tiers: r.tiers ?? DEFAULT_TIERS,
    categories: r.categories ?? DEFAULT_CATEGORIES,
    categoryRules: r.categoryRules ?? DEFAULT_CATEGORY_RULES,
    composition: r.composition ?? DEFAULT_COMPOSITION,
    earlyDeadline: r.earlyDeadline ?? DEFAULT_EARLY_DEADLINE,
    earlyTime: r.earlyTime ?? DEFAULT_EARLY_TIME,
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
export function roleName(key: string, s: Structure = structureNow()): string {
  const legacy = LEGACY_ROLE_NAMES[key];
  return roleOf(s, key)?.name ?? SECONDARY[key] ?? DEFAULT_ROLES.find((r) => r.key === key)?.name ?? (legacy ? roleName(legacy, s) : key);
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

/** Every exam a role sits, each passed on its own: one for most roles, two for «معاون ومنسق تقني» */
export function examRolesOf(key: string, s: Structure = structureNow()) {
  const r = roleOf(s, key);
  return r?.exams?.length ? r.exams : [examRoleOf(key, s)];
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

/**
 * His base role («الصفة الأساسية»): the one the administration set in his file, else the season's records, else the
 * one he applied for. It stays from season to season; a seasonal role covers it for one season.
 */
export function primaryOf(id: string, applied: string | undefined, cadre: Cadre) {
  return cadre.primary?.[id] ?? PEOPLE[id]?.primary ?? applied ?? "";
}

/** The role he works in this season: the seasonal one the administration granted, else his base role */
export function seasonRoleKey(id: string, applied: string | undefined, cadre: Cadre) {
  return seasonalOf(id, cadre)?.role ?? primaryOf(id, applied, cadre);
}

/** The age his cluster's average counts for him: his role's fixed age («عمر مثبَّت»), else his own */
export function badgeAgeOf(id: string, roleKey: string | undefined, s: Structure) {
  return roleOf(s, roleKey)?.fixedAge ?? ageOfId(id);
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
  age: { label: "شارة العمر", icon: "🌟", hint: "متوسط أعمار كادر التكتل 40 سنة أو أقل — يُحتسب الموجّهون بأعمارهم المثبّتة" },
  guidance: { label: "شارة التميّز في التوجيه الديني", icon: "🧭", hint: "في التكتل موجّه ديني أو موجّهة دينية من الدرجة «أ» واحد على الأقل" },
  timeliness: { label: "شارة الالتزام بالمواعيد", icon: "⏱️", hint: "أُرسل الطلب قبل الموعد الأول" },
} as const;
