/**
 * The season's people who are not demo accounts, and what the season's story says of the demo accounts:
 * every name here is invented for the demo. A group head's category and branch, a candidate's role and
 * branch, ages (for the cluster's «شارة العمر»), the seasonal roles the administration granted, and the base
 * roles it set («رئيس تكتل» for whoever leads a cluster every season).
 */
import type { SeasonalRole } from "./structure";
import { GEN_HEADS, GEN_PEOPLE, GEN_ROSTER } from "./season-seed";

/** Approved groups of the season whose heads are not on this device, each with the pilgrims who joined it */
export type PoolHead = { id: string; name: string; group: number; seasons: number; rating: number; branch: string; category: string; pilgrims: number; age: number };

export const HEADS_POOL: PoolHead[] = [
  // The story's own groups; the season's generated ones follow (./season-seed)
  { id: "seed-01", name: "عبد الرحمن القباني", group: 61, seasons: 4, rating: 4.7, branch: "دمشق", category: "c3", pilgrims: 98, age: 57 },
  { id: "seed-02", name: "فراس البيطار", group: 9, seasons: 3, rating: 4.2, branch: "دمشق", category: "c1", pilgrims: 44, age: 49 },
  { id: "seed-03", name: "رضوان الزعبي", group: 41, seasons: 3, rating: 4.4, branch: "درعا", category: "c2", pilgrims: 81, age: 46 },
  { id: "seed-04", name: "حسام الساعاتي", group: 52, seasons: 5, rating: 4.6, branch: "حمص", category: "c2", pilgrims: 86, age: 53 },
  { id: "seed-05", name: "صالح العلي", group: 47, seasons: 3, rating: 4.1, branch: "حماة", category: "c2", pilgrims: 77, age: 44 },
  { id: "seed-06", name: "نزار الشيخ", group: 33, seasons: 3, rating: 4.3, branch: "اللاذقية", category: "c1", pilgrims: 40, age: 41 },
  { id: "seed-07", name: "طارق الحوراني", group: 18, seasons: 4, rating: 4.5, branch: "دمشق", category: "c1", pilgrims: 43, age: 39 },
  { id: "seed-08", name: "ماهر الجابي", group: 55, seasons: 2, rating: 4.0, branch: "حلب", category: "c2", pilgrims: 64, age: 38 },
  { id: "seed-09", name: "غسان النحاس", group: 44, seasons: 1, rating: 3.9, branch: "دير الزور", category: "c1", pilgrims: 36, age: 31 },
  { id: "seed-10", name: "لؤي حمدان", group: 8, seasons: 2, rating: 4.2, branch: "دمشق", category: "c1", pilgrims: 41, age: 37 },
  { id: "seed-11", name: "يحيى المصري", group: 12, seasons: 2, rating: 4.4, branch: "دمشق", category: "c2", pilgrims: 72, age: 42 },
  { id: "seed-12", name: "عمر الدباغ", group: 14, seasons: 1, rating: 4.1, branch: "دمشق", category: "c1", pilgrims: 33, age: 35 },
  { id: "seed-13", name: "كمال الصباغ", group: 22, seasons: 3, rating: 4.6, branch: "دمشق", category: "c3", pilgrims: 118, age: 50 },
  { id: "seed-14", name: "هشام العطار", group: 36, seasons: 0, rating: 0, branch: "حمص", category: "c1", pilgrims: 28, age: 34 },
  { id: "seed-15", name: "أيمن السمان", group: 58, seasons: 2, rating: 3.8, branch: "حماة", category: "c1", pilgrims: 30, age: 45 },
  // تكتل البيان: its head's group, and another that accepted it
  { id: "seed-16", name: "سليم القدسي", group: 65, seasons: 4, rating: 4.5, branch: "دمشق", category: "c2", pilgrims: 63, age: 55 },
  { id: "seed-17", name: "رائد الحلاق", group: 66, seasons: 2, rating: 4.1, branch: "دمشق", category: "c1", pilgrims: 38, age: 43 },
  ...GEN_HEADS,
];

