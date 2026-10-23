/**
 * The staff portal's permissions, one by one: for every system its resources, and for every resource what may be
 * done to it — viewing it (GET), adding (POST), changing (PUT), deleting (DELETE), and the named acts that are none
 * of these (approving, publishing, exporting…). A key reads `system.resource.verb`, e.g. `flights.flights.GET` or
 * `flights.flights.lock`. Viewing is a permission too: a system shows in the menu only to whoever may view something
 * in it. Nobody is assigned a whole system any more; each permission is granted to an employee directly, and some
 * are granted for a scope only — a hall, an airport, an operation, a collection, an office, a kind of operational
 * file — so a hall supervisor is whoever holds `hall.*` for that centre, an airport's representative whoever holds
 * `airport.*` for that airport.
 */
import type { StaffUser } from "./staff";

export type Verb = "GET" | "POST" | "PUT" | "DELETE";
export const VERBS: Verb[] = ["GET", "POST", "PUT", "DELETE"];
export const VERB_LABEL: Record<Verb, string> = { GET: "عرض", POST: "إضافة", PUT: "تعديل", DELETE: "حذف" };

/** What a scoped permission is limited to */
export type ScopeKind = "center" | "airport" | "operation" | "collection" | "office" | "opfileType" | "posting";
export const SCOPE_LABEL: Record<ScopeKind, string> = {
  center: "قاعة الامتحان",
  airport: "المطار",
  operation: "العملية",
  collection: "مجموعة المحتوى",
  office: "مكتب التسجيل",
  opfileType: "نوع الملف التشغيلي",
  posting: "مواقعه في الملفات التشغيلية",
};

export type ResourceDef = {
  key: string;
  label: string;
  verbs: Verb[];
  /** Named acts beyond the four verbs: [key, label] */
  special?: [string, string][];
  /** Personal or confidential data: worth granting on its own */
  sensitive?: true;
  /** Limited to a scope (overrides the system's) */
  scope?: ScopeKind;
  note?: string;
};

export type PermSystem = { key: string; label: string; desc: string; href: string; scope?: ScopeKind; resources: ResourceDef[] };

const R = (key: string, label: string, verbs: Verb[], more: Partial<ResourceDef> = {}): ResourceDef => ({ key, label, verbs, ...more });
const G: Verb[] = ["GET"];
const CRUD: Verb[] = ["GET", "POST", "PUT", "DELETE"];

