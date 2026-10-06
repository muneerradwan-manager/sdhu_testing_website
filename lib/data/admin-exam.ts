/**
 * Written qualification exam for seasonal administrators (الجزء الثاني — 3.4).
 * A small, fictional sample of the question bank. Every role sits its own exam: each question belongs to
 * the roles whose exam it is part of — some to every role (first aid, emergencies, dealing with pilgrims),
 * most to one or two (the guides' rulings, the coordinator's desk, the deputy's attendance).
 * A role's exam is built in sections (the sharia section, the field section...), each with its share of
 * the mark and its number of questions of each type; the paper is drawn from the bank per applicant.
 */

export type ExamCategory = "ديني" | "إداري" | "تشغيلي" | "إسعافات أولية" | "إدارة الحشود" | "نقل" | "طوارئ" | "تقني";
export const EXAM_CATEGORIES: ExamCategory[] = ["ديني", "إداري", "تشغيلي", "إدارة الحشود", "نقل", "إسعافات أولية", "طوارئ", "تقني"];

/** How a question is answered: one of several options, true or false, or a written answer a grader marks */
export type QuestionType = "choice" | "truefalse" | "written";
export const QUESTION_TYPES: Record<QuestionType, string> = { choice: "اختيار من متعدد", truefalse: "صح أو خطأ", written: "تحريري" };
export const TRUE_FALSE = ["صح", "خطأ"];

const HEAD = "group-head";
const DEPUTY = "group-deputy";
const GUIDE_M = "guide-m";
const GUIDE_F = "guide-f";
const TECH = "tech";
const GUIDES = [GUIDE_M, GUIDE_F];
const EVERY_ROLE = [HEAD, DEPUTY, GUIDE_M, GUIDE_F, TECH];

export type ExamQuestion = {
  id: number;
  category: ExamCategory;
  /** Multiple choice when absent */
  type?: QuestionType;
  /** A written question's full mark (5 when absent); every other question counts one point */
  points?: number;
  /** The roles whose exam includes this question (keys from the administrator lib's POSITIONS) */
  roles: string[];
  /** Short scenario shown above the question, when there is one */
  scenario?: string;
  text: string;
  /** A true-or-false question's are «صح» and «خطأ»; a written question has none */
  options: string[];
  /** The right option; -1 for a written question */
  answer: number;
  /** Why the answer is right; for a written question, what the grader looks for */
  explanation: string;
};

export const typeOf = (q: Pick<ExamQuestion, "type">): QuestionType => q.type ?? "choice";
export const pointsOf = (q: Pick<ExamQuestion, "type" | "points">) => (typeOf(q) === "written" ? (q.points ?? 5) : 1);

export const EXAM_RULES = {
  writtenWeight: 0.6,
  oralWeight: 0.4,
  passMark: 70,
  writtenMin: 70,
  season: 1448,
  oralDate: "1 جمادى الأولى 1448 — 10:30 — مبنى مديرية الحج — اللجنة رقم 3",
  resultsDate: "10 جمادى الأولى 1448",
} as const;

