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
    hajjCost: 4_300,
    hady: 180,
    privateRoomDiff: 500,
  },

  dates: [
    { hijri: "9 جمادى الآخرة – 1 رجب", gregorian: "19 تشرين الثاني – 10 كانون الأول 2026", title: "التسجيل على القبول المباشر (35% — الأكبر سناً)", who: "الحاج" },
    { hijri: "1 – 10 رجب", gregorian: "10 – 19 كانون الأول 2026", title: "تدقيق طلبات القبول المباشر والتحقق من الأهلية", who: "الموظفون" },
    { hijri: "15 رجب", gregorian: "24 كانون الأول 2026", title: "القبول المباشر: إعلان الأعمار المقبولة", who: "الحاج" },
    { hijri: "16 – 25 رجب", gregorian: "25 كانون الأول 2026 – 3 كانون الثاني 2027", title: "التسجيل على القرعة (65%) — طلب مستقل", who: "الحاج" },
    { hijri: "1 شعبان — 20:00", gregorian: "9 كانون الثاني 2027", title: "القرعة الإلكترونية ببث مباشر", who: "الحاج" },
    { hijri: "2 – 25 شعبان", gregorian: "10 كانون الثاني – 2 شباط 2027", title: "تأكيد القبول واستكمال الأوراق واختيار المجموعة", who: "الحاج + الإداري" },
    { hijri: "1 – 15 رمضان", gregorian: "8 – 22 شباط 2027", title: "التسديد وتوقيع العقد", who: "الحاج" },
    { hijri: "1 – 15 ذو القعدة", gregorian: "8 – 22 نيسان 2027", title: "إصدار التأشيرات وتوزيع الرحلات", who: "الموظفون" },
    { hijri: "24 ذو القعدة", gregorian: "1 أيار 2027", title: "السفر: دمشق ← جدة ← مكة", who: "الجميع" },
    { hijri: "8 – 12 ذو الحجة", gregorian: "14 – 18 أيار 2027", title: "المشاعر المقدسة", who: "الجميع" },
    { hijri: "23 ذو الحجة", gregorian: "29 أيار 2027", title: "العودة: المدينة ← دمشق", who: "الجميع" },
  ],
} as const;

export const OFFICES = [
  { governorate: "دمشق", offices: ["دمشق – المزة", "دمشق – الميدان", "دمشق – ركن الدين"] },
  { governorate: "ريف دمشق", offices: ["دوما", "التل", "قطنا"] },
  { governorate: "حلب", offices: ["حلب – الجميلية", "حلب – الشعار"] },
  { governorate: "حمص", offices: ["حمص – الوعر", "حمص – باب السباع"] },
  { governorate: "حماة", offices: ["حماة – المركز"] },
  { governorate: "اللاذقية", offices: ["اللاذقية – المركز"] },
  { governorate: "إدلب", offices: ["إدلب – المركز"] },
  { governorate: "درعا", offices: ["درعا – المحطة"] },
  { governorate: "دير الزور", offices: ["دير الزور – المركز"] },
] as const;
