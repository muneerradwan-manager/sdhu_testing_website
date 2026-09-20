/**
 * Simulated Civil Registry (الشؤون المدنية).
 * Everything here is fictional. A few hand-written families cover the scenarios in the
 * operating document; any other 11-digit national number gets a stable generated citizen.
 */
import { SEASON } from "./season";
import { seeded, sleep } from "./utils";

export type Gender = "M" | "F";

export type Person = {
  id: string;
  firstName: string;
  fatherName: string;
  motherName: string;
  lastName: string;
  gender: Gender;
  birthDate: string; // YYYY-MM-DD
  birthPlace: string;
  governorate: string;
  registry: string; // مكان القيد
  maritalStatus: string;
  religion: string;
  nationality: string;
  familyBookNo: string;
  fatherId?: string;
  motherId?: string;
  spouseIds?: string[];
  /** From the platform's own season history */
  hajjBefore?: number;
  /** Already listed in another application this season */
  otherApplication?: string;
  phoneTail: string;
  generated?: boolean;
};

const P = (p: Omit<Person, "religion" | "nationality"> & Partial<Pick<Person, "religion" | "nationality">>): Person => ({
  religion: "مسلم",
  nationality: "سورية",
  ...p,
});

const PEOPLE: Person[] = [
  // ── عائلة الخطيب — دمشق، المزة (بطل المثال) ──
  P({ id: "01012345412", firstName: "محمد", fatherName: "أحمد", motherName: "خديجة", lastName: "الخطيب", gender: "M", birthDate: "1968-04-12", birthPlace: "دمشق", governorate: "دمشق", registry: "المزة 1122", maritalStatus: "متزوج", familyBookNo: "45112233", motherId: "01012340078", spouseIds: ["01012345413"], phoneTail: "412" }),
  P({ id: "01012345413", firstName: "فاطمة", fatherName: "يوسف", motherName: "سعاد", lastName: "الحلبي", gender: "F", birthDate: "1972-03-14", birthPlace: "دمشق", governorate: "دمشق", registry: "المزة 1122", maritalStatus: "متزوجة", familyBookNo: "45112233", spouseIds: ["01012345412"], phoneTail: "731" }),
  P({ id: "01012345414", firstName: "عمر", fatherName: "محمد", motherName: "فاطمة", lastName: "الخطيب", gender: "M", birthDate: "1999-06-02", birthPlace: "دمشق", governorate: "دمشق", registry: "المزة 1122", maritalStatus: "عازب", familyBookNo: "45112233", fatherId: "01012345412", motherId: "01012345413", phoneTail: "905" }),
  P({ id: "01012345415", firstName: "هبة", fatherName: "محمد", motherName: "فاطمة", lastName: "الخطيب", gender: "F", birthDate: "2004-11-20", birthPlace: "دمشق", governorate: "دمشق", registry: "المزة 1122", maritalStatus: "عزباء", familyBookNo: "45112233", fatherId: "01012345412", motherId: "01012345413", phoneTail: "118" }),
  P({ id: "01012345416", firstName: "يوسف", fatherName: "محمد", motherName: "فاطمة", lastName: "الخطيب", gender: "M", birthDate: "2011-01-09", birthPlace: "دمشق", governorate: "دمشق", registry: "المزة 1122", maritalStatus: "عازب", familyBookNo: "45112233", fatherId: "01012345412", motherId: "01012345413", phoneTail: "240" }),
  P({ id: "01012340078", firstName: "خديجة", fatherName: "سعيد", motherName: "آمنة", lastName: "الخطيب", gender: "F", birthDate: "1948-02-11", birthPlace: "دمشق", governorate: "دمشق", registry: "المزة 0470", maritalStatus: "أرملة", familyBookNo: "44001188", phoneTail: "078" }),
  P({ id: "01012349901", firstName: "عبد الله", fatherName: "يوسف", motherName: "سعاد", lastName: "الحلبي", gender: "M", birthDate: "1965-08-30", birthPlace: "دمشق", governorate: "دمشق", registry: "الميدان 3310", maritalStatus: "متزوج", familyBookNo: "40993310", hajjBefore: 1440, phoneTail: "901" }),

  // ── عائلة القاسم — حمص (حاج سابق يرافق والدته) ──
  P({ id: "06055500711", firstName: "حسان", fatherName: "عادل", motherName: "نجاح", lastName: "القاسم", gender: "M", birthDate: "1975-05-19", birthPlace: "حمص", governorate: "حمص", registry: "الوعر 0711", maritalStatus: "متزوج", familyBookNo: "77001234", motherId: "06055500701", spouseIds: ["06055500712"], hajjBefore: 1445, phoneTail: "711" }),
  P({ id: "06055500712", firstName: "رنا", fatherName: "محمود", motherName: "هدى", lastName: "السيد", gender: "F", birthDate: "1983-09-02", birthPlace: "حمص", governorate: "حمص", registry: "الوعر 0711", maritalStatus: "متزوجة", familyBookNo: "77001234", spouseIds: ["06055500711"], phoneTail: "712" }),
  P({ id: "06055500713", firstName: "ليان", fatherName: "حسان", motherName: "رنا", lastName: "القاسم", gender: "F", birthDate: "2008-02-27", birthPlace: "حمص", governorate: "حمص", registry: "الوعر 0711", maritalStatus: "عزباء", familyBookNo: "77001234", fatherId: "06055500711", motherId: "06055500712", phoneTail: "713" }),
  P({ id: "06055500701", firstName: "نجاح", fatherName: "أحمد", motherName: "زينب", lastName: "الزين", gender: "F", birthDate: "1950-12-01", birthPlace: "حمص", governorate: "حمص", registry: "باب السباع 0411", maritalStatus: "أرملة", familyBookNo: "76000411", phoneTail: "701" }),

  // ── عائلة النجار — حلب (امرأة دون 44 تحتاج محرماً) ──
  P({ id: "02033300550", firstName: "سامر", fatherName: "فؤاد", motherName: "لمياء", lastName: "النجار", gender: "M", birthDate: "1958-07-07", birthPlace: "حلب", governorate: "حلب", registry: "الجميلية 0550", maritalStatus: "متزوج", familyBookNo: "33300550", spouseIds: ["02033300551"], phoneTail: "550" }),
  P({ id: "02033300551", firstName: "منى", fatherName: "عبد الرحمن", motherName: "سلمى", lastName: "الشامي", gender: "F", birthDate: "1962-01-15", birthPlace: "حلب", governorate: "حلب", registry: "الجميلية 0550", maritalStatus: "متزوجة", familyBookNo: "33300550", spouseIds: ["02033300550"], phoneTail: "551" }),
  P({ id: "02033300552", firstName: "ريم", fatherName: "سامر", motherName: "منى", lastName: "النجار", gender: "F", birthDate: "1990-10-10", birthPlace: "حلب", governorate: "حلب", registry: "الجميلية 0550", maritalStatus: "عزباء", familyBookNo: "33300550", fatherId: "02033300550", motherId: "02033300551", phoneTail: "552" }),
  P({ id: "02033300553", firstName: "مازن", fatherName: "سامر", motherName: "منى", lastName: "النجار", gender: "M", birthDate: "1994-04-04", birthPlace: "حلب", governorate: "حلب", registry: "الجميلية 0550", maritalStatus: "عازب", familyBookNo: "33300550", fatherId: "02033300550", motherId: "02033300551", phoneTail: "553" }),

  // ── الإداريون (الجزء الثاني) — أحمد رئيس المجموعة 27 ──
  P({ id: "01033300871", firstName: "أحمد", fatherName: "سليمان", motherName: "رجاء", lastName: "الحمصي", gender: "M", birthDate: "1990-02-14", birthPlace: "دمشق", governorate: "دمشق", registry: "كفرسوسة 0871", maritalStatus: "متزوج", familyBookNo: "56000871", phoneTail: "871" }),
  P({ id: "01033300872", firstName: "ياسر", fatherName: "عبد الله", motherName: "هدى", lastName: "العبد الله", gender: "M", birthDate: "1986-09-03", birthPlace: "دمشق", governorate: "دمشق", registry: "المزة 0872", maritalStatus: "متزوج", familyBookNo: "56000872", phoneTail: "872" }),

  // ── سامر نجار — المنسق التقني للمجموعة 27 ──
  P({ id: "01033300874", firstName: "سامر", fatherName: "نبيل", motherName: "وداد", lastName: "نجار", gender: "M", birthDate: "1995-11-08", birthPlace: "دمشق", governorate: "دمشق", registry: "المزة 0874", maritalStatus: "عازب", familyBookNo: "56000874", phoneTail: "874" }),

  // ── ياسين، جار محمد — مسجّل في طلب آخر هذا الموسم ──
  P({ id: "01011100208", firstName: "ياسين", fatherName: "خليل", motherName: "مريم", lastName: "العمر", gender: "M", birthDate: "1970-03-21", birthPlace: "دمشق", governorate: "دمشق", registry: "المزة 3981", maritalStatus: "متزوج", familyBookNo: "12003981", otherApplication: "3981", phoneTail: "208" }),
];

