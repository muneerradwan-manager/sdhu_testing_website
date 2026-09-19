/**
 * Everything a pilgrim sees after acceptance — taken from the operating document's worked example
 * (Cluster Al-Nour, Group 27, Abraj Al-Nour hotel, flight 1448-07, Mina camp 42...).
 * Assignments (rooms, seats, cards) are derived deterministically from the application members.
 */
import { SEASON } from "./season";
import { ageOf, birthYear, type Person } from "./registry";
import type { Member } from "./rules";
import { seeded } from "./utils";

export const CLUSTER = {
  name: "تكتل النور لخدمة الحجاج",
  level: "محسّن",
  since: 1440,
  head: "الحاج عبد الرحمن العلي",
  deputy: "بسام درويش",
  groups: 12,
  pilgrims: 600,
};

export const GROUP = {
  number: 27,
  capacity: 50,
  members: 48,
  team: [
    { role: "رئيس المجموعة", name: "أحمد سليمان الحمصي", phone: "0944 271 449", note: "يتابع طلبك وعقدك والتجمّعات" },
    { role: "معاون رئيس المجموعة", name: "ياسر عبد الله", phone: "0944 272 449", note: "الحضور والتجمّع والوجبات الخاصة" },
    { role: "الموجّه الديني", name: "الشيخ خالد الرفاعي", phone: "0944 273 449", note: "الدروس والمناسك والأسئلة الشرعية" },
    { role: "المنسق التقني", name: "سامر نجار", phone: "0944 274 449", note: "مساعدتك في التطبيق والبطاقة الرقمية" },
  ],
};

export const PLACES = {
  haram: { lat: 21.4225, lng: 39.8262, label: "المسجد الحرام" },
  nabawi: { lat: 24.4672, lng: 39.6112, label: "المسجد النبوي" },
  makkahHotel: {
    name: "فندق أبراج النور",
    area: "العزيزية الشمالية — مكة المكرمة",
    lat: 21.4163,
    lng: 39.8588,
    tower: "البرج (ب)",
    floor: 12,
    distance: "3.4 كم عن الحرم",
    stay: "24 ذو القعدة – 7 ذو الحجة، ثم 12 – 16 ذو الحجة",
    nights: 18,
    features: ["غرف مهيأة لذوي الاحتياجات", "مصاعد", "عيادة 24 ساعة في الطابق الأرضي", "مكتب المجموعة: الغرفة 1230"],
    bus: "حافلة إلى الحرم كل ساعة من 04:00 إلى 24:00 — البوابة الجنوبية",
    meals: [
      { name: "الفطور", time: "06:00 – 09:00" },
      { name: "الغداء", time: "13:00 – 15:00" },
      { name: "العشاء", time: "19:00 – 22:00" },
    ],
  },
  madinahHotel: {
    name: "فندق روضة طيبة",
    area: "المنطقة المركزية — المدينة المنورة",
    lat: 24.4659,
    lng: 39.6089,
    floor: 8,
    distance: "300 متر من باب السلام",
    stay: "16 – 23 ذو الحجة",
    nights: 7,
    features: ["مشياً إلى المسجد النبوي", "فطور مبكر لصلاة الفجر", "حجز مواعيد الروضة للمجموعة"],
    rawdah: "18 ذو الحجة — 02:00 للرجال / 10:00 للسيدات",
    meals: [
      { name: "الفطور", time: "05:30 – 08:30" },
      { name: "الغداء", time: "13:00 – 15:00" },
      { name: "العشاء", time: "20:00 – 22:30" },
    ],
  },
  mina: {
    name: "مخيم التكتل رقم 42",
    area: "منطقة المعيصم — منى — المربع 7",
    lat: 21.4058,
    lng: 39.9036,
    tents: { men: 12, women: 13 },
    notes: ["خيام مكيفة بفرش أرضي وأسرّة قابلة للطي لكبار السن", "نقطة التجمّع: أمام الخيمة 12", "الحمامات: 40 متراً يساراً — العيادة: مدخل المخيم"],
  },
  arafat: {
    name: "مخيم التكتل في عرفات",
    area: "بجوار مسجد نمرة من الجهة الشرقية",
    lat: 21.3549,
    lng: 39.9688,
    tents: { men: 12, women: 13 },
    notes: ["الانطلاق من منى 06:30 — الحافلتان 7 و8", "الماء البارد عند مدخل الخيمة", "الدعاء حتى الغروب ثم التجمّع إلى مزدلفة"],
  },
  muzdalifah: {
    name: "نقطة مبيت المجموعة 27",
    area: "مزدلفة — قرب مسجد المشعر الحرام",
    lat: 21.3838,
    lng: 39.9362,
    notes: ["الوصول المتوقع 21:40", "كبار السن ومرافقوهم يتقدمون إلى منى بعد منتصف الليل بحافلة مبكرة", "جمع الحصى — الانطلاق بعد الفجر 05:15"],
  },
  jamarat: {
    name: "منشأة الجمرات",
    area: "الدور الثالث — الدخول من الجهة الشرقية",
    lat: 21.4228,
    lng: 39.8731,
    notes: ["رمي جمرة العقبة يوم النحر بعد 07:00", "عربة كهربائية لكبار السن عند الطلب المسبق"],
  },
} as const;

