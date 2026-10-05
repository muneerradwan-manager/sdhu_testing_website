import type { Employee, Mission } from "../ops";
import { seeded } from "../utils";

/**
 * The directorate's employees for the demo — the same shape as the operations app's profile
 * (hajjoperations_app, profiles): name in three parts, job title, governorate, mission, permanent or
 * delegated by another body, both phone numbers, and the seasons he travelled with the mission.
 * The first 21 staff-portal accounts (lib/staff.ts) come first and carry their staffId; the rest are
 * generated from a fixed seed so the list is identical on every load. Accounts opened later (one per
 * permission) come after everyone generated, with their own seed, so no earlier employee changes.
 */

type Base = Omit<Employee, "id" | "languages" | "nationalId" | "phoneSy"> & { languages?: string[] };

const STAFF_PEOPLE: (Base & { staffId: string })[] = [
  { staffId: "suha", firstName: "سهى", fatherName: "عبد الكريم", surname: "مراد", gender: "female", birthYear: 1978, city: "دمشق", jobTitle: "مدير إدارة", mission: "البعثة الإدارية", kind: "permanent", seasons: [1445, 1446, 1447] },
  { staffId: "rana", firstName: "رنا", fatherName: "جورج", surname: "حداد", gender: "female", birthYear: 1986, city: "دمشق", jobTitle: "رئيس قسم", mission: "البعثة الإدارية", kind: "permanent", seasons: [] },
  { staffId: "maher", firstName: "ماهر", fatherName: "سليم", surname: "عيسى", gender: "male", birthYear: 1980, city: "حمص", jobTitle: "رئيس قسم", mission: "البعثة الإدارية", kind: "permanent", seasons: [1446, 1447] },
  { staffId: "mazen", firstName: "مازن", fatherName: "محمود", surname: "الحلبي", gender: "male", birthYear: 1975, city: "حلب", jobTitle: "مدير مكتب", mission: "البعثة الإدارية", kind: "permanent", seasons: [1444, 1445, 1447] },
  { staffId: "fadi", firstName: "فادي", fatherName: "نبيل", surname: "سلوم", gender: "male", birthYear: 1983, city: "دمشق", jobTitle: "مسؤول تخطيط ومتابعة", mission: "البعثة الإدارية", kind: "permanent", seasons: [1446, 1447, 1448], phoneSa: "+966 55 310 4418" },
  { staffId: "layla", firstName: "ليلى", fatherName: "عادل", surname: "شمس", gender: "female", birthYear: 1981, city: "دمشق", jobTitle: "طبيب", mission: "البعثة الصحية", kind: "permanent", seasons: [1445, 1446, 1447, 1448], phoneSa: "+966 55 870 2231", notes: "رئيسة الفريق الطبي في مكة المكرمة" },
  { staffId: "haitham", firstName: "هيثم", fatherName: "فايز", surname: "زيدان", gender: "male", birthYear: 1979, city: "ريف دمشق", jobTitle: "مسؤول لوجستي", mission: "البعثة الإدارية", kind: "permanent", seasons: [1446, 1447, 1448], phoneSa: "+966 50 214 9087" },
  { staffId: "tarek", firstName: "طارق", fatherName: "حسين", surname: "مصطفى", gender: "male", birthYear: 1984, city: "حماة", jobTitle: "مدقق حسابات", mission: "البعثة الإدارية", kind: "permanent", seasons: [] },
  { staffId: "abusami", firstName: "سامي", fatherName: "راتب", surname: "حلاق", gender: "male", birthYear: 1970, city: "دمشق", jobTitle: "مسؤول موارد بشرية", mission: "البعثة الإدارية", kind: "permanent", seasons: [1443, 1444], notes: "يُعرف بأبي سامي" },
  { staffId: "nour", firstName: "نور", fatherName: "هشام", surname: "العابد", gender: "female", birthYear: 1992, city: "دمشق", jobTitle: "مسؤول إعلام وعلاقات عامة", mission: "البعثة الإعلامية", kind: "permanent", seasons: [] },
  { staffId: "bilal", firstName: "بلال", fatherName: "أحمد", surname: "قاسم", gender: "male", birthYear: 1988, city: "درعا", jobTitle: "مسؤول إعلام وعلاقات عامة", mission: "البعثة الإعلامية", kind: "permanent", seasons: [1447] },
  { staffId: "hiba", firstName: "هبة", fatherName: "منير", surname: "الأيوبي", gender: "female", birthYear: 1990, city: "حلب", jobTitle: "موظف خدمة جمهور", mission: "البعثة الإدارية", kind: "permanent", seasons: [] },
  { staffId: "osama", firstName: "أسامة", fatherName: "خليل", surname: "الدالاتي", gender: "male", birthYear: 1985, city: "إدلب", jobTitle: "موظف خدمة جمهور", mission: "البعثة الإدارية", kind: "permanent", seasons: [1447], languages: ["العربية", "التركية"] },
  { staffId: "dana", firstName: "دانة", fatherName: "وليد", surname: "العظمة", gender: "female", birthYear: 1991, city: "درعا", jobTitle: "موظف خدمة جمهور", mission: "البعثة الإدارية", kind: "permanent", seasons: [] },
  { staffId: "rima", firstName: "ريما", fatherName: "جميل", surname: "الجندي", gender: "female", birthYear: 1982, city: "حمص", jobTitle: "مدير مكتب", mission: "البعثة الإدارية", kind: "permanent", seasons: [1446] },
  { staffId: "adnan", firstName: "عدنان", fatherName: "صالح", surname: "سليمان", gender: "male", birthYear: 1977, city: "اللاذقية", jobTitle: "محاسب", mission: "البعثة الإدارية", kind: "permanent", seasons: [1445, 1447] },
  { staffId: "samira", firstName: "سميرة", fatherName: "إلياس", surname: "الخوري", gender: "female", birthYear: 1980, city: "حمص", jobTitle: "طبيب", mission: "البعثة الصحية", kind: "permanent", seasons: [1446, 1447, 1448], phoneSa: "+966 56 402 7719" },
  { staffId: "wissam", firstName: "وسام", fatherName: "نزار", surname: "خوري", gender: "male", birthYear: 1984, city: "دمشق", jobTitle: "مسؤول لوجستي", mission: "البعثة الإدارية", kind: "permanent", seasons: [1446, 1447, 1448], phoneSa: "+966 54 118 3302" },
  { staffId: "nader", firstName: "نادر", fatherName: "يوسف", surname: "قاسم", gender: "male", birthYear: 1976, city: "ريف دمشق", jobTitle: "رئيس قسم", mission: "البعثة الإدارية", kind: "permanent", seasons: [1444, 1445, 1446, 1447, 1448], phoneSa: "+966 50 667 1245" },
  { staffId: "lubna", firstName: "لبنى", fatherName: "مروان", surname: "الشهابي", gender: "female", birthYear: 1987, city: "دمشق", jobTitle: "مساعد إداري", mission: "البعثة الإدارية", kind: "permanent", seasons: [] },
  { staffId: "ghassan", firstName: "غسان", fatherName: "عبد الرزاق", surname: "العمر", gender: "male", birthYear: 1974, city: "حماة", jobTitle: "مدير إدارة", mission: "البعثة الإدارية", kind: "permanent", seasons: [1444, 1445, 1446, 1447, 1448], phoneSa: "+966 55 902 6610", notes: "مدير شؤون البعثة — يعدّ الملفات التشغيلية" },
];