export const EXAM_QUESTIONS: ExamQuestion[] = [
  {
    id: 1,
    category: "إداري",
    roles: [HEAD, TECH],
    text: "اختارت عائلة مجموعتك وتواصلت مع منسقها، لكن عددها يرفع الأعضاء فوق السعة المعتمدة. ما الإجراء الصحيح؟",
    options: [
      "يسجّل العائلة ويطلب زيادة السعة لاحقاً",
      "يسجّل بعض أفراد العائلة ويترك الباقين",
      "لا يُسجّل المنسق العائلة؛ فالمنصة تتحقق من السعة لحظة التسجيل، ويبلغ الحاج ليختار مجموعة أخرى تتسع لعائلته كاملة",
      "يسجّلها في مجموعة أخرى دون علمها",
    ],
    answer: 2,
    explanation: "الطلب العائلي يُسجَّل في مجموعة واحدة كاملاً أو لا يُسجَّل، ولا يتجاوز السعة المعتمدة. الحاج هو من يختار المجموعة، ومنسقها يسجّله فيها."
  },
  {
    id: 2,
    category: "ديني",
    roles: [HEAD, DEPUTY, ...GUIDES],
    text: "متى يبدأ رمي جمرة العقبة للمجموعة وفق البرنامج المعتمد يوم النحر؟",
    options: ["فجر يوم عرفة", "يوم النحر بعد الموعد المخصص للتكتل", "ليلة الحادي عشر فقط", "بعد طواف الوداع"],
    answer: 1,
    explanation: "يُرمى جمرة العقبة يوم النحر (10 ذو الحجة)، وتلتزم المجموعة بالموعد والمسار المحددين للتكتل.",
  },
  {
    id: 3,
    category: "إدارة الحشود",
    roles: [HEAD, DEPUTY],
    scenario: "عند تجمّع المجموعة للانتقال من مزدلفة: الحاضرون 45 من 48، وهواتف الغائبين مغلقة.",
    text: "ما الخطوة الأولى الصحيحة؟",
    options: [
      "تنطلق الحافلة فوراً ويلحق الغائبون وحدهم",
      "يتصل المعاون بمرافقي الغائبين، ويُبلَّغ عن المفقود في غرفة العمليات خلال 5 دقائق إن لم يُعثر عليه",
      "تنتظر المجموعة كلها حتى الصباح",
      "يُنشر اسم الغائبين في قناة المجموعة فقط",
    ],
    answer: 1,
    explanation: "الأولوية للتواصل المباشر مع الغائب أو مرافقه، ثم فتح بلاغ مفقود في غرفة العمليات فوراً دون تأخير الجميع.",
  },
  {
    id: 4,
    category: "إسعافات أولية",
    roles: EVERY_ROLE,
    text: "حاج كبير في السن ظهرت عليه علامات ضربة شمس في عرفات (حرارة مرتفعة، تشوش، جلد جاف). ما أول ما تفعله؟",
    options: [
      "تعطيه ماءً بارداً بكميات كبيرة وهو فاقد الوعي",
      "تنقله إلى الظل وتبرّد جسمه وتطلب الفريق الطبي فوراً",
      "تنتظر حتى المغرب",
      "تعطيه دواءً خافضاً للحرارة من حقيبتك",
    ],
    answer: 1,
    explanation: "التبريد السريع في الظل وطلب الفريق الطبي أولاً. لا يُعطى الماء لفاقد الوعي، ولا يصرف الإداري أدوية.",
  },
  {
    id: 5,
    category: "تشغيلي",
    roles: [HEAD, TECH],
    text: "ماذا يعني «التتبع بالأحداث» في المنصة؟",
    options: [
      "تتبع موقع كل حاج بالأقمار الصناعية على مدار الساعة",
      "تسجيل محطات واضحة في الرحلة عند مسح البطاقة (غادر دمشق، وصل إلى عرفة...)",
      "مراقبة هواتف الحجاج",
      "إرسال رسالة لكل حاج كل ساعة",
    ],
    answer: 1,
    explanation: "لا يُتابع الحاج بنقطة متحركة، بل بآخر حدث مسجّل له. وهذا أوفر للبطارية وأحفظ للخصوصية.",
  },
  {
    id: 6,
    category: "إداري",
    roles: [HEAD, DEPUTY, TECH],
    text: "عند مسح بطاقة حاج، ما الذي يحق لرئيس المجموعة أن يراه؟",
    options: [
      "الملف الطبي التفصيلي والأدوية",
      "كل بيانات الحاج دون استثناء",
      "البيانات التي تسمح بها صلاحيته: الاسم والمجموعة والغرفة والاحتياجات، دون الملف الطبي التفصيلي",
      "لا شيء على الإطلاق",
    ],
    answer: 2,
    explanation: "النطاق يُفرض بحسب الصلاحية. الملف الطبي التفصيلي للفريق الطبي فقط.",
  },
  {
    id: 7,
    category: "طوارئ",
    roles: EVERY_ROLE,
    text: "حاج أُغمي عليه داخل الحافلة أثناء الانتقال إلى منى. ما الترتيب الصحيح؟",
    options: [
      "إيقاف الحافلة بأمان، وتقييم التنفس، وفتح بلاغ صحي حرج، والتواصل مع الفريق الطبي",
      "إكمال الطريق ثم فتح بلاغ عند الوصول",
      "الاتصال بعائلته في سوريا أولاً",
      "نقله بسيارة أجرة إلى المستشفى",
    ],
    answer: 0,
    explanation: "السلامة أولاً، ثم فتح بلاغ حرج في غرفة العمليات. البلاغ الحرج الذي لا يُغلق خلال 15 دقيقة يُصعَّد تلقائياً.",
  },
  {
    id: 8,
    category: "نقل",
    roles: [HEAD, DEPUTY],
    text: "قبل انطلاق حافلة المجموعة من ساحة المزة إلى المطار، متى يُغلق رئيس المجموعة التجمّع؟",
    options: [
      "في الموعد المحدد حتى لو غاب بعض الحجاج دون متابعة",
      "بعد اكتمال مسح بطاقات جميع الحجاج أو معالجة حالة كل غائب",
      "عندما يطلب السائق ذلك",
      "بعد وصول الحافلة إلى المطار",
    ],
    answer: 1,
    explanation: "يُغلق التجمّع بعد اكتمال الحضور أو معالجة كل غياب، ثم تُرسل رسالة «انطلقنا» للجميع.",
  },
  {
    id: 9,
    category: "ديني",
    roles: GUIDES,
    text: "ما الحكم الذي يشرحه الموجّه للحاج الذي نسي بعض المناسك ويسأل عن الفدية؟",
    options: [
      "يفتي الإداري بما يراه مناسباً",
      "يحيله الإداري إلى الموجّه الديني المعتمد للمجموعة للإجابة الشرعية",
      "يطلب منه البحث على الإنترنت",
      "يؤجل السؤال إلى ما بعد العودة",
    ],
    answer: 1,
    explanation: "الإجابة عن الأسئلة الشرعية من مهام الموجّه الديني المعتمد، وكل إداري يعمل ضمن صفته.",
  },
  {
    id: 10,
    category: "إسعافات أولية",
    roles: EVERY_ROLE,
    text: "حاج مصاب بالسكري بدأ يتعرق ويرتجف ويبدو مشوشاً قبل موعد الغداء. ما التصرف المناسب إن كان واعياً؟",
    options: [
      "يُعطى جرعة إنسولين إضافية",
      "يُعطى سكراً سريع الامتصاص (عصير أو تمر) ويُطلب الفريق الطبي",
      "يُترك لينام",
      "يُمنع من الأكل حتى يراه الطبيب",
    ],
    answer: 1,
    explanation: "هذه علامات هبوط السكر. إن كان واعياً يُعطى سكراً سريعاً، ويُبلَّغ الفريق الطبي.",
  },
  {
    id: 11,
    category: "إدارة الحشود",
    roles: [HEAD, DEPUTY],
    text: "وصل إشعار حسب المنطقة: «كثافة عالية في الدور الأرضي للجمرات حتى 10:00». مجموعتك مسارها الدور الثالث. ماذا تفعل؟",
    options: [
      "تغيّر المسار إلى الدور الأرضي لأنه أقرب",
      "تلتزم بالمسار المحدد للتكتل (الدور الثالث — الجهة الشرقية) وتذكّر الحجاج بعدم التفرق",
      "تلغي الرمي لليوم",
      "تسمح لكل حاج باختيار الدور الذي يريده",
    ],
    answer: 1,
    explanation: "المسار والأوقات تحددها الجهات المنظمة لكل تكتل، والالتزام بها يحمي الحجاج من الازدحام.",
  },
  {
    id: 12,
    category: "تشغيلي",
    roles: [HEAD],
    text: "ما الذي يتضمنه «التقرير اليومي» الذي يرسله رئيس المجموعة كل ليلة؟",
    options: [
      "الحالة العامة، والحالات الصحية، والشكاوى، والملاحظات",
      "صور الحجاج فقط",
      "كشف المصاريف الشخصية",
      "لا يوجد تقرير يومي",
    ],
    answer: 0,
    explanation: "نموذج قصير يُرسل بضغطة زر، ويصل إلى رئيس التكتل ومشرف القطاع، ويُحفظ في ملف الإداري.",
  },
  {
    id: 13,
    category: "طوارئ",
    roles: [HEAD, DEPUTY],
    text: "حاجة كبيرة في السن تحتاج كرسياً متحركاً، وحصل عطل في مصعد البرج. من يُبلَّغ أولاً؟",
    options: [
      "لا أحد، تنتظر حتى يُصلح",
      "مشرف البرج عبر بلاغ مربوط بالغرفة والبرج، مع متابعة حالة الحاجة",
      "إدارة الحج في دمشق",
      "شركة الطيران",
    ],
    answer: 1,
    explanation: "البلاغات مربوطة بالغرفة والبرج وتصل مباشرة إلى مشرف البرج المسؤول.",
  },
  {
    id: 14,
    category: "نقل",
    roles: [HEAD, DEPUTY, TECH],
    text: "حاج مسجّل في حافلة الفجر إلى الحرم لكنه لم يمسح بطاقته عند الصعود. ما الإجراء؟",
    options: [
      "تنطلق الحافلة ويُسجَّل غائباً دون أي تواصل",
      "يتصل المعاون به أو بمرافقه قبل الانطلاق، ويُسجَّل الحضور الفعلي فقط",
      "يُمسح له غيابياً حتى يكتمل العدد",
      "تُلغى الرحلة",
    ],
    answer: 1,
    explanation: "الحضور يُسجَّل بمسح البطاقة الفعلي فقط، والتواصل مع الغائب قبل الانطلاق مسؤولية الفريق.",
  },
  {
    id: 15,
    category: "إداري",
    roles: EVERY_ROLE,
    text: "حاج غاضب يرفع صوته بسبب تأخر الوجبة الخاصة لوالدته. ما الأسلوب الأنسب؟",
    options: [
      "تجاهله حتى يهدأ",
      "الاستماع بهدوء، وفتح شكوى مربوطة بالبند والغرفة، وإبلاغه بموعد متابعة واضح",
      "الرد بالصوت نفسه",
      "وعده بتعويض مالي",
    ],
    answer: 1,
    explanation: "الاحترام والإصغاء، ثم تحويل المشكلة إلى شكوى قابلة للمتابعة لها صاحب وموعد إغلاق.",
  },
  // ── رئيس المجموعة ──
  {
    id: 16,
    category: "إداري",
    roles: [HEAD],
    text: "تريد تشكيل مجموعتك لموسم 1448. متى يُرسل طلب التشكيل؟",
    options: [
      "فور النجاح في الامتحان الكتابي، قبل الشفهي",
      "بعد تسجيل الحجاج في المجموعة",
      "بعد أن يوافق المعاون والموجّه والمنسق على دعواتك الفردية، فيكتمل الفريق",
      "بعد انضمام المجموعة إلى تكتل",
    ],
    answer: 2,
    explanation: "الفريق يكتمل أولاً: دعوة فردية لكل صفة يوافق عليها صاحبها، ثم يُرسل الطلب ويُسدَّد رسمه ويعتمده مدير المكتب. الانضمام إلى تكتل يأتي بعد انتخاب رؤساء التكتلات.",
  },
  {
    id: 17,
    category: "إداري",
    roles: [HEAD],
    text: "رفض رئيس تكتل طلب انضمام مجموعتك لأن سعة تكتله اكتملت. ما الصحيح؟",
    options: [
      "تطلب الانضمام إلى تكتل آخر لديه مكان، فالانضمام بعقد لا إجبار فيه",
      "تطلب من الإدارة أن تفرض انضمامك إليه",
      "تعيد إرسال الطلب نفسه حتى يقبله",
      "تبقى المجموعة بلا تكتل وتبدأ استقبال الحجاج",
    ],
    answer: 0,
    explanation: "رئيس التكتل يقرر بحسب سعته، ولا إجبار في الانضمام. تطلب تكتلاً آخر، ويُوقَّع العقد حين يقبل.",
  },
  // ── معاون رئيس المجموعة ──
  {
    id: 18,
    category: "إدارة الحشود",
    roles: [DEPUTY],
    text: "في تجمّع الصباح قبل التوجه إلى الحرم مسحتَ بطاقات 46 حاجاً من 48. ما الصحيح قبل الانطلاق؟",
    options: [
      "تنطلق فوراً فالأغلبية حاضرة",
      "تسجّل الغائبَين حاضرَين لأنهما سيلحقان",
      "تلغي التجمّع وتعيده بعد ساعة",
      "تتواصل مع الغائبَين وتبلغ رئيس المجموعة، ولا يُغلق التجمّع حتى يُعرف وضعهما",
    ],
    answer: 3,
    explanation: "المعاون مسؤول عن الحضور: لا يُغلق التجمّع وفيه غائب لا يُعرف مكانه، ويُبلَّغ رئيس المجموعة بكل غياب.",
  },
  {
    id: 19,
    category: "تشغيلي",
    roles: [DEPUTY],
    text: "حاجة لها وجبة خاصة (حمية سكري) لم تصلها في موعدها. ما دورك؟",
    options: [
      "تعطيها وجبة عادية حتى لا تبقى دون طعام",
      "تتحقق من قائمة الوجبات الخاصة، وتبلغ عن التأخير، وتُعلم رئيس المجموعة، وتتابع حتى تصلها وجبتها",
      "تطلب منها شراء طعامها بنفسها",
      "تنتظر الوجبة التالية",
    ],
    answer: 1,
    explanation: "توزيع الوجبات الخاصة من عمل المعاون. الوجبة العادية قد تضر مريض السكري، فيُتابع التأخير حتى تصل وجبتها.",
  },
  {
    id: 20,
    category: "نقل",
    roles: [DEPUTY],
    text: "امتلأت حافلة الانتقال من عرفات إلى مزدلفة قبل أن يصعد ثلاثة من حجاج مجموعتك. ما الإجراء؟",
    options: [
      "يركبون أي حافلة لمجموعة أخرى دون إبلاغ أحد",
      "يمشون إلى مزدلفة",
      "تبلغ غرفة العمليات عن نقص المقاعد، ويبقى معهم أحد أعضاء الفريق حتى تصل حافلة بديلة",
      "تؤجل انطلاق المجموعة كلها إلى الصباح",
    ],
    answer: 2,
    explanation: "لا يُترك حاج دون فريق، والنقص في المقاعد يُبلَّغ إلى غرفة العمليات لتأمين البديل.",
  },
  {
    id: 21,
    category: "إداري",
    roles: [DEPUTY],
    text: "مرض رئيس المجموعة يومين ولم يستطع الخروج. من يتولى التجمّعات والحضور؟",
    options: [
      "المعاون، ينوب عنه في الحضور والتجمّعات ويبقيه ورئيس التكتل على اطلاع",
      "لا أحد حتى يعود",
      "المنسق التقني وحده",
      "الحجاج ينظمون أنفسهم",
    ],
    answer: 0,
    explanation: "المعاون ينوب عن رئيس المجموعة في الحضور والتجمّع عند غيابه، ويُبلغ رئيس التكتل.",
  },
  // ── الموجّه والموجّهة الدينيان ──
  {
    id: 22,
    category: "ديني",
    roles: GUIDES,
    text: "سألك حاج سؤالاً فقهياً لا تعرف جوابه بيقين. ما الصحيح؟",
    options: [
      "تجيب باجتهادك حتى لا تُحرج أمامه",
      "تحيله إلى أي حاج متعلم في المجموعة",
      "تقول له إنك ستتحقق وتعود إليه، وترجع إلى المرجعية الشرعية المعتمدة للبعثة قبل الجواب",
      "تتجاهل السؤال",
    ],
    answer: 2,
    explanation: "الفتوى بغير علم لا تجوز. الموجّه يرجع إلى المرجعية الشرعية المعتمدة ثم يجيب.",
  },
  {
    id: 23,
    category: "ديني",
    roles: GUIDES,
    text: "متى يُحرم الحاج المتمتع بالحج؟",
    options: [
      "يوم التروية، الثامن من ذي الحجة، من مكانه في مكة",
      "يوم عرفة",
      "يوم النحر",
      "قبل السفر من دمشق",
    ],
    answer: 0,
    explanation: "المتمتع يحلّ بعد عمرته، ثم يُحرم بالحج يوم التروية من مكانه في مكة.",
  },
  {
    id: 24,
    category: "ديني",
    roles: GUIDES,
    text: "ما أنسب وقت لدرس المجموعة عن أعمال يوم عرفة؟",
    options: [
      "يوم عرفة بعد صلاة الظهر",
      "بعد العودة إلى دمشق",
      "لا حاجة إليه، فالحجاج يتبعون المجموعة",
      "يوم التروية أو قبله، ليعرف الحجاج ما يفعلونه قبل الوقوف",
    ],
    answer: 3,
    explanation: "الدرس يسبق العمل: يُشرح الوقوف بعرفة قبل يومه، لا في أثنائه.",
  },
  {
    id: 25,
    category: "ديني",
    roles: GUIDES,
    text: "في عرفات، بماذا يذكّر الموجّه الحجاج قبل الغروب؟",
    options: [
      "بمغادرة عرفات قبل الظهر تجنباً للزحام",
      "بالبقاء داخل حدود عرفات حتى غروب الشمس والإكثار من الدعاء",
      "بالتوجه إلى منى مباشرة",
      "بالنوم حتى المغرب",
    ],
    answer: 1,
    explanation: "الوقوف بعرفة ركن الحج، ويُستحب البقاء فيها حتى الغروب مع الإكثار من الدعاء، داخل حدودها.",
  },
  {
    id: 26,
    category: "ديني",
    roles: GUIDES,
    text: "حاج كبير في السن عاجز عن الرمي يسأل عن التوكيل في رمي الجمرات. ما دورك؟",
    options: [
      "تمنعه من التوكيل مطلقاً",
      "تنصحه بترك الرمي",
      "تبيّن له حكم توكيل العاجز كما تعتمده المرجعية الشرعية، وتنسق مع رئيس المجموعة من يرمي عنه",
      "ترمي عنه دون أن تخبره",
    ],
    answer: 2,
    explanation: "يجوز للعاجز أن يوكّل من يرمي عنه. الموجّه يبيّن الحكم، ويُنسَّق الأمر مع رئيس المجموعة.",
  },
  {
    id: 27,
    category: "تشغيلي",
    roles: GUIDES,
    text: "كيف يصل تذكير الموجّه بموعد درس إلى كل حجاج المجموعة؟",
    options: [
      "عبر قناة المجموعة في المنصة، فيصل الإشعار إلى الجميع ويبقى محفوظاً",
      "برسالة إلى هاتف كل حاج على حدة",
      "بورقة على باب الخيمة فقط",
      "يبلغ رئيس المجموعة ليخبر الحجاج شفهياً",
    ],
    answer: 0,
    explanation: "قناة المجموعة تصل إلى كل حجاجها بإشعار، وتبقى الرسائل فيها لمن فاته الإشعار.",
  },
  {
    id: 28,
    category: "ديني",
    roles: GUIDES,
    text: "حاج يجادل بحدة في مسألة خلافية أمام المجموعة. ما الأسلوب الأنسب؟",
    options: [
      "تقطع حديثه أمام الجميع",
      "توافقه لينتهي الجدال",
      "تطلب استبعاده من المجموعة",
      "تحاوره بهدوء على انفراد، وتبيّن أن في المسألة سعة، وتلتزم بما تعتمده البعثة",
    ],
    answer: 3,
    explanation: "الرفق والحوار على انفراد، مع الالتزام بالمرجعية المعتمدة، يحفظان المجموعة من الفرقة.",
  },
  {
    id: 29,
    category: "ديني",
    roles: [GUIDE_M],
    text: "ما الذي يُنبَّه إليه الرجال عند الإحرام؟",
    options: [
      "لبس الثياب المعتادة",
      "اجتناب المخيط وتغطية الرأس، ولبس الإزار والرداء",
      "لبس الجوارب والحذاء المغلق",
      "حلق اللحية",
    ],
    answer: 1,
    explanation: "يحرم الرجل في إزار ورداء، ويجتنب المخيط وتغطية الرأس.",
  },
  {
    id: 30,
    category: "ديني",
    roles: [GUIDE_M],
    text: "يسأل حاج يوم النحر: حلقتُ قبل أن أرمي جمرة العقبة، فما عليّ؟",
    options: [
      "عليه دم",
      "بطل حجه",
      "الأفضل الترتيب: الرمي ثم النحر ثم الحلق ثم الطواف، ومن قدّم بعضها على بعض فلا حرج",
      "يعيد الحلق بعد الرمي",
    ],
    answer: 2,
    explanation: "ما سُئل النبي ﷺ يومئذ عن شيء قُدّم ولا أُخّر إلا قال: «افعل ولا حرج».",
  },
  {
    id: 31,
    category: "ديني",
    roles: [GUIDE_F],
    text: "ما الذي تُنبَّه إليه النساء في الإحرام؟",
    options: [
      "تحرم المرأة في ثيابها المعتادة الساترة، وتجتنب النقاب والقفازين",
      "تلبس الإزار والرداء كالرجال",
      "تغطي وجهها بالنقاب وتلبس القفازين",
      "تقص شعرها قبل الإحرام",
    ],
    answer: 0,
    explanation: "لا لباس مخصوصاً لإحرام المرأة، لكنها تجتنب النقاب والقفازين.",
  },
  {
    id: 32,
    category: "ديني",
    roles: [GUIDE_F],
    text: "حاجة حاضت قبل طواف الإفاضة، وموعد سفر مجموعتها قريب. ما الصحيح؟",
    options: [
      "تسافر دون طواف",
      "تؤجل حجها إلى العام القادم",
      "تطوف دون أن تسأل أحداً",
      "تبلغ الموجّهة، فتُعرض حالتها على المرجعية الشرعية المعتمدة، ويُنسَّق مع رئيس المجموعة ما يلزم قبل السفر",
    ],
    answer: 3,
    explanation: "حالتها تُعرض على المرجعية الشرعية المعتمدة، وتُنسَّق مواعيدها مع رئيس المجموعة بالخصوصية اللازمة.",
  },
  // ── المنسق التقني ──
  {
    id: 33,
    category: "تقني",
    roles: [TECH],
    text: "في مكتب التسجيل جاءك مواطن ليسجّل طلب حج، ولرقمه الوطني طلب في هذا الموسم. ما الصحيح؟",
    options: [
      "تسجّل له طلباً ثانياً",
      "لا يُسجَّل طلب ثانٍ؛ المنصة ترفض من له طلب في الموسم، فتدلّه على متابعة طلبه القائم",
      "تحذف الطلب القديم وتسجّل الجديد",
      "تسجّله برقم أحد أقاربه",
    ],
    answer: 1,
    explanation: "لكل مواطن طلب واحد في الموسم، والمنصة تفحص ذلك قبل فتح الطلب.",
  },
  {
    id: 34,
    category: "تقني",
    roles: [TECH],
    text: "كيف يتحقق المنسق من بيانات المواطن قبل تسجيل طلبه؟",
    options: [
      "يكتبها كما يمليها المواطن",
      "بصورة جواز السفر وحدها",
      "بالرقم الوطني، فتجلب المنصة بياناته من الشؤون المدنية ويطابقها مع هويته",
      "بشهادة شخصين",
    ],
    answer: 2,
    explanation: "البيانات الرسمية تأتي من الشؤون المدنية بالرقم الوطني، لا تُكتب يدوياً.",
  },
  {
    id: 35,
    category: "تقني",
    roles: [TECH],
    text: "متى يسجّل المنسق الحاج في مجموعته؟",
    options: [
      "في مرحلة التفويج، بعد أن يختار الحاج المجموعة ويتواصل معها",
      "في مكتب التسجيل عند تقديم طلب الحج",
      "بعد الوصول إلى مكة",
      "لا يسجّله المنسق، بل رئيس التكتل",
    ],
    answer: 0,
    explanation: "التسجيل في المكتب لا يضع أحداً في مجموعة. في التفويج يختار الحاج مجموعته، ومنسقها هو من يسجّله فيها.",
  },
  {
    id: 36,
    category: "تقني",
    roles: [TECH],
    text: "حاج كبير في السن فقد هاتفه وفيه بطاقته الرقمية. ما الحل؟",
    options: [
      "لا يستطيع الصعود إلى الحافلات حتى يشتري هاتفاً",
      "يستعير هاتف حاج آخر",
      "تُطلب له بطاقة جديدة في الموسم القادم",
      "يعرض المنسق بطاقته من المنصة برقمه الوطني ويطبع له بطاقة ورقية برمزها، فالبطاقة مرتبطة بحسابه لا بالهاتف",
    ],
    answer: 3,
    explanation: "البطاقة الرقمية تتبع حساب الحاج، فتُعرض أو تُطبع من المنصة دون الهاتف الضائع.",
  },
  {
    id: 37,
    category: "تقني",
    roles: [TECH],
    text: "حاج لم يصله إشعار تغيير موعد التجمّع. ما أول ما تتحقق منه؟",
    options: [
      "أن الإشعارات مفعّلة في هاتفه وأنه في المجموعة الصحيحة، ثم تريه الإعلان في قناة المجموعة",
      "تعيد تثبيت التطبيق فوراً",
      "تطلب منه شراء هاتف جديد",
      "لا شيء، فالإشعارات لا تهم",
    ],
    answer: 0,
    explanation: "أكثر أسباب فوات الإشعار: إشعارات معطّلة في الهاتف أو خطأ في المجموعة. والإعلان يبقى في القناة.",
  },
  {
    id: 38,
    category: "تقني",
    roles: [TECH],
    text: "طلب منك حاج رقم هاتف حاج آخر في المجموعة. ما الصحيح؟",
    options: [
      "تعطيه الرقم فوراً",
      "تنشر الرقم في قناة المجموعة",
      "لا تشارك بيانات الحجاج؛ تعرض أن توصل رسالته عبر رئيس المجموعة أو قناتها",
      "تعطيه رقمه الوطني بدلاً من هاتفه",
    ],
    answer: 2,
    explanation: "بيانات الحاج أمانة لا تُشارك دون إذنه؛ والتواصل يمر عبر قنوات المجموعة.",
  },
  {
    id: 39,
    category: "تقني",
    roles: [TECH],
    text: "حاج لا يجيد القراءة يريد متابعة طلبه على المنصة. كيف تساعده؟",
    options: [
      "تقول له إن المنصة ليست لأمثاله",
      "تريه زر «استمع» الذي يقرأ له ما في الشاشة، وتساعده على تفعيل الإشعارات",
      "تطلب منه مراجعة المكتب كل يوم",
      "تعطيه كلمة مرور حسابك ليتابع منه",
    ],
    answer: 1,
    explanation: "زر «استمع» في معظم الشاشات يقرأ ما فيها، والإشعارات توصله بكل جديد في طلبه.",
  },
  // ── صح أو خطأ ──
  {
    id: 40,
    category: "إداري",
    type: "truefalse",
    roles: [HEAD, DEPUTY],
    text: "يستطيع رئيس المجموعة نقل حاج من مجموعته إلى مجموعة أخرى دون أن يطلب الحاج ذلك.",
    options: TRUE_FALSE,
    answer: 1,
    explanation: "الحاج هو من يختار مجموعته، ولا يُنقل منها إلا بطلبه.",
  },
  {
    id: 41,
    category: "ديني",
    type: "truefalse",
    roles: GUIDES,
    text: "طواف الإفاضة ركن من أركان الحج، لا يتم الحج بدونه.",
    options: TRUE_FALSE,
    answer: 0,
    explanation: "طواف الإفاضة (طواف الزيارة) ركن باتفاق العلماء، ولا يُجبر تركه بدم.",
  },
  {
    id: 42,
    category: "إسعافات أولية",
    type: "truefalse",
    roles: EVERY_ROLE,
    text: "يُسقى الحاج فاقد الوعي ماءً ليستفيق.",
    options: TRUE_FALSE,
    answer: 1,
    explanation: "لا يُعطى فاقد الوعي شيئاً بالفم خشية الاختناق: يُمدَّد على جنبه ويُطلب الإسعاف فوراً.",
  },
  {
    id: 43,
    category: "تقني",
    type: "truefalse",
    roles: [TECH],
    text: "يسجّل المنسق التقني الحاج في المجموعة التي اختارها الحاج، ولا يسجّله في غيرها ولو كان فيها مكان.",
    options: TRUE_FALSE,
    answer: 0,
    explanation: "الحاج هو من يختار المجموعة، والمنسق يسجّله فيها كما اختار.",
  },
  {
    id: 44,
    category: "نقل",
    type: "truefalse",
    roles: [HEAD, DEPUTY],
    text: "لا يُغلق التجمّع وينطلق وفي المجموعة حاج لا يُعرف مكانه.",
    options: TRUE_FALSE,
    answer: 0,
    explanation: "يُتحقق من كل غائب قبل الإغلاق، ويُبلَّغ عمّن لم يُعرف مكانه.",
  },
  {
    id: 45,
    category: "ديني",
    type: "truefalse",
    roles: GUIDES,
    text: "يبدأ وقت الوقوف بعرفة عند جمهور العلماء من زوال شمس اليوم التاسع من ذي الحجة.",
    options: TRUE_FALSE,
    answer: 0,
    explanation: "وقت الوقوف عند الجمهور من الزوال يوم عرفة إلى طلوع فجر يوم النحر، ومن وقف جزءاً منه أدرك الحج.",
  },
  // ── تحريري: يصححه مصحح مخوّل ──
  {
    id: 46,
    category: "إداري",
    type: "written",
    points: 5,
    roles: [HEAD],
    scenario: "قبل موعد التجمّع للمطار بساعتين أبلغك حاج أن جواز سفر زوجته ضاع في الفندق.",
    text: "اكتب الخطوات التي تتخذها بالترتيب، ومن تُبلغ في كل خطوة.",
    options: [],
    answer: -1,
    explanation: "يُنتظر: تهدئة الحاج والبحث المنظم في الغرفة والفندق، وإبلاغ المعاون وإدارة الفندق، ورفع بلاغ إلى غرفة العمليات عبر المنصة، والتنسيق مع البعثة لوثيقة بديلة، وألا تُترك الحاجّة وحدها ولا تتأخر بقية المجموعة. درجة لكل نقطة صحيحة حتى خمس.",
  },
  {
    id: 47,
    category: "ديني",
    type: "written",
    points: 5,
    roles: GUIDES,
    text: "اشرح بإيجاز ما يفعله الحاج المتمتّع يوم النحر بالترتيب الذي تعلّمه لحجاج مجموعتك، وحكم تقديم بعضها على بعض.",
    options: [],
    answer: -1,
    explanation: "يُنتظر: رمي جمرة العقبة، ثم ذبح الهدي، ثم الحلق أو التقصير، ثم طواف الإفاضة والسعي. السنة الترتيب، ومن قدّم شيئاً أو أخّره فلا حرج على الصحيح لحديث «افعل ولا حرج». درجة لكل عنصر.",
  },
  {
    id: 48,
    category: "تشغيلي",
    type: "written",
    points: 5,
    roles: [DEPUTY],
    scenario: "وصلت المجموعة إلى مخيم منى، ولم تصل وجبات ثلاثة حجاج من مرضى السكري.",
    text: "كيف تتصرف حتى تصل وجباتهم، وماذا تفعل في الأثناء؟",
    options: [],
    answer: -1,
    explanation: "يُنتظر: مراجعة قائمة الوجبات الخاصة، والتواصل مع متعهد الإعاشة، وإبلاغ رئيس المجموعة وغرفة العمليات، وتأمين بديل مؤقت مناسب ومتابعة من قد يهبط سكره، وتسجيل ما حدث. درجة لكل نقطة.",
  },
  {
    id: 49,
    category: "تقني",
    type: "written",
    points: 5,
    roles: [TECH],
    scenario: "حاجّة كبيرة في السن لا تملك هاتفاً ذكياً، وتريد أن تعرف موعد رحلتها ومكان سكنها.",
    text: "اكتب كيف تخدمها من خلال المنصة دون أن تكشف بياناتها لغير صاحب الحق.",
    options: [],
    answer: -1,
    explanation: "يُنتظر: فتح طلبها ضمن صلاحيات المنسق، وقراءة موعد الرحلة والسكن لها بصوت واضح أو طباعتهما، وتفعيل الإشعارات على هاتف محرمها أو قريبها برضاها، وألا تُعطى بياناتها لأحد غيرها، وإبلاغ رئيس المجموعة. درجة لكل نقطة.",
  },
];

