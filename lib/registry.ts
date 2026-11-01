/**
 * Simulated Civil Registry (الشؤون المدنية).
 * Everything here is fictional. Every person the demo knows — pilgrims, administrators, applicants — is one record in
 * testdata/people/citizens.json, read here and nowhere else: every page takes a person's name and phone from here by
 * national number (`personName`, `phoneOf`). Any other 11-digit national number gets a stable generated citizen.
 */
import CITIZENS from "@/testdata/people/citizens.json";
import BOOKS from "@/testdata/people/family-books.json";
import SCENARIOS from "@/testdata/people/demo-scenarios.json";
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
  /** «الشيخ» before the name, where the person is known by it */
  title?: string;
  /** His mobile number, 10 digits */
  phone?: string;
  /** The last three digits of his phone: what a code «sent to his phone» shows */
  phoneTail: string;
  generated?: boolean;
};

const P = (p: Omit<Person, "religion" | "nationality"> & Partial<Pick<Person, "religion" | "nationality">>): Person => ({
  religion: "مسلم",
  nationality: "سورية",
  ...p,
});

/** The demo's citizens (testdata/people/citizens.json): the only place a person's name and phone are written */
const PEOPLE: Person[] = (CITIZENS as Omit<Person, "phoneTail">[]).map((p) => ({ ...p, phoneTail: p.phone?.slice(-3) ?? p.id.slice(-3) }));

const BY_ID = new Map(PEOPLE.map((p) => [p.id, p]));

export const FAMILY_BOOKS: Record<string, { no: string; headId: string; governorate: string; registry: string; issued: string }> = Object.fromEntries(BOOKS.map((b) => [b.no, b]));

export type DemoScenario = {
  id: string;
  book: string;
  title: string;
  note: string;
  /** Opens the account with an application already in place (lib/demo-scenarios) */
  seed?: "notAccepted" | "accepted" | "lotteryAccepted" | "complete" | "notDrawn";
  /** One of the cases of the sign-in page (its order), else a case of the registration form itself */
  outcome?: number;
  /** No application yet, but every condition met for this registration: signing in opens its window and the form */
  fresh?: "direct" | "lottery";
};

/** Scenario shortcuts shown in the "demo data" helper — one per case the platform handles */

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

/** A name as people write it: no diacritics or tatweel, one alef, ya and ha, spaces ignored («عبدالله» = «عبد الله») */
const nameKey = (s: string) =>
  s
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, "");

/**
 * Proof that whoever typed a national number holds it: the first name on its civil record. Asked wherever a
 * national number is tied to an account or an application, before any of its data is shown. The civil
 * registry answers only «matches» or «does not match», never the name itself.
 */
export function firstNameMatches(id: string, firstName: string) {
  const p = getPerson(id);
  return !!p && !!nameKey(firstName) && nameKey(p.firstName) === nameKey(firstName);
}

/** Wrong first names allowed before the form stops (the real platform counts them per number, on its server) */
export const FIRST_NAME_TRIES = 5;

export function fullName(p: Person) {
  return `${p.firstName} ${p.fatherName} ${p.lastName}`;
}

/**
 * A person's name by national number, as the pages show it: `short` «الشيخ خالد الرفاعي» (title, first and last),
 * `full` «أحمد سليمان الحمصي» (first, father and last, with the title). Every page takes names from here.
 */
export function personName(id: string, form: "short" | "full" = "short") {
  const p = getPerson(id);
  if (!p) return id;
  const name = form === "full" ? fullName(p) : `${p.firstName} ${p.lastName}`;
  return p.title ? `${p.title} ${name}` : name;
}

/** A person's mobile by national number, as written («0944274449»), or spaced for reading («0944 274 449») */
export function phoneOf(id: string, spaced = false) {
  const phone = getPerson(id)?.phone ?? "";
  return spaced && phone.length === 10 ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
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

/** A person as a family book lists him: `movedTo` = the book he moved to when he married, still recorded in this one */
export type BookMember = Person & { movedTo?: string };

export async function lookupFamilyBook(no: string) {
  await sleep(1800);
  return familyBook(no);
}

/**
 * A family book as the civil registry holds it: whoever is listed in it, and the children who left it for
 * a book of their own when they married — they stay recorded in their parents' book, with the book they
 * moved to. So a widow's book lists her married son, who can travel as her companion. Any book of a
 * person on record opens, not only the ones described in FAMILY_BOOKS.
 */
export function familyBook(no: string) {
  const listed = PEOPLE.filter((p) => p.familyBookNo === no);
  const known = FAMILY_BOOKS[no];
  if (!known && !listed.length) return null;
  const moved: BookMember[] = PEOPLE.filter((p) => p.familyBookNo !== no && listed.some((m) => p.fatherId === m.id || p.motherId === m.id)).map((p) => ({ ...p, movedTo: p.familyBookNo }));
  const head = known ? BY_ID.get(known.headId)! : (listed.find((p) => p.gender === "M" && p.spouseIds?.length) ?? [...listed].sort((a, b) => a.birthDate.localeCompare(b.birthDate))[0]);
  const book = known ?? { no, headId: head.id, governorate: head.governorate, registry: head.registry, issued: "" };
  return { ...book, head, members: [...listed, ...moved] as BookMember[] };
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

/** «مازن الخياط — يقدّم طلبه على القبول المباشر»: the name from the citizen, the headline from testdata/people/demo-scenarios.json */
export const DEMO_SCENARIOS: DemoScenario[] = (SCENARIOS as (Omit<DemoScenario, "title"> & { headline: string })[]).map(({ headline, ...d }) => ({ ...d, title: `${personName(d.id)} — ${headline}` }));