/** Portal accounts opened after the list was generated: appended at its end */
const LATE_STAFF_PEOPLE: (Base & { staffId: string })[] = [
  { staffId: "kinan", firstName: "كنان", fatherName: "سمير", surname: "الأحمد", gender: "male", birthYear: 1989, city: "دمشق", jobTitle: "رئيس قسم", mission: "البعثة الإدارية", kind: "permanent", seasons: [] },
  { staffId: "yousef", firstName: "يوسف", fatherName: "عبد الكريم", surname: "الزعبي", gender: "male", birthYear: 1972, city: "درعا", jobTitle: "مدير إدارة", mission: "البعثة الإدارية", kind: "permanent", seasons: [] },
  { staffId: "rahaf", firstName: "رهف", fatherName: "منير", surname: "الخطيب", gender: "female", birthYear: 1991, city: "حمص", jobTitle: "رئيس قسم", mission: "البعثة الإدارية", kind: "permanent", seasons: [] },
  { staffId: "omar", firstName: "عمر", fatherName: "فايز", surname: "الشامي", gender: "male", birthYear: 1987, city: "دمشق", jobTitle: "مسؤول تخطيط ومتابعة", mission: "البعثة الإدارية", kind: "permanent", seasons: [] },
  { staffId: "bassel", firstName: "باسل", fatherName: "رياض", surname: "النوري", gender: "male", birthYear: 1983, city: "ريف دمشق", jobTitle: "مسؤول لوجستي", mission: "البعثة الإدارية", kind: "permanent", seasons: [1446, 1447, 1448], phoneSa: "+966 56 220 4471" },
  // The holder of «إدارة الامتحانات» and the Damascus hall supervisor: their work is in Syria, before the season travels
  { staffId: "munir", firstName: "منير", fatherName: "عادل", surname: "السيد", gender: "male", birthYear: 1982, city: "دمشق", jobTitle: "رئيس قسم", mission: "البعثة الإدارية", kind: "permanent", seasons: [] },
  { staffId: "nisreen", firstName: "نسرين", fatherName: "توفيق", surname: "الحكيم", gender: "female", birthYear: 1986, city: "دمشق", jobTitle: "مساعد إداري", mission: "البعثة الإدارية", kind: "permanent", seasons: [] },
];

