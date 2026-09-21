/**
 * Approved service clusters (التكتلات) for season 1448, their published programmes,
 * known unapproved "campaigns", and the digital documents the platform issues.
 * All fictional. Room numbers and pilgrim names are operational data and never appear here.
 */

export type ServiceLevel = "عادي" | "محسّن" | "خمس نجوم";

export type ClusterGroup = { no: number; leader: string; capacity: number; remaining: number };

export type Cluster = {
  slug: string;
  name: string;
  since: number;
  level: ServiceLevel;
  rating: number;
  reviews: number;
  governorate: string;
  office: string;
  specialty: string;
  about: string;
  approvedOn: string;
  groupsCount: number;
  pilgrims: number;
  makkah: { hotel: string; area: string; distance: string; rooms: string; features: string[] };
  madinah: { hotel: string; area: string; distance: string };
  transport: string[];
  meals: string[];
  programs: string[];
  privateRoomDiff: number;
  groups: ClusterGroup[];
  tone: "green" | "gold" | "maroon";
};

export const CLUSTERS: Cluster[] = [
  {
    slug: "al-nour",
    name: "تكتل النور لخدمة الحجاج",
    since: 1440,
    level: "محسّن",
    rating: 4.8,
    reviews: 1240,
    governorate: "دمشق",
    office: "دمشق",
    specialty: "خدمة كبار السن والعائلات",
    about: "تكتل يعمل منذ 1440، متخصص في خدمة كبار السن والعائلات، ويرافق حجاجه فريق طبي دائم.",
    approvedOn: "25 رجب 1448",
    groupsCount: 12,
    pilgrims: 600,
    makkah: {
      hotel: "فندق أبراج النور",
      area: "العزيزية الشمالية",
      distance: "3.4 كم عن الحرم",
      rooms: "غرف ثلاثية ورباعية",
      features: ["مصاعد", "غرف مهيأة لذوي الاحتياجات", "مصلى للنساء"],
    },
    madinah: { hotel: "فندق روضة طيبة", area: "المنطقة المركزية", distance: "300 متر من باب السلام" },
    transport: ["حافلة مكيفة إلى الحرم كل ساعة من 04:00 إلى 24:00", "حافلات خاصة للمشاعر", "حافلة مكة – المدينة"],
    meals: ["ثلاث وجبات يومياً (بوفيه)", "وجبات خاصة لمرضى السكري والضغط عند الطلب"],
    programs: ["درس ديني يومي بعد العشاء", "رحلة إلى معالم مكة والمدينة", "مرافقة طبية دائمة"],
    privateRoomDiff: 500,
    groups: [
      { no: 27, leader: "أحمد سليمان", capacity: 50, remaining: 6 },
      { no: 31, leader: "ياسر عبد الله", capacity: 50, remaining: 14 },
      { no: 34, leader: "حسن الرفاعي", capacity: 50, remaining: 21 },
      { no: 38, leader: "مازن العطار", capacity: 50, remaining: 0 },
    ],
    tone: "green",
  },
  {
    slug: "al-safa",
    name: "تكتل الصفا والمروة",
    since: 1436,
    level: "خمس نجوم",
    rating: 4.9,
    reviews: 860,
    governorate: "دمشق",
    office: "دمشق",
    specialty: "سكن قريب من الحرم وخدمة متميزة",
    about: "من أقدم التكتلات المعتمدة، يوفّر سكناً مطلاً على الساحات الشمالية للحرم وبرنامجاً علمياً مكثفاً.",
    approvedOn: "22 رجب 1448",
    groupsCount: 8,
    pilgrims: 400,
    makkah: {
      hotel: "فندق إطلالة الصفا",
      area: "الشبيكة",
      distance: "450 متراً عن الحرم",
      rooms: "غرف ثنائية وثلاثية",
      features: ["إطلالة على الحرم", "خدمة غرف على مدار الساعة", "كراسي متحركة مجانية"],
    },
    madinah: { hotel: "فندق دار الهجرة", area: "المنطقة المركزية الشمالية", distance: "150 متراً من الساحات" },
    transport: ["التنقل سيراً إلى الحرم", "حافلات حديثة للمشاعر بمسارات مخصصة", "قطار الحرمين بين مكة والمدينة"],
    meals: ["بوفيه مفتوح ثلاث مرات يومياً", "ركن ضيافة على مدار اليوم"],
    programs: ["دروس يومية مع نخبة من العلماء", "زيارة مجمع كسوة الكعبة", "جلسات تهيئة قبل كل منسك"],
    privateRoomDiff: 900,
    groups: [
      { no: 5, leader: "عبد الرحمن القباني", capacity: 50, remaining: 3 },
      { no: 9, leader: "فراس البيطار", capacity: 50, remaining: 11 },
      { no: 12, leader: "منذر الشامي", capacity: 50, remaining: 0 },
    ],
    tone: "gold",
  },
  {
    slug: "al-yaqeen",
    name: "تكتل اليقين",
    since: 1443,
    level: "عادي",
    rating: 4.5,
    reviews: 2130,
    governorate: "ريف دمشق",
    office: "ريف دمشق",
    specialty: "تكلفة مناسبة وخدمة منظمة",
    about: "تكتل يركّز على التنظيم الجيد بتكلفة أساسية، مع متابعة يومية من رؤساء المجموعات.",
    approvedOn: "26 رجب 1448",
    groupsCount: 16,
    pilgrims: 800,
    makkah: {
      hotel: "فندق منازل اليقين",
      area: "العوالي",
      distance: "6.2 كم عن الحرم",
      rooms: "غرف رباعية وخماسية",
      features: ["مصاعد", "مغسلة ملابس", "صيدلية قريبة"],
    },
    madinah: { hotel: "فندق نسائم المدينة", area: "قرب طريق الملك فيصل", distance: "900 متر من المسجد النبوي" },
    transport: ["حافلة ترددية إلى الحرم كل ساعتين", "حافلات للمشاعر", "حافلة مكة – المدينة"],
    meals: ["وجبتان يومياً (فطور وعشاء)", "وجبة غداء في أيام المشاعر"],
    programs: ["درس أسبوعي في فقه المناسك", "مرشد ميداني لكل مجموعة"],
    privateRoomDiff: 350,
    groups: [
      { no: 41, leader: "رضوان الزعبي", capacity: 50, remaining: 18 },
      { no: 44, leader: "غسان النحاس", capacity: 50, remaining: 27 },
      { no: 47, leader: "عدنان الكردي", capacity: 50, remaining: 9 },
    ],
    tone: "green",
  },
  {
    slug: "al-shahba",
    name: "تكتل الشهباء للحج والعمرة",
    since: 1438,
    level: "محسّن",
    rating: 4.7,
    reviews: 1510,
    governorate: "حلب",
    office: "حلب",
    specialty: "خبرة طويلة مع حجاج الشمال",
    about: "تكتل حلبي معروف بدقة مواعيده، ويضم فريقاً نسائياً لخدمة الحاجّات.",
    approvedOn: "24 رجب 1448",
    groupsCount: 14,
    pilgrims: 700,
    makkah: {
      hotel: "فندق قمم الشهباء",
      area: "ششة",
      distance: "4.1 كم عن الحرم",
      rooms: "غرف ثلاثية ورباعية",
      features: ["مصاعد", "فريق نسائي للخدمة", "غرفة إسعاف أولي"],
    },
    madinah: { hotel: "فندق أنوار الحرم", area: "المنطقة المركزية الغربية", distance: "400 متر من باب الملك فهد" },
    transport: ["حافلة كل ساعة إلى الحرم", "حافلات للمشاعر", "حافلة مكة – المدينة"],
    meals: ["ثلاث وجبات يومياً بمطبخ شامي", "وجبات خاصة عند الطلب"],
    programs: ["درس يومي بعد الفجر", "زيارة معالم المدينة المنورة"],
    privateRoomDiff: 500,
    groups: [
      { no: 52, leader: "حسام الساعاتي", capacity: 50, remaining: 4 },
      { no: 55, leader: "ماهر الجابي", capacity: 50, remaining: 16 },
    ],
    tone: "maroon",
  },
  {
    slug: "al-asi",
    name: "تكتل العاصي",
    since: 1441,
    level: "عادي",
    rating: 4.4,
    reviews: 980,
    governorate: "حمص",
    office: "حمص",
    specialty: "رعاية الحجاج لأول مرة",
    about: "تكتل من حمص وحماة، يقدّم برنامج تهيئة متكاملاً للحجاج الذين يسافرون لأول مرة.",
    approvedOn: "27 رجب 1448",
    groupsCount: 10,
    pilgrims: 500,
    makkah: {
      hotel: "فندق ضيافة العاصي",
      area: "النسيم",
      distance: "5.5 كم عن الحرم",
      rooms: "غرف رباعية",
      features: ["مصاعد", "قاعة محاضرات"],
    },
    madinah: { hotel: "فندق السكينة", area: "حي بني خدرة", distance: "1.1 كم من المسجد النبوي" },
    transport: ["حافلة ترددية إلى الحرم", "حافلات للمشاعر"],
    meals: ["وجبتان يومياً", "مياه ومشروبات في الحافلات"],
    programs: ["ورشة تهيئة قبل السفر", "مرشد لكل 25 حاجاً"],
    privateRoomDiff: 300,
    groups: [
      { no: 61, leader: "صالح العلي", capacity: 50, remaining: 22 },
      { no: 64, leader: "رشيد الحموي", capacity: 50, remaining: 31 },
    ],
    tone: "green",
  },
  {
    slug: "bawabat-al-haramain",
    name: "تكتل بوابة الحرمين",
    since: 1444,
    level: "خمس نجوم",
    rating: 4.8,
    reviews: 540,
    governorate: "اللاذقية",
    office: "اللاذقية",
    specialty: "راحة كاملة وغرف خاصة",
    about: "تكتل يوفّر غرفاً ثنائية وخدمة كونسيرج ومرافقين طبيين، مناسب لمن يحتاج راحة خاصة.",
    approvedOn: "25 رجب 1448",
    groupsCount: 6,
    pilgrims: 300,
    makkah: {
      hotel: "فندق بوابة الملك عبد العزيز",
      area: "جبل عمر",
      distance: "350 متراً عن الحرم",
      rooms: "غرف ثنائية",
      features: ["مصاعد سريعة", "غرف مهيأة لذوي الاحتياجات", "عيادة داخل الفندق"],
    },
    madinah: { hotel: "فندق قباب المدينة", area: "المنطقة المركزية", distance: "100 متر من الساحات" },
    transport: ["التنقل سيراً إلى الحرم", "حافلات فاخرة للمشاعر", "قطار الحرمين"],
    meals: ["ثلاث وجبات بقائمة متنوعة", "وجبات صحية خاصة"],
    programs: ["برنامج علمي يومي", "جولات تاريخية مصحوبة بمرشد", "متابعة طبية فردية"],
    privateRoomDiff: 1_100,
    groups: [
      { no: 70, leader: "نزار الشيخ", capacity: 50, remaining: 2 },
      { no: 72, leader: "وائل السعدي", capacity: 50, remaining: 12 },
    ],
    tone: "gold",
  },
  {
    slug: "hawran",
    name: "تكتل سهل حوران",
    since: 1442,
    level: "محسّن",
    rating: 4.6,
    reviews: 720,
    governorate: "درعا",
    office: "درعا",
    specialty: "العائلات الكبيرة",
    about: "تكتل من الجنوب يجمع أفراد العائلة الواحدة في طابق واحد قدر الإمكان.",
    approvedOn: "28 رجب 1448",
    groupsCount: 9,
    pilgrims: 450,
    makkah: {
      hotel: "فندق سنابل حوران",
      area: "العزيزية الجنوبية",
      distance: "3.9 كم عن الحرم",
      rooms: "غرف رباعية وخماسية",
      features: ["مصاعد", "طوابق للعائلات"],
    },
    madinah: { hotel: "فندق ريحانة طيبة", area: "المنطقة المركزية الجنوبية", distance: "500 متر من باب السلام" },
    transport: ["حافلة كل ساعة إلى الحرم", "حافلات للمشاعر", "حافلة مكة – المدينة"],
    meals: ["ثلاث وجبات يومياً", "وجبات للأطفال والكبار عند الطلب"],
    programs: ["درس يومي بعد العشاء", "برنامج خاص للشباب المرافقين"],
    privateRoomDiff: 450,
    groups: [
      { no: 81, leader: "طارق الحوراني", capacity: 50, remaining: 8 },
      { no: 83, leader: "خالد المصري", capacity: 50, remaining: 19 },
    ],
    tone: "maroon",
  },
];

