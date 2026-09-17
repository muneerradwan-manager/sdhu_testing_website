/**
 * «حالتي الآن» — the in-season timeline (spec phases 10 – 21), from 24 ذو القعدة to 23 ذو الحجة 1448.
 * Day index 0 = 24 ذو القعدة = Saturday 1 May 2027 (ذو القعدة has 29 days this season), index 28 = 23 ذو الحجة.
 */
import { PLACES } from "@/lib/journey";

export type Where = "damascus" | "jeddah" | "makkah" | "mina" | "arafat" | "muzdalifah" | "madinah" | "home";

export const WHERE: Record<Where, { label: string; short: string; lat: number; lng: number; mapLabel: string; zoom: number; image: string; tone: "green" | "gold" | "maroon" | "ink" }> = {
  damascus: { label: "دمشق — ساحة المزة ثم المطار", short: "دمشق", lat: 33.4114, lng: 36.5156, mapLabel: "مطار دمشق الدولي", zoom: 0.03, image: "/images/umayyad.jpg", tone: "ink" },
  jeddah: { label: "جدة — صالة الحجاج", short: "جدة", lat: 21.6796, lng: 39.1565, mapLabel: "صالة الحجاج — مطار الملك عبد العزيز", zoom: 0.03, image: "/images/clock-tower.jpg", tone: "ink" },
  makkah: { label: "مكة المكرمة", short: "مكة", lat: PLACES.makkahHotel.lat, lng: PLACES.makkahHotel.lng, mapLabel: PLACES.makkahHotel.name, zoom: 0.03, image: "/images/kaaba-hajj.jpg", tone: "green" },
  mina: { label: "منى", short: "منى", lat: PLACES.mina.lat, lng: PLACES.mina.lng, mapLabel: PLACES.mina.name, zoom: 0.012, image: "/images/mina-tents.jpg", tone: "gold" },
  arafat: { label: "عرفات", short: "عرفات", lat: PLACES.arafat.lat, lng: PLACES.arafat.lng, mapLabel: PLACES.arafat.name, zoom: 0.015, image: "/images/jabal-rahmah.jpg", tone: "gold" },
  muzdalifah: { label: "مزدلفة", short: "مزدلفة", lat: PLACES.muzdalifah.lat, lng: PLACES.muzdalifah.lng, mapLabel: PLACES.muzdalifah.name, zoom: 0.012, image: "/images/muzdalifah.jpg", tone: "gold" },
  madinah: { label: "المدينة المنورة", short: "المدينة", lat: PLACES.madinahHotel.lat, lng: PLACES.madinahHotel.lng, mapLabel: PLACES.madinahHotel.name, zoom: 0.008, image: "/images/nabawi.jpg", tone: "maroon" },
  home: { label: "عائد إلى الوطن — دمشق", short: "عائد", lat: 33.4114, lng: 36.5156, mapLabel: "مطار دمشق الدولي — صالة القادمين", zoom: 0.03, image: "/images/umayyad-courtyard.jpg", tone: "ink" },
};

export type Moment = { time: string; where: Where; title: string; stage: string };

export type SeasonDay = { i: number; hijri: string; gregorian: string; weekday: string; title: string; moments: Moment[] };

export const LAST_DAY = 28;
const WEEKDAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

export function hijriOf(i: number) {
  return i <= 5 ? `${24 + i} ذو القعدة` : `${i - 5} ذو الحجة`;
}

const makkahStage = (i: number) => `الإقامة في مكة (اليوم ${i + 1} من 13)`;
const afterStage = (n: number) => `بعد المشاعر في مكة (اليوم ${n} من 4)`;
const madinahStage = (n: number) => `زيارة المدينة (اليوم ${n} من 7)`;

