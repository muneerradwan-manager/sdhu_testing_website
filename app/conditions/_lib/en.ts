/**
 * English for the Arabic strings these public pages receive from lib/* (the season's dates, the offices,
 * the published results, the demo documents…). lib/* stays Arabic — it also feeds the Arabic-only portals —
 * so the pages of «الشروط», «النتائج» and «التحقق» turn what they show into English here.
 * Anything not known is returned as it is.
 */

/** Hijri months, then the Levantine names of the Gregorian months (longest first, so «تشرين الأول» wins over «تشرين») */
const MONTHS: [string, string][] = [
  ["ربيع الأول", "Rabi' al-Awwal"],
  ["ربيع الآخر", "Rabi' al-Thani"],
  ["ربيع الثاني", "Rabi' al-Thani"],
  ["جمادى الأولى", "Jumada al-Ula"],
  ["جمادى الآخرة", "Jumada al-Akhirah"],
  ["ذو القعدة", "Dhu al-Qa'dah"],
  ["ذي القعدة", "Dhu al-Qa'dah"],
  ["ذو الحجة", "Dhu al-Hijjah"],
  ["ذي الحجة", "Dhu al-Hijjah"],
  ["محرم", "Muharram"],
  ["صفر", "Safar"],
  ["رجب", "Rajab"],
  ["شعبان", "Sha'ban"],
  ["رمضان", "Ramadan"],
  ["شوال", "Shawwal"],
  ["كانون الثاني", "January"],
  ["كانون الأول", "December"],
  ["تشرين الأول", "October"],
  ["تشرين الثاني", "November"],
  ["شباط", "February"],
  ["آذار", "March"],
  ["نيسان", "April"],
  ["أيار", "May"],
  ["حزيران", "June"],
  ["تموز", "July"],
  ["آب", "August"],
  ["أيلول", "September"],
];

/** Gregorian months by number (1 = January) */
export const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const WORDS: [string, string][] = [
  ["بعد اعتماد العقد", "After the contract is approved"],
  ["تقديري", "estimated"],
  ["موعد تقديري", "estimated date"],
  ["السبت", "Saturday"],
  ["الأحد", "Sunday"],
  ["حتى", "until"],
  ["جامعة الفرات، دير الزور", "Al-Furat University, Deir ez-Zor"],
  ["دير الزور", "Deir ez-Zor"],
  ["النتائج في اليوم نفسه", "results the same day"],
];

/**
 * A date, a range or a short line built of dates: «12 – 25 آب 2026 (29 صفر – 12 ربيع الأول 1448)» →
 * «12 – 25 August 2026 (29 Safar – 12 Rabi' al-Awwal 1448)». «1448هـ» becomes «1448 AH», «2027م» «2027».
 */
export function dateEn(s: string) {
  let out = s;
  for (const [ar, en] of [...WORDS, ...MONTHS].sort((a, b) => b[0].length - a[0].length)) out = out.split(ar).join(en);
  return out
    .replace(/(\d)\s*هـ/g, "$1 AH")
    .replace(/(\d)م(?![ء-ي])/g, "$1")
    .replace(/،/g, ",")
    .replace(/ و/g, " and ");
}

/** Governorates and countries of the offices */
export const PLACES: Record<string, string> = {
  "دمشق": "Damascus",
  "ريف دمشق": "Rural Damascus",
  "حلب": "Aleppo",
  "حمص": "Homs",
  "حماة": "Hama",
  "اللاذقية": "Latakia",
  "إدلب": "Idlib",
  "درعا": "Daraa",
  "دير الزور": "Deir ez-Zor",
  "طرطوس": "Tartus",
  "الحسكة": "Al-Hasakah",
  "الرقة": "Raqqa",
  "السويداء": "As-Suwayda",
  "القنيطرة": "Quneitra",
  "تركيا": "Türkiye",
  "مصر": "Egypt",
  "الأردن": "Jordan",
  "لبنان": "Lebanon",
  "سوريا": "Syria",
};