const BY_ID = new Map(PEOPLE.map((p) => [p.id, p]));

export const FAMILY_BOOKS: Record<string, { no: string; headId: string; governorate: string; registry: string; issued: string }> = {
  "45112233": { no: "45112233", headId: "01012345412", governorate: "دمشق", registry: "المزة 1122", issued: "1994-06-18" },
  "77001234": { no: "77001234", headId: "06055500711", governorate: "حمص", registry: "الوعر 0711", issued: "2005-02-03" },
  "33300550": { no: "33300550", headId: "02033300550", governorate: "حلب", registry: "الجميلية 0550", issued: "1987-09-12" },
  "44001188": { no: "44001188", headId: "01012340078", governorate: "دمشق", registry: "المزة 0470", issued: "1966-01-20" },
};

/** Scenario shortcuts shown in the "demo data" helper */
export const DEMO_SCENARIOS = [
  { id: "01012345412", book: "45112233", title: "محمد الخطيب — المثال الكامل", note: "رب أسرة (58) — زوجته، ابنه عمر، ووالدته خديجة (78) من خارج الدفتر" },
  { id: "06055500711", book: "77001234", title: "حسان القاسم — حجّ سابقاً", note: "يُقبل فقط لأنه محرم لوالدته نجاح (76) أو زوجته" },
  { id: "02033300552", book: "33300550", title: "ريم النجار — دون 44 عاماً", note: "تحتاج محرماً: أضف أخاها مازن أو والدها سامر" },
  { id: "01011100208", book: "", title: "ياسين العمر — طلب مكرر", note: "مسجّل في طلب آخر هذا الموسم (طلب واحد لكل شخص)" },
] as const;

