/**
 * وصف محتوى الموقع العام: صفحة ← قسم ← حقل.
 *
 * هذا الملف هو «خريطة الموقع» في لوحة التحكم. القيم الافتراضية (`def`) هي المحتوى الذي
 * أُطلق به الموقع؛ أي تعديل من الموظف يُحفظ فوقها دون المساس بها، فتبقى «استعادة الأصل» ممكنة دائماً.
 *
 * قاعدة: لا يُكتب أي نص يراه الزائر داخل مكوّنات الواجهة — يُكتب هنا، وتقرؤه الواجهة عبر useSection().
 */
import type { Field, PageDef, SelectOption } from "./types";

const TONES: SelectOption[] = [
  { value: "green", label: "أخضر (الأساسي)" },
  { value: "gold", label: "ذهبي (مميّز)" },
  { value: "maroon", label: "عنّابي (تنبيه)" },
];

/** حقول متكررة: ترويسة قسم (شارة + عنوان + وصف) */
const heading = (eyebrow: string, title: string, description = ""): Field[] => [
  { key: "eyebrow", label: "الشارة الصغيرة", kind: "text", def: eyebrow, hint: "الكلمة الصغيرة فوق العنوان" },
  { key: "title", label: "العنوان", kind: "text", def: title, wide: true },
  { key: "description", label: "الوصف", kind: "textarea", rows: 3, def: description, wide: true },
];

/** حقول ترويسة الصفحة الداخلية (صورة + مسار + عنوان) */
const pageHero = (title: string, highlight: string, description: string, image: string, crumb: string): Field[] => [
  { key: "title", label: "العنوان", kind: "text", def: title },
  { key: "highlight", label: "الكلمة المميّزة بالذهبي", kind: "text", def: highlight, hint: "تظهر بلون ذهبي داخل العنوان" },
  { key: "description", label: "الوصف", kind: "textarea", rows: 3, def: description, wide: true },
  { key: "image", label: "صورة الخلفية", kind: "image", def: image, wide: true },
  { key: "crumb", label: "اسم الصفحة في مسار التنقل", kind: "text", def: crumb },
];

// ═══════════════════════════ الصفحة الرئيسية ═══════════════════════════

