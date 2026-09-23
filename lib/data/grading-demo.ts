import type { Graded } from "../grading";

/**
 * Demo season results: every group and every cluster of season 1447 with the score its evaluation
 * produced, so the classification screen works on realistic numbers. Generated from a fixed seed, so
 * the ranking never changes between renders, and the demo administrators' own groups are placed by
 * hand so their screens tell the same story.
 */

/** The score is a weighted composite the administration defines; these are its parts */
export const SCORE_PARTS = [
  { label: "تقييم الحجاج", weight: 0.4 },
  { label: "تقييم الموظفين ورئيس التكتل", weight: 0.25 },
  { label: "الالتزام بالمراحل التسع", weight: 0.25 },
  { label: "البلاغات والمخالفات", weight: 0.1 },
] as const;

/** Deterministic pseudo-random numbers, so the demo ranking is stable */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["أحمد", "محمد", "خالد", "عمر", "زياد", "بشار", "سامر", "نزار", "وليد", "فادي", "ماهر", "أنس", "باسل", "رامي", "طارق", "عماد", "غسان", "حسام", "جمال", "رضوان", "سليم", "نبيل", "مروان", "هيثم", "يحيى", "كمال", "لؤي", "مازن", "صالح", "عدنان"];
const LAST = ["الحلبي", "الدمشقي", "الحمصي", "الحموي", "الشامي", "الميداني", "القباني", "البيطار", "الزعبي", "العطار", "النحاس", "الخطيب", "السيد", "الدقاق", "الرفاعي", "البارودي", "الأتاسي", "العظمة", "الدباس", "النابلسي", "الساعاتي", "الجابي", "الحوراني", "الشيخ", "القصاب", "الطباع", "الحافظ", "المصري", "الكردي", "الصباغ"];
const OFFICES = ["مكتب دمشق", "مكتب ريف دمشق", "مكتب حلب", "مكتب حمص", "مكتب حماة", "مكتب اللاذقية", "مكتب إدلب", "مكتب درعا", "مكتب دير الزور", "مكتب تركيا — إسطنبول", "مكتب مصر — القاهرة", "مكتب الأردن — عمّان"];

function parts(next: () => number, target: number) {
  // Four components around the target, re-weighted so they add up to it exactly
  const raw = SCORE_PARTS.map(() => target + (next() - 0.5) * 14);
  const sum = SCORE_PARTS.reduce((t, p, i) => t + raw[i] * p.weight, 0);
  const fix = target / sum;
  return SCORE_PARTS.map((p, i) => ({ label: p.label, weight: p.weight, value: Math.round(Math.min(100, Math.max(40, raw[i] * fix)) * 10) / 10 }));
}

/** Groups placed by hand, so the demo administrators see their own standing */
const FIXED_GROUPS: { number: number; head: string; office: string; tier: number; score: number }[] = [
  { number: 27, head: "أحمد سليمان الحمصي", office: "مكتب دمشق", tier: 1, score: 93.4 },
  { number: 9, head: "نبيل عادل الساعاتي", office: "مكتب دمشق", tier: 2, score: 91.8 },
  { number: 31, head: "عبد الرحمن صالح العلي", office: "مكتب دمشق", tier: 3, score: 96.2 },
  { number: 5, head: "بسام يوسف درويش", office: "مكتب دمشق", tier: 2, score: 88.1 },
  { number: 41, head: "رضوان الزعبي", office: "مكتب درعا", tier: 1, score: 79.5 },
  { number: 12, head: "مروان زهير الحلبي", office: "مكتب دمشق", tier: 1, score: 71.2 },
  { number: 44, head: "وليد القصاب", office: "مكتب حلب", tier: 1, score: 54.3 },
  { number: 52, head: "حسام الساعاتي", office: "مكتب حمص", tier: 3, score: 90.7 },
];

/** How many groups each tier holds this season — the first tier is the one in the worked example */
const TIER_SIZES: Record<number, number> = { 1: 126, 2: 74, 3: 38 };

function buildGroups(): Graded[] {
  const next = rng(1448);
  const out: Graded[] = [];
  const used = new Set(FIXED_GROUPS.map((g) => g.number));
  let number = 1;
  for (const tier of [1, 2, 3]) {
    const fixed = FIXED_GROUPS.filter((g) => g.tier === tier);
    for (const g of fixed) {
      out.push({ id: `g-${g.number}`, name: `المجموعة ${g.number}`, head: g.head, office: g.office, tier, score: g.score, parts: parts(next, g.score) });
    }
    for (let i = fixed.length; i < TIER_SIZES[tier]; i++) {
      while (used.has(number)) number++;
      used.add(number);
      // Higher tiers score a little higher on average, and no score is clipped at the top of the scale
      const score = Math.round((50 + tier * 3 + next() * 40) * 10) / 10;
      out.push({
        id: `g-${number}`,
        name: `المجموعة ${number}`,
        head: `${FIRST[Math.floor(next() * FIRST.length)]} ${LAST[Math.floor(next() * LAST.length)]}`,
        office: OFFICES[Math.floor(next() * OFFICES.length)],
        tier,
        score,
        parts: parts(next, score),
      });
    }
  }
  return out;
}

const CLUSTERS: { name: string; head: string; office: string; tier: number; score: number }[] = [
  { name: "تكتل النور", head: "عبد الرحمن صالح العلي", office: "مكتب دمشق", tier: 2, score: 94.6 },
  { name: "تكتل الرحمة", head: "حسام الساعاتي", office: "مكتب حمص", tier: 3, score: 92.3 },
  { name: "تكتل السلام", head: "طارق الحوراني", office: "مكتب دمشق", tier: 2, score: 86.9 },
  { name: "تكتل الهدى", head: "رضوان الزعبي", office: "مكتب درعا", tier: 2, score: 74.2 },
  { name: "تكتل الإخاء", head: "فراس البيطار", office: "مكتب حلب", tier: 1, score: 90.1 },
  { name: "تكتل الوفاء", head: "نزار الشيخ", office: "مكتب اللاذقية", tier: 1, score: 84.7 },
  { name: "تكتل الأمانة", head: "صالح العلي", office: "مكتب حماة", tier: 1, score: 78.4 },
  { name: "تكتل البشرى", head: "عبد الرحمن القباني", office: "مكتب ريف دمشق", tier: 1, score: 72.8 },
  { name: "تكتل الصفا", head: "ماهر الجابي", office: "مكتب إدلب", tier: 1, score: 65.5 },
  { name: "تكتل المروة", head: "غسان النحاس", office: "مكتب دير الزور", tier: 1, score: 58.9 },
];

function buildClusters(): Graded[] {
  const next = rng(1449);
  return CLUSTERS.map((c, i) => ({ id: `c-${i}`, name: c.name, head: c.head, office: c.office, tier: c.tier, score: c.score, parts: parts(next, c.score) }));
}

export const DEMO_GROUPS: Graded[] = buildGroups();
export const DEMO_CLUSTERS: Graded[] = buildClusters();

/** The demo administrator's own group, so his screen shows his standing */
export function groupEntryFor(number: number | undefined) {
  return number === undefined ? undefined : DEMO_GROUPS.find((g) => g.id === `g-${number}`);
}