/**
 * The administrators who qualified for season 1448 in the roles a cluster head picks from: guides and
 * guides of every grade for the groups' guide seats, assistants for their assistant seats and for the cluster's own
 * assistants, coordinators, and female guides of every grade. A cluster head searches it within his branches and
 * invites one person at a time; that person accepts from his own account.
 */
export type Candidate = {
  id: string;
  name: string;
  /** His role this season (a key of the structure's roles) */
  roleKey: string;
  branch: string;
  area: string;
  /** This season's qualification score (written + oral, by the season's weights) */
  score: number;
  seasons: number;
  rating: number | null;
  skills: string[];
  age: number;
};

export const ROSTER: Candidate[] = [
  // معاونون
  { id: "01033300872", name: "ياسر عبد الله", roleKey: "group-deputy", branch: "دمشق", area: "المزة", score: 88, seasons: 1, rating: 4.1, skills: ["first-aid", "computer"], age: 40 },
  { id: "01033300941", name: "عماد الشامي", roleKey: "group-deputy", branch: "دمشق", area: "الميدان", score: 91, seasons: 2, rating: 4.5, skills: ["first-aid", "elderly"], age: 36 },
  { id: "01033300942", name: "بشار الحموي", roleKey: "group-deputy", branch: "دمشق", area: "ركن الدين", score: 79, seasons: 0, rating: null, skills: ["bus", "computer"], age: 29 },
  { id: "01033300943", name: "زياد العطار", roleKey: "group-deputy", branch: "درعا", area: "درعا المحطة", score: 84, seasons: 1, rating: 3.9, skills: ["first-aid"], age: 33 },
  { id: "01033300944", name: "مهند السيد", roleKey: "group-deputy", branch: "دمشق", area: "القنوات", score: 93, seasons: 3, rating: 4.7, skills: ["first-aid", "computer", "elderly"], age: 38 },
  { id: "01033300945", name: "تمّام الخطيب", roleKey: "group-deputy", branch: "حمص", area: "الإنشاءات", score: 82, seasons: 0, rating: null, skills: ["computer", "sign"], age: 27 },
  { id: "01033300946", name: "أنس الدقاق", roleKey: "group-deputy", branch: "دمشق", area: "باب توما", score: 86, seasons: 2, rating: 4.2, skills: ["elderly"], age: 34 },
  { id: "01033300947", name: "عمر الحايك", roleKey: "group-deputy", branch: "اللاذقية", area: "الصليبة", score: 85, seasons: 1, rating: 4.3, skills: ["first-aid", "bus"], age: 31 },
  { id: "01033300948", name: "فراس الأحمد", roleKey: "group-deputy", branch: "حماة", area: "الحاضر", score: 80, seasons: 1, rating: 4.0, skills: ["computer"], age: 35 },
  { id: "01033300993", name: "حازم الشوا", roleKey: "group-deputy", branch: "دمشق", area: "القصاع", score: 87, seasons: 1, rating: 4.3, skills: ["first-aid", "computer"], age: 32 },
  { id: "01033300994", name: "رامي النوري", roleKey: "group-deputy", branch: "دمشق", area: "الزاهرة", score: 83, seasons: 0, rating: null, skills: ["bus"], age: 28 },
  { id: "01033300995", name: "مؤيد الزين", roleKey: "group-deputy", branch: "دمشق", area: "كفرسوسة", score: 85, seasons: 2, rating: 4.1, skills: ["elderly"], age: 37 },
  { id: "01033300996", name: "وسيم الحكيم", roleKey: "group-deputy", branch: "دمشق", area: "المالكي", score: 89, seasons: 3, rating: 4.6, skills: ["first-aid", "elderly"], age: 41 },
  // معاونون بعدد
  { id: "01033300975", name: "عبد الكريم الشلاح", roleKey: "assistant-count", branch: "دمشق", area: "الشاغور", score: 83, seasons: 2, rating: 4.2, skills: ["elderly", "bus"], age: 44 },
  { id: "01033300976", name: "هاني الطويل", roleKey: "assistant-count", branch: "حماة", area: "باب قبلي", score: 81, seasons: 1, rating: 4.0, skills: ["first-aid"], age: 39 },
  // معاونون ومنسقون تقنيون
  { id: "01033300961", name: "لؤي العظمة", roleKey: "assistant-tech", branch: "دمشق", area: "أبو رمانة", score: 89, seasons: 2, rating: 4.4, skills: ["computer", "sign"], age: 33 },
  { id: "01033300971", name: "محمد خير الصواف", roleKey: "assistant-tech", branch: "دمشق", area: "المهاجرين", score: 90, seasons: 2, rating: 4.5, skills: ["computer", "first-aid"], age: 37 },
  { id: "01033300972", name: "حسان المارديني", roleKey: "assistant-tech", branch: "حمص", area: "الوعر", score: 87, seasons: 1, rating: 4.3, skills: ["computer"], age: 32 },
  { id: "01033300973", name: "قتيبة العمر", roleKey: "assistant-tech", branch: "حلب", area: "الفرقان", score: 84, seasons: 0, rating: null, skills: ["computer", "bus"], age: 28 },
  // المنسقون التقنيون
  { id: "01033300874", name: "سامر نبيل نجار", roleKey: "tech", branch: "دمشق", area: "المزة", score: 94, seasons: 1, rating: 4.8, skills: ["computer", "first-aid"], age: 31 },
  { id: "01033300887", name: "رامي الأتاسي", roleKey: "tech", branch: "حمص", area: "الوعر", score: 83, seasons: 0, rating: null, skills: ["computer"], age: 29 },
  { id: "01033300962", name: "كرم الدباس", roleKey: "tech", branch: "دمشق", area: "الشاغور", score: 78, seasons: 0, rating: null, skills: ["computer", "bus"], age: 26 },
  { id: "01033300963", name: "جودت النابلسي", roleKey: "tech", branch: "دمشق", area: "برزة", score: 96, seasons: 3, rating: 4.9, skills: ["computer", "elderly"], age: 42 },
  { id: "01033300964", name: "سيف الدين حلاق", roleKey: "tech", branch: "دمشق", area: "جرمانا", score: 80, seasons: 1, rating: 3.8, skills: ["computer"], age: 30 },
  // الموجّهون الدينيون من الدرجة «ب»
  { id: "01033300873", name: "الشيخ خالد الرفاعي", roleKey: "guide-m", branch: "دمشق", area: "المزة", score: 95, seasons: 2, rating: 4.9, skills: ["elderly", "computer"], age: 47 },
  { id: "01033300951", name: "الشيخ معتز البارودي", roleKey: "guide-m", branch: "دمشق", area: "الصالحية", score: 90, seasons: 3, rating: 4.6, skills: ["elderly"], age: 45 },
  { id: "01033300952", name: "الشيخ أيمن قصاب باشي", roleKey: "guide-m", branch: "دمشق", area: "الميدان", score: 87, seasons: 1, rating: 4.3, skills: ["sign", "elderly"], age: 39 },
  { id: "01033300888", name: "الشيخ عبد الغني الطباع", roleKey: "guide-m", branch: "دمشق", area: "القدم", score: 81, seasons: 0, rating: null, skills: ["computer"], age: 43 },
  { id: "01033300953", name: "الشيخ وائل الحافظ", roleKey: "guide-m", branch: "دمشق", area: "التل", score: 92, seasons: 4, rating: 4.8, skills: ["elderly", "first-aid"], age: 51 },
  { id: "01033300954", name: "الشيخ رياض الأتاسي", roleKey: "guide-m", branch: "حمص", area: "الوعر", score: 85, seasons: 1, rating: 4.0, skills: ["elderly"], age: 41 },
  { id: "01033300957", name: "الشيخ عمار الكردي", roleKey: "guide-m", branch: "دمشق", area: "ركن الدين", score: 88, seasons: 2, rating: 4.4, skills: ["computer"], age: 36 },
  { id: "01033300958", name: "الشيخ يوسف المحمد", roleKey: "guide-m", branch: "اللاذقية", area: "الرمل الشمالي", score: 84, seasons: 1, rating: 4.2, skills: ["elderly"], age: 34 },
  { id: "01033300959", name: "الشيخ حسن القادري", roleKey: "guide-m", branch: "حماة", area: "الحاضر", score: 86, seasons: 2, rating: 4.3, skills: ["sign"], age: 40 },
  { id: "01033300960", name: "الشيخ زهير الملا", roleKey: "guide-m", branch: "دمشق", area: "باب سريجة", score: 83, seasons: 1, rating: 4.1, skills: ["elderly"], age: 37 },
  { id: "01033300990", name: "الشيخ نادر السقا", roleKey: "guide-m", branch: "دمشق", area: "الشاغور", score: 89, seasons: 2, rating: 4.5, skills: ["elderly"], age: 42 },
  { id: "01033300991", name: "الشيخ هيثم المالكي", roleKey: "guide-m", branch: "دمشق", area: "المزة", score: 86, seasons: 1, rating: 4.2, skills: ["computer"], age: 35 },
  { id: "01033300992", name: "الشيخ سعيد الدرة", roleKey: "murshid", branch: "دمشق", area: "الميدان", score: 94, seasons: 4, rating: 4.8, skills: ["elderly", "sign"], age: 52 },
  // الموجّهون الدينيون من الدرجة «أ» (المرشدون)
  { id: "01033300965", name: "الشيخ مأمون الحلواني", roleKey: "murshid", branch: "دمشق", area: "المزرعة", score: 97, seasons: 5, rating: 4.9, skills: ["elderly", "computer"], age: 54 },
  { id: "01033300956", name: "الشيخ بلال العبسي", roleKey: "murshid", branch: "درعا", area: "طفس", score: 91, seasons: 3, rating: 4.6, skills: ["elderly"], age: 46 },
  // الموجّهون الدينيون من الدرجة «ج»: أول درجاتهم، بأعمارهم في متوسط التكتل
  { id: "01033300966", name: "الشيخ أسامة الجبان", roleKey: "guide-m-c", branch: "دمشق", area: "الصالحية", score: 78, seasons: 0, rating: null, skills: ["elderly"], age: 30 },
  { id: "01033300967", name: "الشيخ منذر الكيلاني", roleKey: "guide-m-c", branch: "حماة", area: "باب قبلي", score: 80, seasons: 1, rating: 3.9, skills: ["computer"], age: 33 },
  // الموجّهات الدينيات من الدرجة «ب»
  { id: "01033300981", name: "هالة الدقر", roleKey: "guide-f", branch: "دمشق", area: "الشعلان", score: 92, seasons: 2, rating: 4.7, skills: ["elderly"], age: 43 },
  { id: "01033300982", name: "سمر الخطيب", roleKey: "guide-f", branch: "حمص", area: "الغوطة", score: 88, seasons: 1, rating: 4.4, skills: ["computer"], age: 38 },
  { id: "01033300983", name: "ريم القدسي", roleKey: "guide-f", branch: "حلب", area: "الجميلية", score: 85, seasons: 0, rating: null, skills: ["elderly"], age: 33 },
  { id: "01033300984", name: "لينا العاني", roleKey: "guide-f", branch: "دمشق", area: "المالكي", score: 87, seasons: 1, rating: 4.2, skills: ["sign"], age: 36 },
  // الموجّهات الدينيات من الدرجة «أ» (المرشدات)
  { id: "01033300985", name: "نهى الطباع", roleKey: "murshida", branch: "دمشق", area: "الميدان", score: 95, seasons: 4, rating: 4.8, skills: ["elderly"], age: 49 },
  { id: "01033300986", name: "وفاء البزرة", roleKey: "murshida", branch: "حمص", area: "الخالدية", score: 90, seasons: 2, rating: 4.5, skills: ["elderly", "first-aid"], age: 44 },
  // الموجّهات الدينيات من الدرجة «ج»
  { id: "01033300987", name: "رنا الشهابي", roleKey: "guide-f-c", branch: "دمشق", area: "المزة", score: 82, seasons: 0, rating: null, skills: ["elderly"], age: 31 },
  { id: "01033300988", name: "دعاء الملوحي", roleKey: "guide-f-c", branch: "حمص", area: "الإنشاءات", score: 79, seasons: 1, rating: 4.0, skills: ["sign"], age: 35 },
  // The season's generated people: the cadre of its other clusters, and those still free in every branch
  ...GEN_ROSTER,
];