function momentsFor(i: number): { title: string; moments: Moment[] } {
  if (i === 0)
    return {
      title: "يوم السفر",
      moments: [
        { time: "01:30", where: "damascus", title: "التجمّع والانطلاق إلى المطار", stage: "يوم السفر — مغادرة دمشق" },
        { time: "08:42", where: "jeddah", title: "الهبوط في جدة", stage: "الوصول إلى المملكة" },
        { time: "12:05", where: "makkah", title: "الوصول إلى الفندق", stage: makkahStage(0) },
      ],
    };
  if (i <= 11) return { title: i === 4 ? "رحلة التنعيم" : i === 7 ? "زيارة معالم مكة" : i === 10 ? "زيارة المشاعر قبل الحج" : "الإقامة في مكة", moments: [{ time: "12:30", where: "makkah", title: "في الفندق", stage: makkahStage(i) }] };
  if (i === 12) return { title: "التحضير للمشاعر", moments: [{ time: "12:30", where: "makkah", title: "آخر يوم قبل منى", stage: makkahStage(12) }] };
  if (i === 13) return { title: "يوم التروية", moments: [{ time: "12:30", where: "mina", title: "في منى", stage: "المشاعر — يوم التروية (1 من 5)" }] };
  if (i === 14)
    return {
      title: "يوم عرفة",
      moments: [
        { time: "11:00", where: "arafat", title: "الوقوف بعرفة", stage: "المشاعر — يوم عرفة (2 من 5)" },
        { time: "21:40", where: "muzdalifah", title: "المبيت في مزدلفة", stage: "المشاعر — ليلة مزدلفة (2 من 5)" },
      ],
    };
  if (i === 15) return { title: "يوم النحر — العيد", moments: [{ time: "07:00", where: "mina", title: "رمي جمرة العقبة ثم منى", stage: "المشاعر — يوم النحر (3 من 5)" }] };
  if (i === 16) return { title: "أول أيام التشريق", moments: [{ time: "12:30", where: "mina", title: "في منى", stage: "المشاعر — أيام التشريق (4 من 5)" }] };
  if (i === 17)
    return {
      title: "ثاني أيام التشريق — التعجّل",
      moments: [
        { time: "14:30", where: "mina", title: "رمي الجمرات ثم التجمّع", stage: "المشاعر — أيام التشريق (5 من 5)" },
        { time: "20:30", where: "makkah", title: "العودة إلى الفندق", stage: afterStage(1) },
      ],
    };
  if (i <= 20) return { title: i === 18 ? "طواف الإفاضة" : "أيام الراحة في مكة", moments: [{ time: i === 18 ? "08:00" : "12:30", where: "makkah", title: "في الفندق", stage: afterStage(i - 16) }] };
  if (i === 21)
    return {
      title: "طواف الوداع والسفر إلى المدينة",
      moments: [
        { time: "04:00", where: "makkah", title: "طواف الوداع وتسليم الغرف", stage: afterStage(4) },
        { time: "15:30", where: "madinah", title: "الوصول إلى المدينة", stage: madinahStage(1) },
      ],
    };
  if (i <= 27) return { title: i === 23 ? "موعد الروضة الشريفة" : i === 24 ? "رحلة قباء وأحد والقبلتين" : i === 27 ? "الاجتماع الختامي" : "في المدينة المنورة", moments: [{ time: "12:30", where: "madinah", title: "في الفندق", stage: madinahStage(i - 20) }] };
  return {
    title: "يوم العودة",
    moments: [
      { time: "09:45", where: "madinah", title: "مطار المدينة المنورة", stage: "العودة إلى الوطن" },
      { time: "17:10", where: "home", title: "الهبوط في دمشق", stage: "عائد — اكتمل الموسم" },
    ],
  };
}

export function dayOf(i: number): SeasonDay {
  const idx = Math.max(0, Math.min(LAST_DAY, Math.round(i)));
  return { i: idx, hijri: hijriOf(idx), gregorian: `${1 + idx} أيار 2027`, weekday: WEEKDAYS[idx % 7], ...momentsFor(idx) };
}

export const DAYS = Array.from({ length: LAST_DAY + 1 }, (_, i) => dayOf(i));

/** Segments painted under the scrubber */
export const SEGMENTS: { from: number; to: number; label: string; cls: string }[] = [
  { from: 0, to: 12, label: "مكة", cls: "bg-green-light" },
  { from: 13, to: 17, label: "المشاعر", cls: "bg-gold-dark" },
  { from: 18, to: 20, label: "مكة", cls: "bg-green" },
  { from: 21, to: 27, label: "المدينة", cls: "bg-maroon-light" },
  { from: 28, to: 28, label: "العودة", cls: "bg-ink" },
];

// ───────────────────────── Transport & meals ─────────────────────────

