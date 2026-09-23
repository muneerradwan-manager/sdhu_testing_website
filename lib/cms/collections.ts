/**
 * مجموعات المحتوى: عناصر متشابهة يحرّرها الموظف واحداً واحداً — المقالات، الدروس،
 * أيام دليل المناسك، الأسئلة الشائعة، الحملات المعتمدة.
 *
 * العناصر الأصلية (`builtIn`) تأتي من ملفات البيانات كما هي، فتبقى المرجع الذي تعود إليه
 * «استعادة الأصل». وما يعدّله الموظف يُحفظ فوقها دون المساس بها.
 *
 * الروابط المحجوزة (`slots`): الموقع يُصدَّر ملفات ثابتة، فلا يمكن توليد رابط جديد بعد البناء.
 * لذلك تُبنى روابط فارغة جاهزة، ينزل فيها ما يُنشئه الموظف ويعمل فوراً.
 */

import { TRACKS, type Lesson, type Track } from "@/lib/data/academy";
import { CLUSTERS } from "@/lib/data/clusters";
import { DAYS, GUIDE_DUAS } from "@/lib/data/guide";
import { FAQS, FAQ_CATEGORIES } from "@/lib/data/faq";
import { ARTICLES, CATEGORIES } from "@/lib/data/news";
import type { CollectionDef, Field, SelectOption } from "./types";

const opts = (values: readonly string[]): SelectOption[] => values.map((v) => ({ value: v, label: v }));

/** حقل قائمة نصوص بسيطة (وسوم، نقاط، مهام...) */
const textList = (key: string, label: string, itemName: string, def: readonly string[] = [], rows?: number): Field => ({
  key,
  label,
  kind: "list",
  itemName,
  itemTitleKey: "text",
  wide: true,
  item: [{ key: "text", label: "النص", kind: rows ? "textarea" : "text", rows, def: "", wide: true }],
  def: def.map((text) => ({ text })),
});

/** يحوّل قائمة النصوص المحفوظة إلى مصفوفة نصوص، ويقبل الشكلين القديم والجديد */
export function toStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : x && typeof x === "object" && "text" in x ? String((x as { text: unknown }).text ?? "") : ""))
    .filter(Boolean);
}

const TONES = opts(["green", "gold", "maroon"]);

// ═══════════════════════════ مقالات الأخبار ═══════════════════════════

const NEWS: CollectionDef = {
  id: "news",
  label: "مقالات الأخبار والإعلانات",
  itemName: "مقال",
  icon: "Megaphone",
  group: "مجموعات المحتوى",
  description: "كل ما يُنشر في مدونة الإدارة: الإعلانات والقرارات والتعاميم، بنصوصها الكاملة وصورها ووسومها.",
  path: "/news",
  itemHref: (id) => `/news/${id}`,
  titleKey: "title",
  subtitleKey: "excerpt",
  imageKey: "image",
  badgeKey: "category",
  slots: Array.from({ length: 12 }, (_, i) => `post-${i + 1}`),
  fields: [
    { key: "title", label: "العنوان", kind: "text", def: "", wide: true },
    { key: "category", label: "التصنيف", kind: "select", options: opts(CATEGORIES), def: CATEGORIES[0] },
    { key: "image", label: "صورة المقال", kind: "image", def: "/images/haram-2022.jpg", wide: true },
    { key: "excerpt", label: "المقدمة المختصرة", kind: "textarea", rows: 3, def: "", wide: true, hint: "تظهر في بطاقة المقال وفي نتائج البحث." },
    { key: "hijri", label: "التاريخ الهجري", kind: "text", def: "", placeholder: "1 رجب 1448هـ" },
    { key: "gregorian", label: "التاريخ الميلادي", kind: "text", def: "", placeholder: "10 كانون الأول 2026م" },
    { key: "iso", label: "تاريخ الترتيب", kind: "text", def: "", placeholder: "2026-12-10", hint: "بصيغة سنة-شهر-يوم؛ عليه يُرتَّب أحدث المنشورات." },
    { key: "author", label: "الكاتب", kind: "text", def: "" },
    { key: "department", label: "الجهة المصدِرة", kind: "text", def: "" },
    { key: "views", label: "عدد القراءات", kind: "number", def: 0, min: 0 },
    { key: "pinned", label: "مثبّت في أعلى المدونة", kind: "boolean", def: false },
    { key: "ticker", label: "نص الشريط العاجل", kind: "text", def: "", wide: true, hint: "اتركه فارغاً إن لم ترد ظهوره في الشريط." },
    textList("tags", "الوسوم", "وسم"),
    { key: "body", label: "متن المقال", kind: "blocks", def: [], wide: true, hint: "أضف فقرات وعناوين وقوائم وجداول وتنبيهات واقتباسات بالترتيب الذي تريده." },
  ],
  builtIn: ARTICLES.map((a) => ({
    id: a.slug,
    values: {
      title: a.title,
      category: a.category,
      image: a.image,
      excerpt: a.excerpt,
      hijri: a.hijri,
      gregorian: a.gregorian,
      iso: a.iso,
      author: a.author,
      department: a.department,
      views: a.views,
      pinned: !!a.pinned,
      ticker: a.ticker ?? "",
      tags: a.tags.map((text) => ({ text })),
      body: a.body,
    },
  })),
};