/** The questions of one role's exam, in bank order */
export function questionsForRole(bank: ExamQuestion[], roleKey: string) {
  return bank.filter((q) => q.roles.includes(roleKey));
}

// ───────────────────────── Sections and papers ─────────────────────────

/** How many questions of each type a section draws */
export type TypeCounts = Record<QuestionType, number>;

/** One part of a role's exam: its subject, its share of the written mark (%), the bank categories it draws from, and its questions by type */
export type ExamSection = { id: string; name: string; weight: number; categories: ExamCategory[]; counts: TypeCounts };

/** A role's exam as the administration builds it: its duration and its sections, whose weights add up to 100 */
export type ExamBlueprint = { minutes: number; sections: ExamSection[] };

/**
 * One exam as the exam system's owner keeps it: what it is called, the role it qualifies for, when it is
 * sat and where, and how it is built. Every role has its main exam, whose id is the role's key; a make-up
 * exam is sat by whoever missed his role's main one. `centers` absent means every active centre.
 */
export type ExamDef = ExamBlueprint & {
  id: string;
  name: string;
  role: string;
  kind: "main" | "makeup";
  date: string;
  time: string;
  centers?: string[];
  /** Stopped: no hall opens it until the owner starts it again */
  off?: boolean;
};

export const EXAM_KINDS: Record<ExamDef["kind"], string> = { main: "أساسي", makeup: "استدراكي" };