const MALE_NAMES = ["خالد", "بلال", "أنس", "طارق", "مصطفى", "إبراهيم", "علي", "نزار", "وائل", "هشام", "سليم", "زياد"];
const FEMALE_NAMES = ["سلمى", "رغد", "آلاء", "نور", "ميساء", "لبنى", "دعاء", "رهف", "سمر", "إيمان", "هالة", "بشرى"];
const FATHERS = ["عبد الكريم", "محمود", "حسن", "عبد الرزاق", "جميل", "ماجد", "فايز", "نبيل"];
const MOTHERS = ["فاطمة", "عائشة", "سعاد", "ليلى", "وداد", "نهى", "رجاء", "صباح"];
const LASTS = ["الأحمد", "الحموي", "الدمشقي", "السعدي", "العلي", "الحسين", "الشيخ", "الإدلبي", "الحوراني", "المصري"];
const PLACES = [
  ["دمشق", "دمشق"], ["حلب", "حلب"], ["حمص", "حمص"], ["حماة", "حماة"], ["اللاذقية", "اللاذقية"], ["درعا", "درعا"], ["دوما", "ريف دمشق"],
] as const;

function generate(id: string): Person {
  const rnd = seeded(id);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];
  const gender: Gender = Number(id.at(-1)) % 2 === 1 ? "M" : "F";
  const year = 1945 + Math.floor(rnd() * 62); // 1945 – 2006
  const month = 1 + Math.floor(rnd() * 12);
  const day = 1 + Math.floor(rnd() * 28);
  const [place, gov] = pick(PLACES);
  return P({
    id,
    firstName: gender === "M" ? pick(MALE_NAMES) : pick(FEMALE_NAMES),
    fatherName: pick(FATHERS),
    motherName: pick(MOTHERS),
    lastName: pick(LASTS),
    gender,
    birthDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    birthPlace: place,
    governorate: gov,
    registry: `${place} ${id.slice(-4)}`,
    maritalStatus: year > 2000 ? (gender === "M" ? "عازب" : "عزباء") : gender === "M" ? "متزوج" : "متزوجة",
    familyBookNo: id.slice(2, 10),
    phoneTail: id.slice(-3),
    generated: true,
  });
}

