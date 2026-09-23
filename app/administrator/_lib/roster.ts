import { SKILLS } from "./admin";

/**
 * The administrators who qualified for season 1448 and are still free to join a group. A group head
 * does not receive a ready-made team: he searches this roster himself and invites ONE person for each
 * role, and that person accepts from his own application. Whoever a group already took is shown with
 * the group that took him, so nobody is invited twice.
 */
export type Candidate = {
  id: string;
  name: string;
  roleKey: "group-deputy" | "guide-m" | "tech";
  office: string;
  area: string;
  /** This season's qualification score (written 60% + oral 40%) */
  score: number;
  /** Seasons already served */
  seasons: number;
  /** Last season's rating, if he served before */
  rating: number | null;
  skills: string[];
  /** The group that already took him, if any */
  taken?: number;
};

/** The roles a group head fills before his group can be approved */
export const TEAM_ROLES = [
  { key: "group-deputy", label: "معاون رئيس المجموعة", note: "الحضور والتجمّع وتوزيع الوجبات الخاصة" },
  { key: "guide-m", label: "الموجّه الديني", note: "الدروس والمناسك والأسئلة الشرعية" },
  { key: "tech", label: "المنسق التقني", note: "التطبيق والبطاقة الرقمية والملفات الصحية" },
] as const;

export const ROSTER: Candidate[] = [
  // معاونو رؤساء المجموعات
  { id: "01033300872", name: "ياسر عبد الله", roleKey: "group-deputy", office: "مكتب دمشق", area: "المزة", score: 88, seasons: 1, rating: 4.1, skills: ["first-aid", "computer"] },
  { id: "01033300941", name: "عماد الشامي", roleKey: "group-deputy", office: "مكتب دمشق", area: "الميدان", score: 91, seasons: 2, rating: 4.5, skills: ["first-aid", "elderly"] },
  { id: "01033300942", name: "بشار الحموي", roleKey: "group-deputy", office: "مكتب دمشق", area: "ركن الدين", score: 79, seasons: 0, rating: null, skills: ["bus", "computer"] },
  { id: "01033300943", name: "زياد العطار", roleKey: "group-deputy", office: "مكتب ريف دمشق", area: "دوما", score: 84, seasons: 1, rating: 3.9, skills: ["first-aid"] },
  { id: "01033300944", name: "مهند السيد", roleKey: "group-deputy", office: "مكتب دمشق", area: "القنوات", score: 93, seasons: 3, rating: 4.7, skills: ["first-aid", "computer", "elderly"], taken: 44 },
  { id: "01033300945", name: "تمّام الخطيب", roleKey: "group-deputy", office: "مكتب دمشق", area: "المهاجرين", score: 82, seasons: 0, rating: null, skills: ["computer", "sign"] },
  { id: "01033300946", name: "أنس الدقاق", roleKey: "group-deputy", office: "مكتب دمشق", area: "باب توما", score: 86, seasons: 2, rating: 4.2, skills: ["elderly"] },
  // الموجّهون الدينيون
  { id: "01033300873", name: "الشيخ خالد الرفاعي", roleKey: "guide-m", office: "مكتب دمشق", area: "المزة", score: 95, seasons: 2, rating: 4.9, skills: ["elderly", "computer"] },
  { id: "01033300951", name: "الشيخ معتز البارودي", roleKey: "guide-m", office: "مكتب دمشق", area: "الصالحية", score: 90, seasons: 3, rating: 4.6, skills: ["elderly"] },
  { id: "01033300952", name: "الشيخ أيمن قصاب باشي", roleKey: "guide-m", office: "مكتب دمشق", area: "الميدان", score: 87, seasons: 1, rating: 4.3, skills: ["sign", "elderly"] },
  { id: "01033300888", name: "الشيخ عبد الغني الطباع", roleKey: "guide-m", office: "مكتب دمشق", area: "القدم", score: 81, seasons: 0, rating: null, skills: ["computer"] },
  { id: "01033300953", name: "الشيخ وائل الحافظ", roleKey: "guide-m", office: "مكتب ريف دمشق", area: "التل", score: 92, seasons: 4, rating: 4.8, skills: ["elderly", "first-aid"], taken: 12 },
  { id: "01033300954", name: "الشيخ رياض الأتاسي", roleKey: "guide-m", office: "مكتب حمص", area: "الوعر", score: 85, seasons: 1, rating: 4.0, skills: ["elderly"] },
  // المنسقون التقنيون
  { id: "01033300874", name: "سامر نبيل نجار", roleKey: "tech", office: "مكتب دمشق", area: "المزة", score: 94, seasons: 1, rating: 4.8, skills: ["computer", "first-aid"] },
  { id: "01033300887", name: "رامي الأتاسي", roleKey: "tech", office: "مكتب حمص", area: "الوعر", score: 83, seasons: 0, rating: null, skills: ["computer"] },
  { id: "01033300961", name: "لؤي العظمة", roleKey: "tech", office: "مكتب دمشق", area: "أبو رمانة", score: 89, seasons: 2, rating: 4.4, skills: ["computer", "sign"] },
  { id: "01033300962", name: "كرم الدباس", roleKey: "tech", office: "مكتب دمشق", area: "الشاغور", score: 78, seasons: 0, rating: null, skills: ["computer", "bus"] },
  { id: "01033300963", name: "جودت النابلسي", roleKey: "tech", office: "مكتب دمشق", area: "برزة", score: 96, seasons: 3, rating: 4.9, skills: ["computer", "elderly"], taken: 9 },
  { id: "01033300964", name: "سيف الدين حلاق", roleKey: "tech", office: "مكتب ريف دمشق", area: "جرمانا", score: 80, seasons: 1, rating: 3.8, skills: ["computer"] },
];

export function skillLabel(key: string) {
  return SKILLS.find((s) => s.key === key)?.label ?? key;
}

/** Search the qualified roster for one role: by name, by area or office, or by the tail of the national id */
export function searchRoster(roleKey: string, query: string, freeOnly: boolean) {
  const q = query.trim();
  return ROSTER.filter((c) => c.roleKey === roleKey)
    .filter((c) => (freeOnly ? !c.taken : true))
    .filter((c) => !q || c.name.includes(q) || c.area.includes(q) || c.office.includes(q) || c.id.endsWith(q) || c.skills.some((s) => skillLabel(s).includes(q)))
    .sort((a, b) => Number(!!a.taken) - Number(!!b.taken) || b.score - a.score);
}
