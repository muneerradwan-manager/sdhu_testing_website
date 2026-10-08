/**
 * The administrators' qualification test (الاختبار المؤتمت), as the administration's exam platform runs it.
 * A small, fictional sample of the question bank. Every role sits its own test: each question belongs to the
 * roles whose test it is part of — some to every role (first aid, emergencies, dealing with pilgrims), most to
 * one or two (the guides' rulings, the coordinator's desk, the deputy's attendance).
 * A role's test is built in sections (القسم الإداري، القسم الشرعي…): each draws so many questions for every
 * paper and has its own pass mark, and passing the test means passing every section. There are no written
 * (تحريرية) questions and no oral exam: every question is chosen from options and marked by the platform.
 */

import type { Attempt } from "@/lib/store";

export type ExamCategory = "ديني" | "إداري" | "تشغيلي" | "إسعافات أولية" | "إدارة الحشود" | "نقل" | "طوارئ" | "تقني";
export const EXAM_CATEGORIES: ExamCategory[] = ["ديني", "إداري", "تشغيلي", "إدارة الحشود", "نقل", "إسعافات أولية", "طوارئ", "تقني"];

/**
 * How a question is answered: one of several options, or true or false (two options). There are no written
 * answers: every question is marked by the platform the moment the paper is sent.
 */
export type QuestionType = "choice" | "truefalse";
export const QUESTION_TYPES: Record<QuestionType, string> = { choice: "اختيار من متعدد", truefalse: "صح أو خطأ" };
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
  /** The roles whose exam includes this question (keys from the administrator lib's POSITIONS) */
  roles: string[];
  /** Short scenario shown above the question, when there is one */
  scenario?: string;
  text: string;
  /** A true-or-false question's are «صح» and «خطأ» */
  options: string[];
  /** The right option */
  answer: number;
  /** Why the answer is right */
  explanation: string;
};

export const typeOf = (q: Pick<ExamQuestion, "type">): QuestionType => q.type ?? "choice";
/** A question of a kind the exam no longer has (a written one kept from before): never served */
export const isServable = (q: { type?: string }) => !q.type || q.type === "choice" || q.type === "truefalse";


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
      "فور تسليم الاختبار المؤتمت، قبل إعلان النتيجة",
      "بعد إلحاق الحجاج بالمجموعة",
      "بعد إعلان نجاحك، في مدة تشكيل المجموعات، وحدك دون فريق",
      "بعد أن يدعو رئيس تكتل مجموعتك إليه",
    ],
    answer: 2,
    explanation: "تشكّل مجموعتك وحدك في مدة تشكيل المجموعات بعد إعلان نجاحك، ويعتمدها مدير المكتب. لا فريق في الطلب: الموجّه والمنسق والمعاون يختارهم رئيس التكتل ويسندهم إلى مجموعاته، ولا انتخاب لرؤساء التكتلات.",
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
    text: "متى يُلحق الحاج بمجموعة يعمل فيها المنسق؟",
    options: [
      "حين يتفق الحاج مع المجموعة، فيرفع المنسق العقد الموقّع ويعتمده المكتب",
      "في مكتب التسجيل عند تسجيله على الحج",
      "بعد الوصول إلى مكة",
      "حين يختار الحاج المجموعة من المنصة",
    ],
    answer: 0,
    explanation: "التسجيل على الحج لا يضع أحداً في مجموعة، ولا يختار الحاج مجموعته من المنصة. يتفق مع المجموعة، فيرفع من يملك الصلاحية فيها العقد، ويعتمده المكتب.",
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
];

/** The questions of one role's exam, in bank order */
export function questionsForRole(bank: ExamQuestion[], roleKey: string) {
  return bank.filter((q) => q.roles.includes(roleKey));
}

// ───────────────────────── Tests, sections and papers ─────────────────────────

/** A section draws its questions in an order of each paper's own, or in the bank's order */
export type SectionOrder = "random" | "ordered";
export const SECTION_ORDERS: Record<SectionOrder, string> = { random: "عشوائي", ordered: "مرتّب" };