export function nextBus(where: Where, i: number): string {
  switch (where) {
    case "damascus":
      return "حافلة التجمّع 01:30 من ساحة المزة — الحضور إلى المطار 02:30";
    case "jeddah":
      return "الحافلة 32 — الساحة (ج) — مهيأة للكرسي المتحرك — تنطلق 10:20";
    case "makkah":
      if (i === 12) return "غداً 07:00 إلى منى — الحافلتان 7 و8 — البوابة الجنوبية";
      if (i === 20) return "غداً 10:00 إلى المدينة بعد طواف الوداع";
      return "حافلة الحرم التالية: 14:00 — البوابة الجنوبية للفندق";
    case "mina":
      return i === 13 ? "غداً 06:30 إلى عرفة — الحافلتان 7 و8" : i === 17 ? "العودة إلى مكة 18:00 — الحافلتان 7 و8" : "الرمي مشياً مع المجموعة — التجمّع أمام الخيمة 12";
    case "arafat":
      return "إلى مزدلفة بعد الغروب مباشرة — الحافلتان 7 و8";
    case "muzdalifah":
      return "كبار السن ومرافقوهم: حافلة مبكرة 00:30 — البقية بعد الفجر 05:15";
    case "madinah":
      return i === 27 ? "غداً 09:00 إلى مطار المدينة — التجمّع 08:00 في البهو" : "لا حاجة إلى حافلة — المسجد النبوي على بعد 300 متر";
    case "home":
      return "حافلة التكتل من المطار إلى ساحة المزة";
  }
}

export type Meal = { key: "breakfast" | "lunch" | "dinner"; name: string; time: string; start: string; place: string; menu: string };

const HOTEL_MENUS: Record<Meal["key"], string[]> = {
  breakfast: ["فول، بيض، جبن، زيتون، خبز، فواكه، شاي وقهوة", "فتة حمص، لبنة، زعتر وزيت، عسل، فواكه، شاي", "مسبّحة، بيض مسلوق، حلاوة، مربى، خبز، حليب"],
  lunch: ["كبسة دجاج، شوربة عدس، سلطة، أرز، لبن", "مقلوبة باذنجان، سلطة عربية، شوربة خضار، لبن", "كبة بالصينية، أرز بشعيرية، فتوش، عصير"],
  dinner: ["مندي لحم، خضار مشوية، حساء، حلوى", "شيش طاووق، بطاطا، متبل، سلطة، مهلبية", "ملوخية بالدجاج، أرز، سلطة خضراء، فاكهة"],
};

export function mealsFor(where: Where, i: number): Meal[] {
  if (where === "makkah") {
    const k = (i + 1) % 3; // day index 2 (26 ذو القعدة) shows the spec's menu
    return [
      { key: "breakfast", name: "الفطور", time: "06:00 – 09:00", start: "06:00", place: "مطعم الطابق (م)", menu: HOTEL_MENUS.breakfast[k] },
      { key: "lunch", name: "الغداء", time: "13:00 – 15:00", start: "13:00", place: "مطعم الطابق (م)", menu: HOTEL_MENUS.lunch[k] },
      { key: "dinner", name: "العشاء", time: "19:00 – 22:00", start: "19:00", place: "مطعم الطابق (م)", menu: HOTEL_MENUS.dinner[k] },
    ];
  }
  if (where === "madinah") {
    const k = i % 3;
    return [
      { key: "breakfast", name: "الفطور", time: "05:30 – 08:30", start: "05:30", place: "مطعم الفندق — مبكر لصلاة الفجر", menu: HOTEL_MENUS.breakfast[k] },
      { key: "lunch", name: "الغداء", time: "13:00 – 15:00", start: "13:00", place: "مطعم الفندق", menu: HOTEL_MENUS.lunch[(k + 1) % 3] },
      { key: "dinner", name: "العشاء", time: "20:00 – 22:30", start: "20:00", place: "مطعم الفندق", menu: HOTEL_MENUS.dinner[(k + 2) % 3] },
    ];
  }
  if (where === "mina" || where === "arafat" || where === "muzdalifah") {
    const eid = i === 15;
    return [
      { key: "breakfast", name: "الفطور", time: "06:00", start: "06:00", place: "مدخل الخيمة", menu: "وجبة مغلّفة: جبن، زيتون، خبز، تمر، عصير" },
      { key: "lunch", name: eid ? "غداء العيد" : "الغداء", time: "13:00", start: "13:00", place: "داخل الخيمة", menu: eid ? "لحم وأرز — وجبة عيد" : "أرز ولحم، سلطة، فاكهة" },
      { key: "dinner", name: "العشاء", time: "19:30", start: "19:30", place: "داخل الخيمة", menu: "دجاج مشوي، خبز، حمص، لبن — ماء وعصير طوال اليوم" },
    ];
  }
  if (where === "jeddah" || where === "damascus")
    return [
      { key: "breakfast", name: "وجبة الطائرة", time: "06:30", start: "06:30", place: "على متن الرحلة 1448-07", menu: "سندويشة جبن، كعك، عصير، ماء" },
      { key: "lunch", name: "الغداء", time: "13:00 – 15:00", start: "13:00", place: "فندق أبراج النور — الطابق (م)", menu: HOTEL_MENUS.lunch[0] },
      { key: "dinner", name: "العشاء", time: "19:00 – 22:00", start: "19:00", place: "فندق أبراج النور — الطابق (م)", menu: HOTEL_MENUS.dinner[0] },
    ];
  return [{ key: "lunch", name: "وجبة الطائرة", time: "14:30", start: "14:30", place: "على متن الرحلة 1448-07R", menu: "أرز ودجاج، سلطة، كعكة، ماء" }];
}