const HOME: PageDef = {
  id: "home",
  label: "الصفحة الرئيسية",
  path: "/",
  icon: "Landmark",
  group: "الموقع العام",
  required: true,
  description: "واجهة المنصة: الفيديو والعدّ التنازلي، الشريط العاجل، الخدمات، رحلة الحاج، الأرقام، الأكاديمية، الأخبار، التقويم، ودعوة التسجيل.",
  sections: [
    {
      id: "hero",
      label: "الواجهة الرئيسية",
      icon: "Sparkles",
      required: true,
      note: "أول ما يراه الزائر: فيديو الخلفية، العنوان المتحرك، والعدّ التنازلي.",
      fields: [
        { key: "badge", label: "الشارة العلوية", kind: "text", def: "التسجيل لموسم حج 1448هـ مفتوح الآن", wide: true },
        {
          key: "titleWords",
          label: "كلمات العنوان الكبير",
          kind: "list",
          itemName: "كلمة",
          itemTitleKey: "word",
          wide: true,
          hint: "كل كلمة تظهر بحركة مستقلة. فعّل «مميّزة» لتظهر بالذهبي.",
          item: [
            { key: "word", label: "الكلمة", kind: "text", def: "" },
            { key: "highlight", label: "مميّزة بالذهبي", kind: "boolean", def: false },
          ],
          def: [
            { word: "رحلة", highlight: false },
            { word: "العمر", highlight: true },
            { word: "تبدأ", highlight: false },
            { word: "من", highlight: false },
            { word: "هنا", highlight: false },
          ],
        },
        {
          key: "description",
          label: "الفقرة تحت العنوان",
          kind: "textarea",
          rows: 3,
          wide: true,
          def: "منصة واحدة ترافقك من إنشاء الحساب بالرقم الوطني، إلى القرعة والقبول، ثم الفندق والرحلة والمخيم، حتى تعود إلى أهلك بسلام.",
        },
        { key: "primaryLabel", label: "الزر الأساسي — النص", kind: "text", def: "ابدأ طلب الحج" },
        { key: "primaryHref", label: "الزر الأساسي — الرابط", kind: "url", def: "/register" },
        { key: "secondaryLabel", label: "الزر الثانوي — النص", kind: "text", def: "الأكاديمية" },
        { key: "secondaryHref", label: "الزر الثانوي — الرابط", kind: "url", def: "/academy" },
        {
          key: "trust",
          label: "سطور الطمأنة",
          kind: "list",
          itemName: "سطر",
          itemTitleKey: "text",
          wide: true,
          item: [{ key: "text", label: "النص", kind: "text", def: "" }],
          def: [{ text: "بياناتك من الشؤون المدنية مباشرة" }, { text: "قرعة علنية ببث مباشر" }],
        },
        { key: "video", label: "فيديو الخلفية", kind: "video", def: "/videos/kaaba-night.webm", wide: true },
        { key: "poster", label: "صورة الفيديو البديلة", kind: "image", def: "/images/kaaba-hajj.jpg", wide: true },
        { key: "soundOn", label: "زر الصوت — عند التشغيل", kind: "text", def: "كتم الصوت" },
        { key: "soundOff", label: "زر الصوت — عند الكتم", kind: "text", def: "تشغيل صوت الحرم" },
        { key: "scrollHint", label: "نص الانتقال للأسفل", kind: "text", def: "اكتشف المزيد" },
        { key: "countdownEyebrow", label: "بطاقة العدّ — الشارة", kind: "text", def: "العدّ التنازلي" },
        { key: "countdownTitle", label: "بطاقة العدّ — العنوان", kind: "text", def: "حتى يوم عرفة 1448هـ" },
        {
          key: "countdownTarget",
          label: "بطاقة العدّ — التاريخ المستهدف",
          kind: "text",
          def: "2027-05-15T05:00:00+03:00",
          hint: "بصيغة ISO مع التوقيت، مثال: 2027-05-15T05:00:00+03:00",
          wide: true,
        },
        {
          key: "rows",
          label: "مواعيد بطاقة العدّ",
          kind: "list",
          itemName: "موعد",
          itemTitleKey: "label",
          wide: true,
          item: [
            { key: "label", label: "الاسم", kind: "text", def: "" },
            { key: "value", label: "التاريخ", kind: "text", def: "" },
            { key: "live", label: "مفتوح الآن (نقطة نابضة)", kind: "boolean", def: false },
          ],
          def: [
            { label: "التسجيل على القبول المباشر", value: "9 جمادى الآخرة – 1 رجب", live: true },
            { label: "اعتماد قوائم القبول المباشر", value: "15 رجب", live: false },
            { label: "التسجيل على القرعة", value: "16 – 25 رجب", live: false },
            { label: "القرعة ببث مباشر", value: "1 شعبان — 20:00", live: false },
          ],
        },
      ],
    },
    {
      id: "ticker",
      label: "الشريط العاجل",
      icon: "Megaphone",
      note: "الشريط المتحرك أسفل الواجهة مباشرة.",
      fields: [
        { key: "label", label: "كلمة الشريط", kind: "text", def: "عاجل" },
        {
          key: "items",
          label: "الرسائل",
          kind: "list",
          itemName: "رسالة",
          itemTitleKey: "text",
          wide: true,
          item: [{ key: "text", label: "النص", kind: "text", def: "" }],
          def: [
            { text: "التسجيل على القبول المباشر (الأكبر سناً) لموسم حج 1448هـ: 9 جمادى الآخرة – 1 رجب" },
            { text: "التسجيل على القرعة بطلب مستقل: 16 – 25 رجب — والقرعة يوم 1 شعبان الساعة 20:00 ببث مباشر" },
            { text: "تحذير: لا توجد مقاعد مضمونة مقابل مبالغ مالية — تحقق من الجهات المعتمدة عبر المنصة" },
            { text: "رسم التسجيل 25 دولاراً للفرد، مع إيصال رقمي قابل للتحقق" },
            { text: "إطلاق مسار «فقه الحج» في أكاديمية الدروس الدينية — 18 درساً بثلاثة مستويات" },
          ],
        },
      ],
    },
    {
      id: "services",
      label: "بطاقات الخدمات",
      icon: "ClipboardList",
      fields: [
        ...heading(
          "متاح للجميع دون تسجيل دخول",
          "كل ما تحتاجه في مكان واحد",
          "تصفّح الأخبار والأكاديمية ومواقيت الصلاة ونتائج القبول بحرية، ولا نطلب منك حساباً إلا عندما تقدّم طلبك.",
        ),
        {
          key: "items",
          label: "الخدمات",
          kind: "list",
          itemName: "خدمة",
          itemTitleKey: "title",
          wide: true,
          item: [
            { key: "title", label: "العنوان", kind: "text", def: "" },
            { key: "text", label: "الوصف", kind: "text", def: "" },
            { key: "href", label: "الرابط", kind: "url", def: "/" },
            { key: "icon", label: "الأيقونة", kind: "icon", def: "UsersRound" },
            { key: "tone", label: "اللون", kind: "select", options: TONES, def: "green" },
          ],
          def: [
            { href: "/register", icon: "UsersRound", title: "تقديم طلب حج", text: "لك ولعائلتك بخطوات بسيطة", tone: "gold" },
            { href: "/results", icon: "FileSearch", title: "نتائج القبول", text: "ابحث برقمك الوطني", tone: "green" },
            { href: "/academy", icon: "BookOpenText", title: "أكاديمية الدروس", text: "فيديو وصوت وملخصات", tone: "green" },
            { href: "/guide", icon: "NotebookTabs", title: "دليل المناسك", text: "يوماً بيوم مع الأدعية", tone: "green" },
            { href: "/prayer-times", icon: "Clock3", title: "مواقيت الصلاة", text: "واتجاه القبلة لمدينتك", tone: "green" },
            { href: "/conditions", icon: "ScrollText", title: "الشروط والتكاليف", text: "مع فحص أهلية مبدئي", tone: "green" },
            { href: "/verify", icon: "ShieldCheck", title: "التحقق من الجهات", text: "والإيصالات والشهادات", tone: "maroon" },
            { href: "/news", icon: "Megaphone", title: "الإعلانات الرسمية", text: "قرارات وتعاميم الإدارة", tone: "green" },
          ],
        },
      ],
    },
    {
      id: "umrahTeaser",
      label: "بطاقة العمرة",
      icon: "Hourglass",
      fields: [
        { key: "title", label: "العنوان", kind: "text", def: "خدمات العمرة" },
        { key: "badge", label: "الشارة", kind: "text", def: "قريباً" },
        {
          key: "text",
          label: "النص",
          kind: "textarea",
          rows: 3,
          wide: true,
          def: "نعمل على إضافة التسجيل في رحلات العمرة والجهات المعتمدة ومتابعة الطلب. وحتى ذلك الحين، مسار «فقه العمرة» متاح في الأكاديمية.",
        },
        { key: "ctaLabel", label: "نص الرابط", kind: "text", def: "اعرف المزيد" },
        { key: "href", label: "الرابط", kind: "url", def: "/umrah" },
        { key: "icon", label: "الأيقونة", kind: "icon", def: "Hourglass" },
      ],
    },
    {
      id: "journey",
      label: "رحلتك في محطات",
      icon: "Plane",
      fields: [
        ...heading(
          "كيف تعمل المنصة؟",
          "رحلتك في ست محطات واضحة",
          "لن تحتاج إلى مراجعة المكتب أو السؤال عن الخطوة التالية؛ كل محطة تظهر في حسابك مع موعدها وما هو مطلوب منك.",
        ),
        {
          key: "steps",
          label: "المحطات",
          kind: "list",
          itemName: "محطة",
          itemTitleKey: "title",
          wide: true,
          item: [
            { key: "title", label: "العنوان", kind: "text", def: "" },
            { key: "when", label: "الموعد", kind: "text", def: "" },
            { key: "text", label: "الشرح", kind: "textarea", rows: 3, def: "", wide: true },
            { key: "icon", label: "الأيقونة", kind: "icon", def: "UserRoundPlus" },
          ],
          def: [
            { icon: "UserRoundPlus", title: "إنشاء الحساب", text: "الرقم الوطني ورقم الهاتف فقط — وبياناتك تصل من الشؤون المدنية للتأكيد.", when: "دقيقتان" },
            {
              icon: "FileSignature",
              title: "التسجيل على القبول المباشر",
              text: "طلب للقبول وفق الأكبر سناً على 35% من الحصة. أسئلة بسيطة واحدة تلو الأخرى، وإضافة العائلة من دفتر العائلة أو بالرقم الوطني.",
              when: "9 جمادى الآخرة – 1 رجب",
            },
            {
              icon: "ScanSearch",
              title: "التحقق وإعلان الأعمار",
              text: "تطبّق المنصة شروط الموسم على كل فرد وتشرح لك أي ملاحظة، ومنها عمر القبول المباشر، قبل أن تدفع أي مبلغ.",
              when: "حتى 15 رجب",
            },
            {
              icon: "Ticket",
              title: "التسجيل على القرعة",
              text: "تسجيل مستقل بطلب جديد لكل مؤهل، ومنهم من لم يُقبل مباشرة، وتُجرى بعده قرعة علنية ببث مباشر على 65% من الحصة.",
              when: "16 – 25 رجب · القرعة 1 شعبان — 20:00",
            },
            { icon: "BadgeCheck", title: "التجهيز والتسديد", text: "المجموعة، العقد، الإيصالات، التأشيرة، والدروس الدينية قبل السفر.", when: "شعبان – ذو القعدة" },
            { icon: "Plane", title: "السفر والعودة", text: "الرحلة والفندق والمخيم وبطاقتك الرقمية في جيبك طوال الرحلة.", when: "24 ذو القعدة – 23 ذو الحجة" },
          ],
        },
      ],
    },
    {
      id: "numbers",
      label: "الموسم بالأرقام",
      icon: "Award",
      fields: [
        { key: "eyebrow", label: "الشارة", kind: "text", def: "موسم 1448هـ بالأرقام" },
        { key: "title", label: "العنوان", kind: "text", def: "شفافية كاملة في كل رقم", wide: true },
        { key: "image", label: "صورة الخلفية", kind: "image", def: "/images/mina-tents.jpg", wide: true },
        {
          key: "items",
          label: "الأرقام",
          kind: "list",
          itemName: "رقم",
          itemTitleKey: "label",
          wide: true,
          item: [
            { key: "value", label: "الرقم", kind: "number", def: 0, min: 0 },
            { key: "label", label: "العنوان", kind: "text", def: "" },
            { key: "sub", label: "الشرح", kind: "text", def: "" },
          ],
          def: [
            { value: 22500, label: "الحصة الإجمالية", sub: "حاج وحاجة" },
            { value: 72420, label: "متقدماً للقبول المباشر", sub: "حتى إغلاق التسجيل 1 رجب" },
            { value: 7875, label: "قبول مباشر", sub: "35% للأكبر سناً" },
            { value: 14625, label: "بالقرعة العلنية", sub: "65% ببث مباشر" },
          ],
        },
      ],
    },
    {
      id: "academy",
      label: "قسم الأكاديمية",
      icon: "BookOpenText",
      fields: [
        ...heading(
          "أكاديمية الدروس الدينية",
          "تعلّم مناسكك قبل أن تسافر",
          "مسارات مرتبة بالفيديو والصوت والملخص المكتوب، متاحة طوال السنة. أنشئ حساباً لتتبع تقدمك والحصول على شهادة الإتمام.",
        ),
        { key: "videoBadge", label: "شارة الفيديو", kind: "text", def: "فيديو • 13 ثانية" },
        { key: "videoTitle", label: "عنوان الفيديو", kind: "text", def: "لقطات من طواف الإفاضة" },
        { key: "videoNote", label: "سطر تحت العنوان", kind: "text", def: "من مسار «فقه الحج» — المستوى الثاني: الطواف والسعي", wide: true },
        { key: "videoPoster", label: "صورة الفيديو", kind: "image", def: "/images/tawaf-night.jpg", wide: true },
        { key: "videoSrc", label: "ملف الفيديو", kind: "video", def: "/videos/tawaf-ifadha.webm", wide: true },
        {
          key: "stats",
          label: "الأرقام الثلاثة",
          kind: "list",
          itemName: "رقم",
          itemTitleKey: "l",
          maxItems: 3,
          wide: true,
          item: [
            { key: "n", label: "الرقم", kind: "text", def: "" },
            { key: "l", label: "الشرح", kind: "text", def: "" },
          ],
          def: [
            { n: "6", l: "مسارات" },
            { n: "18", l: "درساً في فقه الحج" },
            { n: "24/7", l: "متاحة دائماً" },
          ],
        },
        { key: "ctaLabel", label: "نص الزر", kind: "text", def: "ادخل الأكاديمية" },
        { key: "ctaHref", label: "رابط الزر", kind: "url", def: "/academy" },
        { key: "prayerEyebrow", label: "مواقيت الصلاة — الشارة", kind: "text", def: "مواقيت الصلاة" },
        { key: "prayerTitle", label: "مواقيت الصلاة — العنوان", kind: "text", def: "صلاتك في وقتها أينما كنت", wide: true },
        {
          key: "prayerDescription",
          label: "مواقيت الصلاة — الوصف",
          kind: "textarea",
          rows: 2,
          wide: true,
          def: "دمشق وحلب ومكة المكرمة والمدينة المنورة، مع عدٍّ تنازلي للصلاة القادمة.",
        },
      ],
    },
    {
      id: "verse",
      label: "شريط الآية",
      icon: "MoonStar",
      fields: [
        {
          key: "text",
          label: "الآية",
          kind: "textarea",
          rows: 3,
          wide: true,
          def: "﴿وَأَذِّن فِي النَّاسِ بِالْحَجِّ يَأْتُوكَ رِجَالًا وَعَلَىٰ كُلِّ ضَامِرٍ يَأْتِينَ مِن كُلِّ فَجٍّ عَمِيقٍ﴾",
        },
        { key: "source", label: "المصدر", kind: "text", def: "سورة الحج — الآية 27", wide: true },
        { key: "image", label: "صورة الخلفية", kind: "image", def: "/images/jabal-rahmah.jpg", wide: true },
        { key: "alt", label: "وصف الصورة", kind: "text", def: "جبل الرحمة في عرفات", wide: true },
      ],
    },
    {
      id: "news",
      label: "آخر الأخبار",
      icon: "Megaphone",
      fields: [
        { key: "eyebrow", label: "الشارة", kind: "text", def: "مدونة الإدارة" },
        { key: "title", label: "العنوان", kind: "text", def: "آخر الأخبار والإعلانات", wide: true },
        { key: "ctaLabel", label: "نص زر «كل الأخبار»", kind: "text", def: "كل الأخبار" },
        {
          key: "slugs",
          label: "الأخبار المعروضة",
          kind: "list",
          itemName: "خبر",
          itemTitleKey: "slug",
          maxItems: 3,
          wide: true,
          hint: "المعرّف النصي للخبر كما يظهر في رابطه (مثل registration-opens-1448).",
          item: [{ key: "slug", label: "معرّف الخبر", kind: "text", def: "" }],
          def: [{ slug: "registration-opens-1448" }, { slug: "accepted-ages-66" }, { slug: "fake-campaigns-warning" }],
        },
      ],
    },
    {
      id: "calendar",
      label: "تقويم الموسم",
      icon: "CalendarDays",
      fields: [
        ...heading(
          "تقويم الموسم",
          "مواعيد موسم حج 1448هـ",
          "تضبط الإدارة هذه المواعيد في إعدادات الموسم، وتصلك تذكيرات شخصية بها بعد إنشاء حسابك.",
        ),
        {
          key: "dates",
          label: "المواعيد",
          kind: "list",
          itemName: "موعد",
          itemTitleKey: "title",
          wide: true,
          item: [
            { key: "title", label: "الحدث", kind: "text", def: "", wide: true },
            { key: "hijri", label: "التاريخ الهجري", kind: "text", def: "" },
            { key: "gregorian", label: "التاريخ الميلادي", kind: "text", def: "" },
            { key: "who", label: "لمن؟", kind: "text", def: "الحاج" },
          ],
          def: [
            { hijri: "9 جمادى الآخرة – 1 رجب", gregorian: "19 تشرين الثاني – 10 كانون الأول 2026", title: "التسجيل على القبول المباشر (35% — الأكبر سناً)", who: "الحاج" },
            { hijri: "1 – 10 رجب", gregorian: "10 – 19 كانون الأول 2026", title: "تدقيق طلبات القبول المباشر والتحقق من الأهلية", who: "الموظفون" },
            { hijri: "15 رجب", gregorian: "24 كانون الأول 2026", title: "اعتماد قوائم القبول المباشر", who: "الحاج" },
            { hijri: "16 – 25 رجب", gregorian: "25 كانون الأول 2026 – 3 كانون الثاني 2027", title: "التسجيل على القرعة (65%) — طلب مستقل", who: "الحاج" },
            { hijri: "1 شعبان — 20:00", gregorian: "9 كانون الثاني 2027", title: "القرعة الإلكترونية ببث مباشر", who: "الحاج" },
            { hijri: "2 – 25 شعبان", gregorian: "10 كانون الثاني – 2 شباط 2027", title: "تأكيد القبول، والدفعة الأولى للمقبولين بالقرعة، ورفع الوثائق، ومرحلة التفويج إلى المجموعات", who: "الحاج + المنسق" },
            { hijri: "1 – 15 رمضان", gregorian: "8 – 22 شباط 2027", title: "التسديد وتوقيع العقد", who: "الحاج" },
            { hijri: "1 – 15 ذو القعدة", gregorian: "8 – 22 نيسان 2027", title: "إصدار التأشيرات وتوزيع الرحلات", who: "الموظفون" },
            { hijri: "24 ذو القعدة", gregorian: "1 أيار 2027", title: "السفر: دمشق ← جدة ← مكة", who: "الجميع" },
            { hijri: "8 – 12 ذو الحجة", gregorian: "14 – 18 أيار 2027", title: "المشاعر المقدسة", who: "الجميع" },
            { hijri: "23 ذو الحجة", gregorian: "29 أيار 2027", title: "العودة: المدينة ← دمشق", who: "الجميع" },
          ],
        },
      ],
    },
    {
      id: "cta",
      label: "دعوة التسجيل",
      icon: "BadgeCheck",
      fields: [
        { key: "title", label: "العنوان", kind: "text", def: "جاهز لتقديم طلبك؟", wide: true },
        { key: "titleHighlight", label: "السطر الثاني (ذهبي)", kind: "text", def: "نرافقك خطوة بخطوة", wide: true },
        {
          key: "text",
          label: "الفقرة",
          kind: "textarea",
          rows: 3,
          wide: true,
          def: "صُممت الأسئلة لتكون واضحة وكبيرة ومسموعة، حتى يستطيع كبار السن تقديم طلبهم بأنفسهم دون مساعدة.",
        },
        { key: "primaryLabel", label: "الزر الأساسي — النص", kind: "text", def: "إنشاء حساب حاج" },
        { key: "primaryHref", label: "الزر الأساسي — الرابط", kind: "url", def: "/register" },
        { key: "secondaryLabel", label: "الزر الثانوي — النص", kind: "text", def: "افحص أهليتك أولاً" },
        { key: "secondaryHref", label: "الزر الثانوي — الرابط", kind: "url", def: "/conditions" },
        { key: "image", label: "صورة الخلفية", kind: "image", def: "/images/farewell-tawaf.jpg", wide: true },
        {
          key: "points",
          label: "النقاط المرقّمة",
          kind: "list",
          itemName: "نقطة",
          itemTitleKey: "text",
          wide: true,
          item: [{ key: "text", label: "النص", kind: "text", def: "" }],
          def: [
            { text: "الرقم الوطني ورقم الهاتف فقط" },
            { text: "بياناتك تأتي من الشؤون المدنية" },
            { text: "أضف عائلتك من دفتر العائلة" },
            { text: "تابع طلبك لحظة بلحظة" },
          ],
        },
      ],
    },
  ],
};