/** A centre where the written exam is sat: its hall, the governorates it serves, and its seats */
/** A centre; `at` is its hall's place on the map, pinned when the centre is created */
export type ExamCenter = { id: string; name: string; hall: string; at?: { lat: number; lng: number }; governorates: string[]; capacity?: number; off?: boolean };

/** How many questions an exam asks that its role's bank cannot serve, section by section and type by type */
export function shortageOf(bank: ExamQuestion[], exam: Pick<ExamDef, "role" | "sections">) {
  return exam.sections.reduce(
    (a, s) =>
      a +
      (Object.keys(s.counts) as QuestionType[]).reduce((b, t) => {
        const have = sectionPool(bank, exam.role, s).filter((q) => typeOf(q) === t).length;
        return b + Math.max(0, s.counts[t] - have);
      }, 0),
    0,
  );
}

const counts = (choice: number, truefalse = 0, written = 0): TypeCounts => ({ choice, truefalse, written });
const SAFETY: ExamSection = { id: "safety", name: "قسم السلامة والطوارئ", weight: 20, categories: ["إسعافات أولية", "طوارئ"], counts: counts(3, 1) };
const SHARIA_SHORT: ExamSection = { id: "sharia", name: "القسم الشرعي", weight: 10, categories: ["ديني"], counts: counts(1) };
const GUIDE: ExamBlueprint = {
  minutes: 25,
  sections: [
    { id: "sharia", name: "القسم الشرعي", weight: 60, categories: ["ديني"], counts: counts(7, 2, 1) },
    { id: "admin", name: "القسم الإداري والتشغيلي", weight: 20, categories: ["إداري", "تشغيلي"], counts: counts(2) },
    SAFETY,
  ],
};