export function nextMeal(meals: Meal[], time: string) {
  return meals.find((m) => m.start > time) ?? null;
}

// ───────────────────────── Trips & lessons ─────────────────────────

export type Trip = { id: string; title: string; when: string; gather: string; back: string; seats: number; booked: number; lead: string; days: number[]; mandatory?: boolean; note?: string };

export const TRIPS: Trip[] = [
  { id: "umrah", title: "العمرة الأولى (تمتّع)", when: "الليلة 21:30", gather: "بهو الفندق 21:00", back: "02:00", seats: 50, booked: 47, lead: "أحمد سليمان + الشيخ خالد", days: [0], mandatory: true, note: "كبار السن بالكرسي مع مرافقيهم" },
  { id: "haram", title: "رحلة إلى المسجد الحرام", when: "12:00", gather: "البوابة الجنوبية", back: "حافلات كل ساعة من موقف (ب) — آخر حافلة 24:00", seats: 50, booked: 37, lead: "ياسر عبد الله", days: [1, 2, 3, 5, 6, 8, 9, 11, 12, 19, 20] },
  { id: "taneem", title: "التنعيم — عمرة عن الغير", when: "28 ذو القعدة 16:00", gather: "البوابة الجنوبية 15:45", back: "21:00", seats: 50, booked: 30, lead: "ياسر عبد الله", days: [3, 4], note: "«من أراد العمرة عن غيره فليتحلل من عمرته السابقة أولاً» — الشيخ خالد" },
  { id: "landmarks", title: "زيارة معالم مكة (جبل النور، غار ثور من بعيد، المتحف)", when: "2 ذو الحجة 08:00", gather: "البوابة الجنوبية", back: "13:00", seats: 90, booked: 81, lead: "ياسر + معاون المجموعة 31", days: [6, 7] },
  { id: "mashaer-visit", title: "زيارة المشاعر قبل الحج (تعرّف على المخيم)", when: "5 ذو الحجة 15:00", gather: "البوابة الجنوبية", back: "18:00", seats: 50, booked: 47, lead: "أحمد سليمان", days: [9, 10], mandatory: true },
  { id: "ifadah", title: "طواف الإفاضة والسعي", when: "13 ذو الحجة 03:30", gather: "بهو الفندق 03:15", back: "08:00", seats: 50, booked: 47, lead: "الشيخ خالد الرفاعي", days: [17, 18], mandatory: true, note: "كبار السن بالكرسي في الدور المخصص" },
  { id: "rawdah", title: "زيارة الروضة الشريفة", when: "18 ذو الحجة — 02:00 رجال / 10:00 سيدات", gather: "بهو الفندق قبل الموعد بنصف ساعة", back: "بعد الزيارة", seats: 50, booked: 46, lead: "أحمد سليمان", days: [21, 22, 23], note: "اطلب الكرسي المتحرك مسبقاً من هنا" },
  { id: "quba", title: "قباء وأحد والقبلتين", when: "19 ذو الحجة 08:00", gather: "بهو الفندق", back: "12:30", seats: 50, booked: 43, lead: "ياسر + الشيخ خالد", days: [22, 23, 24] },
];