// ═══════════════════════════ من نحن ═══════════════════════════

const ABOUT: PageDef = {
  id: "about",
  label: "من نحن",
  path: "/about",
  icon: "Building2",
  group: "الموقع العام",
  description: "تعريف الإدارة: الرؤية والرسالة، الأرقام، المسيرة، القيادة، الإدارات، البعثات، المبادئ، الفروع، والتواصل.",
  sections: [
    {
      id: "hero",
      label: "ترويسة الصفحة",
      icon: "Landmark",
      required: true,
      fields: pageHero(
        "من",
        "نحن",
        "إدارة الحج والعمرة السورية: نخدم ضيوف الرحمن من بيوتهم في المحافظات حتى عودتهم سالمين، بقواعد معلنة ومنصة وطنية واحدة.",
        "/images/umayyad.jpg",
        "من نحن",
      ),
    },
    {
      id: "intro",
      label: "المقدمة والصور",
      icon: "Camera",
      fields: [
        { key: "badge", label: "الشارة", kind: "text", def: "من دمشق إلى الحرمين", wide: true },
        { key: "title", label: "العنوان", kind: "text", def: "خدمة الحاج أمانة،", wide: true },
        { key: "titleAccent", label: "الكلمة العنّابية", kind: "text", def: "والعدل" },
        { key: "titleTail", label: "بقية العنوان", kind: "text", def: "طريقنا إليها" },
        {
          key: "p1",
          label: "الفقرة الأولى",
          kind: "textarea",
          rows: 5,
          wide: true,
          def: "من قرب الجامع الأموي في دمشق تنطلق كل عام رحلة آلاف الحجاج السوريين. نحن الجهة التي تنظّم هذه الرحلة: نفتح تسجيلين منفصلين، فنقبل الحجاج بالأكبر سناً في الأول وبالقرعة العلنية في الثاني، ونؤهّل الإداريين، ونعتمد التكتلات، ونرافق الحجاج في مكة والمدينة والمشاعر حتى يعودوا.",
        },
        {
          key: "p2",
          label: "الفقرة الثانية",
          kind: "textarea",
          rows: 4,
          wide: true,
          def: "وفي موسم 1448هـ جمعنا كل ذلك في المنصة الوطنية للحج: مكان واحد واضح للمواطن والإداري والموظف، يحفظ الحقوق ويُظهر كل خطوة.",
        },
        { key: "cta1Label", label: "الزر الأول — النص", kind: "text", def: "تواصل معنا" },
        { key: "cta1Href", label: "الزر الأول — الرابط", kind: "url", def: "#contact" },
        { key: "cta2Label", label: "الزر الثاني — النص", kind: "text", def: "أقرب فرع إليك" },
        { key: "cta2Href", label: "الزر الثاني — الرابط", kind: "url", def: "#branches" },
        { key: "imageMain", label: "الصورة الكبيرة", kind: "image", def: "/images/umayyad-courtyard.jpg", wide: true },
        { key: "imageMainCaption", label: "تعليق الصورة الكبيرة", kind: "text", def: "الجامع الأموي — دمشق", wide: true },
        { key: "imageTop", label: "الصورة العلوية", kind: "image", def: "/images/kaaba-hajj.jpg", wide: true },
        { key: "imageTopAlt", label: "وصف الصورة العلوية", kind: "text", def: "الكعبة المشرفة", wide: true },
        { key: "imageBottom", label: "الصورة السفلية", kind: "image", def: "/images/nabawi.jpg", wide: true },
        { key: "imageBottomAlt", label: "وصف الصورة السفلية", kind: "text", def: "المسجد النبوي", wide: true },
        { key: "badgeLabel", label: "البطاقة العائمة — العنوان", kind: "text", def: "حصة موسم 1448هـ" },
        { key: "badgeValue", label: "البطاقة العائمة — الرقم", kind: "number", def: 22500, min: 0 },
        { key: "badgeSub", label: "البطاقة العائمة — الشرح", kind: "text", def: "حاج وحاجة" },
      ],
    },
    {
      id: "pillars",
      label: "الرؤية والرسالة والقيم",
      icon: "Target",
      fields: [
        {
          key: "items",
          label: "الركائز",
          kind: "list",
          itemName: "ركيزة",
          itemTitleKey: "title",
          wide: true,
          item: [
            { key: "title", label: "العنوان", kind: "text", def: "" },
            { key: "icon", label: "الأيقونة", kind: "icon", def: "Eye" },
            { key: "text", label: "النص", kind: "textarea", rows: 4, def: "", wide: true },
          ],
          def: [
            {
              title: "رؤيتنا",
              icon: "Eye",
              text: "أن يؤدي كل حاج سوري فريضته بطمأنينة وكرامة، عبر خدمة عادلة وشفافة تبدأ من بيته وتنتهي بعودته سالماً.",
            },
            {
              title: "رسالتنا",
              icon: "Target",
              text: "تنظيم رحلة الحج والعمرة من التسجيل حتى العودة على منصة وطنية واحدة، بقواعد معلنة، وقبول عادل، ومتابعة ميدانية، وتقييم حقيقي لكل مرحلة.",
            },
            {
              title: "قيمنا",
              icon: "Gem",
              text: "العدل في القبول، والشفافية في النشر، وخدمة كبار السن أولاً، وحماية البيانات، والمحاسبة بالتقييم.",
            },
          ],
        },
        {
          key: "values",
          label: "القيم المختصرة",
          kind: "list",
          itemName: "قيمة",
          itemTitleKey: "title",
          wide: true,
          item: [
            { key: "title", label: "العنوان", kind: "text", def: "" },
            { key: "text", label: "النص", kind: "textarea", rows: 2, def: "", wide: true },
          ],
          def: [
            { title: "العدل", text: "تسجيل على القبول المباشر بالأكبر سناً، وتسجيل مستقل على قرعة علنية، دون استثناءات." },
            { title: "الشفافية", text: "القوائم والقرارات منشورة، وكل إجراء مسجّل." },
            { title: "الخدمة", text: "الحاج في المركز، وكبار السن أولاً." },
            { title: "الأمانة", text: "لكل رسم إيصال، ولكل علاقة عقد موقّع." },
            { title: "الخصوصية", text: "لا نكشف أي معلومة شخصية في البوابة العامة." },
            { title: "التحسين", text: "كل مرحلة تُقيَّم، والنتائج تُستخدم فعلاً." },
          ],
        },
      ],
    },
    {
      id: "stats",
      label: "الإدارة بالأرقام",
      icon: "Award",
      fields: [
        { key: "eyebrow", label: "الشارة", kind: "text", def: "بالأرقام" },
        { key: "title", label: "العنوان", kind: "text", def: "موسم واحد، آلاف القصص", wide: true },
        { key: "image", label: "صورة الخلفية", kind: "image", def: "/images/tawaf-night.jpg", wide: true },
        {
          key: "items",
          label: "الأرقام",
          kind: "list",
          itemName: "رقم",
          itemTitleKey: "label",
          wide: true,
          item: [
            { key: "value", label: "الرقم", kind: "number", def: 0, min: 0 },
            { key: "label", label: "الشرح", kind: "text", def: "", wide: true },
          ],
          def: [
            { value: 22500, label: "حاج في حصة موسم 1448هـ" },
            { value: 8, label: "فروع في المحافظات" },
            { value: 36, label: "تكتلاً معتمداً" },
            { value: 1240, label: "إدارياً موسمياً مؤهلاً" },
            { value: 9, label: "إدارات متخصصة" },
            { value: 4, label: "بعثات ميدانية" },
          ],
        },
      ],
    },
    {
      id: "history",
      label: "المسيرة",
      icon: "CalendarRange",
      fields: [
        ...heading("مسيرتنا", "من السجلات الورقية إلى منصة وطنية", "محطات صنعت الطريقة التي نخدم بها الحجاج اليوم."),
        {
          key: "items",
          label: "المحطات",
          kind: "list",
          itemName: "محطة",
          itemTitleKey: "title",
          wide: true,
          item: [
            { key: "year", label: "السنة الميلادية", kind: "text", def: "" },
            { key: "hijri", label: "السنة الهجرية", kind: "text", def: "" },
            { key: "title", label: "العنوان", kind: "text", def: "", wide: true },
            { key: "text", label: "الشرح", kind: "textarea", rows: 2, def: "", wide: true },
          ],
          def: [
            { year: "2016", hijri: "1437هـ", title: "تأسيس الإدارة", text: "بدء العمل من مكتب واحد في دمشق بسجلات ورقية ولجان محلية." },
            { year: "2019", hijri: "1440هـ", title: "أول أرشيف إلكتروني", text: "نقل ملفات الحجاج إلى قاعدة بيانات موحدة وبدء الإيصالات المرقّمة." },
            { year: "2022", hijri: "1443هـ", title: "القرعة العلنية", text: "إجراء القرعة ببث مباشر لأول مرة بحضور لجنة إشراف وتدقيق." },
            { year: "2024", hijri: "1445هـ", title: "توسيع الفروع", text: "افتتاح فروع جديدة في المحافظات ليقترب المكتب من كل حاج." },
            { year: "2025", hijri: "1446هـ", title: "وثيقة التشغيل الشاملة", text: "كتابة رحلة الحاج والإداري والموظف مرحلة بمرحلة تمهيداً للمنصة." },
            { year: "2026", hijri: "1448هـ", title: "إطلاق المنصة الوطنية للحج", text: "منصة واحدة للتسجيل والقبول والأكاديمية والمتابعة والتقييم." },
          ],
        },
      ],
    },
    {
      id: "leaders",
      label: "القيادة",
      icon: "UsersRound",
      fields: [
        ...heading("القيادة", "فريق يقود الموسم", "أسماء وهمية لأغراض العرض."),
        {
          key: "items",
          label: "الأشخاص",
          kind: "list",
          itemName: "شخص",
          itemTitleKey: "name",
          wide: true,
          item: [
            { key: "name", label: "الاسم", kind: "text", def: "" },
            { key: "initials", label: "الأحرف الأولى", kind: "text", def: "", hint: "تظهر في الدائرة إن لم تُرفع صورة" },
            { key: "role", label: "المنصب", kind: "text", def: "" },
            { key: "note", label: "الوصف", kind: "text", def: "", wide: true },
            { key: "photo", label: "الصورة الشخصية", kind: "image", def: "", wide: true },
          ],
          def: [
            { name: "د. عبد الله الشامي", initials: "ع ش", role: "المدير العام", note: "يشرف على الإدارة وخططها السنوية", photo: "" },
            { name: "سهى الخطيب", initials: "س خ", role: "مديرة الموسم", note: "تضبط إعدادات الموسم وتعتمد النتائج", photo: "" },
            { name: "مازن الحلبي", initials: "م ح", role: "مدير مكتب دمشق", note: "الاعتماد النهائي للتكتلات والعقود", photo: "" },
            { name: "طارق مصطفى", initials: "ط م", role: "رئيس التدقيق", note: "يراجع سجل الأحداث والاعتراضات", photo: "" },
            { name: "رنا العمر", initials: "ر ع", role: "مديرة التسجيل", note: "شروط التسجيل وقوائم الخارجية", photo: "" },
            { name: "هيثم السيد", initials: "هـ س", role: "رئيس المواصلات", note: "الرحلات والنقل وغرفة العمليات", photo: "" },
          ],
        },
      ],
    },
    {
      id: "departments",
      label: "الإدارات",
      icon: "ClipboardList",
      fields: [
        ...heading("الهيكل", "تسع إدارات، هدف واحد", "كل إدارة مسؤولة عن جزء واضح من رحلة الحاج، ولكل موظف صلاحيات تُمنح له واحدة واحدة."),
        {
          key: "items",
          label: "الإدارات",
          kind: "list",
          itemName: "إدارة",
          itemTitleKey: "title",
          wide: true,
          item: [
            { key: "title", label: "الاسم", kind: "text", def: "" },
            { key: "icon", label: "الأيقونة", kind: "icon", def: "ClipboardList" },
            { key: "text", label: "الوصف", kind: "textarea", rows: 2, def: "", wide: true },
          ],
          def: [
            { title: "إدارة التسجيل", icon: "ClipboardList", text: "استقبال الطلبات وتدقيق الوثائق والتحقق من الأهلية." },
            { title: "إدارة المواسم", icon: "CalendarRange", text: "ضبط الحصة والرسوم والمواعيد وإصدار نتائج القبول." },
            { title: "التدقيق", icon: "ShieldCheck", text: "مراجعة سجل الأحداث والاعتراضات وضمان النزاهة." },
            { title: "غرفة العمليات", icon: "Radar", text: "متابعة الحجاج لحظياً والاستجابة للطوارئ في الميدان." },
            { title: "شؤون الإداريين", icon: "UserCog", text: "امتحانات الإداريين وتأهيلهم وتقييم أدائهم." },
            { title: "المالية", icon: "Wallet", text: "الإيصالات والتسديد والمحاسبة بنظام الأسهم ورد الأموال." },
            { title: "الشؤون الدينية", icon: "BookOpen", text: "الأكاديمية والدروس قبل السفر والإرشاد في المشاعر." },
            { title: "المواصلات", icon: "Plane", text: "عقود الطيران وتوزيع الرحلات والنقل بين المدن." },
            { title: "الفريق الطبي", icon: "Stethoscope", text: "الفحوص واللقاحات والرعاية الصحية طوال الرحلة." },
          ],
        },
      ],
    },
    {
      id: "accounts",
      label: "أنواع الحسابات",
      icon: "IdCard",
      fields: [
        ...heading(
          "أنواع الحسابات",
          "ثلاثة أطراف، حساب واحد لكل شخص",
          "لكل شخص في المنصة نوع حساب واحد فقط، ولا يجمع بين نوعين. أما الزائر فيتصفح المحتوى العام دون حساب.",
        ),
        { key: "featuredBadge", label: "شارة البطاقة الأولى", kind: "text", def: "الأكثر شيوعاً" },
        {
          key: "items",
          label: "أنواع الحسابات",
          kind: "list",
          itemName: "نوع حساب",
          itemTitleKey: "title",
          maxItems: 3,
          wide: true,
          item: [
            { key: "title", label: "الاسم", kind: "text", def: "" },
            { key: "icon", label: "الأيقونة", kind: "icon", def: "UserRound" },
            { key: "tagline", label: "سطر التعريف", kind: "text", def: "", wide: true },
            { key: "who", label: "من هو؟", kind: "textarea", rows: 2, def: "", wide: true },
            { key: "create", label: "كيف يُنشأ الحساب؟", kind: "textarea", rows: 2, def: "", wide: true },
            { key: "permissions", label: "الصلاحيات", kind: "textarea", rows: 2, def: "", wide: true },
            { key: "travel", label: "هل يسافر إلى الحج؟", kind: "text", def: "", wide: true },
            { key: "duration", label: "مدة الحساب", kind: "text", def: "", wide: true },
          ],
          def: [
            {
              title: "الحاج",
              icon: "UserRound",
              tagline: "المواطن الذي يتقدم بطلب حج",
              who: "المواطن الذي يتقدم بطلب حج أو قُبل طلبه",
              create: "ينشئه بنفسه بالرقم الوطني",
              permissions: "لا يملك صلاحيات إدارية؛ يرى بياناته وبيانات عائلته فقط",
              travel: "نعم، إن قُبل طلبه",
              duration: "مرتبط بطلبه في كل موسم",
            },
            {
              title: "الإداري الموسمي",
              icon: "BriefcaseBusiness",
              tagline: "يخدم الحجاج خلال الموسم",
              who: "رئيس تكتل أو مجموعة ومعاوناهما، والموجّه، والمنسق التقني",
              create: "ينشئه بنفسه، ثم يتقدم برسم تسجيل ويخضع للامتحان",
              permissions: "تأتي تلقائياً من منصبه في الموسم، وتتغير بتغيّره",
              travel: "نعم دائماً، مع حجاجه",
              duration: "موسمي، يتجدد بالتقدم لكل موسم",
            },
            {
              title: "الموظف الدائم",
              icon: "IdCard",
              tagline: "يعمل في مكاتب الإدارة",
              who: "موظف تسجيل أو مواسم أو تدقيق أو عمليات أو مواصلات...",
              create: "لا ينشئه بنفسه؛ يُنشئه له موظف يملك الصلاحية",
              permissions: "تُمنح له واحدة واحدة بحسب عمله",
              travel: "بعضهم فقط، بأدوار ميدانية",
              duration: "دائم، لا ينتهي بانتهاء الموسم",
            },
          ],
        },
        {
          key: "rows",
          label: "أسطر جدول المقارنة",
          kind: "list",
          itemName: "سطر",
          itemTitleKey: "label",
          wide: true,
          hint: "المفتاح يربط السطر بالحقل في بطاقة الحساب أعلاه.",
          item: [
            { key: "key", label: "المفتاح", kind: "text", def: "" },
            { key: "label", label: "اسم السطر", kind: "text", def: "" },
          ],
          def: [
            { key: "who", label: "من هو؟" },
            { key: "create", label: "كيف يُنشأ الحساب؟" },
            { key: "permissions", label: "الصلاحيات" },
            { key: "travel", label: "هل يسافر إلى الحج؟" },
            { key: "duration", label: "مدة الحساب" },
          ],
        },
      ],
    },
    {
      id: "missions",
      label: "البعثات",
      icon: "Plane",
      fields: [
        ...heading("في الميدان", "البعثات الأربع", "تعتمدها الإدارة وتوزّعها على الأبراج والمخيمات لمراقبة عمل التكتلات وخدمة الحجاج."),
        {
          key: "items",
          label: "البعثات",
          kind: "list",
          itemName: "بعثة",
          itemTitleKey: "title",
          wide: true,
          item: [
            { key: "title", label: "الاسم", kind: "text", def: "" },
            { key: "icon", label: "الأيقونة", kind: "icon", def: "Landmark" },
            { key: "text", label: "الوصف", kind: "textarea", rows: 2, def: "", wide: true },
            { key: "image", label: "الصورة", kind: "image", def: "/images/mina-tents.jpg", wide: true },
          ],
          def: [
            { title: "البعثة الإدارية", icon: "Landmark", text: "تتابع التزام التكتلات بالسكن والنقل والإعاشة وفق العقود.", image: "/images/mina-tents.jpg" },
            { title: "البعثة الدينية", icon: "BookOpen", text: "ترشد الحجاج في المناسك وتجيب عن أسئلتهم في المشاعر.", image: "/images/jabal-rahmah.jpg" },
            { title: "البعثة الصحية", icon: "HeartPulse", text: "عيادات ميدانية ومتابعة لكبار السن وأصحاب الأمراض المزمنة.", image: "/images/pilgrim-dua.jpg" },
            { title: "البعثة الإعلامية", icon: "Camera", text: "توثيق الموسم وطمأنة الأهالي ونشر التعليمات أولاً بأول.", image: "/images/jamarat.jpg" },
          ],
        },
      ],
    },
    {
      id: "principles",
      label: "مبادئ المنصة",
      icon: "ShieldCheck",
      fields: [
        ...heading("مبادئ المنصة", "القواعد التي تحكم كل شيء", "مبادئ ثابتة بُنيت عليها المنصة الوطنية للحج، من إنشاء الحساب حتى أرشفة الموسم."),
        {
          key: "items",
          label: "المبادئ",
          kind: "list",
          itemName: "مبدأ",
          itemTitleKey: "title",
          wide: true,
          item: [
            { key: "title", label: "العنوان", kind: "text", def: "", wide: true },
            { key: "text", label: "الشرح", kind: "textarea", rows: 3, def: "", wide: true },
          ],
          def: [
            { title: "الرقم الوطني مفتاح المواطن", text: "بياناته الرسمية تأتي من الشؤون المدنية، وإن تعذّر الربط أدخلها بنفسه وتحقق منها الموظف." },
            { title: "نوع حساب واحد لكل شخص", text: "حاج أو إداري أو موظف، ولا جمع بين نوعين." },
            { title: "الموسم هو الإطار", text: "كل قاعدة وحصة ومنصب مرتبط بموسم، ويمكن أن يختلف في الموسم التالي." },
            {
              title: "تسجيلان منفصلان للقبول",
              text: "تسجيل على القبول المباشر بالأكبر سناً (35% من الحصة)، ثم تسجيل مستقل بطلب جديد على قرعة علنية (65%) تُعتمد نتائجها وتُنشر مع سجل كامل.",
            },
            { title: "الحاج يرى ما يخصه", text: "وما لم يُحدَّد بعد يظهر بعبارة «لم يُحدَّد بعد» بدلاً من أن يختفي." },
            { title: "كل مرحلة تُقيَّم", text: "يقيّم الحاج كل مرحلة، ويُقيَّم الإداري والتكتل، والنتائج تُستخدم فعلاً." },
            { title: "سجل أحداث للإضافة فقط", text: "كل إجراء مسجّل باسم من نفّذه، ولا يطّلع عليه إلا صاحب الصلاحية." },
            { title: "لكل رسم إيصال ولكل علاقة عقد", text: "إيصالات رقمية مستقلة قابلة للتحقق، وعقود تُوقَّع إلكترونياً وتصادق عليها الإدارة." },
            { title: "نمط الزائر أولاً", text: "كل ما هو عام متاح دون حساب، ولا يُطلب الحساب إلا لما يخص الشخص نفسه." },
            { title: "الشروط من لوحة الإدارة", text: "تُضبط لكل موسم، ويبقى ثابتاً: مسلم وسوري، لم يحج سابقاً، وغير مصاب بمرض عضال." },
          ],
        },
      ],
    },
    {
      id: "branches",
      label: "دليل الفروع",
      icon: "MapPin",
      fields: [
        ...heading("دليل الفروع", "قريبون منك في كل محافظة", "اختر الفرع لترى موقعه على الخريطة وعنوانه وأوقات دوامه ورقم هاتفه."),
        {
          key: "items",
          label: "الفروع",
          kind: "list",
          itemName: "فرع",
          itemTitleKey: "name",
          wide: true,
          item: [
            { key: "slug", label: "المعرّف", kind: "text", def: "", hint: "بالإنكليزية، بدون مسافات" },
            { key: "name", label: "اسم الفرع", kind: "text", def: "", wide: true },
            { key: "city", label: "المدينة", kind: "text", def: "" },
            { key: "head", label: "الإدارة العامة", kind: "boolean", def: false },
            { key: "address", label: "العنوان", kind: "textarea", rows: 2, def: "", wide: true },
            { key: "hours", label: "أوقات الدوام", kind: "text", def: "", wide: true },
            { key: "phone", label: "الهاتف", kind: "text", def: "" },
            { key: "lat", label: "خط العرض", kind: "number", def: 33.5, step: 0.0001 },
            { key: "lng", label: "خط الطول", kind: "number", def: 36.3, step: 0.0001 },
          ],
          def: [
            {
              slug: "damascus",
              name: "الإدارة العامة — دمشق، المزة",
              city: "دمشق",
              lat: 33.5006,
              lng: 36.2495,
              address: "المزة، أوتستراد المزة، جانب حديقة الجلاء، بناء رقم 14",
              hours: "الأحد – الخميس، 8:00 ص – 3:00 م",
              phone: "011 612 4490",
              head: true,
            },
            { slug: "aleppo", name: "فرع حلب", city: "حلب", lat: 36.2085, lng: 37.1467, address: "الجميلية، شارع القوتلي، مقابل البريد المركزي", hours: "الأحد – الخميس، 8:00 ص – 2:30 م", phone: "021 221 7735", head: false },
            { slug: "homs", name: "فرع حمص", city: "حمص", lat: 34.7308, lng: 36.7094, address: "شارع الحضارة، قرب دوار الساعة الجديدة", hours: "الأحد – الخميس، 8:00 ص – 2:30 م", phone: "031 247 1102", head: false },
            { slug: "hama", name: "فرع حماة", city: "حماة", lat: 35.1333, lng: 36.7519, address: "ساحة العاصي، شارع أبي الفداء، الطابق الأول", hours: "الأحد – الخميس، 8:00 ص – 2:30 م", phone: "033 251 6640", head: false },
            { slug: "latakia", name: "فرع اللاذقية", city: "اللاذقية", lat: 35.5196, lng: 35.7897, address: "شارع 8 آذار، قرب ساحة الشيخ ضاهر", hours: "الأحد – الخميس، 8:00 ص – 2:30 م", phone: "041 247 3318", head: false },
            { slug: "daraa", name: "فرع درعا", city: "درعا", lat: 32.6254, lng: 36.1057, address: "درعا المحطة، شارع الشهداء، بناء المجمع الحكومي", hours: "الأحد – الخميس، 8:00 ص – 2:00 م", phone: "015 223 9051", head: false },
            { slug: "deir-ez-zor", name: "فرع دير الزور", city: "دير الزور", lat: 35.3359, lng: 40.1408, address: "شارع التكايا، قرب الجسر المعلق", hours: "الأحد – الخميس، 8:00 ص – 2:00 م", phone: "051 222 4867", head: false },
            { slug: "idlib", name: "فرع إدلب", city: "إدلب", lat: 35.9306, lng: 36.6339, address: "مركز المدينة، شارع الجلاء، جانب المركز الثقافي", hours: "الأحد – الخميس، 8:00 ص – 2:00 م", phone: "023 255 1470", head: false },
          ],
        },
      ],
    },
    {
      id: "contact",
      label: "نموذج التواصل",
      icon: "Mail",
      fields: [
        ...heading("تواصل معنا", "نسمعك ونرد عليك", "أرسل استفسارك أو ملاحظتك، وستحصل على رقم تذكرة لمتابعة رسالتك."),
        {
          key: "subjects",
          label: "مواضيع الرسائل",
          kind: "list",
          itemName: "موضوع",
          itemTitleKey: "text",
          wide: true,
          item: [{ key: "text", label: "الموضوع", kind: "text", def: "" }],
          def: [
            { text: "استفسار عن التسجيل" },
            { text: "نتائج القبول والقرعة" },
            { text: "الرسوم والإيصالات" },
            { text: "الإبلاغ عن جهة وهمية" },
            { text: "العمل كإداري" },
            { text: "اقتراح أو شكوى" },
          ],
        },
        {
          key: "channels",
          label: "بطاقة قنوات التواصل",
          kind: "list",
          itemName: "قناة",
          itemTitleKey: "label",
          wide: true,
          item: [
            { key: "label", label: "الاسم", kind: "text", def: "" },
            { key: "icon", label: "الأيقونة", kind: "icon", def: "Phone" },
            { key: "value", label: "القيمة", kind: "text", def: "", wide: true },
            { key: "note", label: "الملاحظة", kind: "text", def: "", wide: true },
            { key: "ltr", label: "يُعرض من اليسار (أرقام وبريد)", kind: "boolean", def: false },
          ],
          def: [
            { label: "مركز الاتصال", icon: "Headset", value: "9449", note: "يومياً من 8 صباحاً حتى 8 مساءً", ltr: true },
            { label: "الإدارة العامة", icon: "Phone", value: "011 612 4490", note: "الأحد – الخميس", ltr: true },
            { label: "البريد الإلكتروني", icon: "Mail", value: "info@hajj.gov.sy.demo", note: "نرد خلال يومي عمل", ltr: true },
            { label: "العنوان", icon: "Building2", value: "دمشق — المزة", note: "أوتستراد المزة، جانب حديقة الجلاء", ltr: false },
          ],
        },
        { key: "warningTitle", label: "التنبيه — العنوان", kind: "text", def: "تنبيه" },
        {
          key: "warningText",
          label: "التنبيه — النص",
          kind: "textarea",
          rows: 2,
          wide: true,
          def: "موظفو الإدارة لا يطلبون منك رمز التحقق أو أي مبلغ عبر الهاتف أبداً.",
        },
      ],
    },
  ],
};