/** Each role's exam as the platform ships it; the exam system's owner rebuilds it in «إدارة الامتحانات» */
export const DEFAULT_BLUEPRINTS: Record<string, ExamBlueprint> = {
  "group-head": {
    minutes: 25,
    sections: [
      { id: "admin", name: "القسم الإداري", weight: 40, categories: ["إداري"], counts: counts(4, 1, 1) },
      { id: "field", name: "قسم الميدان والحشود", weight: 30, categories: ["تشغيلي", "إدارة الحشود", "نقل"], counts: counts(4, 1) },
      SAFETY,
      SHARIA_SHORT,
    ],
  },
  "group-deputy": {
    minutes: 25,
    sections: [
      { id: "field", name: "قسم الميدان والحشود", weight: 40, categories: ["تشغيلي", "إدارة الحشود", "نقل"], counts: counts(5, 1, 1) },
      { id: "admin", name: "القسم الإداري", weight: 25, categories: ["إداري"], counts: counts(3, 1) },
      { ...SAFETY, weight: 25 },
      SHARIA_SHORT,
    ],
  },
  "guide-m": GUIDE,
  "guide-f": GUIDE,
  tech: {
    minutes: 25,
    sections: [
      { id: "tech", name: "القسم التقني", weight: 50, categories: ["تقني"], counts: counts(5, 1, 1) },
      { id: "admin", name: "القسم الإداري والتشغيلي", weight: 30, categories: ["إداري", "تشغيلي", "نقل"], counts: counts(4) },
      SAFETY,
    ],
  },
};