export type Lesson = { id: string; title: string; when: string; place: string; by: string; interested: number; scope?: "تكتل" };

export function lessonsFor(i: number, where: Where): Lesson[] {
  if (where === "makkah" && i <= 12) {
    const list: Lesson[] = [
      { id: `tawaf-${i}`, title: i < 6 ? "أحكام الطواف والسعي للمتمتّع" : "ما يُباح وما يُحظر على المحرم", when: "اليوم 20:30", place: "قاعة الطابق (م)", by: "الشيخ خالد الرفاعي", interested: 63 },
      { id: `next-${i}`, title: i < 6 ? "ما يُباح وما يُحظر على المحرم" : "أعمال يوم التروية", when: "غداً 20:30", place: "القاعة نفسها", by: "الشيخ خالد الرفاعي", interested: 41 },
    ];
    if (i >= 9) list.push({ id: "arafah", title: "يوم عرفة: فضله وأدعيته", when: "7 ذو الحجة 20:00", place: "قاعة البرج (أ) الكبرى", by: "الشيخ عبد الرحمن العلي", interested: 212, scope: "تكتل" });
    return list;
  }
  if (where === "mina" && i === 13) return [{ id: "arafah-deeds", title: "أعمال يوم عرفة", when: "بعد العصر", place: "الخيمة 12", by: "الشيخ خالد الرفاعي", interested: 48 }];
  if (where === "mina") return [{ id: `rami-${i}`, title: "أحكام رمي الجمرات والتعجّل", when: "قبل الظهر", place: "الخيمة 12", by: "الشيخ خالد الرفاعي", interested: 45 }];
  if (where === "arafat") return [{ id: "khutbah", title: "خطبة عرفة وصلاة الظهر والعصر جمعاً", when: "12:15", place: "الخيمة 12", by: "الشيخ خالد الرفاعي", interested: 48 }];
  if (where === "makkah" && i >= 17) return [{ id: `wada-${i}`, title: "أحكام طواف الوداع", when: "15 ذو الحجة 20:30", place: "قاعة الطابق (م)", by: "الشيخ خالد الرفاعي", interested: 44 }];
  if (where === "madinah") return [{ id: `madinah-${i}`, title: i < 23 ? "آداب زيارة المسجد النبوي والروضة" : "سيرة غزوة أحد — قبل الرحلة", when: "اليوم بعد العشاء", place: "قاعة الفندق", by: "الشيخ خالد الرفاعي", interested: 39 }];
  return [];
}

// ───────────────────────── Zone notifications ─────────────────────────

export type Notice = { time: string; scope: "رسمي" | "حسب المنطقة" | "حسب المجموعة" | "حسب الفرد" | "حسب الحالة"; text: string; tone: "heat" | "crowd" | "info" | "good" | "personal" };