// ═══════════════════════════ العمرة ═══════════════════════════

const UMRAH: PageDef = {
  id: "umrah",
  label: "العمرة",
  path: "/umrah",
  icon: "Hourglass",
  group: "الموقع العام",
  description: "صفحة خدمات العمرة — قيد الإعداد، مع قائمة ما يُخطَّط له ونموذج التنبيه.",
  sections: [
    {
      id: "hero",
      label: "ترويسة الصفحة",
      icon: "Landmark",
      required: true,
      fields: [
        ...pageHero(
          "العمرة",
          "قريباً",
          "نعمل على إضافة خدمات العمرة إلى المنصة الوطنية. ستُعلن التفاصيل والمواعيد رسمياً عند اعتمادها من الإدارة.",
          "/images/tawaf-night.jpg",
          "العمرة",
        ),
      ],
    },
    {
      id: "notice",
      label: "تنبيه «قيد الإعداد»",
      icon: "AlertTriangle",
      fields: [
        { key: "title", label: "العنوان", kind: "text", def: "الخدمة قيد الإعداد", wide: true },
        { key: "icon", label: "الأيقونة", kind: "icon", def: "Hourglass" },
        {
          key: "text",
          label: "النص",
          kind: "textarea",
          rows: 4,
          wide: true,
          def: "لم تُعلن بعد برامج العمرة ولا مواعيدها ولا تكاليفها على المنصة. أي جهة تعرض عليك اليوم «تسجيلاً عبر المنصة الوطنية» للعمرة لا تمثّل الإدارة — يمكنك التحقق من الجهات المعتمدة.",
        },
        { key: "linkLabel", label: "نص الرابط داخل النص", kind: "text", def: "التحقق من الجهات المعتمدة" },
        { key: "linkHref", label: "وجهة الرابط", kind: "url", def: "/verify" },
      ],
    },
    {
      id: "planned",
      label: "الخدمات المخطط لها",
      icon: "ClipboardList",
      fields: [
        ...heading("ما الذي نعمل عليه", "خدمات العمرة المخطط لها", "هذه قائمة بما نعمل على إضافته، وقد تتغير تفاصيلها عند الإطلاق."),
        { key: "badge", label: "شارة كل بطاقة", kind: "text", def: "قريباً" },
        {
          key: "items",
          label: "الخدمات",
          kind: "list",
          itemName: "خدمة",
          itemTitleKey: "title",
          wide: true,
          item: [
            { key: "title", label: "العنوان", kind: "text", def: "" },
            { key: "icon", label: "الأيقونة", kind: "icon", def: "UsersRound" },
            { key: "text", label: "الوصف", kind: "textarea", rows: 3, def: "", wide: true },
          ],
          def: [
            { icon: "UsersRound", title: "التسجيل في رحلات العمرة", text: "تقديم طلب العمرة لك ولعائلتك من حسابك نفسه، بالطريقة المبسطة التي تعرفها من طلب الحج." },
            { icon: "ShieldCheck", title: "الجهات المعتمدة للعمرة", text: "دليل بالشركات والحملات المعتمدة، مع إمكانية التحقق من أي جهة قبل التعامل معها." },
            { icon: "Wallet", title: "البرامج والتكاليف المعلنة", text: "عرض البرامج المعتمدة وتكاليفها الرسمية بشفافية، مع إيصالات رقمية لكل دفعة." },
            { icon: "FileCheck2", title: "متابعة الطلب والتأشيرة", text: "حالة الطلب والوثائق المطلوبة والتأشيرة خطوة بخطوة، مع إشعارات على الهاتف." },
            { icon: "Plane", title: "الرحلة والسكن", text: "تفاصيل الرحلة والفندق والمجموعة في مكان واحد بعد اعتماد الطلب." },
            { icon: "CalendarClock", title: "مواعيد المواسم", text: "مواعيد فتح التسجيل لكل موسم عمرة، وتذكير شخصي بها." },
          ],
        },
      ],
    },
    {
      id: "academyCard",
      label: "بطاقة مسار فقه العمرة",
      icon: "BookOpenText",
      fields: [
        { key: "badge", label: "الشارة", kind: "text", def: "متاح الآن" },
        { key: "title", label: "العنوان", kind: "text", def: "مسار «فقه العمرة» في الأكاديمية", wide: true },
        {
          key: "text",
          label: "النص",
          kind: "textarea",
          rows: 3,
          wide: true,
          def: "أركان العمرة وواجباتها وأخطاؤها الشائعة، بالفيديو والشرح المسموع والملخص المكتوب — دون تسجيل دخول.",
        },
        { key: "ctaLabel", label: "نص الرابط", kind: "text", def: "ابدأ التعلّم" },
        { key: "href", label: "الرابط", kind: "url", def: "/academy/umrah-fiqh" },
      ],
    },
  ],
};