/**
 * One part of a role's test: its name, the bank categories its questions come from, how many it draws for every
 * paper, and the share of them (%) an applicant must answer right to pass it. Passing the test means passing every
 * section: there is no overall mark to reach, and no weights.
 */
export type ExamSection = { id: string; name: string; categories: ExamCategory[]; draw: number; pass: number; order: SectionOrder };

/** A role's test as built: its time and its sections */
export type ExamBlueprint = { minutes: number; sections: ExamSection[] };

export type ExamStatus = "draft" | "published" | "archived";
export const EXAM_STATUS: Record<ExamStatus, string> = { draft: "مسودة", published: "منشور", archived: "مؤرشف" };

/** How an applicant's device comes into the test once the supervisor has checked him in */
export type Pairing = "auto_all" | "auto_clean" | "manual";
export const PAIRING: Record<Pairing, { label: string; hint: string }> = {
  auto_all: { label: "دخول تلقائي للجميع", hint: "يدخل المتقدم المسجَّل حضوره مباشرة بلا رمز ولا موافقة. العودة أثناء الاختبار تبقى لموافقة المشرف." },
  auto_clean: { label: "تلقائي من شبكة القاعة", hint: "يدخل تلقائياً من على شبكة القاعة. ومن خارجها يوافق المشرف ويكتب السبب." },
  manual: { label: "موافقة يدوية", hint: "يذهب المشرف إلى مقعد المتقدم ويطابق رمز الاقتران على شاشته، ثم يوافق على الطلب." },
};

/**
 * One test as the exam system keeps it: its name, the role it qualifies for, when it is sat and where, how it is
 * built, and how its sittings run. Every role has its main test, whose id is the role's key; a make-up test is sat
 * by whoever missed his role's main one. `centers` absent means every active hall.
 */
export type ExamDef = ExamBlueprint & {
  id: string;
  name: string;
  role: string;
  kind: "main" | "makeup";
  /** Its day (ISO, the demo clock's): when its halls can be opened, an hour before its time to the end of its day */
  day?: string;
  /** Its day as read (Hijri), and its hour */
  date: string;
  time: string;
  centers?: string[];
  /** Only a published test is sat; an archived one keeps its attempts and results */
  status: ExamStatus;
  /** The applicant sees his result the moment his submission is confirmed */
  showResult: boolean;
  /** One line per point, shown on the hall's display screen during the test */
  instructions: string[];
  pairing: Pairing;
  /** Entry requests count as the hall's only from its network; from outside it the supervisor writes why he approves */
  network: boolean;
  /** Before tests had a status: stopped */
  off?: boolean;
};

export const EXAM_KINDS: Record<ExamDef["kind"], string> = { main: "أساسي", makeup: "استدراكي" };

/** What the hall's screen shows during a test unless its owner wrote otherwise */
export const DEFAULT_INSTRUCTIONS = [
  "ابقَ في مقعدك ولا تغادر القاعة قبل أن يؤكّد المشرف تسليمك.",
  "الجهاز للاختبار وحده: لا تفتح تطبيقاً آخر ولا تلتقط صورة للشاشة، فكل ذلك يُسجَّل.",
  "أجب عن كل الأسئلة: لا خصم على الإجابة الخاطئة.",
  "النجاح يلزمه بلوغ النسبة المطلوبة في كل قسم.",
  "عند الانتهاء ارفع يدك وانتظر المشرف ليكتب رمزه السري على شاشتك.",
];

/** A hall where tests are sat: its place, the governorates it serves, its seats, and the number of its display screen */
export type ExamCenter = { id: string; name: string; hall: string; at?: { lat: number; lng: number }; governorates: string[]; capacity?: number; off?: boolean; display?: number };

/** A section's pool for one role: the bank's questions of that role in the section's categories */
export function sectionPool(bank: ExamQuestion[], roleKey: string, section: Pick<ExamSection, "categories">) {
  return bank.filter((q) => isServable(q) && q.roles.includes(roleKey) && section.categories.includes(q.category));
}

