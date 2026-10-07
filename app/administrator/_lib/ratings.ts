import { DEMO_GROUPS } from "@/lib/data/grading-demo";
import { OUTCOME_TEXT, standingOf } from "@/lib/grading";
import { SEASON } from "@/lib/season";
import { countOf, type Noun } from "@/lib/utils";
import type { SeasonRecord } from "./admin";

/**
 * Where an administrator's season rating (out of 5) comes from. He accepted it with the commitment
 * «قبول التقييم»: the pilgrims, the staff and the cluster head rate him, and the platform's own record
 * of his conduct is the fourth part — it starts at 5 and every recorded violation takes points off it.
 * The rating is the weighted sum of the four, so every season in «السجل الموسمي» can say how it was
 * reached and what happened in it, not only the number.
 */
export const RATING_SOURCES = [
  { key: "pilgrims", label: "تقييم الحجاج", weight: 0.4, how: "في التقييم الشامل بعد العودة إلى دمشق" },
  { key: "cluster", label: "تقييم رئيس التكتل", weight: 0.25, how: "في نهاية الموسم، لكل إداري في تكتله" },
  { key: "staff", label: "تقييم الموظفين", weight: 0.2, how: "موظفو المكتب والمطار والميدان" },
  { key: "conduct", label: "الانضباط — من سجل المنصة", weight: 0.15, how: "يبدأ من 5، وتنقص منه كل مخالفة مسجّلة" },
] as const;

export type RatingSourceKey = (typeof RATING_SOURCES)[number]["key"];

export type Deduction = { text: string; by: string; points: number };

export type SeasonRating = {
  season: string;
  role: string;
  group: string;
  rating: number;
  /** Each source out of 5, with what it adds to the rating */
  sources: { key: RatingSourceKey; label: string; how: string; weight: number; value: number; points: number; who: string; note?: string }[];
  /** How many pilgrims gave 5, 4, 3, 2 and 1 stars */
  stars: [number, number, number, number, number];
  raters: number;
  pilgrims: number;
  deductions: Deduction[];
  praise: string[];
  quotes: { stars: number; text: string }[];
  /** His group's place in the classification of that season, when he headed it and it was ranked */
  standing?: { group: string; score: number; rank: number; total: number; tier: string; outcome: string; note: string; tone: "green" | "gold" | "maroon" };
};

/** What can be recorded against each kind of work, mildest first */
const DEDUCTIONS: Record<string, Deduction[]> = {
  "group-head": [
    { text: "تأخر تجمّع المجموعة في المطار 25 دقيقة عن موعده", by: "موظف المطار", points: 0.2 },
    { text: "رُفع تقرير مرحلة المدينة المنورة بعد موعده بيوم", by: "سجل المنصة", points: 0.2 },
  ],
  "group-deputy": [
    { text: "اكتمل ملفان صحيان لحاجّين بعد موعدهما بيومين", by: "سجل المنصة", points: 0.2 },
    { text: "غاب عن تجمّع العودة في جدة دون أن يبلّغ رئيس المجموعة مسبقاً", by: "رئيس المجموعة", points: 0.3 },
  ],
  tech: [{ text: "لم تُفعَّل بطاقة حاج قبل السفر، فتأخر دخوله المطار", by: "موظف المطار", points: 0.2 }],
  "guide-m": [{ text: "تأخر درس المناسك في المدينة نصف ساعة عن موعده", by: "رئيس المجموعة", points: 0.1 }],
};

const PRAISE: Record<string, string[]> = {
  "group-head": ["أُغلقت تجمّعات المجموعة كلها في مواعيدها", "رُفعت تقارير المراحل التسع في مواعيدها", "لم يبقَ بلاغ مفتوح على المجموعة عند العودة"],
  "group-deputy": ["اكتملت ملفات الحجاج الصحية قبل السفر", "تولّى تجمّع العودة حين انشغل رئيس المجموعة بحالة إسعافية"],
  tech: ["أغلق بلاغات الحجاج التقنية في ساعتين في المتوسط", "فُعّلت بطاقات حجاج مجموعاته كلها قبل السفر", "درّب الحجاج على التطبيق في لقاء ما قبل السفر"],
  "guide-m": ["أتمّ برنامج الدروس كاملاً في مكة والمدينة", "رافق الحجاج في المشاعر كلها", "شكره الحجاج في 21 تعليقاً"],
};