export const placeEn = (s: string) => PLACES[s] ?? s;

const CAPITALS: Record<string, string> = { "إسطنبول": "Istanbul", "القاهرة": "Cairo", "عمّان": "Amman" };

/** «مكتب دمشق» → «Damascus Office», «مكتب تركيا — إسطنبول» → «Türkiye Office — Istanbul» */
export function officeEn(s: string) {
  const m = s.match(/^مكتب (.+?)(?: — (.+))?$/);
  if (!m) return placeEn(s);
  return `${placeEn(m[1])} Office${m[2] ? ` — ${CAPITALS[m[2]] ?? m[2]}` : ""}`;
}

/** The registration an application was made in */
export const CAMPAIGNS: Record<string, string> = {
  "القبول المباشر": "Direct acceptance",
  "القرعة": "Lottery",
  "المنحة": "Scholarship",
};

export const campaignEn = (s: string) => CAMPAIGNS[s] ?? s;

/** A cluster's service level */
export const LEVELS: Record<string, string> = { "اقتصادي": "Economy", "اقتصادي محسن": "Economy plus", "خمس نجوم": "Five-star" };

export const levelEn = (s: string) => LEVELS[s] ?? s;

/** The season's calendar (lib/season SEASON.dates): titles and who acts */
const PHRASES: Record<string, string> = {
  "التسجيل على الحج — القبول المباشر لمواليد 1958 فما قبل ومرافقيهم": "Hajj registration — direct acceptance for those born in 1958 or earlier, and their companions",
  "التسجيل على الحج — التسجيل الأولي على القرعة: طلب مستقل، رسم التسجيل فقط": "Hajj registration — lottery pre-registration: a separate application, registration fee only",
  "إغلاق التسجيل على الحج: لا طلبات جديدة إلا باستثناء من الإدارة": "Hajj registration closes: no new applications without an exception from the Administration",
  "القرعة العلنية في دير الزور، ونشر نتائجها: تُسحب سنوات ميلاد، ولبعضها أشهر": "The public lottery in Deir ez-Zor, and its results published: birth years are drawn, some with specific months",
  "تثبيت المقبولين تسجيلهم: الدفعة الأولى 3,500 $ عبر شام كاش أو بنك البركة": "Accepted pilgrims confirm their registration: first instalment of 3,500 $ via Sham Cash or Al Baraka Bank",
  "إلحاق الحاج بمجموعة: يتفق مع المجموعة، ويوقّع العقد في المكتب، فيلحقه موظف المكتب بها":
    "Joining a group: the pilgrim agrees with the group and signs the contract at the office, and the office staff add them to it",
  "الدفعة الثانية بعد اعتماد العقد — ثم الوثائق الطبية": "Second instalment once the contract is approved — then the medical documents",
  "إصدار التأشيرات وتوزيع الرحلات": "Visas issued and flights allocated",
  "السفر: دمشق ← جدة ← مكة": "Travel: Damascus → Jeddah → Makkah",
  "المشاعر المقدسة": "The holy sites",
  "العودة: المدينة ← دمشق": "Return: Madinah → Damascus",
  "الحاج أو من يسجّله": "The pilgrim, or whoever registers them",
  "الجميع": "Everyone",
  "الحاج": "The pilgrim",
  "الحاج + المجموعة + المكتب": "Pilgrim + group + office",
  "الموظفون": "Staff",
  // The installments (lib/installments, SEASON.installments)
  "الدفعة الأولى": "First instalment",
  "الدفعة الثانية": "Second instalment",
  "تكلفة الحج كاملة": "Full Hajj cost",
  "عند التسجيل على القبول المباشر، أو عند تثبيت التسجيل لمن قُبل بالقرعة": "on registering for direct acceptance, or on confirming registration if accepted in the lottery",
  "عند الانضمام إلى مجموعة": "on joining a group",
};

export const phraseEn = (s: string) => PHRASES[s] ?? dateEn(s);