/** How many questions a test draws that its role's bank cannot serve */
export function shortageOf(bank: ExamQuestion[], exam: Pick<ExamDef, "role" | "sections">) {
  const used = new Set<number>();
  return exam.sections.reduce((a, s) => {
    const pool = sectionPool(bank, exam.role, s).filter((q) => !used.has(q.id));
    pool.slice(0, s.draw).forEach((q) => used.add(q.id));
    return a + Math.max(0, s.draw - pool.length);
  }, 0);
}

const ADMIN_CATEGORIES: ExamCategory[] = ["إداري", "تشغيلي", "إدارة الحشود", "نقل", "إسعافات أولية", "طوارئ"];
const section = (id: string, name: string, categories: ExamCategory[]) => (draw: number): ExamSection => ({ id, name, categories, draw, pass: 50, order: "random" });
const ADMIN = section("admin", "القسم الإداري", ADMIN_CATEGORIES);
const SHARIA = section("sharia", "القسم الشرعي", ["ديني"]);
const TECHNICAL = section("tech", "القسم التقني", ["تقني"]);

/** Each role's test as the platform ships it (every section passed at 50%); the exam system rebuilds it */
export const DEFAULT_BLUEPRINTS: Record<string, ExamBlueprint> = {
  "group-head": { minutes: 25, sections: [ADMIN(14), SHARIA(1)] },
  "group-deputy": { minutes: 25, sections: [ADMIN(14), SHARIA(1)] },
  "guide-m": { minutes: 25, sections: [SHARIA(10), ADMIN(5)] },
  "guide-f": { minutes: 25, sections: [SHARIA(10), ADMIN(5)] },
  tech: { minutes: 25, sections: [ADMIN(8), TECHNICAL(7)] },
};

export const questionCount = (b: Pick<ExamBlueprint, "sections">) => b.sections.reduce((a, s) => a + (s.draw ?? 0), 0);

/**
 * A section kept from before sections had a draw and a pass mark (its share of a weighted mark, its counts by
 * type): its questions drawn as they were, passed at 50%
 */
export function asSection(s: ExamSection | (Omit<ExamSection, "draw" | "pass" | "order"> & { counts?: Record<string, number>; weight?: number; draw?: number; pass?: number; order?: SectionOrder })): ExamSection {
  const old = s as { counts?: Record<string, number> };
  const draw = s.draw ?? Object.values(old.counts ?? {}).reduce((a, n) => a + (n ?? 0), 0);
  return { id: s.id, name: s.name, categories: s.categories, draw, pass: s.pass ?? 50, order: s.order ?? "random" };
}

/** A section as one applicant received it: its questions, and the share he must answer right */
export type PaperSection = { id: string; name: string; pass: number; ids: number[]; /** kept from weighted papers */ weight?: number };

/** A fixed shuffle per applicant: two applicants seldom get the same questions in the same order */
export function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * The paper one applicant sits: each section draws its count from its pool — in his own order, or in the bank's
 * order for an «مرتّب» section. A question that falls in two sections' categories is drawn once.
 */
export function drawPaper(bank: ExamQuestion[], blueprint: ExamBlueprint, roleKey: string, seed: string): PaperSection[] {
  const rnd = seeded(seed);
  const used = new Set<number>();
  return blueprint.sections.map((raw) => {
    const s = asSection(raw);
    const pool = sectionPool(bank, roleKey, s).filter((q) => !used.has(q.id));
    const ids = (s.order === "ordered" ? pool : pool.map((q) => ({ q, k: rnd() })).sort((a, b) => a.k - b.k).map(({ q }) => q)).slice(0, s.draw).map((q) => q.id);
    ids.forEach((id) => used.add(id));
    return { id: s.id, name: s.name, pass: s.pass, ids };
  });
}