export const CATALOG: PermSystem[] = [
  {
    key: "access",
    label: "صلاحيات الموظفين",
    desc: "منح الصلاحيات للموظفين صلاحيةً صلاحية وسحبها، ومتابعة أحداث الأنظمة المهمة وما يُرفع إلى المدير.",
    href: "/staff/access",
    resources: [
      R("permissions", "صلاحيات الموظفين", ["GET", "PUT"], { special: [["copy", "نسخ صلاحيات موظف إلى آخر"]] }),
      R("important-events", "أحداث الأنظمة المهمة", G),
      R("escalations", "ما رُفع إلى المدير", ["GET", "PUT"]),
    ],
  },
  {
    key: "staff",
    label: "إدارة الموظفين",
    desc: "سجل موظفي البعثة الدائمين والمنتدبين، وحساباتهم في البوابة، ومشاركتهم في الموسم.",
    href: "/staff/employees",
    resources: [
      R("summary", "لوحة التحكم", G),
      R("employees", "سجل الموظفين", ["GET", "POST", "PUT"], { special: [["suspend", "إيقاف موظف وإعادته"]] }),
      R("employees-pii", "الرقم الوطني والهواتف والبريد", ["GET", "PUT"], { sensitive: true }),
      R("season-participation", "المشاركون في الموسم", ["GET", "POST", "DELETE"]),
      R("accounts", "حسابات البوابة", ["GET", "POST", "PUT"], { special: [["reset-password", "إرسال كلمة مرور مؤقتة"]] }),
      R("records", "سجلات الإضافة والتعديل", G),
    ],
  },
  {
    key: "registration",
    label: "إدارة التسجيل على الحج",
    desc: "صفحات التقديم على الحج وأسئلتها، وخطوات ما بعد القبول، وشروط الأهلية، والدفعات، ونشر الإصدارات، ومتابعة الطلبات.",
    href: "/staff/hajj",
    resources: [
      R("summary", "لوحة التحكم", G),
      R("pages", "صفحات التقديم وأسئلتها", CRUD),
      R("general-texts", "النصوص العامة", ["GET", "PUT"]),
      R("post-steps", "الخطوات بعد القبول", CRUD),
      R("eligibility-rules", "شروط الأهلية", CRUD),
      R("payments-tracks", "الدفعات وطرق الدفع والمساران", ["GET", "PUT"]),
      R("draft", "مسودة الإعدادات", G, { special: [["publish", "نشر التغييرات أو جدولتها"], ["discard", "تجاهل التعديلات"]] }),
      R("versions", "الإصدارات", G, { special: [["restore", "الرجوع إلى إصدار سابق"]] }),
      R("seasons", "مواسم التسجيل", ["GET", "POST"]),
      R("applications", "الطلبات", G),
      R("applications-answers", "إجابات الطلبات وموافقات الأفراد", G, { sensitive: true }),
      R("applications-payments", "الدفعات المؤكدة للطلبات", G, { sensitive: true }),
      R("preview", "المعاينة", G),
      R("activity", "سجل النشاط", G),
    ],
  },
  {
    key: "reviews",
    label: "مراجعة الطلبات والوثائق",
    desc: "قرارات الطلبات التي تحتاج مراجعة، وتصحيح البيانات المدنية، وإلحاق الحجاج بالمجموعات بعقودهم.",
    href: "/staff/reviews",
    resources: [
      R("stats", "الإحصائيات", G, { note: "أرقام النظام وما ينتظر فيه، في صفحة إحصائياته" }),
      R("applications", "الطلبات التي تحتاج قراراً", G, { special: [["approve", "اعتماد الطلب"], ["reject", "رفض الطلب"]] }),
      R("civil-claims", "تصحيح البيانات المدنية", G, { special: [["approve", "اعتماد التصحيح"], ["reject", "رفض التصحيح"]] }),
      R("group-contracts", "الإلحاق بالمجموعات", ["GET", "POST"], { special: [["approve", "اعتماد العقد"], ["return", "إعادة العقد"]] }),
    ],
  },
  {
    key: "office",
    label: "التسجيل في المكتب",
    desc: "تسجيل مواطن على الحج من مكتب التسجيل: البحث في السجل المدني، وموافقته، وأفراده، والدفع.",
    href: "/staff/registration",
    resources: [
      R("stats", "الإحصائيات", G, { note: "أرقام النظام وما ينتظر فيه، في صفحة إحصائياته" }),
      R("citizens", "البحث في السجل المدني", G, { sensitive: true, scope: "office" }),
      R("applications", "الطلبات التي سجّلها", ["GET", "POST"], { special: [["print", "طباعة الطلب"]], scope: "office" }),
      R("others-applications", "ما سجّله غيره", G, { scope: "office" }),
    ],
  },
  {
    key: "lottery",
    label: "القبول المباشر والقرعة",
    desc: "اعتماد الأعمار المقبولة مباشرة، وإحصاء التسجيل على القرعة، وإدخال نتائج البث واعتمادها ونشرها.",
    href: "/staff/lottery",
    resources: [
      R("stats", "الإحصائيات", G, { note: "أرقام النظام وما ينتظر فيه، في صفحة إحصائياته" }),
      R("ages", "الأعمار المقبولة مباشرة", G, { special: [["issue", "إرسال الأعمار للاعتماد"], ["approve", "اعتماد الأعمار وإعلانها"]] }),
      R("pool", "إحصاء التسجيل على القرعة", G, { special: [["export", "تصدير الإحصاء"]] }),
      R("draw", "نتائج البث", ["GET", "POST", "PUT"], { special: [["submit", "إرسال النتائج للاعتماد"], ["publish", "اعتماد النتائج ونشرها"]], note: "من أدخل النتائج لا يعتمدها" }),
    ],
  },
  {
    key: "admins",
    label: "إدارة الإداريين",
    desc: "قواعد الإداريين وقوائمهم المرجعية ومراجعهم، والكادر، والمتقدمون، وتشكيل المجموعات والتكتلات، والمراسلات، والتقييم والتصنيف.",
    href: "/staff/admins",
    resources: [
      R("summary", "لوحة التحكم", G),
      R("records", "سجلات التعديل", G),
      R("role-permissions", "صلاحيات الصفات في البوابة الإدارية", ["GET", "PUT"], { special: [["reset", "إرجاعها إلى الأصل"]] }),
      R("commitments", "الالتزامات", ["GET", "PUT"]),
      R("calendar", "الرزنامة", CRUD),
      R("evaluation-stages", "مراحل التقييم", CRUD),
      R("doc-types", "الشهادات والوثائق", CRUD),
      R("skills", "المهارات", CRUD),
      R("languages", "اللغات", CRUD),
      R("role-requirements", "شروط الصفات", ["GET", "PUT"], { special: [["reset", "إرجاع الجدول إلى الأصل"]] }),
      R("rules", "القواعد كلها", [], { special: [["reset-all", "إعادة كل القواعد إلى الأصل"]] }),
      R("roles", "الصفات", CRUD, { special: [["reset", "إرجاع الصفات إلى الأصل"]] }),
      R("categories-tiers", "الفئات والمستويات والأعداد", CRUD, { special: [["reset", "إرجاعها إلى الأصل"]] }),
      R("branches", "الفروع", CRUD, { special: [["reset", "إرجاع الفروع إلى الأصل"]] }),
      R("role-labels", "التسميات الموسمية", CRUD, { special: [["reset", "إرجاعها إلى الأصل"]] }),
      R("job-descriptions", "التوصيف الوظيفي", ["GET", "PUT"], { special: [["reset", "إرجاعه إلى الأصل"]] }),
      R("system-sections", "النظام الإداري", CRUD, { special: [["reset", "إرجاعه إلى الأصل"]] }),
      R("decisions", "المقررات الإدارية", CRUD, { special: [["reset", "إرجاع القائمة إلى الأصل"]] }),
      R("contract-templates", "نماذج العقود", CRUD, { special: [["reset", "إرجاع القائمة إلى الأصل"]] }),
      R("operational-plans", "الخطط التشغيلية", G, { special: [["approve", "قبول الخطة"], ["return", "إعادتها بملاحظات"]] }),
      R("cadre", "الكادر الإداري", ["GET", "POST", "PUT"], { special: [["export", "تصدير الكادر"]] }),
      R("cadre-contact", "هاتف الكادر وباركوده وميلاده وتيليجرام وحضوره", ["GET", "PUT"], { sensitive: true }),
      R("cadre-accounts", "حالة حساب الفرد", ["GET", "PUT", "DELETE"], { special: [["unlink-telegram", "فك ربط تيليجرام"]] }),
      R("cadre-events", "أحداث الكادر", ["GET", "POST"], { special: [["export", "تصدير الأحداث"]] }),
      R("telegram", "رسائل تيليجرام", G, { special: [["send", "إرسال رسالة تيليجرام"]] }),
      R("applicants", "ملفات المتقدمين", G),
      R("applicants-files", "رسوم المتقدمين وإيصالاتهم ونتائج اختبارهم", G, { sensitive: true }),
      R("groups", "تشكيل المجموعات", ["GET", "POST"], { special: [["approve", "اعتماد مجموعة"], ["return", "إعادة طلب إلى رئيسه"]] }),
      R("contracts", "العقود الموقّعة", ["GET", "PUT"], { sensitive: true }),
      R("clusters", "التكتلات", CRUD, {
        special: [
          ["create", "إنشاء التكتل نهائياً"],
          ["exceptional-edit", "تعديل استثنائي بعد الإنشاء"],
          ["archive", "أرشفة واستعادة"],
          ["add-outside-group", "إضافة مجموعة من خارج التكتلات"],
          ["export", "تصدير"],
          ["print", "طباعة التقرير"],
        ],
      }),
      R("programmes", "برامج التكتلات", G, { special: [["approve", "اعتماد ونشر"], ["return", "إعادة مع السبب"]] }),
      R("group-pages", "صفحات المجموعات", G, { special: [["approve", "اعتماد ونشر"], ["return", "إعادة مع السبب"]] }),
      R("directory", "التكتلات والمجموعات", ["GET", "PUT"], { special: [["export", "تصدير"], ["season-start", "بدء موسم جديد"], ["season-undo", "التراجع عن بدء الموسم"]] }),
      R("letters", "المراسلات", ["GET", "PUT"], { special: [["close", "إغلاق المراسلة وإعادة فتحها"], ["print", "طباعة"]] }),
      R("evaluation", "تقييم الإداريين", ["GET", "PUT"], { special: [["decide-objection", "البت في الاعتراض"]] }),
      R("grading", "التصنيف", G, { special: [["publish", "اعتماد النتائج ونشرها"]] }),
    ],
  },
  {
    key: "exams",
    label: "إدارة الامتحانات",
    desc: "القاعات والمحافظات، والاختبارات وأقسامها، وبنك الأسئلة، والمتقدمون، والجلسات، والمراجعة والنتائج، والشفهي، والإحصائيات.",
    href: "/staff/exam",
    resources: [
      R("summary", "لوحة التحكم", G),
      R("records", "سجلات التعديل", G),
      R("centers", "القاعات والمحافظات", ["GET", "POST", "PUT"], { special: [["disable", "تعطيل قاعة وتفعيلها"]] }),
      R("exams", "الاختبارات", CRUD, { special: [["publish", "نشر الاختبار"], ["archive", "أرشفة الاختبار"], ["reset", "إعادة الاختبارات والبنك إلى الأصل"]] }),
      R("questions", "بنك الأسئلة", ["GET", "POST", "PUT"], { special: [["disable", "تعطيل سؤال وتفعيله"], ["replace", "إنشاء بديل لسؤال"], ["assign-role", "إدخال سؤال في اختبار صفة"]] }),
      R("questions-answers", "الأجوبة الصحيحة", G, { sensitive: true, special: [["export", "تصدير البنك بأجوبته"]] }),
      R("applicants", "المتقدمون", G, { special: [["move", "نقل متقدمين إلى قاعة"], ["export", "تصدير"]] }),
      R("applicants-pii", "الأرقام الوطنية والباركود", G, { sensitive: true }),
      R("sittings", "جلسات الاختبار", G),
      R("live", "الجلسات الفعالة", G),
      R("attempts", "المراجعة والتقارير", G, { special: [["approve", "اعتماد إداري لمحاولة"], ["void", "إلغاء إداري لمحاولة"], ["export", "تصدير"]] }),
      R("attempt-answers", "إجابات المتقدمين", G, { sensitive: true }),
      R("results", "النتائج", G, { special: [["export", "تصدير"]] }),
      R("oral", "الامتحان الشفهي", ["GET", "PUT"]),
      R("stats", "الإحصائيات", G, { special: [["export", "تصدير"]] }),
    ],
  },
  {
    key: "hall",
    label: "قاعة الامتحان",
    desc: "إدارة جلسة الاختبار في قاعة بعينها: فتحها وبدؤها وإنهاؤها، والحضور، وطلبات دخول الأجهزة، وتأكيد التسليم.",
    href: "/staff/hall",
    scope: "center",
    resources: [
      R("sittings", "جلسات القاعة", G, { special: [["open", "فتح القاعة"], ["start", "بدء الاختبار"], ["end", "إنهاء الاختبار وإغلاق القاعة"]] }),
      R("network", "شبكة القاعة", ["GET", "PUT"], { special: [["allow-mobile-data", "السماح ببيانات الجوال"]] }),
      R("attendance", "الحضور", ["GET", "POST", "DELETE"]),
      R("entry-requests", "طلبات الدخول", G, { special: [["approve", "موافقة"], ["reject", "رفض"]] }),
      R("submissions", "التسليم", G, { special: [["confirm", "تأكيد التسليم"], ["confirm-batch", "التأكيد الجماعي"], ["refer", "إحالة إلى الإدارة"]] }),
      R("pin", "رمز المشرف (PIN)", ["PUT"]),
    ],
  },
  {
    key: "flights",
    label: "إدارة الطيران",
    desc: "المطارات والناقلون، والرحلات ذهاباً وعودة، وركابها وكشوفها، وأيام التكتلات، والتفويج.",
    href: "/staff/flights",
    resources: [
      R("summary", "لوحة التحكم", G),
      R("records", "سجلات التعديل", G),
      R("airports", "المطارات", ["GET", "POST", "PUT"], { special: [["archive", "أرشفة واستعادة"]] }),
      R("carriers", "الناقلون الجويون", ["GET", "POST", "PUT"], { special: [["archive", "أرشفة واستعادة"]] }),
      R("flights", "الرحلات", CRUD, {
        special: [
          ["publish", "نشر"],
          ["lock", "إقفال وإصدار الكشف"],
          ["postpone", "تأجيل"],
          ["reschedule", "تحديد موعد جديد"],
          ["divert", "تحويل الوجهة"],
          ["cancel", "إلغاء الرحلة"],
          ["depart", "تسجيل الإقلاع"],
          ["arrive", "تسجيل الهبوط"],
        ],
      }),
      R("flight-notes", "ملاحظات الرحلة", ["GET", "PUT"], { sensitive: true }),
      R("passengers", "الركاب والمقاعد", CRUD, { special: [["other-means", "مسافر بوسيلة أخرى"]] }),
      R("passengers-pii", "احتياجات الركاب وأعمارهم", G, { sensitive: true }),
      R("manifests", "كشوف الركاب", G, { sensitive: true, special: [["reissue", "إصدار جديد"], ["export", "تصدير إلى نسك مسار أو الناقل"]] }),
      R("allotments", "أيام التكتلات", CRUD),
      R("dispatch", "التفويج", G),
    ],
  },
  {
    key: "airport",
    label: "رحلات المطار",
    desc: "تسجيل إقلاع الرحلات من مطار بعينه وهبوطها فيه.",
    href: "/staff/airport",
    scope: "airport",
    resources: [R("flights", "رحلات المطار", G, { special: [["depart", "تسجيل الإقلاع"], ["arrive", "تسجيل الهبوط"]] })],
  },
  {
    key: "season",
    label: "إعدادات الموسم",
    desc: "شروط الموسم ورسومه، ومواعيد العمليات، ومواعيد الوجبات.",
    href: "/staff/season",
    resources: [
      R("stats", "الإحصائيات", G, { note: "أرقام النظام وما ينتظر فيه، في صفحة إحصائياته" }),
      R("values", "الشروط والرسوم", ["GET", "PUT"], { special: [["reset", "القيم الافتراضية"]] }),
      R("windows", "مواعيد العمليات", ["GET", "PUT"], { scope: "operation" }),
      R("meals", "مواعيد الوجبات", ["GET", "PUT"]),
    ],
  },
  {
    key: "operations",
    label: "غرفة العمليات",
    desc: "البلاغات كلها، والمهام الداخلية، والتقارير اليومية للتكتلات، وقرارات الغرفة.",
    href: "/staff/operations",
    resources: [
      R("stats", "الإحصائيات", G, { note: "أرقام النظام وما ينتظر فيه، في صفحة إحصائياته" }),
      R("tickets", "البلاغات", ["GET", "PUT"], { special: [["assign", "إسناد بلاغ"], ["close", "إغلاق بلاغ"]] }),
      R("tasks", "المهام الداخلية", ["GET", "POST", "PUT"]),
      R("daily-reports", "التقارير اليومية", ["GET", "PUT"], { sensitive: true }),
      R("decisions", "قرارات الغرفة", G, { special: [["approve", "اعتماد قرار (حافلة إضافية…)"]] }),
      R("shift-log", "سجل المناوبة", G),
    ],
  },
  {
    key: "medical",
    label: "الفريق الطبي",
    desc: "مراجعة الوثائق الطبية للحجاج، والحالات الصحية، والبلاغات الصحية.",
    href: "/staff/medical",
    resources: [
      R("stats", "الإحصائيات", G, { note: "أرقام النظام وما ينتظر فيه، في صفحة إحصائياته" }),
      R("documents", "الوثائق الطبية", G, { sensitive: true, special: [["approve", "اعتماد وثيقة"], ["return", "إعادة وثيقة"]] }),
      R("health-files", "الحالات الصحية", G, { sensitive: true }),
      R("tickets", "البلاغات الصحية", ["GET", "PUT"], { special: [["assign", "إسناد"], ["close", "إغلاق"]] }),
    ],
  },
  {
    key: "transport",
    label: "المواصلات",
    desc: "بلاغات النقل، والحجاج الذين يحتاجون تجهيزاً، وحافلات التكتلات وطلباتها.",
    href: "/staff/transport",
    resources: [
      R("stats", "الإحصائيات", G, { note: "أرقام النظام وما ينتظر فيه، في صفحة إحصائياته" }),
      R("tickets", "بلاغات النقل", ["GET", "PUT"], { special: [["assign", "إسناد"], ["close", "إغلاق"]] }),
      R("needs", "حجاج يحتاجون تجهيزاً", G, { sensitive: true }),
      R("buses", "حافلات التكتلات", ["GET", "POST", "DELETE"]),
      R("bus-requests", "طلبات الحافلات الإضافية", G, { special: [["approve", "إسناد حافلة"], ["reject", "رفض الطلب"]] }),
    ],
  },
  {
    key: "opfiles",
    label: "الملفات التشغيلية",
    desc: "ملف التسكين في مكة وملفا مخيمات منى وعرفات: أماكنها وتكتلاتها وإسناد الموظفين فيها.",
    href: "/staff/operational-files",
    scope: "opfileType",
    resources: [
      R("stats", "الإحصائيات", G, { note: "أرقام النظام وما ينتظر فيه، في صفحة إحصائياته" }),
      R("files", "الملفات", CRUD, { special: [["activate", "تفعيل الملف وإعادته مسودة"], ["export", "تصدير"]] }),
      R("nodes", "القطاعات والأبراج والمراكز والمخيمات", CRUD),
      R("assignments", "إسناد الموظفين وسكنهم", CRUD),
      R("staff-contact", "هواتف الموظفين", G, { sensitive: true }),
    ],
  },
  {
    key: "reference",
    label: "البيانات المرجعية",
    desc: "فنادق الموسم وقطاعات مكة ومراكز المشاعر ومخيماتها.",
    href: "/staff/reference",
    resources: [
      R("hotels", "الفنادق", ["GET", "POST", "PUT"], { special: [["archive", "أرشفة واستعادة"], ["import", "نقل من الموسم السابق"]] }),
      R("sectors", "القطاعات", ["GET", "POST", "PUT"], { special: [["archive", "أرشفة واستعادة"], ["import", "نقل من الموسم السابق"]] }),
      R("centers", "المراكز", ["GET", "POST", "PUT"], { special: [["archive", "أرشفة واستعادة"], ["import", "نقل من الموسم السابق"]] }),
      R("camps", "المخيمات", ["GET", "POST", "PUT"], { special: [["archive", "أرشفة واستعادة"], ["import", "نقل من الموسم السابق"]] }),
    ],
  },
  {
    key: "audit",
    label: "سجل الأحداث",
    desc: "كل ما جرى في المنصة: من فعل ماذا ومتى.",
    href: "/staff/audit",
    resources: [
      R("stats", "الإحصائيات", G, { note: "أرقام النظام وما ينتظر فيه، في صفحة إحصائياته" }),
      R("events", "الأحداث", G, { special: [["export", "تصدير"], ["trace", "تتبّع طلب"]] }),
    ],
  },
  {
    key: "executive",
    label: "لوحة الإدارة العليا",
    desc: "تقرير نهاية الموسم للإدارة العليا.",
    href: "/staff/executive",
    resources: [R("dashboard", "اللوحة", G, { special: [["print", "طباعة"]] })],
  },
  {
    key: "content",
    label: "محتوى الموقع",
    desc: "صفحات الموقع وأقسامها، ومجموعات المحتوى، ومكتبة الوسائط، والنسخ السابقة.",
    href: "/staff/content",
    resources: [
      R("stats", "الإحصائيات", G, { note: "أرقام النظام وما ينتظر فيه، في صفحة إحصائياته" }),
      R("pages", "الصفحات وأقسامها", ["GET", "PUT"], { special: [["publish", "نشر"], ["discard", "تجاهل المسودة"], ["set-status", "تغيير حالة الصفحة"], ["reset", "إرجاعها إلى الأصل"]] }),
      R("items", "عناصر مجموعات المحتوى", CRUD, { scope: "collection", special: [["publish", "نشر المجموعة"], ["archive", "أرشفة واستعادة"]] }),
      R("media", "مكتبة الوسائط", CRUD),
      R("revisions", "النسخ السابقة", ["GET", "DELETE"], { special: [["restore", "استعادة نسخة"]] }),
      R("site", "الموقع كله", [], { special: [["preview", "وضع المعاينة"], ["backup-export", "تنزيل نسخة احتياطية"], ["backup-import", "استيراد نسخة احتياطية"]] }),
    ],
  },
  {
    key: "evaluate",
    label: "تقييم الإداريين بعد الموسم",
    desc: "تقييم التكتلات التي سكنت حيث رابط الموظف، ومجموعاتها وإدارييها.",
    href: "/staff/evaluate",
    scope: "posting",
    resources: [R("evaluations", "التقييمات", ["GET", "PUT"])],
  },
];

