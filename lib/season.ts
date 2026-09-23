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
  reserve: 3_000,
  directShare: 0.35,
  lotteryShare: 0.65,
  directSeats: 7_875,
  lotterySeats: 14_625,
  acceptedDirectAge: 66,
  scholarshipSeats: 500,

  /**
   * Two SEPARATE registrations, one after the other. Direct acceptance (oldest first, 35%) opens first;
   * after its accepted ages are announced, lottery registration (65%) opens as its own application.
   * Nobody moves from one to the other automatically — whoever was not accepted directly may register
   * for the lottery with a new application.
   */
  windows: {
    direct: { hijri: "9 جمادى الآخرة – 1 رجب", gregorian: "19 تشرين الثاني – 10 كانون الأول 2026", announce: "15 رجب" },
    lottery: { hijri: "16 – 25 رجب", gregorian: "25 كانون الأول 2026 – 3 كانون الثاني 2027", draw: "1 شعبان — 20:00" },
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
    privateRoomDiff: 500,
  },

  /**
   * How the Hajj cost is paid is decided by the administration for the whole season — the pilgrim does
   * not choose. Season 1448: two installments — the first at registration on direct acceptance (or when
   * the name comes out in the draw), the second when joining a group. With 1, the whole cost is paid at
   * that first moment.
   */
  installments: {
    count: 2 as 1 | 2,
    windows: ["عند التسجيل على القبول المباشر، أو عند ظهور الاسم في القرعة", "عند الانضمام إلى مجموعة"],
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
    /**
     * Cluster head and deputy are never applied for. The administration decides how many clusters the
     * season has and opens candidacy; the group heads elect the cluster heads from among themselves.
     * An elected head keeps his own group, manages the cluster, and picks his deputy — who must have
     * headed a group before.
     */
    clusters: {
      count: 10,
      /** To stand: this many consecutive seasons as group head, each rated at least this */
      candidacy: { consecutiveSeasons: 3, minRating: 4 },
      /** The deputy the elected head picks must have headed a group for at least this many seasons */
      deputySeasons: 1,
      window: "1 – 10 جمادى الآخرة",
    },
  },

  /** The office opens this window for accepted pilgrims to join groups through the group's coordinator */
  groupingWindow: "2 – 25 شعبان",

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

  dates: [
    { hijri: "9 جمادى الآخرة – 1 رجب", gregorian: "19 تشرين الثاني – 10 كانون الأول 2026", title: "التسجيل على القبول المباشر لمن بلغ 66 عاماً فأكثر (35%): رسم التسجيل + الدفعة الأولى", who: "الحاج" },
    { hijri: "1 – 10 رجب", gregorian: "10 – 19 كانون الأول 2026", title: "تدقيق طلبات القبول المباشر والتحقق من الأهلية", who: "الموظفون" },
    { hijri: "15 رجب", gregorian: "24 كانون الأول 2026", title: "اعتماد قوائم القبول المباشر", who: "الحاج" },
    { hijri: "16 – 25 رجب", gregorian: "25 كانون الأول 2026 – 3 كانون الثاني 2027", title: "التسجيل على القرعة (65%) — طلب مستقل، رسم التسجيل فقط", who: "الحاج" },
    { hijri: "1 شعبان — 20:00", gregorian: "9 كانون الثاني 2027", title: "القرعة الإلكترونية ببث مباشر", who: "الحاج" },
    { hijri: "2 شعبان", gregorian: "10 كانون الثاني 2027", title: "المقبولون بالقرعة: تأكيد القبول ودفع الدفعة الأولى", who: "الحاج" },
    { hijri: "2 – 25 شعبان", gregorian: "10 كانون الثاني – 2 شباط 2027", title: "مرحلة التفويج: يختار الحاج مجموعته ويسجّله منسقها ويوقّعان العقد", who: "الحاج + المنسق" },
    { hijri: "2 – 25 شعبان", gregorian: "10 كانون الثاني – 2 شباط 2027", title: "الدفعة الثانية عند الانضمام إلى المجموعة — ثم الوثائق الطبية", who: "الحاج" },
    { hijri: "1 – 15 ذو القعدة", gregorian: "8 – 22 نيسان 2027", title: "إصدار التأشيرات وتوزيع الرحلات", who: "الموظفون" },
    { hijri: "24 ذو القعدة", gregorian: "1 أيار 2027", title: "السفر: دمشق ← جدة ← مكة", who: "الجميع" },
    { hijri: "8 – 12 ذو الحجة", gregorian: "14 – 18 أيار 2027", title: "المشاعر المقدسة", who: "الجميع" },
    { hijri: "23 ذو الحجة", gregorian: "29 أيار 2027", title: "العودة: المدينة ← دمشق", who: "الجميع" },
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