// ═══════════════════════════ صفحات بترويسة فقط ═══════════════════════════

const heroOnly = (
  id: string,
  label: string,
  path: string,
  icon: string,
  hero: Field[],
  description: string,
  extra: PageDef["sections"] = [],
): PageDef => ({
  id,
  label,
  path,
  icon,
  group: "الموقع العام",
  description,
  sections: [{ id: "hero", label: "ترويسة الصفحة", icon: "Landmark", required: true, fields: hero }, ...extra],
});

const CONDITIONS = heroOnly(
  "conditions",
  "الشروط والتكاليف",
  "/conditions",
  "ScrollText",
  pageHero(
    "شروط التسجيل",
    "والتكاليف",
    "كل ما تحتاج معرفته قبل التقديم لموسم 1448هـ: الشروط، وحدود الطلب، والرسوم، وطريقة القبول، ومواعيد الموسم. الشروط تعتمدها الإدارة وتنشرها قبل فتح التسجيل.",
    "/images/pilgrim-elder.jpg",
    "الشروط والتكاليف",
  ),
  "شروط التسجيل، الرسوم، الأهلية المبدئية، والأسئلة الشائعة.",
  [
    {
      id: "basics",
      label: "الشروط الأساسية",
      icon: "Check",
      fields: [
        ...heading("ثابتة في كل موسم", "الشروط الأساسية", "أربعة شروط لا تتغير من موسم إلى آخر، وتنطبق على كل فرد في الطلب."),
      ],
    },
  ],
);