export const PERM_SYSTEM = Object.fromEntries(CATALOG.map((s) => [s.key, s])) as Record<string, PermSystem>;

/** Every key a resource offers */
export const keysOf = (sys: string, r: ResourceDef) => [...r.verbs.map((v) => `${sys}.${r.key}.${v}`), ...(r.special ?? []).map(([k]) => `${sys}.${r.key}.${k}`)];
export const ALL_KEYS: string[] = CATALOG.flatMap((s) => s.resources.flatMap((r) => keysOf(s.key, r)));
export const systemKeys = (sys: string) => ALL_KEYS.filter((k) => k.startsWith(`${sys}.`));
/**
 * A system's viewing permissions: holding any of them opens its pages. Its statistics are not among them: they
 * are a permission of their own, with a page of their own (/staff/stats/<system>), and opening one does not open
 * the other
 */
export const viewKeys = (sys: string) => systemKeys(sys).filter((k) => k.endsWith(".GET") && !(hasStats(sys) && k === statsKey(sys)));
/**
 * The systems with a statistics page of their own: every one that is neither a management file (whose summary is
 * its statistics) nor a field post. «إدارة الامتحانات» has a «الإحصائيات» of its own too, but as one of its
 * operations, so it is not among them
 */
export const STATS_SYSTEMS = ["reviews", "office", "lottery", "season", "operations", "medical", "transport", "opfiles", "audit", "content"] as const;
export type StatsSystem = (typeof STATS_SYSTEMS)[number];
export const hasStats = (sys: string): sys is StatsSystem => (STATS_SYSTEMS as readonly string[]).includes(sys);
/** The permission to see a system's statistics */
export const statsKey = (sys: string) => `${sys}.stats.GET`;