export function isValidNationalId(id: string) {
  return /^\d{11}$/.test(id);
}

export function getPerson(id: string): Person | null {
  if (!isValidNationalId(id)) return null;
  return BY_ID.get(id) ?? generate(id);
}

export function fullName(p: Person) {
  return `${p.firstName} ${p.fatherName} ${p.lastName}`;
}

export function birthYear(p: Person) {
  return Number(p.birthDate.slice(0, 4));
}

export function ageOf(p: Person) {
  return SEASON.referenceYear - birthYear(p);
}

/** Simulated network lookups — the delay is part of the experience */
export async function lookupPerson(id: string) {
  await sleep(1400);
  return getPerson(id);
}

export async function lookupFamilyBook(no: string) {
  await sleep(1800);
  const book = FAMILY_BOOKS[no];
  if (!book) return null;
  const members = PEOPLE.filter((p) => p.familyBookNo === no);
  return { ...book, head: BY_ID.get(book.headId)!, members };
}

// ───────────────────────── Kinship ─────────────────────────

export type Relation = "self" | "spouse" | "parent" | "child" | "sibling" | "grandparent" | "grandchild" | "other";

/** Returns what `b` is to `a`, derived from registry links only (null when records can't tell) */
export function registryRelation(a: Person, b: Person): Relation | null {
  if (a.id === b.id) return "self";
  if (a.spouseIds?.includes(b.id) || b.spouseIds?.includes(a.id)) return "spouse";
  if (a.fatherId === b.id || a.motherId === b.id) return "parent";
  if (b.fatherId === a.id || b.motherId === a.id) return "child";
  if ((a.fatherId && a.fatherId === b.fatherId) || (a.motherId && a.motherId === b.motherId)) return "sibling";
  const aParents = [a.fatherId, a.motherId].filter(Boolean).map((id) => BY_ID.get(id!)).filter(Boolean) as Person[];
  if (aParents.some((pp) => pp.fatherId === b.id || pp.motherId === b.id)) return "grandparent";
  const bParents = [b.fatherId, b.motherId].filter(Boolean).map((id) => BY_ID.get(id!)).filter(Boolean) as Person[];
  if (bParents.some((pp) => pp.fatherId === a.id || pp.motherId === a.id)) return "grandchild";
  // Children of a spouse listed in the same booklet
  if (b.fatherId && a.spouseIds?.includes(b.fatherId)) return "child";
  if (b.motherId && a.spouseIds?.includes(b.motherId)) return "child";
  if (a.fatherId && b.spouseIds?.includes(a.fatherId)) return "parent";
  if (a.motherId && b.spouseIds?.includes(a.motherId)) return "parent";
  return null;
}

export function relationLabel(rel: Relation, gender: Gender) {
  const f = gender === "F";
  switch (rel) {
    case "self": return "صاحب الطلب";
    case "spouse": return f ? "زوجة" : "زوج";
    case "parent": return f ? "أم" : "أب";
    case "child": return f ? "ابنة" : "ابن";
    case "sibling": return f ? "أخت" : "أخ";
    case "grandparent": return f ? "جدة" : "جد";
    case "grandchild": return f ? "حفيدة" : "حفيد";
    default: return "قريب / مرافق";
  }
}

export const RELATION_OPTIONS: { value: Relation; label: string; emoji: string }[] = [
  { value: "spouse", label: "زوج / زوجة", emoji: "💍" },
  { value: "parent", label: "أب / أم", emoji: "🧓" },
  { value: "child", label: "ابن / ابنة", emoji: "🧒" },
  { value: "sibling", label: "أخ / أخت", emoji: "🤝" },
  { value: "grandparent", label: "جد / جدة", emoji: "👴" },
  { value: "grandchild", label: "حفيد / حفيدة", emoji: "👶" },
  { value: "other", label: "قريب آخر أو صديق", emoji: "👥" },
];