const QUOTES = {
  high: [
    { stars: 5, text: "ما قصّر معنا لحظة، جزاه الله خيراً." },
    { stars: 5, text: "كان حاضراً في كل موعد، ويرد على الهاتف ليلاً ونهاراً." },
  ],
  mid: [
    { stars: 4, text: "تنظيم جيد، وتمنيت لو كانت الأخبار تصلنا أسرع في المدينة." },
    { stars: 4, text: "تعامل طيب، وتأخرت بعض المواعيد قليلاً." },
  ],
};

/** Notes of the cluster head and the staff, by how the season went */
const NOTES = {
  high: { cluster: "التزم ببرنامج التكتل، وكان سنداً لبقية المجموعات.", staff: "تعاون كامل مع المكتب والمطار، ومواعيده دقيقة." },
  mid: { cluster: "أداء جيد، ويحتاج إلى متابعة أدق للمواعيد.", staff: "متعاون، وتأخرت بعض متابعاته." },
};

/**
 * The seasons the demo tells in full. The others follow from the rating: the better the season, the
 * fewer the violations, but every number still adds up to the rating on record.
 */
const TOLD: Record<string, Partial<Omit<SeasonRating, "sources">> & { cluster: number; clusterBy?: string; notes: { cluster: string; staff: string } }> = {
  // Walid Al-Qassab, group 44 in the Aleppo office: the season that kept him from renewing his role
  "01033300884:1447": {
    stars: [6, 9, 10, 8, 5],
    pilgrims: 45,
    cluster: 3.5,
    clusterBy: "فراس البيطار — رئيس تكتل الإخاء",
    deductions: [
      { text: "تأخر تجمّع مجموعة السكينة في مطار حلب 55 دقيقة عن موعده، فتأخر صعود 12 حاجاً", by: "موظف المطار", points: 0.6 },
      { text: "سبعة بلاغات من الحجاج عن توزيع الغرف في فندق مكة، ثلاثة منها أُغلقت بعد أكثر من 24 ساعة", by: "مركز الدعم", points: 0.8 },
      { text: "رُفع تقرير مرحلة المشاعر (منى وعرفات) بعد موعده بيومين", by: "سجل المنصة", points: 0.5 },
      { text: "إنذار خطي من مكتب حلب: تغيّب عن اجتماع التنسيق قبل السفر", by: "مكتب حلب", points: 0.3 },
    ],
    praise: ["كان مع حجاج مجموعته يوم عرفة حتى النفرة إلى مزدلفة"],
    quotes: [
      { stars: 2, text: "رئيس المجموعة ما كان يرد على الهاتف بمكة، ونقلنا الغرف بأنفسنا." },
      { stars: 3, text: "تعامل محترم، لكن التنظيم ضعيف والمواعيد كلها متأخرة." },
      { stars: 5, text: "جزاه الله خيراً، كان معنا في المشاعر خطوة بخطوة." },
    ],
    notes: {
      cluster: "التزم ببرنامج التكتل في المشاعر، وتأخر توزيع الغرف في مكة يومين حتى تدخّلتُ.",
      staff: "تجمّع مطار حلب تأخر، وفاته اجتماع التنسيق قبل السفر.",
    },
  },
};

export const PILGRIMS: Noun = { zero: "لا أحد", one: "حاج واحد", two: "حاجّان", few: "حجاج", many: "حاجاً" };
const VIOLATIONS: Noun = { zero: "لا مخالفة مسجّلة", one: "مخالفة واحدة مسجّلة", two: "مخالفتان مسجّلتان", few: "مخالفات مسجّلة", many: "مخالفة مسجّلة" };
const STAFF: Noun = { zero: "لا أحد", one: "موظف واحد", two: "موظفان", few: "موظفين", many: "موظفاً" };

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number) => Math.min(5, Math.max(1, n));

/**
 * Stars around an average, as pilgrims give them: most at the two values nearest to it, and a tail of
 * lower ones that grows as the average falls
 */