const MALE = ["أحمد", "محمد", "محمود", "خالد", "عمر", "علي", "حسن", "يوسف", "إبراهيم", "عبد الله", "عبد الرحمن", "سامر", "باسل", "مهند", "وائل", "زياد", "رامي", "معاذ", "أنس", "بشار", "فراس", "هشام", "نزار", "ياسر", "مصطفى", "حمزة", "طلال", "عماد", "قصي", "أيمن", "لؤي", "صهيب", "مؤيد", "ماجد", "جهاد", "نضال", "عبد الحكيم", "مالك", "ثائر", "حسام"];
const FEMALE = ["فاطمة", "مريم", "آمنة", "خديجة", "هدى", "رغد", "سلمى", "ريم", "لمى", "نسرين", "أسماء", "رهف", "سمر", "إيمان", "ديما", "هالة", "عبير", "منى"];
const FATHER = ["محمد", "أحمد", "عبد الكريم", "سليم", "خليل", "عبد الرزاق", "ياسين", "حسين", "صالح", "نبيل", "عادل", "فايز", "راتب", "جميل", "منير", "عبد الغني", "توفيق", "بسام", "رياض", "عبد القادر", "مصطفى", "زهير", "حسان", "شريف"];
const SURNAME = ["الخطيب", "الحمصي", "الشامي", "العلي", "الحسن", "النجار", "السيد", "الأحمد", "الزعبي", "المصري", "الإدلبي", "الرفاعي", "القاسم", "الصباغ", "الحموي", "الجاسم", "الخلف", "الدرويش", "العبد الله", "الطحان", "البيطار", "الكردي", "الساعور", "المحمد", "الحريري", "الأتاسي", "الجابي", "العطار", "الشيخ", "الكيالي", "دياب", "حداد", "عثمان", "سلامة", "البكور", "الحراكي", "المقداد", "السباعي", "الدباغ", "الحافظ"];

const CITY_WEIGHTS: [string, number][] = [
  ["دمشق", 22], ["ريف دمشق", 14], ["حلب", 14], ["حمص", 10], ["حماة", 8], ["اللاذقية", 6], ["طرطوس", 3], ["إدلب", 7], ["درعا", 7], ["السويداء", 2], ["القنيطرة", 1], ["دير الزور", 4], ["الرقة", 1], ["الحسكة", 1],
];
const CITY_CODE: Record<string, string> = { دمشق: "010", "ريف دمشق": "030", حلب: "020", حمص: "040", حماة: "050", اللاذقية: "060", طرطوس: "070", إدلب: "080", درعا: "090", السويداء: "100", القنيطرة: "110", "دير الزور": "120", الرقة: "130", الحسكة: "140" };

const ADMIN_TITLES = ["مساعد إداري", "رئيس قسم", "محاسب", "أمين صندوق", "مسؤول لوجستي", "مسؤول مخازن", "سائق", "مسؤول صيانة", "مدخل بيانات", "مسؤول تخطيط ومتابعة", "مسؤول جودة", "موظف خدمة جمهور", "مترجم", "مهندس معلوماتية", "فني دعم تقني", "مسؤول أمن وسلامة", "مسؤول مشتريات وتموين", "أمين أرشيف ووثائق", "أمين سر"];

const MISSION_PLAN: { mission: Mission; weight: number; titles: string[]; orgs: string[] }[] = [
  { mission: "البعثة الإدارية", weight: 64, titles: ADMIN_TITLES, orgs: ["وزارة الداخلية — إدارة الهجرة والجوازات", "وزارة النقل", "محافظة دمشق"] },
  { mission: "البعثة الدينية", weight: 14, titles: ["مرشد ديني"], orgs: ["وزارة الأوقاف"] },
  { mission: "البعثة الصحية", weight: 14, titles: ["طبيب", "ممرض", "ممرض", "صيدلاني"], orgs: ["وزارة الصحة", "الهلال الأحمر العربي السوري"] },
  { mission: "البعثة الإعلامية", weight: 8, titles: ["مسؤول إعلام وعلاقات عامة", "مصور"], orgs: ["وزارة الإعلام"] },
];

function pickWeighted<T>(rnd: () => number, items: [T, number][]) {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let x = rnd() * total;
  for (const [v, w] of items) {
    x -= w;
    if (x <= 0) return v;
  }
  return items[items.length - 1][0];
}