// ═══════════════════════════ الأسئلة الشائعة ═══════════════════════════

const FAQ: CollectionDef = {
  id: "faq",
  label: "الأسئلة الشائعة",
  itemName: "سؤال",
  icon: "MessageSquare",
  group: "مجموعات المحتوى",
  description: "الأسئلة وأجوبتها المعتمدة كما تظهر في صفحة الشروط والتكاليف.",
  path: "/conditions#faq",
  titleKey: "q",
  subtitleKey: "a",
  badgeKey: "category",
  slots: Array.from({ length: 10 }, (_, i) => `faq-${i + 1}`),
  fields: [
    { key: "category", label: "التصنيف", kind: "select", options: opts(FAQ_CATEGORIES), def: FAQ_CATEGORIES[0], wide: true },
    { key: "q", label: "السؤال", kind: "textarea", rows: 2, def: "", wide: true },
    { key: "a", label: "الجواب", kind: "textarea", rows: 5, def: "", wide: true },
  ],
  builtIn: FAQS.map((f, i) => ({ id: `faq-builtin-${i}`, values: { category: f.category, q: f.q, a: f.a } })),
};

// ═══════════════════════════ أيام دليل المناسك ═══════════════════════════

const GUIDE_DAYS: CollectionDef = {
  id: "guideDays",
  label: "أيام دليل المناسك",
  itemName: "يوم",
  icon: "CalendarDays",
  group: "مجموعات المحتوى",
  description: "ما يفعله الحاج في كل يوم من 8 إلى 13 ذي الحجة: الأعمال والمواعيد والدعاء والمكان على الخريطة.",
  path: "/guide",
  titleKey: "name",
  subtitleKey: "intro",
  imageKey: "image",
  badgeKey: "hijri",
  fields: [
    { key: "name", label: "اسم اليوم", kind: "text", def: "" },
    { key: "day", label: "رقم اليوم", kind: "text", def: "", hint: "يظهر في شريط الأيام." },
    { key: "hijri", label: "التاريخ الهجري", kind: "text", def: "", wide: true },
    { key: "image", label: "صورة اليوم", kind: "image", def: "", wide: true },
    { key: "intro", label: "التقديم", kind: "textarea", rows: 3, def: "", wide: true },
    { key: "placeLabel", label: "اسم المكان", kind: "text", def: "", wide: true },
    { key: "placeLat", label: "خط العرض", kind: "number", def: 21.42, step: 0.0001 },
    { key: "placeLng", label: "خط الطول", kind: "number", def: 39.82, step: 0.0001 },
    textList("tasks", "أعمال اليوم", "عمل", [], 2),
    {
      key: "times",
      label: "المواعيد التقريبية",
      kind: "list",
      itemName: "موعد",
      itemTitleKey: "label",
      wide: true,
      item: [
        { key: "time", label: "الساعة", kind: "text", def: "", placeholder: "08:00" },
        { key: "label", label: "الحدث", kind: "text", def: "", wide: true },
      ],
      def: [],
    },
    { key: "duaTitle", label: "عنوان الدعاء", kind: "text", def: "", wide: true },
    { key: "duaText", label: "نص الدعاء", kind: "textarea", rows: 3, def: "", wide: true },
  ],
  builtIn: DAYS.map((d) => ({
    id: d.id,
    values: {
      name: d.name,
      day: d.day,
      hijri: d.hijri,
      image: d.image,
      intro: d.intro,
      placeLabel: d.place.label,
      placeLat: d.place.lat,
      placeLng: d.place.lng,
      tasks: d.tasks.map((text) => ({ text })),
      times: d.times.map((t) => ({ time: t.time, label: t.label })),
      duaTitle: d.dua.title,
      duaText: d.dua.text,
    },
  })),
};