export function scopeKindOf(key: string): ScopeKind | undefined {
  const [sys, res] = key.split(".");
  const s = PERM_SYSTEM[sys];
  return s?.resources.find((r) => r.key === res)?.scope ?? s?.scope;
}

/** «عرض الرحلات» — the system, the resource and the verb in words */
export function permLabel(key: string) {
  const [sys, res, verb] = key.split(".");
  const s = PERM_SYSTEM[sys];
  const r = s?.resources.find((x) => x.key === res);
  if (!s || !r) return key;
  const v = (VERB_LABEL as Record<string, string>)[verb] ?? r.special?.find(([k]) => k === verb)?.[1] ?? verb;
  return `${v} — ${r.label} (${s.label})`;
}

// ───────────────────────── grants ─────────────────────────

/** One permission granted to an employee; no `scope` means everywhere */
export type PermGrant = { key: string; scope?: string[]; by?: string; at?: number };

/**
 * May this employee do it? With a scope id, only if his grant covers it; without one, if he holds the permission
 * anywhere (a hall supervisor «may» open halls, and each hall checks its own id).
 */
export function can(user: Pick<StaffUser, "grants"> | null | undefined, key: string, scopeId?: string) {
  const g = user?.grants.find((x) => x.key === key);
  if (!g) return false;
  if (!g.scope || g.scope.length === 0 || scopeId === undefined) return true;
  return g.scope.includes(scopeId);
}

