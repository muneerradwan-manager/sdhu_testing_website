/**
 * Season 1448 AH settings, exactly as the season director configures them in the admin panel
 * (see "المرحلة 0" in the operating document). Nothing here is hard-coded business logic —
 * the rules engine reads these values.
 */
export const SEASON = {
  hijriYear: 1448,
  gregorianYear: 2027,
  /** Birth-year thresholds are evaluated against this reference year */
  referenceYear: 2026,

  quota: 22_500,
  /** Season 1448 as announced: 65% accepted directly by age (born 1958 or earlier), 35% by the lottery */
  directShare: 0.65,
  lotteryShare: 0.35,
  directSeats: 14_625,
  lotterySeats: 7_875,
  /** Born 1958 or earlier: 68 and over in the reference year */
  acceptedDirectAge: 68,
  scholarshipSeats: 500,

  /**
   * Registering on the Hajj: two SEPARATE registrations, one after the other, on the dates the Hajj and
   * Umrah administration announced for season 1448 (lib/operations.ts). Direct acceptance (oldest first, 65%) opens first;
   * after its accepted ages are announced, the preliminary lottery registration (35%) opens as its own
   * application. Nobody moves from one to the other automatically — whoever was not accepted directly
   * may register for the lottery with a new application. The draw picks birth years (some by months);
   * the accepted confirm their registration by paying the first installment (see lib/lottery.ts).
   */
  windows: {
    direct: { hijri: "12 – 25 آب", gregorian: "12 – 25 آب 2026 (29 صفر – 12 ربيع الأول 1448)", announce: "26 آب" },
    lottery: { hijri: "26 آب – 10 أيلول", gregorian: "26 آب – 10 أيلول 2026 (13 – 28 ربيع الأول 1448)", draw: "السبت 26 أيلول", results: "26 أيلول", confirm: "11 – 27 تشرين الأول" },
  },

  rules: {
    /** صاحب الطلب من مواليد 1997 فما قبل (29 عاماً فأكثر) */
    applicantMaxBirthYear: 1997,
    /** المرافق من مواليد 2009 فما قبل (17 عاماً فأكثر) */
    companionMaxBirthYear: 2009,
    /** المرأة من مواليد 1982 فما بعد (دون 44 عاماً) تحتاج محرماً */
    womanNeedsMahramMinBirthYear: 1982,
    /** من مواليد 1957 فما قبل (69 عاماً فأكثر) يحتاج مرافقاً حصراً */
    elderlyNeedsCompanionMaxBirthYear: 1957,
    maxCompanions: 3,
    maxCompanionsFamily: 5,
  },

  fees: {
    registrationPerPerson: 25,
    administratorRegistration: 30,
    groupFormation: 200,
    clusterFormation: 500,
    /** Full Hajj cost per person (last season it was paid in one go: 4,750 $) */
    hajjCost: 4_750,
    /**
     * First installment per person. Paid with the registration on direct acceptance, and when the
     * name comes out in the draw on the lottery. The rest follows the plan the pilgrim chose.
     */
    firstInstallment: 3_500,
    hady: 180,
    /** Private accommodation, as an example of what a cluster asks per person (each cluster sets its own) */
    roomExample: { 1: 300, 2: 175, 3: 100, 4: 50 },
  },

  /**
   * How the Hajj cost is paid is decided by the administration for the whole season — the pilgrim does
   * not choose. Season 1448: two installments — the first at registration on direct acceptance (or when
   * the name comes out in the draw), the second when joining a group. With 1, the whole cost is paid at
   * that first moment.
   */
  installments: {
    count: 2 as 1 | 2,
    windows: ["عند التسجيل على القبول المباشر، أو عند تثبيت التسجيل لمن قُبل بالقرعة", "عند الانضمام إلى مجموعة"],
  },

  /**
   * Seasonal administrators. The account is permanent, but participation is renewed every season with a
   * new application, ONE role per season, and the season's fees (registration, group or cluster
   * formation). An administrator may keep last season's role or apply for another one — both under
   * conditions the administration sets here.
   */
  administrators: {
    /** Keeping the same role as the last season served */
    keepRole: {
      /** Rating of that season must reach this, or the role must be applied for like a new one */
      minRating: 3.5,
      /** Same role, rating met, no gap season: the written and oral exams are waived */
      examExempt: true,
      /** Seasons without participation before the exams are required again even for the same role */
      maxGapSeasons: 1,
    },
    // The clusters are the administration's structure, not numbers of the season: who may file a request (a
    // role it grants), the groups' categories, the tiers and their composition (app/administrator/_lib/structure)
  },

  /**
   * Classification of the groups and the clusters at the end of the season. A group head in his first
   * season starts at the entry tier; after that his tier follows his evaluation. Inside every tier,
   * across all offices together, the top share moves up one tier, the bottom share moves down one,
   * and the rest stay. The same rule and the same shares apply to the clusters.
   */
  grading: {
    tiers: [
      { key: 1, label: "الفئة الأولى", service: "عادي", note: "فئة البداية — كل رئيس مجموعة جديد يبدأ منها" },
      { key: 2, label: "الفئة الثانية", service: "محسّن", note: "تُنال بالترقية من الفئة الأولى" },
      { key: 3, label: "الفئة الثالثة", service: "خمس نجوم", note: "أعلى فئة — لا ترقية فوقها" },
    ],
    /** Share of each tier promoted one tier up */
    promoteShare: 0.3,
    /** Share of each tier moved one tier down */
    demoteShare: 0.2,
    /** Honoured at the end of the season in every tier */
    honorTop: 3,
    /** The tier a first-season group head starts at */
    entryTier: 1,
  },

  /**
   * Attaching accepted pilgrims to groups: a separate operation from registering on the Hajj. It opens with
   * the forming of the clusters and goes on after it — by a contract between the pilgrim and the group
   */
  groupingWindow: "12 تشرين الثاني – 15 كانون الثاني (موعد تقديري)",

  /**
   * Medical documents — vaccination certificates included. None is asked before the assignment window:
   * they are requested only after the pilgrim has joined a group (and paid the installment due then).
   * The administration sets the final list; this is the list configured for the demo.
   */
  medicalDocuments: [
    { key: "covid", label: "شهادة لقاح كورونا", hint: "بالجرعات المعتمدة" },
    { key: "meningitis", label: "شهادة لقاح الحمى الشوكية", hint: "سارية خلال 3 سنوات" },
    { key: "flu", label: "شهادة لقاح الإنفلونزا الموسمية", hint: "لهذا الموسم — لمن بلغ 60 عاماً", minAge: 60 },
    { key: "report", label: "التقرير الطبي العام", hint: "من طبيب معتمد: الحالة الصحية والقدرة على السفر" },
    { key: "prescription", label: "الوصفة الطبية للأدوية الدائمة", hint: "لمن يتناول دواءً دائماً — تكفي 35 يوماً", onlyIfMedications: true },
  ],

  /**
   * The pilgrims' calendar of season 1448: what the Hajj and Umrah administration announced (SANA, Al Jazeera,
   * August–October 2026), and, marked «تقديري», what it had not announced yet, on last season's pattern.
   * `from` and `to` are days, so the public timeline lights the row the demo's date is in.
   */
  dates: [
    { hijri: "29 صفر – 12 ربيع الأول", gregorian: "12 – 25 آب 2026", from: "2026-08-12", to: "2026-08-25", title: "التسجيل على الحج — القبول المباشر لمواليد 1958 فما قبل ومرافقيهم", who: "الحاج أو من يسجّله" },
    { hijri: "13 – 28 ربيع الأول", gregorian: "26 آب – 10 أيلول 2026", from: "2026-08-26", to: "2026-09-10", title: "التسجيل على الحج — التسجيل الأولي على القرعة: طلب مستقل، رسم التسجيل فقط", who: "الحاج أو من يسجّله" },
    { hijri: "29 ربيع الأول", gregorian: "11 أيلول 2026", from: "2026-09-11", to: "2026-09-25", title: "إغلاق التسجيل على الحج: لا طلبات جديدة إلا باستثناء من الإدارة", who: "الجميع" },
    { hijri: "15 ربيع الآخر", gregorian: "السبت 26 أيلول 2026", from: "2026-09-26", to: "2026-09-26", title: "القرعة العلنية في دير الزور، ونشر نتائجها: تُسحب سنوات ميلاد، ولبعضها أشهر", who: "الحاج" },
    { hijri: "30 ربيع الآخر – 16 جمادى الأولى", gregorian: "11 – 27 تشرين الأول 2026", from: "2026-10-11", to: "2026-10-27", title: "تثبيت المقبولين تسجيلهم: الدفعة الأولى 3,500 $ عبر شام كاش أو بنك البركة", who: "الحاج" },
    { hijri: "2 جمادى الآخرة – 7 شعبان (تقديري)", gregorian: "12 تشرين الثاني 2026 – 15 كانون الثاني 2027", from: "2026-11-12", to: "2027-01-15", title: "إلحاق الحاج بمجموعة: يتفق مع المجموعة، ويرفع رئيسها أو منسقها العقد، ويعتمده المكتب", who: "الحاج + المجموعة" },
    { hijri: "بعد اعتماد العقد (تقديري)", gregorian: "حتى 15 كانون الثاني 2027", from: "2026-11-12", to: "2027-01-15", title: "الدفعة الثانية بعد اعتماد العقد — ثم الوثائق الطبية", who: "الحاج" },
    { hijri: "1 – 15 ذو القعدة", gregorian: "8 – 22 نيسان 2027", from: "2027-04-08", to: "2027-04-22", title: "إصدار التأشيرات وتوزيع الرحلات", who: "الموظفون" },
    { hijri: "24 ذو القعدة", gregorian: "1 أيار 2027", from: "2027-05-01", to: "2027-05-01", title: "السفر: دمشق ← جدة ← مكة", who: "الجميع" },
    { hijri: "8 – 12 ذو الحجة", gregorian: "14 – 18 أيار 2027", from: "2027-05-14", to: "2027-05-18", title: "المشاعر المقدسة", who: "الجميع" },
    { hijri: "23 ذو الحجة", gregorian: "29 أيار 2027", from: "2027-05-29", to: "2027-05-29", title: "العودة: المدينة ← دمشق", who: "الجميع" },
  ],
} as const;

