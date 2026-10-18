/**
 * Demo data for creating an account: for each situation of a pilgrim, and for each role an administrator applies
 * for, a citizen of the simulated civil registry who fits it — gender and year of birth — and has no account yet
 * on this device. Pressing its card fills the form (national ID, first name, phone, password); the rest of the way
 * (the code, the civil registry) is the platform's own. The people are found, not written: each card searches its
 * own run of national numbers for the first fitting citizen, so they stay the same on every device.
 */
import { getPerson, type Gender, type Person } from "./registry";

export type SignupDemo = { key: string; title: string; note: string; person: Person; phone: string; password: string; section?: string };

type Want = { key: string; title: string; note: string; gender: Gender; born: [number, number]; section?: string };

/** The first fitting, generated citizen in `prefix`'s run of numbers (prefix: 7 digits) that is not taken */
function find(prefix: string, w: Want, taken: (id: string) => boolean): Person | null {
  for (let k = 0; k < 10_000; k++) {
    const id = `${prefix}${String(k).padStart(4, "0")}`;
    const p = getPerson(id);
    if (!p?.generated || p.gender !== w.gender || taken(id)) continue;
    const y = Number(p.birthDate.slice(0, 4));
    if (y >= w.born[0] && y <= w.born[1]) return p;
  }
  return null;
}

const phoneOf = (id: string) => `0944${id.slice(-6)}`;

const PILGRIMS: Want[] = [
  { key: "direct-m", title: "قبول مباشر — رجل", note: "من مواليد 1958: ضمن القبول المباشر لكبار السن، ولا يحتاج مرافقاً.", gender: "M", born: [1958, 1958] },
  { key: "direct-f", title: "قبول مباشر — امرأة", note: "ضمن القبول المباشر، ولا تحتاج محرماً، لكنها تحتاج مرافقاً لأنها من مواليد 1957 فما قبل.", gender: "F", born: [1946, 1956] },
  { key: "lottery-m", title: "القرعة — رجل", note: "دون عمر القبول المباشر: يسجّل على القرعة في مواعيدها.", gender: "M", born: [1968, 1985] },
  { key: "woman-44", title: "امرأة 44 عاماً فأكثر", note: "تقدّم طلبها وحدها دون محرم.", gender: "F", born: [1962, 1980] },
  { key: "woman-young", title: "امرأة دون 44 عاماً", note: "تحتاج محرماً في طلبها: زوجها أو أخاها أو أباها.", gender: "F", born: [1984, 1995] },
];

/** Every role open for application (the cluster's head, deputy and accountant are places a cluster gives, not roles applied for) */
const ADMINS: Want[] = [
  { key: "group-head", section: "رئاسة المجموعة", title: "رئيس مجموعة", note: "من 30 إلى 60 عاماً: يشكّل مجموعته ويقودها.", gender: "M", born: [1972, 1990] },
  { key: "group-deputy", section: "المعاونون", title: "معاون", note: "من 25 إلى 60 عاماً: مقعد المعاون في مجموعة، أو معاون التكتل.", gender: "M", born: [1975, 1995] },
  { key: "assistant-count", section: "المعاونون", title: "معاون بعدد", note: "معاون في التكتل يضيف 20 حاجاً إلى عدد حجاجه.", gender: "M", born: [1975, 1995] },
  { key: "tech", section: "المنسقون التقنيون", title: "منسق تقني", note: "من 22 إلى 55 عاماً: بيانات الحجاج وأوراقهم في التكتل.", gender: "M", born: [1980, 1998] },
  { key: "assistant-tech", section: "المنسقون التقنيون", title: "معاون ومنسق تقني", note: "يجمع الصفتين، ويمتحن امتحانَي المعاون والمنسق التقني.", gender: "M", born: [1980, 1996] },
  { key: "murshid", section: "الموجّهون الدينيون", title: "موجّه ديني أ", note: "أعلى درجات الموجّهين: مقعد الموجّه في مجموعة.", gender: "M", born: [1965, 1985] },
  { key: "guide-m", section: "الموجّهون الدينيون", title: "موجّه ديني ب", note: "من 25 إلى 65 عاماً: الدروس والمناسك في مجموعته.", gender: "M", born: [1965, 1990] },
  { key: "guide-m-c", section: "الموجّهون الدينيون", title: "موجّه ديني ج", note: "أولى درجات الموجّهين.", gender: "M", born: [1975, 1995] },
  { key: "murshida", section: "الموجّهات الدينيات", title: "موجّهة دينية أ", note: "أعلى درجات الموجّهات: من موجّهات التكتل.", gender: "F", born: [1965, 1985] },
  { key: "guide-f", section: "الموجّهات الدينيات", title: "موجّهة دينية ب", note: "من 25 إلى 65 عاماً: التوجيه الديني لحاجّات التكتل.", gender: "F", born: [1965, 1990] },
  { key: "guide-f-c", section: "الموجّهات الدينيات", title: "موجّهة دينية ج", note: "أولى درجات الموجّهات.", gender: "F", born: [1975, 1995] },
];

function build(list: Want[], prefix: string, password: string, taken: (id: string) => boolean): SignupDemo[] {
  return list.flatMap((w, i) => {
    const person = find(`${prefix}${String(i).padStart(2, "0")}`, w, taken);
    return person ? [{ key: w.key, title: w.title, note: w.note, section: w.section, person, phone: phoneOf(person.id), password }] : [];
  });
}

/** The pilgrims' cards: the guides' full example first (محمد الخطيب), then one citizen for each situation */
export function pilgrimSignups(taken: (id: string) => boolean): SignupDemo[] {
  const example = getPerson("01012345412")!;
  const first: SignupDemo[] = taken(example.id)
    ? []
    : [{ key: "example", title: "المثال الكامل", note: "رب أسرة (58 عاماً)، يضيف زوجته وابنه من دفتر العائلة ووالدته بالرقم الوطني.", person: example, phone: "0944345412", password: "Hajj@1448" }];
  return [...first, ...build(PILGRIMS, "05055", "Hajj@1448", taken)];
}

/** The administrators' cards: one citizen for every role open for application */
export function adminSignups(taken: (id: string) => boolean): SignupDemo[] {
  return build(ADMINS, "05077", "Admin@1448", taken);
}