export const canAny = (user: Pick<StaffUser, "grants"> | null | undefined, keys: string[], scopeId?: string) => keys.length === 0 || keys.some((k) => can(user, k, scopeId));

/** The ids his grant of this permission covers: `"all"`, or the list (empty when not held) */
export function scopesOf(user: Pick<StaffUser, "grants"> | null | undefined, key: string): "all" | string[] {
  const g = user?.grants.find((x) => x.key === key);
  if (!g) return [];
  return !g.scope || g.scope.length === 0 ? "all" : g.scope;
}

/** May he view anything in this system — what shows it in his menu */
export const seesSystem = (user: Pick<StaffUser, "grants"> | null | undefined, sys: string) => !!user?.grants.some((g) => g.key.startsWith(`${sys}.`) && g.key.endsWith(".GET"));

/** The systems he sees, in the catalog's order */
export const systemsOf = (user: Pick<StaffUser, "grants"> | null | undefined) => CATALOG.filter((s) => seesSystem(user, s.key)).map((s) => s.key);

/** Everyone holding a permission (anywhere, or for one scope id) */
export const holdersOf = <U extends Pick<StaffUser, "grants">>(users: U[], key: string, scopeId?: string) => users.filter((u) => can(u, key, scopeId));

/**
 * His permissions in a few words, system by system: «إدارة الطيران — كاملة», «رحلات المطار — مطار دمشق»,
 * «القبول المباشر والقرعة — 5 من 10». `nameOf` turns a scope id into its name (a centre, an airport…).
 */