// ═══════════════════════════ أدعية الدليل ═══════════════════════════

const GUIDE_DUA_COLLECTION: CollectionDef = {
  id: "guideDuas",
  label: "أدعية دليل المناسك",
  itemName: "دعاء",
  icon: "HandHeart",
  group: "مجموعات المحتوى",
  description: "الأدعية المأثورة التي تظهر في الدليل، مع موضعها ومصدرها.",
  path: "/guide",
  titleKey: "title",
  subtitleKey: "text",
  badgeKey: "when",
  slots: Array.from({ length: 8 }, (_, i) => `dua-${i + 1}`),
  fields: [
    { key: "title", label: "عنوان الدعاء", kind: "text", def: "", wide: true },
    { key: "when", label: "متى يُقال؟", kind: "text", def: "", wide: true },
    { key: "text", label: "النص", kind: "textarea", rows: 4, def: "", wide: true },
    { key: "source", label: "المصدر", kind: "text", def: "", wide: true },
  ],
  builtIn: GUIDE_DUAS.map((d, i) => ({ id: `dua-builtin-${i}`, values: { title: d.title, when: d.when, text: d.text, source: d.source } })),
};

// ═══════════════════════════ الحملات المعتمدة ═══════════════════════════

const CLUSTER_COLLECTION: CollectionDef = {
  id: "clusters",
  label: "التكتلات والحملات المعتمدة",
  itemName: "تكتل",
  icon: "ShieldCheck",
  group: "مجموعات المحتوى",
  description: "الجهات المعتمدة للموسم كما تظهر في صفحة التحقق: برامجها وسكنها ونقلها وتقييمها.",
  path: "/verify",
  titleKey: "name",
  subtitleKey: "about",
  badgeKey: "level",
  fields: [
    { key: "name", label: "اسم التكتل", kind: "text", def: "", wide: true },
    { key: "level", label: "مستوى الخدمة", kind: "select", options: opts(["عادي", "محسّن", "خمس نجوم"]), def: "عادي" },
    { key: "tone", label: "لون البطاقة", kind: "select", options: TONES, def: "green" },
    { key: "since", label: "يعمل منذ (هجري)", kind: "number", def: 1440, min: 1300, max: 1500 },
    { key: "approvedOn", label: "تاريخ الاعتماد", kind: "text", def: "", wide: true },
    { key: "governorate", label: "المحافظة", kind: "text", def: "" },
    { key: "office", label: "المكتب", kind: "text", def: "" },
    { key: "specialty", label: "التخصص", kind: "text", def: "", wide: true },
    { key: "about", label: "نبذة", kind: "textarea", rows: 3, def: "", wide: true },
    { key: "rating", label: "التقييم", kind: "number", def: 4.5, min: 0, max: 5, step: 0.1 },
    { key: "reviews", label: "عدد المقيّمين", kind: "number", def: 0, min: 0 },
    { key: "groupsCount", label: "عدد المجموعات", kind: "number", def: 0, min: 0 },
    { key: "pilgrims", label: "عدد الحجاج", kind: "number", def: 0, min: 0 },
    { key: "privateRoomDiff", label: "فارق الغرفة الخاصة ($)", kind: "number", def: 0, min: 0 },
    { key: "makkahHotel", label: "فندق مكة", kind: "text", def: "", wide: true },
    { key: "makkahArea", label: "منطقة السكن في مكة", kind: "text", def: "" },
    { key: "makkahDistance", label: "المسافة عن الحرم", kind: "text", def: "" },
    { key: "makkahRooms", label: "نوع الغرف", kind: "text", def: "", wide: true },
    textList("makkahFeatures", "مزايا سكن مكة", "ميزة"),
    { key: "madinahHotel", label: "فندق المدينة", kind: "text", def: "", wide: true },
    { key: "madinahArea", label: "منطقة السكن في المدينة", kind: "text", def: "" },
    { key: "madinahDistance", label: "المسافة عن المسجد النبوي", kind: "text", def: "" },
    textList("transport", "المواصلات", "خدمة"),
    textList("meals", "الإعاشة", "خدمة"),
    textList("programs", "البرامج", "برنامج"),
    {
      key: "groups",
      label: "المجموعات",
      kind: "list",
      itemName: "مجموعة",
      itemTitleKey: "leader",
      wide: true,
      item: [
        { key: "no", label: "رقم المجموعة", kind: "number", def: 1, min: 1 },
        { key: "leader", label: "رئيس المجموعة", kind: "text", def: "", wide: true },
        { key: "capacity", label: "السعة", kind: "number", def: 50, min: 1 },
        { key: "remaining", label: "المتبقي", kind: "number", def: 0, min: 0 },
      ],
      def: [],
    },
  ],
  // Reserved URLs, so a cluster the staff add opens its own full page in the exported site
  slots: Array.from({ length: 6 }, (_, i) => `cluster-${i + 1}`),
  builtIn: CLUSTERS.map((c) => ({
    id: c.slug,
    values: {
      name: c.name,
      level: c.level,
      tone: c.tone,
      since: c.since,
      approvedOn: c.approvedOn,
      governorate: c.governorate,
      office: c.office,
      specialty: c.specialty,
      about: c.about,
      rating: c.rating,
      reviews: c.reviews,
      groupsCount: c.groupsCount,
      pilgrims: c.pilgrims,
      privateRoomDiff: c.privateRoomDiff,
      makkahHotel: c.makkah.hotel,
      makkahArea: c.makkah.area,
      makkahDistance: c.makkah.distance,
      makkahRooms: c.makkah.rooms,
      makkahFeatures: c.makkah.features.map((text) => ({ text })),
      madinahHotel: c.madinah.hotel,
      madinahArea: c.madinah.area,
      madinahDistance: c.madinah.distance,
      transport: c.transport.map((text) => ({ text })),
      meals: c.meals.map((text) => ({ text })),
      programs: c.programs.map((text) => ({ text })),
      groups: c.groups.map((g) => ({ no: g.no, leader: g.leader, capacity: g.capacity, remaining: g.remaining })),
    },
  })),
};