export const questionCount = (b: ExamBlueprint) => b.sections.reduce((a, s) => a + s.counts.choice + s.counts.truefalse + s.counts.written, 0);

/** A section's pool for one role: the bank's questions of that role in the section's categories */
export function sectionPool(bank: ExamQuestion[], roleKey: string, section: Pick<ExamSection, "categories">) {
  return bank.filter((q) => q.roles.includes(roleKey) && section.categories.includes(q.category));
}

/** A section as one applicant received it */
export type PaperSection = { id: string; name: string; weight: number; ids: number[] };

/** A fixed shuffle per applicant: two applicants seldom get the same questions in the same order */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * The paper one applicant sits: each section draws its count of each type from its pool, in an order
 * of his own. A question that falls in two sections' categories is drawn once.
 */
export function drawPaper(bank: ExamQuestion[], blueprint: ExamBlueprint, roleKey: string, seed: string): PaperSection[] {
  const rnd = seeded(seed);
  const used = new Set<number>();
  return blueprint.sections.map((s) => {
    const pool = sectionPool(bank, roleKey, s).filter((q) => !used.has(q.id));
    const ids = (Object.keys(s.counts) as QuestionType[]).flatMap((t) =>
      pool
        .filter((q) => typeOf(q) === t)
        .map((q) => ({ q, k: rnd() }))
        .sort((a, b) => a.k - b.k)
        .slice(0, s.counts[t])
        .map(({ q }) => q.id),
    );
    // written questions last in their section, the rest mixed
    const order = new Map(ids.map((id) => [id, rnd()]));
    const byId = new Map(pool.map((q) => [q.id, q]));
    ids.sort((a, b) => Number(typeOf(byId.get(a)!) === "written") - Number(typeOf(byId.get(b)!) === "written") || order.get(a)! - order.get(b)!);
    ids.forEach((id) => used.add(id));
    return { id: s.id, name: s.name, weight: s.weight, ids };
  });
}