const GUIDE = heroOnly(
  "guide",
  "دليل المناسك",
  "/guide",
  "NotebookTabs",
  pageHero(
    "دليل",
    "المناسك",
    "مركز المعرفة للحاج السوري: ماذا تفعل في كل يوم، وأين تكون، وماذا تقول. بلغة بسيطة وخرائط وأدعية مسموعة.",
    "/images/jabal-rahmah.jpg",
    "دليل المناسك",
  ),
  "أعمال الحج يوماً بيوم، الأنساك، الأدعية، وقائمة الحقيبة.",
  [
    {
      id: "days",
      label: "ترويسة الأيام",
      icon: "CalendarDays",
      fields: heading("من 8 إلى 13 ذي الحجة", "أعمال الحج يوماً بيوم", "اختر اليوم لترى ما تفعله، والمواعيد التقريبية، والدعاء، والمكان على الخريطة."),
    },
    {
      id: "rites",
      label: "ترويسة الأنساك",
      icon: "Compass",
      fields: heading("قبل الإحرام", "أي نسك تختار؟", "الأنساك الثلاثة صحيحة كلها. هذه مقارنة سريعة تساعدك على الفهم، واسأل مرشد مجموعتك عن الأنسب لك."),
    },
  ],
);

const ACADEMY = heroOnly(
  "academy",
  "الأكاديمية",
  "/academy",
  "BookOpenText",
  pageHero(
    "أكاديمية",
    "الدروس الدينية",
    "تعلّم مناسكك قبل أن تسافر: دروس قصيرة وواضحة بصوت نخبة من المشايخ والمختصين، متاحة مجاناً طوال السنة، مع ملخص مكتوب لكل درس.",
    "/images/haram-2022.jpg",
    "الأكاديمية",
  ),
  "مسارات الدروس الدينية بالفيديو والصوت والملخصات.",
);