export function grantSummary(user: Pick<StaffUser, "grants"> | null | undefined, nameOf: (kind: ScopeKind, id: string) => string = (_, id) => id) {
  if (!user) return [];
  return CATALOG.flatMap((s) => {
    const held = user.grants.filter((g) => g.key.startsWith(`${s.key}.`));
    if (!held.length) return [];
    const total = systemKeys(s.key).length;
    const scoped = [...new Set(held.flatMap((g) => (g.scope ?? []).map((id) => nameOf(scopeKindOf(g.key) ?? "operation", id))))];
    const extent = held.length >= total ? "كاملة" : `${held.length} من ${total}`;
    return [`${s.label} — ${scoped.length && s.scope ? scoped.join("، ") : extent}`];
  });
}

/** A whole system, or one resource, as grants: `flights.*`, `operations.tickets.*`, with an optional scope */
export function expand(pattern: string, scope?: string[], meta?: { by?: string; at?: number }): PermGrant[] {
  const keys = pattern.endsWith(".*") ? ALL_KEYS.filter((k) => k.startsWith(pattern.slice(0, -1))) : [pattern];
  return keys.map((key) => ({ key, ...(scope && { scope }), ...meta }));
}

/** Merge grant lists: one entry per key, scopes united (an unscoped grant wins) */
export function mergeGrants(...lists: PermGrant[][]): PermGrant[] {
  const out = new Map<string, PermGrant>();
  for (const g of lists.flat()) {
    const had = out.get(g.key);
    if (!had) out.set(g.key, { ...g });
    else if (!had.scope || !g.scope) out.set(g.key, { ...had, scope: undefined });
    else out.set(g.key, { ...had, scope: [...new Set([...had.scope, ...g.scope])] });
  }
  return [...out.values()];
}

/** The operation windows each former file controlled, now granted as scoped `season.windows` */
export const WINDOWS_OF = {
  registration: ["hajj-direct", "hajj-lottery"],
  admins: ["admin-registration", "group-formation", "cluster-formation", "group-management", "cluster-management", "pilgrim-evaluation", "self-evaluation", "peer-evaluation", "evaluation-objection"],
  exams: ["admin-exams", "admin-orals"],
};