/** Points earned and possible per section */
export type Tally = Record<string, { earned: number; possible: number }>;

/** The written mark out of 100: each section's share of its points, weighted by the section's weight */
export function weightedScore(paper: PaperSection[], tally: Tally) {
  const live = paper.filter((s) => (tally[s.id]?.possible ?? 0) > 0);
  const total = live.reduce((a, s) => a + s.weight, 0);
  if (!total) return 0;
  return Math.round(live.reduce((a, s) => a + (s.weight * tally[s.id].earned) / tally[s.id].possible, 0) / total * 100);
}

/**
 * Marks a paper the moment it is sent: the automated questions now, the written ones left to a grader.
 * `tally` holds the automated points with every written question's full mark counted as possible;
 * `toGrade` the written answers to mark (a blank one scores nothing and needs no grader).
 */
export function markPaper(paper: PaperSection[], bank: ExamQuestion[], answers: Record<number, number | string>) {
  const byId = new Map(bank.map((q) => [q.id, q]));
  const tally: Tally = {};
  const toGrade: number[] = [];
  let correct = 0;
  let auto = 0;
  for (const s of paper) {
    let earned = 0;
    let possible = 0;
    for (const id of s.ids) {
      const q = byId.get(id);
      if (!q) continue;
      possible += pointsOf(q);
      if (typeOf(q) === "written") {
        if (String(answers[id] ?? "").trim()) toGrade.push(id);
      } else {
        auto++;
        if (answers[id] === q.answer) {
          earned += 1;
          correct++;
        }
      }
    }
    tally[s.id] = { earned, possible };
  }
  return { tally, toGrade, correct, auto, score: weightedScore(paper, tally) };
}