export const FLIGHTS = {
  outbound: {
    code: "1448-07",
    carrier: "الحملة الوطنية — طيران الحج",
    from: { code: "DAM", city: "دمشق", airport: "مطار دمشق الدولي" },
    to: { code: "JED", city: "جدة", airport: "مطار الملك عبد العزيز — صالة الحجاج" },
    hijri: "24 ذو القعدة 1448",
    gregorian: "السبت 1 أيار 2027",
    departure: "06:00",
    arrival: "08:30",
    duration: "2س 30د",
    gate: "البوابة 3",
    boardingAt: "05:15",
    airportAt: "02:30",
    gathering: "ساحة المزة — الحافلة تنطلق 01:30",
    baggage: "حقيبة 23 كغ + حقيبة يد 7 كغ — حقيبة الإحرام معك في اليد",
    afterLanding: "الحافلة 32 في الساحة (ج) — مهيأة للكرسي المتحرك — الوصول إلى الفندق نحو 12:05",
  },
  inbound: {
    code: "1448-07R",
    carrier: "الحملة الوطنية — طيران الحج",
    from: { code: "MED", city: "المدينة المنورة", airport: "مطار الأمير محمد بن عبد العزيز" },
    to: { code: "DAM", city: "دمشق", airport: "مطار دمشق الدولي" },
    hijri: "23 ذو الحجة 1448",
    gregorian: "السبت 29 أيار 2027",
    departure: "14:00",
    arrival: "17:10",
    duration: "3س 10د",
    gate: "صالة الحجاج",
    boardingAt: "13:15",
    airportAt: "09:45",
    gathering: "بهو فندق روضة طيبة 08:00 — تسليم الغرف بمسح البطاقة",
    baggage: "حقيبة 23 كغ + حقيبة يد 7 كغ — ماء زمزم (5 لتر) يُسلَّم مغلّفاً في المطار",
    afterLanding: "حافلة التكتل من المطار إلى ساحة المزة",
  },
};

export const ITINERARY = [
  { hijri: "24 ذو القعدة", title: "السفر إلى جدة ثم مكة", place: "دمشق ← جدة ← مكة", detail: "العمرة الأولى الليلة: تجمّع في بهو الفندق 21:00، الحافلة 21:30", icon: "plane" },
  { hijri: "25 ذو القعدة – 7 ذو الحجة", title: "الإقامة في مكة المكرمة", place: "فندق أبراج النور", detail: "حافلة الحرم كل ساعة، درس يومي بعد العشاء، رحلة التنعيم وزيارة معالم مكة", icon: "hotel" },
  { hijri: "8 ذو الحجة", title: "يوم التروية — إلى منى", place: "مخيم 42 — المعيصم", detail: "الحافلتان 7 و8 من البوابة الجنوبية 07:00 — الإحرام من الفندق", icon: "tent" },
  { hijri: "9 ذو الحجة", title: "يوم عرفة", place: "بجوار مسجد نمرة", detail: "الانطلاق 06:30 — الظهر والعصر جمعاً وقصراً في الخيمة — الدعاء حتى الغروب", icon: "sun" },
  { hijri: "ليلة 10 ذو الحجة", title: "المبيت في مزدلفة", place: "قرب المشعر الحرام", detail: "جمع الحصى — كبار السن يتقدمون إلى منى بعد منتصف الليل", icon: "moon" },
  { hijri: "10 ذو الحجة", title: "يوم النحر", place: "الجمرات ثم منى", detail: "رمي جمرة العقبة، الهدي بالقسائم المعتمدة، الحلق والتحلل الأول", icon: "star" },
  { hijri: "11 – 12 ذو الحجة", title: "أيام التشريق", place: "منى", detail: "رمي الجمرات الثلاث يومياً وفق المواعيد المخصصة للتكتل", icon: "tent" },
  { hijri: "12 – 16 ذو الحجة", title: "العودة إلى مكة", place: "فندق أبراج النور", detail: "طواف الإفاضة ثم طواف الوداع", icon: "kaaba" },
  { hijri: "16 – 23 ذو الحجة", title: "المدينة المنورة", place: "فندق روضة طيبة", detail: "الصلاة في المسجد النبوي، زيارة الروضة، رحلة قباء وأحد والقبلتين", icon: "mosque" },
  { hijri: "23 ذو الحجة", title: "العودة إلى الوطن", place: "المدينة ← دمشق", detail: "رحلة 1448-07R — الوصول 17:10 — حمداً لله على السلامة", icon: "home" },
] as const;