export type UnapprovedEntity = { name: string; claims: string[]; reports: number };

export const UNAPPROVED: UnapprovedEntity[] = [
  {
    name: "حملة الرحمة للحج المضمون",
    claims: ["تعد بمقعد حج مضمون دون قرعة", "تطلب مبلغاً مقدماً نقداً أو بالحوالة", "تتواصل عبر واتساب فقط"],
    reports: 37,
  },
  {
    name: "مكتب البركة للسفر والحج السريع",
    claims: ["يعرض تأشيرات حج خارج الحصة الرسمية", "يطلب صورة الهوية وكلمة مرور الحساب"],
    reports: 12,
  },
];

export const HOTLINE = "9449";

/** Arabic-insensitive normalisation for name search */
export function normalizeArabic(s: string) {
  return s
    .trim()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

export type EntityMatch = { kind: "approved"; cluster: Cluster } | { kind: "unapproved"; entity: UnapprovedEntity } | { kind: "unknown"; query: string };

/** `clusters` تأتي من لوحة المحتوى؛ وتبقى قائمة الشيفرة افتراضاً لمن لا يمرّرها */
export function findEntity(query: string, clusters: Cluster[] = CLUSTERS): EntityMatch {
  const q = normalizeArabic(query);
  if (!q) return { kind: "unknown", query };
  const cluster = clusters.find((c) => normalizeArabic(c.name) === q) ?? clusters.find((c) => q.length >= 3 && normalizeArabic(c.name).includes(q));
  if (cluster) return { kind: "approved", cluster };
  const entity = UNAPPROVED.find((u) => normalizeArabic(u.name) === q) ?? UNAPPROVED.find((u) => q.length >= 3 && normalizeArabic(u.name).includes(q));
  if (entity) return { kind: "unapproved", entity };
  return { kind: "unknown", query };
}

export function suggestEntities(query: string, clusters: Cluster[] = CLUSTERS) {
  const q = normalizeArabic(query);
  const all = [...clusters.map((c) => c.name), ...UNAPPROVED.map((u) => u.name)];
  if (!q) return all.slice(0, 5);
  return all.filter((n) => normalizeArabic(n).includes(q)).slice(0, 6);
}

// ───────────────────────── Documents ─────────────────────────

export type IssuedDocument = {
  number: string;
  type: string;
  kind: "receipt" | "certificate";
  amount?: number;
  date: string;
  holder: string;
  detail: string;
};

export const DOCUMENTS: IssuedDocument[] = [
  { number: "1448-R-004512", type: "إيصال رسم التسجيل", kind: "receipt", amount: 100, date: "12 جمادى الآخرة 1448", holder: "محمد أ. الخ•••", detail: "طلب عائلي — 4 أفراد × 25 دولاراً" },
  { number: "1448-P-004512-1", type: "إيصال الدفعة الأولى من تكلفة الحج", kind: "receipt", amount: 14_000, date: "20 جمادى الآخرة 1448", holder: "محمد أ. الخ•••", detail: "4 أفراد × 3,500 دولار — مع التسجيل على القبول المباشر" },
  { number: "1448-P-004512-2", type: "إيصال الهدي", kind: "receipt", amount: 720, date: "4 رمضان 1448", holder: "محمد أ. الخ•••", detail: "4 أفراد × 180 دولاراً" },
  { number: "1448-P-004512-3", type: "إيصال فارق الغرفة الخاصة", kind: "receipt", amount: 500, date: "6 رمضان 1448", holder: "محمد أ. الخ•••", detail: "غرفة خاصة واحدة" },
  { number: "1448-A-000871", type: "إيصال رسم تسجيل إداري", kind: "receipt", amount: 30, date: "20 ربيع الآخر 1448", holder: "أحمد م. سل•••", detail: "رسم تسجيل إداري للموسم" },
  { number: "1448-C-004512", type: "شهادة أداء فريضة الحج", kind: "certificate", date: "25 ذو الحجة 1448", holder: "محمد أ. الخ•••", detail: "موسم 1448هـ — تكتل النور لخدمة الحجاج" },
];

export function findDocument(no: string) {
  const n = no.trim().toUpperCase().replace(/\s+/g, "").replace(/[–—_]/g, "-");
  return DOCUMENTS.find((d) => d.number === n) ?? null;
}