/** The written mark with the grader's marks added; `pending` is what is still unmarked (counted as 0) */
export function withMarks(paper: PaperSection[], tally: Tally, toGrade: number[], marks: Record<number, number> = {}) {
  const t: Tally = Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, { ...v }]));
  for (const s of paper) for (const id of s.ids) if (toGrade.includes(id) && marks[id] !== undefined) t[s.id].earned += marks[id];
  return { score: weightedScore(paper, t), tally: t, pending: toGrade.filter((id) => marks[id] === undefined) };
}

/** How results are judged this season (the shipped values are EXAM_RULES); each role's paper is its blueprint */
export type ExamNumbers = { passMark: number; writtenMin: number; writtenWeight: number; oralWeight: number };

/**
 * Written + oral → final, with the season's weights. Whoever was exempt from the written has the oral
 * alone. Never stored: a change to the weights reaches every result, and both portals read the same one.
 */
export function finalScoreWith(written: number | undefined, oral: number, rules: Pick<ExamNumbers, "writtenWeight" | "oralWeight">) {
  return written === undefined ? oral : Math.round((written * rules.writtenWeight + oral * rules.oralWeight) * 10) / 10;
}

/** «الكتابي 60% + الشفهي 40%» with the season's weights */
export function weightsLabel(rules: Pick<ExamNumbers, "writtenWeight" | "oralWeight">) {
  return `الكتابي ${Math.round(rules.writtenWeight * 100)}% + الشفهي ${Math.round(rules.oralWeight * 100)}%`;
}