export type Track = "direct" | "lottery";
export type TrackKey = "submitted" | "checking" | "eligible" | "direct" | "lottery" | "accepted" | "notAccepted";
export type TrackStep = { key: TrackKey; at: number; title: string; text: string };

const COMMON: TrackStep[] = [
  { key: "submitted", at: 0, title: "مُقدَّم", text: "استلمنا طلبك ورسم التسجيل" },
  { key: "checking", at: 2, title: "تدقيق البيانات", text: "مطابقة الشؤون المدنية وتطبيق شروط الموسم" },
  { key: "eligible", at: 4, title: "مؤهل", text: "جميع أفراد الطلب مستوفون للشروط" },
];

/** The registration an application belongs to (older saved applications were direct-acceptance ones) */
export function trackOf(app: { track?: Track }): Track {
  return app.track ?? "direct";
}

/** Direct acceptance goes by the applicant's age: accepted when at or above the announced cut-off */
export function directAccepted(app: { members: Member[] }) {
  const applicant = app.members.find((m) => m.relation === "self") ?? app.members[0];
  return !!applicant && ageOf(applicant.person) >= SEASON.acceptedDirectAge;
}

/**
 * Tracking timeline (seconds after submission in the demo). Each registration has its own:
 * direct → ages announced → accepted directly OR not accepted (nothing moves to the lottery by itself);
 * lottery → live draw → selected.
 */
export function trackSteps(track: Track, accepted: boolean): TrackStep[] {
  if (track === "direct") {
    return [
      ...COMMON,
      { key: "direct", at: 6, title: "إعلان الأعمار المقبولة", text: `القبول المباشر: ${SEASON.acceptedDirectAge} عاماً فأكثر — ${SEASON.windows.direct.announce}` },
      accepted
        ? { key: "accepted", at: 8, title: "مقبول مباشرة", text: "قُبل طلبك وفق الأكبر سناً" }
        : { key: "notAccepted", at: 8, title: "لم يُقبل مباشرة", text: `التسجيل على القرعة ${SEASON.windows.lottery.hijri}` },
    ];
  }
  return [
    ...COMMON,
    { key: "lottery", at: 6.5, title: "القرعة الإلكترونية", text: `بث مباشر — ${SEASON.windows.lottery.draw}` },
    { key: "accepted", at: 10, title: "مقبول بالقرعة", text: "تم اختيار طلبك" },
  ];
}

export function stageAt(steps: TrackStep[], elapsed: number) {
  const stage = [...steps].reverse().find((t) => elapsed >= t.at) ?? steps[0];
  return { stage, index: steps.indexOf(stage) };
}

/** After acceptance, the file fills in piece by piece — seconds after submission */
export const REVEAL = { group: 11.5, makkah: 13, madinah: 14, flights: 15, camps: 16, card: 17 } as const;

export function applicationNumberFor(applicantId: string) {
  if (applicantId === "01012345412") return "4512";
  return String(4000 + Math.floor(seeded(applicantId)() * 5000));
}

export type Assignment = {
  person: Person;
  relationLabel: string;
  room: string;
  madinahRoom: string;
  seat: string;
  returnSeat: string;
  bus: number;
  tent: number;
  bracelet: string;
  needs: string[];
};

export function assign(members: Member[], labelFor: (m: Member) => string): Assignment[] {
  const letters = ["C", "D", "E", "F", "A", "B"];
  let menIdx = 0;
  let womenIdx = 0;
  return members.map((m, i) => {
    const woman = m.person.gender === "F";
    const needsLift = m.needs.length > 0 || birthYear(m.person) <= SEASON.rules.elderlyNeedsCompanionMaxBirthYear;
    const room = woman ? `12${String(16 + Math.floor(womenIdx++ / 3) * 2).padStart(2, "0")}` : `12${String(14 - Math.floor(menIdx++ / 3) * 2).padStart(2, "0")}`;
    return {
      person: m.person,
      relationLabel: labelFor(m),
      room,
      madinahRoom: woman ? "806" : "804",
      seat: `23${letters[i] ?? "A"}`,
      returnSeat: `31${letters[i] ?? "A"}`,
      bus: woman ? 8 : 7,
      tent: woman ? PLACES.mina.tents.women : PLACES.mina.tents.men,
      bracelet: `NR27-${m.person.id.slice(-4)}`,
      needs: needsLift && m.needs.length === 0 && ageOf(m.person) >= 69 ? ["مرافقة كبير سن"] : m.needs,
    };
  });
}

export function costsFor(members: Member[]) {
  const n = members.length;
  const f = SEASON.fees;
  const privateRoom = members.some((m) => m.needs.length > 0) ? f.privateRoomDiff : 0;
  return {
    hajj: f.hajjCost * n,
    hady: f.hady * n,
    privateRoom,
    total: f.hajjCost * n + f.hady * n + privateRoom,
  };
}