const granted = (role: string, reason: string, label?: string): SeasonalRole => ({ role, reason, label, by: "مازن الحلبي", at: Date.UTC(2026, 9, 28, 9) });

/** The demo accounts in the season's story: a group head's category, branches, seasonal role */
const DEMO_PEOPLE: Record<string, { category?: string; branch: string; extra?: string[]; seasonal?: SeasonalRole; age?: number }> = {
  "01033300881": { category: "c3", branch: "دمشق", extra: ["حماة", "اللاذقية"], seasonal: granted("cluster-head", "رئيس مجموعة الخبير ثلاثة مواسم متتالية بتقييم 4.6 – 4.8: اختارته الإدارة رئيس تكتل، ويبقى رئيس مجموعته") },
  "01033300882": { category: "c3", branch: "دمشق", seasonal: granted("cluster-head", "للزيادة العددية: تكتل إضافي لحجاج مكتب دمشق") },
  "01033300883": { category: "c2", branch: "دمشق" },
  "01033300884": { category: "c1", branch: "دمشق" },
  // Today's group heads: a first-timer (his category comes with his group's approval), last season's head, a head of four seasons
  "01033300898": { branch: "دمشق" },
  "01033300899": { category: "c2", branch: "دمشق" },
  "01033300880": { category: "c3", branch: "دمشق", seasonal: granted("cluster-head", "رئيس مجموعة الصفا أربعة مواسم متتالية بتقييم 4.5 – 4.8: تكتل جديد لحجاج دمشق") },
  "01033300871": { category: "c2", branch: "دمشق" },
  "01033300885": { category: "c1", branch: "حلب" },
  "01033300886": { branch: "دمشق" },
  "01033300891": { category: "c2", branch: "دمشق" },
  "seed-16": { category: "c2", branch: "دمشق", age: 55, seasonal: granted("cluster-head", "رئيس مجموعة البشرى أربعة مواسم بتقييم 4.5: تكتل جديد لحجاج دمشق") },
  // The staff's own records of the same heads (lib/data/staff-seed), under the ids they were filed with
  "01033300955": { category: "c2", branch: "دمشق" },
  "02041700533": { category: "c1", branch: "دمشق" },
  "05022400319": { category: "c1", branch: "دمشق" },
};

/** Everyone's seed, by national id (or seed id); `primary`: a base role the administration set, over the one applied for */
export const PEOPLE: Record<string, { category?: string; branch?: string; extra?: string[]; seasonal?: SeasonalRole; age?: number; primary?: string }> = {
  ...Object.fromEntries(ROSTER.map((c) => [c.id, { branch: c.branch, age: c.age }])),
  ...Object.fromEntries(HEADS_POOL.map((h) => [h.id, { category: h.category, branch: h.branch, age: h.age }])),
  // The generated people whole: their seasonal roles and extra branches too
  ...GEN_PEOPLE,
  ...DEMO_PEOPLE,
  // The heads of the season's other requests
  // Cluster heads by base role, as on the administration's platform: they lead a cluster every season
  "seed-01": { category: "c3", branch: "دمشق", extra: ["حلب", "دير الزور"], age: 57, primary: "cluster-head" },
  "seed-04": { category: "c2", branch: "حمص", extra: ["درعا", "دمشق"], age: 53, primary: "cluster-head" },
};
