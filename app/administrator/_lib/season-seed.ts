/**
 * The rest of the season, generated: a dozen more cluster requests over the branches, tiers and states, every
 * one composed by the administration's numbers (./structure-defaults) — its groups of every category with
 * their heads and seats, its cluster assistants, coordinators and female guides, its deputy and accountant —
 * then the approved groups no request took yet and the qualified people still free in each branch. The names
 * are invented from common first and family names, the same on every load (a seeded generator); none is a
 * real person's, and no cluster carries a real cluster's name.
 */
import type { ClusterInvite, ClusterRecord, ClusterStatus, GroupInvite, Seat } from "@/lib/store";
import type { SeasonalRole } from "./structure";
import { distribute, peopleFor, type Unit } from "./distribution";
import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_RULES, DEFAULT_COMPOSITION } from "./structure-defaults";

type Head = { id: string; name: string; group: number; seasons: number; rating: number; branch: string; category: string; pilgrims: number; age: number };
type Person = { id: string; name: string; roleKey: string; branch: string; area: string; score: number; seasons: number; rating: number | null; skills: string[]; age: number };
type Seed = { category?: string; branch: string; extra?: string[]; seasonal?: SeasonalRole; age: number };

/** mulberry32: the same sequence on every load */
function generator(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = generator(1448);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
const between = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

const MEN = ["محمد", "أحمد", "محمود", "عمر", "علي", "حسن", "حسين", "خالد", "يوسف", "إبراهيم", "عبد الله", "عبد الرحمن", "عبد الكريم", "مصطفى", "زكريا", "أنس", "معاذ", "بلال", "طارق", "زياد", "فراس", "ماجد", "وائل", "نزار", "هشام", "باسل", "عمار", "أيمن", "غياث", "مهند", "حمزة", "صهيب", "عدنان", "جمال", "كنان", "يحيى", "إياد", "سعيد", "منذر", "عبد الحكيم", "نادر", "جهاد", "مأمون", "قصي", "هاني"];
const WOMEN = ["فاطمة", "عائشة", "خديجة", "مريم", "زينب", "آمنة", "رقية", "سمية", "أسماء", "هبة", "رنا", "ديما", "سلمى", "نور", "هدى", "إيمان", "رحاب", "وعد", "بشرى", "منى", "سهير", "غادة", "ميساء", "ريم"];
const FAMILIES = ["العمر", "الأحمد", "الحسن", "القاسم", "الجابر", "النعيمي", "الزعبي", "الديري", "العبيد", "البكري", "السقا", "الشماع", "الحداد", "الطحان", "الكيال", "التركماني", "الأيوبي", "المحمد", "الخليل", "السعدي", "القادري", "الجيلاني", "الطويل", "الفاعوري", "المقداد", "الحريري", "الصالح", "العيسى", "الموسى", "اليوسف", "الإبراهيم", "السليمان", "الخلف", "الفارس", "العساف", "الدرويش", "البرازي", "الكزبري", "الشيشكلي", "الأتاسي", "الجندلي", "المالح", "الكحالة", "الرز", "الحمامي", "العجلاني", "النوري", "الصواف", "الحكيم", "السمان", "الطرابيشي", "الشهابي", "الملا", "الحافظ", "الكردي", "الحجار", "المصطفى", "الضاهر", "العاني", "الصباغ"];
const AREAS: Record<string, string[]> = {
  دمشق: ["المزة", "الميدان", "ركن الدين", "القصاع", "برزة", "كفرسوسة", "المالكي", "الشاغور", "باب توما", "المهاجرين", "القدم", "الصالحية"],
  حلب: ["الجميلية", "الفرقان", "السليمانية", "الشهباء", "الحمدانية", "السبيل"],
  إدلب: ["المدينة", "الضبيط", "القصور", "المحافظة"],
  حمص: ["الوعر", "الإنشاءات", "الخالدية", "الغوطة", "عكرمة"],
  حماة: ["الحاضر", "باب قبلي", "الأربعين", "طريق حلب"],
  اللاذقية: ["الصليبة", "الرمل الشمالي", "الزراعة", "مشروع الصليبة"],
  درعا: ["درعا المحطة", "طفس", "نوى", "إزرع"],
  "دير الزور": ["الجورة", "القصور", "الحميدية"],
  الرقة: ["المشلب", "الرميلة"],
  اسطنبول: ["الفاتح", "إسنيورت", "باشاك شهير"],
  "غازي عنتاب": ["شاهين بيه", "شهيت كامل"],
  مصر: ["السادس من أكتوبر", "العبور", "مدينة نصر"],
};
const SKILLS = ["first-aid", "computer", "elderly", "bus", "sign"];

/** Ages, seasons and a sheikh's title by role */
const PROFILE: Record<string, { lo: number; hi: number; title?: string; female?: boolean }> = {
  "group-head": { lo: 36, hi: 62 },
  "cluster-head": { lo: 44, hi: 63 },
  "guide-m": { lo: 30, hi: 58, title: "الشيخ" },
  murshid: { lo: 44, hi: 66, title: "الشيخ" },
  "guide-f": { lo: 28, hi: 56, female: true },
  murshida: { lo: 40, hi: 62, female: true },
  "group-deputy": { lo: 24, hi: 50 },
  "assistant-tech": { lo: 24, hi: 46 },
  "assistant-count": { lo: 30, hi: 55 },
  tech: { lo: 23, hi: 44 },
};

const used = new Set<string>();
let serial = 0;
export const GEN_HEADS: Head[] = [];
export const GEN_ROSTER: Person[] = [];
export const GEN_PEOPLE: Record<string, Seed> = {};

/** A new person of the season in a role and a branch: in the roster (and the heads, with a group) */
function person(roleKey: string, branch: string, seasonal?: SeasonalRole): Person {
  const p = PROFILE[roleKey] ?? PROFILE["group-deputy"];
  let name = "";
  do {
    name = `${p.title ? `${p.title} ` : ""}${pick(p.female ? WOMEN : MEN)} ${pick(FAMILIES)}`;
  } while (used.has(name));
  used.add(name);
  serial++;
  const seasons = between(0, 5);
  const x: Person = {
    id: `s-${String(serial).padStart(4, "0")}`,
    name,
    roleKey,
    branch,
    area: pick(AREAS[branch] ?? ["المدينة"]),
    score: between(72, 98),
    seasons,
    rating: seasons ? Math.round((3.6 + rnd() * 1.35) * 10) / 10 : null,
    skills: [...new Set([pick(SKILLS), pick(SKILLS)])],
    age: between(p.lo, p.hi),
  };
  GEN_ROSTER.push(x);
  GEN_PEOPLE[x.id] = { branch, age: x.age, seasonal };
  return x;
}

/** The season's group numbers from 70 on are the generated groups'; the story's own are below */
let nextNumber = 70;

/** A group head and his approved group, of a category, in a branch */
function headWithGroup(category: string, branch: string, tier: string, fill: [number, number]): Head {
  const p = person("group-head", branch);
  // A group head is listed with the groups, not with the people a cluster head picks for its seats
  GEN_ROSTER.pop();
  const capacity = DEFAULT_CATEGORY_RULES[tier]?.[category]?.pilgrims ?? 45;
  const h: Head = { id: p.id, name: p.name, group: nextNumber++, seasons: Math.max(1, p.seasons), rating: p.rating ?? 4, branch, category, pilgrims: Math.round(capacity * (fill[0] + rnd() * (fill[1] - fill[0]))), age: p.age };
  GEN_HEADS.push(h);
  GEN_PEOPLE[h.id] = { ...GEN_PEOPLE[h.id], category };
  return h;
}

const acc = (x: { id: string; name: string }, at: number, status: ClusterInvite["status"] = "accepted"): ClusterInvite => ({ id: x.id, name: x.name, at, status });
const day = (d: number, h = 9) => Date.UTC(2026, 10, d, h);

type Plan = {
  id: string;
  name: string;
  branch: string;
  extra?: string[];
  tier: "eco" | "eco-plus" | "five";
  /** Each group's category, the head's own first */
  cats: number[];
  status: ClusterStatus;
  note?: string;
  reviewer?: string;
  /** Seats and lists still waiting for an answer, as in a draft */
  unfinished?: boolean;
  /** One group head serves as an assistant this season: his first-category group merged with another */
  merged?: boolean;
  /** «معاون بعدد» among the cluster's assistants */
  counted?: number;
};

/** In the administration's order: the requests of the season, every branch, every tier, every state */
const PLANS: Plan[] = [
  { id: "as-salam", name: "تكتل السلام", branch: "دمشق", tier: "eco", cats: [3, 2, 2, 1, 1, 2, 1, 2, 3], status: "approved", merged: true, counted: 1 },
  { id: "al-amana", name: "تكتل الأمانة", branch: "حلب", tier: "eco-plus", cats: [2, 2, 3, 1, 1, 2, 1], status: "approved" },
  { id: "al-manara", name: "تكتل المنارة", branch: "إدلب", tier: "eco", cats: [2, 1, 1, 1, 2, 1, 1, 2, 1, 1], status: "approved", counted: 2 },
  { id: "ar-riyada", name: "تكتل الريادة", branch: "حلب", tier: "eco", cats: [4, 3, 2, 4, 2, 1, 2, 2, 1, 1], status: "approved" },
  { id: "al-yanabee", name: "تكتل الينابيع", branch: "دمشق", tier: "eco-plus", cats: [3, 3, 2, 2, 1, 1, 2, 1, 2], status: "approved", merged: true },
  { id: "al-ghaith", name: "تكتل الغيث", branch: "درعا", tier: "eco", cats: [1, 1, 2, 1, 1, 1, 1], status: "approved" },
  { id: "as-sanabel", name: "تكتل السنابل", branch: "دير الزور", extra: ["الرقة"], tier: "eco", cats: [2, 1, 1, 2, 1, 1, 3], status: "approved" },
  { id: "al-ahd", name: "تكتل العهد", branch: "اسطنبول", extra: ["غازي عنتاب", "مصر"], tier: "five", cats: [2, 1, 2, 1, 1, 2], status: "approved" },
  { id: "al-fajr", name: "تكتل الفجر", branch: "حمص", extra: ["حماة"], tier: "eco", cats: [3, 2, 1, 1, 2, 1, 2], status: "pending" },
  { id: "al-wafaa", name: "تكتل الوفاء", branch: "حماة", tier: "eco-plus", cats: [2, 1, 2, 1, 1, 2], status: "reviewing", reviewer: "رهف الخطيب" },
  { id: "al-ishraq", name: "تكتل الإشراق", branch: "دمشق", tier: "eco", cats: [2, 2, 1, 1, 3, 1, 2, 1], status: "rejected", reviewer: "ماهر عيسى", note: "النظام الإداري يشترط تفرّغ المنسق التقني في مراحل العمل الأساسية، وأحد منسقيكم موظف بدوام كامل في الموسم. استبدله بمنسق متفرّغ ثم أعد الإرسال قبل الموعد النهائي." },
  { id: "al-asala", name: "تكتل الأصالة", branch: "اللاذقية", tier: "eco", cats: [2, 1, 1, 2, 1], status: "draft", unfinished: true },
];

const GUIDE_LABELS = ["موجّه ب"];
const cat = (n: number) => `c${n}`;

function build(plan: Plan) {
  const branches = [plan.branch, ...(plan.extra ?? [])];
  const where = (i: number) => branches[i % branches.length];
  const fill: [number, number] = plan.status === "approved" ? [0.7, 1] : [0.45, 0.85];
  const sent = day(between(13, 18));
  const at = sent - 86_400_000;
  const answer = (x: { id: string; name: string }, i: number): ClusterInvite => acc(x, at, plan.unfinished && i % 3 === 1 ? "pending" : "accepted");

  // The head heads the first group; the administration made him the cluster's head this season
  const headGroup = headWithGroup(cat(plan.cats[0]), plan.branch, plan.tier, fill);
  GEN_PEOPLE[headGroup.id].seasonal = {
    role: "cluster-head",
    reason: pick([`رئيس مجموعة ${headGroup.seasons} مواسم بتقييم ${headGroup.rating}`, "للزيادة العددية: تكتل إضافي لحجاج الفرع", `رئيس تكتل في 1447 وتقييمه ${headGroup.rating}`]),
    by: pick(["مازن الحلبي", "ماهر عيسى", "رهف الخطيب"]),
    at: Date.UTC(2026, 9, between(20, 30), 10),
  };
  GEN_PEOPLE[headGroup.id].extra = plan.extra;
  const heads = [headGroup, ...plan.cats.slice(1).map((c, i) => headWithGroup(cat(c), where(i + 1), plan.tier, fill))];
  const rules = DEFAULT_CATEGORY_RULES[plan.tier];
  const groups: GroupInvite[] = heads.map((h) => ({ ...acc(h, at), number: h.group, branch: h.branch, category: h.category, pilgrims: h.pilgrims }));

  // A head whose first-category group merged with another: an assistant this season, a group head after it
  let merged: Person | undefined;
  if (plan.merged) {
    const partner = heads.find((h, i) => i > 0 && h.category === "c1");
    merged = person("group-head", plan.branch, {
      role: "group-deputy",
      label: "معاون متحد",
      reason: `اتحاد مجموعتين من الفئة الأولى لموسم 1448 (النظام الإداري): مجموعته اتحدت مع مجموعة ${partner?.name ?? "أخرى"}، فيعمل معاوناً هذا الموسم ويبقى رئيس مجموعة للمواسم القادمة`,
      by: "مازن الحلبي",
      at: Date.UTC(2026, 10, 2, 11),
    });
    GEN_PEOPLE[merged.id].category = "c1";
  }

  let n = 0;
  const seats: Record<number, Seat[]> = {};
  heads.forEach((h, gi) => {
    const r = rules[h.category];
    const list: Seat[] = [];
    const guideRole = () => (rnd() < 0.2 ? "murshid" : "guide-m");
    const assistantRole = () => (rnd() < 0.22 ? "assistant-tech" : "group-deputy");
    for (let i = 0; i < r.guides; i++) {
      const p = person(guideRole(), h.branch, rnd() < 0.06 ? { role: "guide-m", label: pick(GUIDE_LABELS), reason: "مكلّف بمجموعتين صغيرتين في الدروس", by: "ماهر عيسى", at: Date.UTC(2026, 10, 3, 9) } : undefined);
      list.push({ kind: "guide", who: answer(p, n++) });
    }
    for (let i = 0; i < r.assistants; i++) {
      // The merged head takes the first assistant seat of a group of his cluster
      const p = merged && gi === 1 && i === 0 ? merged : person(assistantRole(), h.branch);
      list.push({ kind: "assistant", who: answer(p, n++) });
    }
    for (let i = 0; i < r.free; i++) {
      const kind = rnd() < 0.5 ? "guide" : "assistant";
      const p = person(kind === "guide" ? guideRole() : assistantRole(), h.branch);
      list.push({ kind, free: true, who: answer(p, n++) });
    }
    seats[h.group] = list;
  });
  const comp = DEFAULT_COMPOSITION[plan.tier];
  const assistants: ClusterInvite[] = [
    ...Array.from({ length: comp.assistants }, (_, i) => {
      const p = person("group-deputy", plan.branch, i === 0 && rnd() < 0.4 ? { role: "group-deputy", label: "معاون - مكتب سياحي", reason: "يتابع حجوزات التكتل مع المكتب السياحي", by: "رهف الخطيب", at: Date.UTC(2026, 10, 4, 10) } : undefined);
      return answer(p, n++);
    }),
    ...Array.from({ length: plan.counted ?? 0 }, () => answer(person("assistant-count", plan.branch), n++)),
    // No assistant seat in the second group: the merged head is one of the cluster's assistants instead
    ...(merged && !Object.values(seats).flat().some((x) => x.who?.id === merged!.id) ? [answer(merged, n++)] : []),
  ];
  const units: Unit[] = heads.map((h) => ({ number: h.group, units: DEFAULT_CATEGORIES.find((k) => k.id === h.category)?.weight ?? 1 }));
  const coordinators = Array.from({ length: peopleFor(units.map((u) => u.units), comp.perCoordinator) }, (_, i) => answer(person(i === 0 ? "assistant-tech" : rnd() < 0.3 ? "assistant-tech" : "tech", where(i)), n++));
  const femaleNeed = peopleFor(units.map((u) => u.units), comp.perGuide);
  const femaleGuides = Array.from({ length: plan.unfinished ? Math.max(0, femaleNeed - 1) : femaleNeed }, (_, i) => answer(person(rnd() < 0.3 ? "murshida" : "guide-f", where(i)), n++));
  // Coordinators and female guides on the groups, each within his quota of units
  const accepted = coordinators.filter((x) => x.status === "accepted");
  const sorting = distribute(units, accepted.map((x) => x.id), comp.perCoordinator).map;
  const guideSorting = distribute(units, femaleGuides.filter((x) => x.status === "accepted").map((x) => x.id), comp.perGuide).map;

  const deputy = heads[1] ? acc(heads[1], at, plan.unfinished ? "pending" : "accepted") : undefined;
  const pool = [...heads.slice(1), ...accepted, ...Object.values(seats).flat().flatMap((x) => (x.who?.status === "accepted" ? [x.who] : []))];
  const accountant = plan.unfinished ? undefined : acc(pick(pool), at);

  const cluster: ClusterRecord = {
    id: plan.id,
    name: plan.name,
    createdAt: day(12),
    tier: plan.tier,
    status: plan.status,
    ...(plan.status !== "draft" && { firstSentAt: sent, sentAt: sent }),
    ...((plan.status === "approved" || plan.status === "rejected" || plan.status === "reviewing") && { review: { at: sent + 20 * 3_600_000, by: plan.reviewer ?? "مازن الحلبي" } }),
    ...(plan.status === "approved" && { decision: { status: "approved" as const, at: sent + 2 * 86_400_000, by: plan.reviewer ?? "مازن الحلبي" }, feePaidAt: sent + 3 * 86_400_000 }),
    ...(plan.status === "rejected" && { decision: { status: "rejected" as const, at: sent + 86_400_000, by: plan.reviewer ?? "ماهر عيسى", note: plan.note } }),
    deputy,
    accountant,
    groups: Object.fromEntries(groups.map((g) => [g.number, g])),
    seats,
    assistants,
    coordinators,
    femaleGuides,
    sorting,
    guideSorting,
  };
  return { headId: headGroup.id, headName: headGroup.name, headGroup: headGroup.group, cluster };
}

export const GEN_CLUSTERS = PLANS.map(build);

/**
 * Approved groups that no request holds yet, in every branch and category — a cluster head may invite them,
 * and after the final deadline the administration adds the ones left to a cluster — and the qualified people
 * still free in each branch, every role.
 */
const FREE_GROUPS: Record<string, number> = { دمشق: 7, حلب: 4, إدلب: 2, حمص: 2, حماة: 2, اللاذقية: 2, درعا: 1, "دير الزور": 1, الرقة: 1, اسطنبول: 1, "غازي عنتاب": 1, مصر: 1 };
for (const [branch, count] of Object.entries(FREE_GROUPS)) {
  for (let i = 0; i < count; i++) {
    const r = rnd();
    headWithGroup(r < 0.45 ? "c1" : r < 0.8 ? "c2" : r < 0.95 ? "c3" : "c4", branch, "eco", [0.35, 0.8]);
  }
}
const FREE_PEOPLE: Record<string, number> = { "guide-m": 2, murshid: 1, "guide-f": 1, murshida: 1, "group-deputy": 2, "assistant-tech": 1, "assistant-count": 1, tech: 1 };
for (const branch of Object.keys(FREE_GROUPS)) {
  const big = branch === "دمشق" || branch === "حلب";
  for (const [role, count] of Object.entries(FREE_PEOPLE)) for (let i = 0; i < (big ? count * 2 : count); i++) person(role, branch);
}