const NEWS_PAGE = heroOnly(
  "news",
  "الأخبار والإعلانات",
  "/news",
  "Megaphone",
  pageHero(
    "مدونة الإدارة",
    "والإعلانات الرسمية",
    "كل قرار وتعميم وإعلان يصدر عن الإدارة يُنشر هنا أولاً، بعد اعتماده. تابع مواعيد الموسم، ونتائج القبول، والتحذيرات المهمة.",
    "/images/haram-2022.jpg",
    "الأخبار",
  ),
  "مدونة الإدارة: القرارات والتعاميم والإعلانات الرسمية.",
);

const PRAYER = heroOnly(
  "prayer-times",
  "مواقيت الصلاة",
  "/prayer-times",
  "Clock3",
  pageHero(
    "مواقيت",
    "الصلاة",
    "مواقيت دقيقة لمدينتك ولمكة المكرمة والمدينة المنورة، مع عدّ تنازلي حي للصلاة القادمة، وبوصلة تدلك على القبلة، وجدول شهري قابل للطباعة.",
    "/images/clock-tower.jpg",
    "مواقيت الصلاة",
  ),
  "المواقيت اليومية والجدول الشهري وبوصلة القبلة.",
);

const RESULTS = heroOnly(
  "results",
  "نتائج القبول",
  "/results",
  "FileSearch",
  pageHero(
    "نتائج القبول",
    "1448هـ",
    "نتائج التسجيلين معتمدة ومنشورة للجميع: القبول المباشر وفق الأكبر سناً، والقرعة الإلكترونية على طلبات القرعة، وقائمة الاحتياط. ابحث برقمك الوطني أو تصفّح القوائم العامة.",
    "/images/haram-2022.jpg",
    "نتائج القبول",
  ),
  "البحث بالرقم الوطني، القوائم العامة، وشرح القرعة.",
  [
    {
      id: "search",
      label: "ترويسة البحث",
      icon: "FileSearch",
      fields: heading("البحث بالرقم الوطني", "هل تم قبولك؟", "أدخل الرقم الوطني كاملاً ورمز التحقق. تظهر النتيجة فوراً دون الحاجة إلى حساب."),
    },
    {
      id: "charts",
      label: "ترويسة الإحصاءات",
      icon: "Award",
      fields: heading("الإحصاءات المفتوحة", "القبول بالأرقام", "أرقام مجمّعة فقط، تُحدَّث تلقائياً مع كل نشر معتمد."),
    },
    {
      id: "lists",
      label: "ترويسة القوائم العامة",
      icon: "ClipboardList",
      fields: heading(
        "القوائم العامة",
        "المقبولون والاحتياط",
        "الطلب العائلي يظهر بأسماء أفراده تحت رقم الطلب. الرقم الوطني مقنّع، ولا تظهر أي بيانات أخرى.",
      ),
    },
  ],
);