/** `companion.name` is "أنت" when the signed-in pilgrim is the official companion */
export function noticesFor(i: number, n: number, companion?: { name: string; elder: string }): Notice[] {
  const out: Notice[] = [];
  const add = (time: string, scope: Notice["scope"], text: string, tone: Notice["tone"] = "info") => out.push({ time, scope, text, tone });
  switch (i) {
    case 0:
      add("01:32", "حسب المجموعة", "انطلقت حافلة المجموعة 27 إلى المطار.", "good");
      add("07:50", "حسب الفرد", "تذكير: تقتربون من ميقات أهل الشام. انووا العمرة إن كنتم متمتعين.", "personal");
      add("08:44", "رسمي", "أهلاً بكم في المملكة العربية السعودية. حافلتكم رقم 32 في الساحة (ج). رئيس مجموعتكم بانتظاركم عند اللافتة.");
      add("12:10", "حسب المجموعة", "مرحباً بكم. العمرة الليلة: تجمّع في بهو الفندق 21:00. الحافلة 21:30.");
      break;
    case 12:
      add("09:00", "رسمي", "غداً الانتقال إلى منى. يُسمح بحقيبة صغيرة واحدة. الإحرام من الفندق. الأدوية والبطاقة والسوار معكم.");
      add("18:00", "حسب المجموعة", "التجمّع غداً 07:00 عند البوابة الجنوبية — الحافلتان 7 و8.");
      break;
    case 13:
      add("07:12", "حسب المجموعة", "اكتمل صعود الحافلات: 48 من 48.", "good");
      add("08:05", "حسب المنطقة", "وصلتم إلى مخيم 42 — المربع 7. الحمامات 40 متراً يساراً، والعيادة عند المدخل.");
      add("16:00", "حسب المجموعة", "غداً الانطلاق إلى عرفة 06:30 — الحافلتان 7 و8.");
      break;
    case 14:
      add("11:00", "حسب المنطقة", "الحرارة 41 درجة في عرفة — التزموا الخيام حتى العصر — الماء البارد عند المدخل.", "heat");
      add("14:30", "حسب المنطقة", "إجهاد حراري في مخيمات مجاورة. اشربوا الماء كل نصف ساعة واستعملوا المظلة.", "heat");
      add("18:40", "حسب المجموعة", "التجمّع للانتقال إلى مزدلفة بعد المغرب مباشرة أمام الخيمة 12.");
      if (companion) add("22:10", "حسب الفرد", `حافلة كبار السن من مزدلفة إلى منى تنطلق 00:30 — ${companion.name} و${companion.elder} مسجّلان.`, "personal");
      break;
    case 15:
      add("06:30", "حسب المنطقة", "كثافة عالية في الدور الأرضي للجمرات حتى 10:00 — مسار تكتل النور: الدور الثالث من الجهة الشرقية.", "crowd");
      add("10:20", "حسب الحالة", `تم ذبح الهدي عن أفراد طلبك (${n}) — رقم القسيمة H-1448-27-${String(n).padStart(2, "0")}.`, "good");
      add("11:00", "حسب المجموعة", "بعد الحلق يجوز لكم لبس المخيط — الشيخ خالد.");
      add("12:00", "رسمي", "تقبّل الله منكم. كل عام وأنتم بخير.", "good");
      break;
    case 16:
    case 17:
      add("10:00", "حسب المنطقة", "موعد رمي تكتل النور اليوم: 14:30 – 15:30 — الدور الثالث.", "crowd");
      add("13:45", "حسب المنطقة", "ازدحام شديد عند جمرة العقبة — التزموا المسار المحدد ولا تتوقفوا عند الأحواض.", "crowd");
      if (i === 17) add("16:00", "حسب المجموعة", "التجمّع 18:00 أمام الخيمة 12 للعودة إلى مكة (التعجّل).");
      break;
    case 18:
      add("08:10", "حسب الحالة", "✓ الإحرام ✓ عرفة ✓ مزدلفة ✓ الرمي ✓ الهدي ✓ الحلق ✓ طواف الإفاضة ✓ السعي — تم التحلل الكامل.", "good");
      break;
    case 20:
      add("20:30", "حسب المجموعة", "غداً طواف الوداع 04:00، ثم الإفطار وتسليم الغرف حتى 09:00 بمسح البطاقة.");
      break;
    case 21:
      add("15:35", "حسب المنطقة", "وصلتم إلى المدينة المنورة — المسجد النبوي على بعد 300 متر من الفندق.", "good");
      add("19:00", "حسب المجموعة", "موعد الروضة الشريفة للمجموعة: 18 ذو الحجة — 02:00 للرجال و10:00 للسيدات.");
      break;
    case 22:
      add("21:00", "حسب الفرد", "غداً موعد الروضة الشريفة: الرجال 02:00 والسيدات 10:00. اطلب الكرسي المتحرك مسبقاً.", "personal");
      break;
    case 23:
      add("01:15", "حسب المنطقة", "بعد 45 دقيقة موعد الروضة للرجال — التجمّع في بهو الفندق.", "personal");
      add("09:15", "حسب المنطقة", "ازدحام عند باب السلام — ادخلوا من باب الملك فهد في موعد السيدات.", "crowd");
      break;
    case 27:
      add("20:00", "رسمي", "غداً رحلة العودة. الوزن المسموح 23 كغ. ماء زمزم (5 لتر) يُسلَّم مغلّفاً في المطار حسب تعليمات الناقل.");
      break;
    case 28:
      add("14:05", "حسب الحالة", "أقلعت رحلة العودة 1448-07R — الوصول المتوقع 17:10.");
      add("17:12", "رسمي", "حمداً لله على السلامة. حج مبرور وسعي مشكور. نرجو تقييم رحلتك كاملة من التطبيق.", "good");
      break;
    default:
      if (i >= 1 && i <= 11) {
        if (i === 2 || i === 8) add("11:20", "حسب المنطقة", "ازدحام على طريق العزيزية المؤدي إلى الحرم. حافلة 12:00 قد تتأخر 20 دقيقة.", "crowd");
        if (i === 3) add("16:00", "حسب الفرد", "تذكير: رحلة التنعيم غداً 16:00. نقطة التجمّع: البوابة الجنوبية.", "personal");
        add("12:45", "حسب المنطقة", "الغداء يبدأ خلال 15 دقيقة في مطعم الطابق (م).");
        add("20:00", "حسب المجموعة", "الدرس اليومي 20:30 في قاعة الطابق (م) مع الشيخ خالد.");
      } else if (i >= 22) {
        add("05:00", "حسب المنطقة", "الفطور مبكر اليوم من 05:30 لمن يصلي الفجر في المسجد النبوي.");
      } else {
        add("12:45", "حسب المنطقة", "الغداء يبدأ خلال 15 دقيقة.");
      }
  }
  return out;
}