const pick = <T,>(rnd: () => number, list: readonly T[]) => list[Math.floor(rnd() * list.length)];
const digits = (rnd: () => number, n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join("");

function contact(rnd: () => number, city: string, travelled: boolean) {
  return {
    nationalId: `${CITY_CODE[city] ?? "010"}${digits(rnd, 8)}`,
    phoneSy: `09${pick(rnd, ["3", "4", "5", "6", "8", "9"])}${digits(rnd, 1)} ${digits(rnd, 3)} ${digits(rnd, 3)}`,
    phoneSa: travelled ? `+966 5${pick(rnd, ["0", "3", "4", "5", "6", "9"])} ${digits(rnd, 3)} ${digits(rnd, 4)}` : undefined,
  };
}

function build(): Employee[] {
  const rnd = seeded("sdhu-employees-1448");
  const out: Employee[] = [];
  const names = new Set<string>();

  STAFF_PEOPLE.forEach((p, i) => {
    const c = contact(rnd, p.city, p.seasons.length > 0);
    names.add(`${p.firstName} ${p.fatherName} ${p.surname}`);
    out.push({
      ...p,
      id: `E-${String(i + 1).padStart(3, "0")}`,
      nationalId: c.nationalId,
      phoneSy: c.phoneSy,
      phoneSa: p.phoneSa,
      email: `${p.staffId}@hajj.gov.sy`,
      languages: p.languages ?? ["العربية", ...(rnd() < 0.5 ? ["الإنكليزية"] : [])],
    });
  });

  let n = out.length;
  while (out.length < STAFF_PEOPLE.length + 124) {
    const plan = pickWeighted(rnd, MISSION_PLAN.map((m) => [m, m.weight] as [(typeof MISSION_PLAN)[number], number]));
    const female = rnd() < (plan.mission === "البعثة الصحية" ? 0.45 : plan.mission === "البعثة الدينية" ? 0.3 : 0.14);
    const firstName = pick(rnd, female ? FEMALE : MALE);
    const fatherName = pick(rnd, FATHER);
    const surname = pick(rnd, SURNAME);
    const name = `${firstName} ${fatherName} ${surname}`;
    if (names.has(name) || firstName === fatherName) continue;
    names.add(name);

    const city = pickWeighted(rnd, CITY_WEIGHTS);
    const external = rnd() < (plan.mission === "البعثة الإدارية" ? 0.12 : 0.4);
    // Seasons travelled: a run ending at 1447, then this season for most of them
    const since = external ? 1446 + Math.floor(rnd() * 2) : 1443 + Math.floor(rnd() * 5);
    const seasons: number[] = [];
    for (let y = since; y <= 1447; y++) if (rnd() < 0.85 || y === 1447) seasons.push(y);
    if (rnd() < 0.86) seasons.push(1448);
    const c = contact(rnd, city, true);
    const langs = ["العربية"];
    if (rnd() < 0.45) langs.push("الإنكليزية");
    if (rnd() < 0.12) langs.push("التركية");
    if (rnd() < 0.06) langs.push("الفرنسية");
    if (rnd() < 0.05) langs.push("الأوردو");

    n += 1;
    out.push({
      id: `E-${String(n).padStart(3, "0")}`,
      firstName,
      fatherName,
      surname,
      gender: female ? "female" : "male",
      birthYear: 1964 + Math.floor(rnd() * 32),
      nationalId: c.nationalId,
      city,
      jobTitle: pick(rnd, plan.titles),
      mission: plan.mission,
      kind: external ? "external" : "permanent",
      organization: external ? pick(rnd, plan.orgs) : undefined,
      phoneSy: c.phoneSy,
      phoneSa: c.phoneSa,
      languages: langs,
      seasons,
      suspended: n === 58 || n === 97 ? true : undefined,
      notes: n === 58 ? "موقوف مؤقتاً بانتظار استكمال ملف جواز السفر" : n === 97 ? "موقوف بقرار إداري حتى انتهاء التحقيق في شكوى" : undefined,
    });
  }
  // Delegated for this season, their body sent the names before the numbers: the register flags them for HR
  for (const e of out) if (e.id === "E-041" || e.id === "E-135") Object.assign(e, { phoneSy: "", phoneSa: undefined, notes: `أرسلت ${e.organization} اسمه دون أرقام هواتفه، وتُستكمل منها.` });
  const late = seeded("sdhu-employees-1448-late");
  LATE_STAFF_PEOPLE.forEach((p) => {
    const c = contact(late, p.city, p.seasons.length > 0);
    n += 1;
    out.push({ ...p, id: `E-${String(n).padStart(3, "0")}`, nationalId: c.nationalId, phoneSy: c.phoneSy, phoneSa: p.phoneSa, email: `${p.staffId}@hajj.gov.sy`, languages: p.languages ?? ["العربية"] });
  });
  return out;
}

export const EMPLOYEES_SEED: Employee[] = build();