function starsAround(avg: number, n: number): [number, number, number, number, number] {
  const tails = avg >= 4.5 ? [0.03, 0, 0] : avg >= 4 ? [0.08, 0.03, 0] : [0.15, 0.05, 0.02];
  const [n3, n2, n1] = tails.map((t) => Math.round(n * t));
  const body = n - n3 - n2 - n1;
  const rest = Math.round(avg * n) - 3 * n3 - 2 * n2 - n1;
  const lo = Math.min(4, Math.max(1, Math.floor(rest / body)));
  const hi = Math.max(0, Math.min(body, rest - lo * body));
  const counts = [0, n1, n2, n3, 0, 0];
  counts[lo] += body - hi;
  counts[lo + 1] += hi;
  return [counts[5], counts[4], counts[3], counts[2], counts[1]];
}

/** The full story of one season served; null for a season he did not take part in */
export function seasonRating(id: string, h: SeasonRecord): SeasonRating | null {
  if (!h.roleKey || h.rating === null) return null;
  const r = h.rating;
  const told = TOLD[`${id}:${h.season}`];
  const seed = Number(id.slice(-2)) + Number(h.season);
  const kind = h.roleKey === "guide-f" ? "guide-m" : h.roleKey;

  const deductions = told?.deductions ?? (r >= 4.7 ? [] : r >= 4.4 ? DEDUCTIONS[kind]?.slice(0, 1) ?? [] : DEDUCTIONS[kind] ?? []);
  const conduct = round1(5 - deductions.reduce((t, d) => t + d.points, 0));
  const cluster = told?.cluster ?? clamp(round1(r + [0.1, 0, -0.1, 0.2][seed % 4]));
  // The pilgrims of his group (a technical coordinator answers to those of all the groups assigned to him)
  const pilgrims = told?.pilgrims ?? (kind === "tech" ? 128 + (seed % 9) : 40 + (seed % 8));
  const raters = told?.stars ? told.stars.reduce((a, b) => a + b, 0) : Math.round(pilgrims * 0.85);
  // The pilgrims' part is whatever the other three leave to the rating; their stars are drawn around it
  const target = clamp((r - 0.25 * cluster - 0.2 * clamp(r + 0.1) - 0.15 * conduct) / 0.4);
  const stars = told?.stars ?? starsAround(target, raters);
  const pilgrimsAvg = round1((stars[0] * 5 + stars[1] * 4 + stars[2] * 3 + stars[3] * 2 + stars[4]) / raters);
  // The staff's part closes the sum, so the four add up to the rating on record
  const staff = clamp(round1((r - 0.4 * pilgrimsAvg - 0.25 * cluster - 0.15 * conduct) / 0.2));
  const notes = told?.notes ?? (r >= 4.5 ? NOTES.high : NOTES.mid);

  const values: Record<RatingSourceKey, { value: number; who: string; note?: string }> = {
    pilgrims: { value: pilgrimsAvg, who: `قيّمه ${countOf(raters, PILGRIMS)} من ${pilgrims}` },
    cluster: { value: cluster, who: told?.clusterBy ?? "", note: notes.cluster },
    staff: { value: staff, who: `متوسط ${countOf(3 + (seed % 4), STAFF)}`, note: notes.staff },
    conduct: { value: conduct, who: countOf(deductions.length, VIOLATIONS) },
  };

  // His group's classification at the end of the season, as the administration published it
  let standing: SeasonRating["standing"];
  const number = h.groups.length === 1 ? h.groups[0] : undefined;
  if (kind === "group-head" && number && h.season === "1447") {
    const g = SEASON.grading;
    const s = standingOf(`g-${number}`, DEMO_GROUPS, { promoteShare: g.promoteShare, demoteShare: g.demoteShare, honorTop: g.honorTop });
    if (s) {
      const o = OUTCOME_TEXT[s.outcome];
      standing = { group: h.group, score: s.entry.score, rank: s.rank, total: s.tierResult.total, tier: s.tierResult.label, outcome: o.label, note: o.note, tone: o.tone };
    }
  }

  return {
    season: h.season,
    role: h.role,
    group: h.group,
    rating: r,
    // Shown to one decimal, and each part computed from what is shown, so the sum on the screen adds up
    sources: RATING_SOURCES.map((s) => ({ ...s, ...values[s.key], points: Math.round(values[s.key].value * s.weight * 100) / 100 })),
    stars,
    raters,
    pilgrims,
    deductions,
    praise: told?.praise ?? (PRAISE[kind] ?? []).slice(0, r >= 4.5 ? 3 : 2),
    quotes: told?.quotes ?? (r >= 4.5 ? QUOTES.high : QUOTES.mid),
    standing,
  };
}