// ───────────────────────── Stage ratings & final evaluation ─────────────────────────

export function stageQuestionFor(i: number, where: Where): { key: string; q: string } | null {
  if (i === 0 && where === "makkah") return { key: "stage-arrival", q: "كيف تقيّم الاستقبال في المطار ورحلة الحافلة إلى مكة؟" };
  if (i === 1) return { key: "stage-hotel", q: "كيف تقيّم الغرفة والنظافة وخدمات الفندق؟" };
  if (i === 5) return { key: "stage-trip", q: "كيف تقيّم رحلة اليوم إلى الحرم؟" };
  if (i === 21 && where === "makkah") return { key: "stage-tawaf", q: "كيف تقيّم تنظيم الطوافين والمرافقة الدينية؟" };
  if (i === 21 && where === "madinah") return { key: "stage-makkah-hotel", q: "كيف تقيّم إقامتك الكاملة في فندق أبراج النور؟" };
  if (i === 24) return { key: "stage-madinah", q: "كيف تقيّم الإقامة والبرنامج في المدينة؟" };
  if (i === 28 && where === "home") return { key: "stage-return", q: "كيف تقيّم تنظيم رحلة العودة؟" };
  return null;
}

export const MASHAER_ITEMS = [
  { key: "mashaer-camp", label: "المخيم في منى" },
  { key: "mashaer-arafat", label: "التنظيم في عرفة" },
  { key: "mashaer-transport", label: "النقل بين المشاعر" },
  { key: "mashaer-meals", label: "الوجبات في المخيم" },
  { key: "mashaer-guidance", label: "التوجيه الديني" },
  { key: "mashaer-elderly", label: "التعامل مع كبار السن" },
];

/** Spec phase 21 — 13 items. `related` lists rating keys (post:*, app:*, season:*) averaged next to each item */
export const EVALUATION: { key: string; label: string; related: string[]; yesNo?: boolean }[] = [
  { key: "registration", label: "التسجيل والقرعة", related: ["app:acceptance", "post:confirm"] },
  { key: "payment", label: "الدفع والوثائق", related: ["post:documents", "post:payment"] },
  { key: "travel", label: "السفر والطيران", related: ["post:visa", "season:stage-arrival", "season:stage-return"] },
  { key: "transport", label: "النقل الداخلي", related: ["season:stage-trip", "season:mashaer-transport"] },
  { key: "makkah", label: "الفندق في مكة", related: ["season:stage-hotel", "season:stage-makkah-hotel"] },
  { key: "madinah", label: "الفندق في المدينة", related: ["season:stage-madinah"] },
  { key: "food", label: "الطعام", related: ["season:meal-*", "season:mashaer-meals"] },
  { key: "group", label: "المجموعة والتنظيم", related: ["post:group"] },
  { key: "leader", label: "رئيس المجموعة (أحمد سليمان)", related: [] },
  { key: "guide", label: "الموجّه (الشيخ خالد الرفاعي)", related: ["season:mashaer-guidance", "season:stage-tawaf"] },
  { key: "programs", label: "البرامج الدينية", related: ["season:stage-tawaf"] },
  { key: "support", label: "الدعم والطوارئ", related: ["tickets:*"] },
  { key: "recommend", label: "هل توصي بتكتل النور؟", related: [], yesNo: true },
];