/** The order a question's options are shown in on one paper: always shuffled (a true-or-false question keeps «صح» first) */
export function optionOrder(q: Pick<ExamQuestion, "id" | "options" | "type">, seed: string) {
  const idx = q.options.map((_, i) => i);
  if (typeOf(q) === "truefalse") return idx;
  const rnd = seeded(`${seed}:${q.id}`);
  return idx.map((i) => ({ i, k: rnd() })).sort((a, b) => a.k - b.k).map(({ i }) => i);
}

/** Points earned and possible per section */
export type Tally = Record<string, { earned: number; possible: number }>;

/** One section of a marked paper: what he got, its share, the share it asks, and whether he passed it */
export type SectionResult = { id: string; name: string; earned: number; possible: number; percent: number; pass: number; passed: boolean };

const pct = (earned: number, possible: number) => (possible ? Math.round((earned / possible) * 1000) / 10 : 0);

/** A marked paper section by section: passing it means passing every section */
export function sectionsOf(paper: PaperSection[], tally: Tally): SectionResult[] {
  return paper
    .filter((s) => (tally[s.id]?.possible ?? 0) > 0)
    .map((s) => {
      const { earned, possible } = tally[s.id];
      const percent = pct(earned, possible);
      const pass = s.pass ?? 50;
      return { id: s.id, name: s.name, earned, possible, percent, pass, passed: percent >= pass };
    });
}

/**
 * Marks a paper the moment it is sent: a point for every right answer. Its share of all its points (%) is shown
 * beside the sections; passing is passing every section.
 */
export function markPaper(paper: PaperSection[], bank: ExamQuestion[], answers: Record<number, number | string>) {
  const byId = new Map(bank.map((q) => [q.id, q]));
  const tally: Tally = {};
  let correct = 0;
  let possible = 0;
  for (const s of paper) {
    let earned = 0;
    let all = 0;
    for (const id of s.ids) {
      if (!byId.has(id)) continue;
      all += 1;
      if (answers[id] === byId.get(id)!.answer) earned += 1;
    }
    tally[s.id] = { earned, possible: all };
    correct += earned;
    possible += all;
  }
  const sections = sectionsOf(paper, tally);
  return { tally, correct, possible, score: pct(correct, possible), sections, passed: sections.length > 0 && sections.every((x) => x.passed) };
}

/**
 * A sat attempt at a role's test as the platform ships it, for the seeds and the demo: every answer right but `wrong`
 * of its largest section (2 by default — enough wrong there fails it), confirmed by the hall's supervisor with his
 * PIN unless another status is given
 */
export function satAttempt(o: { id: string; role: string; startedAt: number; submittedAt: number; hall?: string; wrong?: number; by?: string; status?: "confirmed" | "submitted" | "unconfirmed"; reason?: string }): Attempt {
  const byId = new Map(EXAM_QUESTIONS.map((q) => [q.id, q]));
  const paper = drawPaper(EXAM_QUESTIONS, DEFAULT_BLUEPRINTS[o.role] ?? DEFAULT_BLUEPRINTS["group-head"], o.role, o.id);
  const big = paper.reduce((a, s) => (s.ids.length > a.ids.length ? s : a), paper[0]);
  const wrong = new Set(big.ids.slice(0, o.wrong ?? 2));
  const answers = Object.fromEntries(
    paper.flatMap((s) => s.ids).map((qid) => {
      const q = byId.get(qid)!;
      return [qid, wrong.has(qid) ? (q.answer + 1) % q.options.length : q.answer];
    }),
  );
  const { tally, score } = markPaper(paper, EXAM_QUESTIONS, answers);
  const status = o.status ?? "confirmed";
  return {
    status,
    hall: o.hall,
    minutes: DEFAULT_BLUEPRINTS[o.role]?.minutes,
    startedAt: o.startedAt,
    pairedAt: o.startedAt - 5 * 60_000,
    submittedAt: o.submittedAt,
    paper,
    answers,
    tally,
    score,
    showResult: true,
    ...(status === "confirmed" && { confirmedAt: o.submittedAt + 60_000, confirmedBy: o.by, confirmVia: "pin" as const }),
    ...(status === "unconfirmed" && { unconfirmedReason: o.reason }),
  };
}