const VERIFY = heroOnly(
  "verify",
  "التحقق من الجهات",
  "/verify",
  "ShieldCheck",
  pageHero(
    "التحقق من",
    "الجهات والوثائق",
    "قبل أن تدفع أي مبلغ أو تعتمد على أي ورقة: تأكد أن الجهة معتمدة للموسم، وأن الإيصال أو الشهادة صادرة فعلاً عن المنصة.",
    "/images/kaaba-panoramio.jpg",
    "التحقق من الجهات والوثائق",
  ),
  "التحقق من الحملات المعتمدة والإيصالات والشهادات.",
);

// ═══════════════════════════ إعدادات عامة ═══════════════════════════

const GLOBAL: PageDef = {
  id: "global",
  label: "الهوية والقوائم والتذييل",
  path: "/",
  icon: "Globe",
  group: "عناصر تظهر في كل الصفحات",
  required: true,
  description: "اسم المنصة، قائمة التنقل العلوية، قائمة «المزيد»، وتذييل الموقع بكل أعمدته.",
  sections: [
    {
      id: "identity",
      label: "هوية المنصة",
      icon: "Landmark",
      required: true,
      fields: [
        { key: "name", label: "اسم المنصة", kind: "text", def: "المنصة الوطنية للحج", wide: true },
        { key: "authority", label: "اسم الجهة", kind: "text", def: "إدارة الحج والعمرة السورية", wide: true },
        { key: "season", label: "الموسم المعروض", kind: "text", def: "موسم 1448هـ" },
      ],
    },
    {
      id: "nav",
      label: "القائمة العلوية",
      icon: "ClipboardList",
      required: true,
      fields: [
        {
          key: "items",
          label: "روابط القائمة",
          kind: "list",
          itemName: "رابط",
          itemTitleKey: "label",
          wide: true,
          item: [
            { key: "label", label: "النص", kind: "text", def: "" },
            { key: "href", label: "الرابط", kind: "url", def: "/" },
          ],
          def: [
            { href: "/", label: "الرئيسية" },
            { href: "/academy", label: "الأكاديمية" },
            { href: "/guide", label: "دليل المناسك" },
            { href: "/prayer-times", label: "مواقيت الصلاة" },
            { href: "/news", label: "الأخبار" },
            { href: "/results", label: "نتائج القبول" },
            { href: "/about", label: "من نحن" },
          ],
        },
        {
          key: "more",
          label: "قائمة «المزيد»",
          kind: "list",
          itemName: "عنصر",
          itemTitleKey: "label",
          wide: true,
          item: [
            { key: "label", label: "النص", kind: "text", def: "" },
            { key: "href", label: "الرابط", kind: "url", def: "/" },
            { key: "note", label: "الشرح", kind: "text", def: "", wide: true },
            { key: "soon", label: "شارة «قريباً»", kind: "boolean", def: false },
          ],
          def: [
            { href: "/umrah", label: "العمرة", note: "خدمات العمرة على المنصة", soon: true },
            { href: "/conditions", label: "شروط التسجيل والتكاليف", note: "مع فحص أهلية مبدئي", soon: false },
            { href: "/verify", label: "التحقق من الجهات والوثائق", note: "حملات معتمدة، إيصالات، شهادات", soon: false },
            { href: "/administrator", label: "بوابة الإداريين", note: "التقديم، الامتحان، تشكيل المجموعة", soon: false },
            { href: "/staff", label: "دخول الموظفين", note: "المراجعة، القرعة، غرفة العمليات", soon: false },
          ],
        },
      ],
    },
    {
      id: "footer",
      label: "تذييل الموقع",
      icon: "FileText",
      required: true,
      fields: [
        {
          key: "about",
          label: "نبذة التذييل",
          kind: "textarea",
          rows: 3,
          wide: true,
          def: "منصة واحدة لرحلة الحاج كاملة: من إنشاء الحساب والتسجيل والقرعة، إلى السكن والرحلات والمشاعر، حتى العودة إلى الوطن بسلام.",
        },
        { key: "col1Title", label: "عنوان العمود الأول", kind: "text", def: "البوابة العامة" },
        { key: "col2Title", label: "عنوان العمود الثاني", kind: "text", def: "خدمات الحاج" },
        {
          key: "col2",
          label: "روابط العمود الثاني",
          kind: "list",
          itemName: "رابط",
          itemTitleKey: "label",
          wide: true,
          hint: "تُضاف قبل روابط قائمة «المزيد».",
          item: [
            { key: "label", label: "النص", kind: "text", def: "" },
            { key: "href", label: "الرابط", kind: "url", def: "/" },
          ],
          def: [
            { label: "إنشاء حساب حاج", href: "/register" },
            { label: "تقديم طلب حج", href: "/portal/apply" },
            { label: "متابعة الطلب", href: "/portal/application" },
          ],
        },
        { key: "contactTitle", label: "عنوان عمود التواصل", kind: "text", def: "تواصل معنا" },
        { key: "address", label: "العنوان", kind: "text", def: "دمشق — المزة، أوتوستراد المزة، بناء الإدارة (عنوان وهمي)", wide: true },
        { key: "phone", label: "الهاتف", kind: "text", def: "+963 11 000 1448" },
        { key: "email", label: "البريد الإلكتروني", kind: "text", def: "info@hajj-demo.sy" },
        { key: "hours", label: "أوقات الدوام", kind: "text", def: "أوقات الدوام: الأحد – الخميس، 8:30 صباحاً – 3:30 عصراً", wide: true },
        {
          key: "social",
          label: "روابط التواصل الاجتماعي",
          kind: "list",
          itemName: "حساب",
          itemTitleKey: "label",
          wide: true,
          item: [
            { key: "label", label: "الاسم", kind: "text", def: "" },
            { key: "href", label: "الرابط", kind: "url", def: "#" },
            {
              key: "network",
              label: "الشبكة",
              kind: "select",
              def: "facebook",
              options: [
                { value: "facebook", label: "فيسبوك" },
                { value: "youtube", label: "يوتيوب" },
                { value: "telegram", label: "تيليغرام" },
                { value: "x", label: "إكس" },
                { value: "whatsapp", label: "واتساب" },
              ],
            },
          ],
          def: [
            { label: "فيسبوك", network: "facebook", href: "#" },
            { label: "يوتيوب", network: "youtube", href: "#" },
            { label: "تيليغرام", network: "telegram", href: "#" },
          ],
        },
        {
          key: "legal",
          label: "سطر الحقوق",
          kind: "text",
          wide: true,
          def: "© موسم 1448هـ — منصة تجريبية للعرض فقط. لا تمثل أي جهة رسمية ولا تجمع أي بيانات حقيقية.",
        },
        { key: "credits", label: "سطر مصادر الصور", kind: "text", def: "الصور ومقاطع الفيديو من Wikimedia Commons بتراخيص مفتوحة", wide: true },
      ],
    },
  ],
};

export const CMS_PAGES: PageDef[] = [HOME, ABOUT, CONDITIONS, GUIDE, ACADEMY, NEWS_PAGE, PRAYER, RESULTS, VERIFY, UMRAH, GLOBAL];

export const CMS_GROUPS = [...new Set(CMS_PAGES.map((p) => p.group))];

export function getPageDef(id: string) {
  return CMS_PAGES.find((p) => p.id === id) ?? null;
}

export function getSectionDef(pageId: string, sectionId: string) {
  return getPageDef(pageId)?.sections.find((s) => s.id === sectionId) ?? null;
}

/** القيم الافتراضية لقسم كامل */
export function sectionDefaults(pageId: string, sectionId: string): Record<string, unknown> {
  const def = getSectionDef(pageId, sectionId);
  if (!def) return {};
  return Object.fromEntries(def.fields.map((f) => [f.key, f.def]));
}