// ═══════════════════════════ الأكاديمية ═══════════════════════════

const TRACK_COLLECTION: CollectionDef = {
  id: "academyTracks",
  label: "مسارات الأكاديمية",
  itemName: "مسار",
  icon: "BookOpenText",
  group: "مجموعات المحتوى",
  description: "تعريف كل مسار في أكاديمية الدروس الدينية: عنوانه ووصفه وصورته ومعرض صوره.",
  path: "/academy",
  itemHref: (id) => `/academy/${id}`,
  titleKey: "title",
  subtitleKey: "description",
  imageKey: "image",
  fields: [
    { key: "title", label: "عنوان المسار", kind: "text", def: "", wide: true },
    { key: "short", label: "الوصف المختصر", kind: "textarea", rows: 2, def: "", wide: true },
    { key: "description", label: "الوصف الكامل", kind: "textarea", rows: 3, def: "", wide: true },
    { key: "image", label: "صورة المسار", kind: "image", def: "", wide: true },
    {
      key: "icon",
      label: "الأيقونة",
      kind: "select",
      def: "kaaba",
      options: [
        { value: "kaaba", label: "الكعبة" },
        { value: "umrah", label: "العمرة" },
        { value: "heart", label: "القلب" },
        { value: "madinah", label: "المدينة" },
        { value: "dua", label: "الدعاء" },
        { value: "bag", label: "الحقيبة" },
      ],
    },
    { key: "tone", label: "اللون", kind: "select", options: TONES, def: "green" },
    {
      key: "gallery",
      label: "معرض الصور",
      kind: "list",
      itemName: "صورة",
      itemTitleKey: "src",
      wide: true,
      item: [{ key: "src", label: "الصورة", kind: "image", def: "", wide: true }],
      def: [],
    },
    {
      key: "levels",
      label: "عناوين المستويات",
      kind: "list",
      itemName: "مستوى",
      itemTitleKey: "title",
      wide: true,
      hint: "الترتيب هنا يطابق ترتيب مستويات المسار؛ الدروس تُحرَّر من مجموعة «دروس الأكاديمية».",
      item: [
        { key: "title", label: "عنوان المستوى", kind: "text", def: "", wide: true },
        { key: "subtitle", label: "وصف المستوى", kind: "text", def: "", wide: true },
      ],
      def: [],
    },
  ],
  builtIn: TRACKS.map((t) => ({
    id: t.slug,
    values: {
      title: t.title,
      short: t.short,
      description: t.description,
      image: t.image,
      icon: t.icon,
      tone: t.tone,
      gallery: t.gallery.map((src) => ({ src })),
      levels: t.levels.map((l) => ({ title: l.title, subtitle: l.subtitle })),
    },
  })),
};