/**
 * One registration office per governorate inside Syria, plus one office in each country abroad with a
 * large Syrian community. The office is never chosen from a list: it follows where the applicant lives —
 * the governorate office (from the civil registry) inside Syria, or the country office abroad. A
 * coordinator-filed application belongs to the coordinator's office.
 */
export const OFFICES = [
  { governorate: "دمشق", office: "مكتب دمشق", abroad: false },
  { governorate: "ريف دمشق", office: "مكتب ريف دمشق", abroad: false },
  { governorate: "حلب", office: "مكتب حلب", abroad: false },
  { governorate: "حمص", office: "مكتب حمص", abroad: false },
  { governorate: "حماة", office: "مكتب حماة", abroad: false },
  { governorate: "اللاذقية", office: "مكتب اللاذقية", abroad: false },
  { governorate: "إدلب", office: "مكتب إدلب", abroad: false },
  { governorate: "درعا", office: "مكتب درعا", abroad: false },
  { governorate: "دير الزور", office: "مكتب دير الزور", abroad: false },
  { governorate: "تركيا", office: "مكتب تركيا — إسطنبول", abroad: true },
  { governorate: "مصر", office: "مكتب مصر — القاهرة", abroad: true },
  { governorate: "الأردن", office: "مكتب الأردن — عمّان", abroad: true },
] as const;

/** Countries abroad that have an office — the only extra question the applicant is asked */
export const ABROAD = OFFICES.filter((o) => o.abroad).map((o) => o.governorate);

/** Where the applicant lives: "سوريا" or one of ABROAD */
export type Residence = "سوريا" | (typeof ABROAD)[number];

/** The office area an application belongs to: the registry governorate inside Syria, or the country abroad */
export function officeArea(governorate: string, residence: string = "سوريا") {
  return residence === "سوريا" ? governorate : residence;
}

export function officeFor(area: string) {
  return OFFICES.find((o) => o.governorate === area)?.office ?? `مكتب ${area}`;
}