/** معرّف الدرس في المجموعة = مسار/درس */
export const lessonItemId = (trackSlug: string, lessonSlug: string) => `${trackSlug}/${lessonSlug}`;

const LECTURER_OPTIONS: SelectOption[] = [
  { value: "abdulrahman", label: "الشيخ عبد الرحمن" },
  { value: "khaled", label: "الشيخ خالد" },
  { value: "huda", label: "د. هدى" },
  { value: "nour", label: "أ. نور" },
  { value: "ahmad", label: "الشيخ أحمد" },
  { value: "samer", label: "د. سامر" },
  { value: "reem", label: "م. ريم" },
];

const lessonEntries: { track: Track; lesson: Lesson; levelIndex: number }[] = TRACKS.flatMap((track) =>
  track.levels.flatMap((level, levelIndex) => level.lessons.map((lesson) => ({ track, lesson, levelIndex }))),
);

const LESSON_COLLECTION: CollectionDef = {
  id: "academyLessons",
  label: "دروس الأكاديمية",
  itemName: "درس",
  icon: "FileText",
  group: "مجموعات المحتوى",
  description: "نصوص الدروس: الملخص والنقاط والأسئلة والوسوم والأدعية ومدّة الدرس والملقي.",
  path: "/academy",
  itemHref: (id) => `/academy/${id}`,
  titleKey: "title",
  subtitleKey: "trackTitle",
  imageKey: "poster",
  badgeKey: "levelTitle",
  fields: [
    { key: "title", label: "عنوان الدرس", kind: "text", def: "", wide: true },
    { key: "minutes", label: "المدة بالدقائق", kind: "number", def: 10, min: 1, max: 180 },
    { key: "lecturer", label: "الملقي", kind: "select", options: LECTURER_OPTIONS, def: "abdulrahman" },
    { key: "poster", label: "صورة الدرس", kind: "image", def: "", wide: true },
    textList("summary", "الملخص المكتوب", "فقرة", [], 4),
    textList("points", "النقاط الرئيسية", "نقطة"),
    textList("tags", "الوسوم", "وسم"),
    {
      key: "faq",
      label: "أسئلة حول الدرس",
      kind: "list",
      itemName: "سؤال",
      itemTitleKey: "q",
      wide: true,
      item: [
        { key: "q", label: "السؤال", kind: "textarea", rows: 2, def: "", wide: true },
        { key: "a", label: "الجواب", kind: "textarea", rows: 4, def: "", wide: true },
      ],
      def: [],
    },
    {
      key: "duas",
      label: "أدعية الدرس",
      kind: "list",
      itemName: "دعاء",
      itemTitleKey: "title",
      wide: true,
      item: [
        { key: "title", label: "العنوان", kind: "text", def: "", wide: true },
        { key: "text", label: "النص", kind: "textarea", rows: 3, def: "", wide: true },
        { key: "source", label: "المصدر", kind: "text", def: "", wide: true },
      ],
      def: [],
    },
  ],
  builtIn: lessonEntries.map(({ track, lesson, levelIndex }) => ({
    id: lessonItemId(track.slug, lesson.slug),
    values: {
      title: lesson.title,
      minutes: lesson.minutes,
      lecturer: lesson.lecturer,
      poster: lesson.poster,
      summary: lesson.summary.map((text) => ({ text })),
      points: lesson.points.map((text) => ({ text })),
      tags: lesson.tags.map((text) => ({ text })),
      faq: lesson.faq.map((f) => ({ q: f.q, a: f.a })),
      duas: (lesson.duas ?? []).map((d) => ({ title: d.title, text: d.text, source: d.source ?? "" })),
      // للعرض في لوحة التحكم فقط
      trackTitle: track.title,
      levelTitle: track.levels[levelIndex].title,
    },
  })),
};

export const CMS_COLLECTIONS: CollectionDef[] = [
  NEWS,
  FAQ,
  GUIDE_DAYS,
  GUIDE_DUA_COLLECTION,
  CLUSTER_COLLECTION,
  TRACK_COLLECTION,
  LESSON_COLLECTION,
];

export function getCollectionDef(id: string) {
  return CMS_COLLECTIONS.find((c) => c.id === id) ?? null;
}
