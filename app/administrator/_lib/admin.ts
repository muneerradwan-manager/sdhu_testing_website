"use client";

import { useMemo } from "react";
import { satAttempt, sectionsOf, type SectionResult } from "@/lib/data/admin-exam";
import { ageOf, fullName, getPerson, type Person } from "@/lib/registry";
import { groupName, groupsName } from "@/lib/groups";
import { OPERATIONS, rangeLabel } from "@/lib/operations";
import { SEASON } from "@/lib/season";
import { seedCoordinatorWork } from "./coordinator";
import { SEED_CLUSTERS } from "./cluster";
import { DEFAULT_ROLES, examRoleOf, examRolesOf, roleKeyByName, roleName, seasonalOf, structureNow } from "./structure";
import { actions, getState, useStore, type AdminProfile, type AdminRecord, type AdminRules, type Attempt, type AttemptStatus, type VaultDoc } from "@/lib/store";

export const ADMIN_ROLE = "إداري";

/**
 * "done" = finished the whole journey (passed, group approved, contracts signed) so every screen of the
 * role shows; "ready" = qualified, at the start of his own work in the formation; "start" = a fresh file that
 * has not begun. "field" and "tech" are older names for "done".
 */
export type DemoAdminMode = "start" | "ready" | "done" | "field" | "tech";

/**
 * `section`: where the demo's list shows him — the role he works in this season, or the place a cluster gives.
 * `mode`: «done» finished his journey (every screen of his place shows); «ready» qualified for the season and at
 * the start of his own work — a cluster to file, a group to form, an invitation waiting for his answer; «start»
 * has not registered for the season yet.
 */
export type DemoAdmin = { id: string; phone: string; position: string; section: string; title: string; note: string; mode: "start" | "ready" | "done" };

/** The demo's list, in the order of the cluster's structure: its head, his deputy and accountant, then the groups and the cluster's people */
export const DEMO_GROUPS = ["رئيس تكتل", "نائب رئيس التكتل", "محاسب التكتل", "رئيس مجموعة", "معاون", "معاون التكتل", "معاون بعدد", "معاون ومنسق تقني", "منسق تقني", "موجّه ديني أ", "موجّه ديني ب", "موجّهة دينية أ", "موجّهة دينية ب"];

/**
 * The demo accounts the login page lists now. Today's test is the group head's registration: a first-timer,
 * last season's head renewing, and a head of four seasons the administration granted «رئيس تكتل». Every other
 * account stays in DEMO_ADMINS and still works: «/administrator/login?demo=all» lists them all, and adding an
 * id here lists it again for everyone (null lists them all).
 */
export const DEMO_LISTED: string[] | null = ["01033300898", "01033300899", "01033300880"];

/** The demo administrators: every role and every place a cluster gives, most of them finished in تكتل النور, some not started */
export const DEMO_ADMINS: DemoAdmin[] = [
  { id: "01033300898", phone: "0944898449", position: "group-head", section: "رئيس مجموعة", mode: "start", title: "أيهم الموصلي — يتقدم لرئاسة مجموعة أول مرة", note: "37 عاماً — لا مواسم سابقة له ولا ملف. يسجّل للموسم ويختار «رئيس مجموعة»، فيرفع وثائقه ويقرّ بالالتزامات، ويدفع الرسم بعد ثبوت أهليته، ثم يؤدي الاختبار المؤتمت في القاعة، وبعد النجاح يراجع المكتب فيشكّل له الموظف مجموعته." },
  { id: "01033300899", phone: "0944899449", position: "group-head", section: "رئيس مجموعة", mode: "start", title: "معتصم العرقسوسي — رئيس مجموعة الموسم الماضي يجدّد", note: "45 عاماً — رئيس مجموعة الهدى في 1447 بتقييم 4.4، فئتها الثانية. يسجّل لموسم 1448 فيجد ملفه الدائم بوثائقه ومهاراته، ويجدّد «رئيس مجموعة» معفى من الاختبار لأن تقييمه فوق الحد، ثم يراجع المكتب فيشكّل له الموظف مجموعته." },
  { id: "01033300880", phone: "0944880449", position: "group-head", section: "رئيس مجموعة", mode: "start", title: "نزيه المحايري — رئيس مجموعة أربعة مواسم يُتاح له إنشاء تكتل", note: "54 عاماً — رئيس مجموعة الصفا أربعة مواسم متتالية (1444 – 1447) بتقييم 4.5 – 4.8، فئتها الثالثة. منحته الإدارة صفة «رئيس تكتل» لهذا الموسم: يجدّد رئاسة مجموعته معفى من الاختبار، ويظهر له «تشكيل التكتلات» ليقدّم طلب تكتل." },
  { id: "01033300881", phone: "0944281449", position: "group-head", section: "رئيس تكتل", mode: "done", title: "عبد الرحمن العلي — رئيس تكتل النور", note: "58 عاماً — رئيس مجموعة الخبير ثلاثة مواسم متتالية (4.6 – 4.8)، فئتها الثالثة. جدّد صفته معفى من الاختبار، ومنحته الإدارة صفة «رئيس تكتل» موسمية، فقدّم طلب تكتل النور (اقتصادي): ست مجموعات مجموع فئاتها 11 ومقاعدها، ومعاون التكتل، ومنسقان وموجّهتان، ونائبه ومحاسبه. أرسله فاعتمدته الإدارة بعد مراجعته. يبقى رئيس مجموعته ويدير التكتل كله." },
  { id: "01033300882", phone: "0944282449", position: "group-head", section: "رئيس تكتل", mode: "ready", title: "نبيل الساعاتي — رئيس مجموعة منحته الإدارة صفة رئيس تكتل", note: "54 عاماً — رئيس مجموعة الميزان ثلاثة مواسم متتالية بتقييم 4.3 – 4.6، فئتها الثالثة. جدّد صفته، واعتُمدت مجموعته ولم تدخل تكتلاً. منحته الإدارة صفة «رئيس تكتل» موسمية للزيادة العددية: يقدّم طلب تشكيل تكتل من أوله في مدته — المستوى، فالمجموعات ومقاعدها، فمعاون التكتل والمنسق والموجّهة، فالنائب والمحاسب — ويرسله للمراجعة." },
  { id: "01033300883", phone: "0944283449", position: "group-head", section: "نائب رئيس التكتل", mode: "done", title: "بسام درويش — نائب رئيس تكتل النور", note: "51 عاماً — رئيس مجموعة أحفاد بني هاشم (الفئة الثانية) في 1446 و1447 (4.4). مجموعته في تكتل النور، ودعاه رئيسه نائباً له فقبل: صفة ثانوية فوق رئاسة مجموعته، يرى بها مجموعات التكتل ومعلوماته." },
  { id: "01033300884", phone: "0944284449", position: "group-head", section: "رئيس مجموعة", mode: "start", title: "وليد القصاب — رئيس مجموعة", note: "45 عاماً — رئيس مجموعة في 1447 بتقييم 3.2 دون الحد: لا يُجدَّد في صفته، وتبقى له الصفات الأخرى بالاختبار المؤتمت. لم يبدأ." },
  { id: "01033300871", phone: "0944271449", position: "group-head", section: "رئيس مجموعة", mode: "done", title: "أحمد سليمان الحمصي — رئيس مجموعة", note: "36 عاماً — معاون مجموعة في 1446 (4.6) ولم يشارك في 1447. انتقل إلى رئاسة مجموعة بالاختبار المؤتمت، وشكّل مجموعته «مجموعة اللطيف» وحده، وأعطته الإدارة الفئة الثانية (90 حاجاً في الاقتصادي، بموجّه ومعاون). قبل دعوة تكتل النور لها. يرى حجاجها حين يلحقهم المكتب بها، ويرحّب بالعائلات ويفتح التجمّعات." },
  { id: "01033300885", phone: "0944285449", position: "group-head", section: "رئيس مجموعة", mode: "ready", title: "مروان الحلبي — رئيس مجموعة", note: "42 عاماً — أول موسم له رئيساً: نجح في الاختبار المؤتمت، ولم تُشكَّل مجموعته بعد: يراجع المكتب باسمها ورسمها، فيشكّلها موظف إدارة الإداريين بفئته." },
  { id: "01033300872", phone: "0944272449", position: "group-deputy", section: "معاون", mode: "done", title: "ياسر عبد الله — معاون", note: "40 عاماً — معاون مجموعة اللطيف في 1447 (4.1). جدّد الصفة نفسها معفى من الاختبار، ودعاه رئيس تكتل النور إلى مقعد المعاون في مجموعة اللطيف فقبل. أنهى رحلته." },
  { id: "01033300886", phone: "0944286449", position: "group-deputy", section: "معاون", mode: "start", title: "فادي الخياط — معاون سابق يتقدم لرئاسة مجموعة", note: "34 عاماً — معاون مجموعة الإحسان في 1447 بتقييم 4.3. يفتح طلب 1448 فيجد ملفه الدائم بوثائقه ولغاته ومهاراته: يحدّث ما انتهت صلاحيته، ويضيف ويعدّل ويحذف، ثم يتقدم لرئاسة مجموعة بالاختبار المؤتمت." },
  { id: "01033300874", phone: "0944274449", position: "tech", section: "منسق تقني", mode: "done", title: "سامر نبيل نجار — منسق تقني", note: "31 عاماً — منسق تقني في 1447 (4.8)، جدّد الصفة نفسها. المنسق للتكتل لا لمجموعة: تكتل النور بمجموع فئات 11 له منسقان، ووزّعه رئيسه على مجموعتين منه (الخبير واللطيف): خمس وحدات من حدّه الست. يسجّل الحجاج على الحج في مكتب دمشق دون أن يضعهم في مجموعة، ويرى حجاج مجموعاته كما يلحقهم المكتب، ويأخذ ملفاتهم الصحية. يفتح وفي مكتبه طلبان مسجّلان." },
  { id: "01033300887", phone: "0944287449", position: "tech", section: "منسق تقني", mode: "start", title: "رامي الأتاسي — منسق تقني", note: "29 عاماً — من حمص، أول موسم له. لم يبدأ." },
  { id: "01033300873", phone: "0944273449", position: "guide-m", section: "موجّه ديني ب", mode: "done", title: "الشيخ خالد الرفاعي — موجّه ديني ب", note: "47 عاماً — موجّه مجموعة اللطيف في 1446 و1447 (4.9). جدّد الصفة نفسها معفى من الاختبار، ودعاه رئيس تكتل النور إلى مقعد الموجّه في مجموعة اللطيف فقبل. أنهى رحلته." },
  { id: "01033300888", phone: "0944288449", position: "guide-m", section: "موجّه ديني ب", mode: "start", title: "عبد الغني الطباع — موجّه ديني ب", note: "43 عاماً — أول موسم له. لم يبدأ." },
  { id: "01033300944", phone: "0944944449", position: "group-deputy", section: "محاسب التكتل", mode: "done", title: "مهند السيد — معاون ومحاسب تكتل النور", note: "38 عاماً — معاون بثلاثة مواسم (4.7). دعاه رئيس تكتل النور إلى مقعد المعاون في مجموعة أحفاد بني هاشم، ثم محاسباً للتكتل: صفة ثانوية يسجّل بها مصروفات التكتل، من كادره." },
  { id: "01033300947", phone: "0944947449", position: "group-deputy", section: "معاون التكتل", mode: "done", title: "عمر الحايك — معاون تكتل النور", note: "31 عاماً — معاون من فرع اللاذقية (4.3). معاون التكتل لا لمجموعة: العدد الثابت في المستوى الاقتصادي واحد، للمطارات والمخيمات والطوارئ مع رئيس التكتل." },
  { id: "01033300975", phone: "0944975449", position: "assistant-count", section: "معاون بعدد", mode: "done", title: "عبد الكريم الشلاح — معاون بعدد", note: "44 عاماً — «معاون بعدد» (4.2): من معاوني التكتل بلا حد أقصى، ويضيف 20 حاجاً إلى عدد حجاج تكتل النور. يؤدي اختبار المعاون." },
  { id: "01033300961", phone: "0944961449", position: "assistant-tech", section: "معاون ومنسق تقني", mode: "done", title: "لؤي العظمة — معاون ومنسق تقني", note: "33 عاماً — يجمع الصفتين (4.4)، فأدى اختبارَي المعاون والمنسق التقني واجتازهما معاً. في تكتل النور أحد منسقَيه — ولا بد أن يكون أحد منسقي كل تكتل بهذه الصفة — ووزّعه رئيسه على أحفاد بني هاشم وطيبة وزمزم والإيمان: ست وحدات، حدّه." },
  { id: "01033300965", phone: "0944965449", position: "murshid", section: "موجّه ديني أ", mode: "done", title: "الشيخ مأمون الحلواني — موجّه ديني أ", note: "54 عاماً — موجّه من الدرجة «أ» خمسة مواسم (4.9)، ويؤدي اختبار الموجّه الديني، ويُحتسب في متوسط أعمار التكتل 40. في المقعد الحر من مجموعة الخبير (الفئة الثالثة)، وبه نال تكتل النور «شارة التميّز في التوجيه الديني»." },
  { id: "01033300981", phone: "0944981449", position: "guide-f", section: "موجّهة دينية ب", mode: "done", title: "هالة الدقر — موجّهة دينية ب", note: "43 عاماً — موجّهة للتكتل لا لمجموعة (4.7): حاجّات تكتل النور كلهن. مجموع فئاته 11، فله موجّهتان (واحدة لكل 7 وحدات)." },
  { id: "01033300984", phone: "0944984449", position: "guide-f", section: "موجّهة دينية ب", mode: "start", title: "لينا العاني — موجّهة دينية ب", note: "36 عاماً — موجّهة في 1447 (4.2). لم تبدأ موسم 1448." },
  { id: "01033300891", phone: "0944891449", position: "group-head", section: "نائب رئيس التكتل", mode: "ready", title: "صلاح الدين المارديني — مدعو نائباً لرئيس تكتل البيان", note: "47 عاماً — رئيس مجموعة الأمل (الفئة الثانية، 4.4). قبل دعوة تكتل البيان لمجموعته، ودعاه رئيسه نائباً له: الدعوة في «تشكيل التكتلات» بانتظار رده." },
  { id: "01033300892", phone: "0944892449", position: "group-deputy", section: "محاسب التكتل", mode: "ready", title: "غسان الكيلاني — مدعو معاوناً ومحاسباً في تكتل البيان", note: "39 عاماً — معاون (4.3). دعاه رئيس تكتل البيان إلى مقعد المعاون في مجموعة البشرى، ومحاسباً للتكتل: دعوتان بانتظار رده." },
  { id: "01033300893", phone: "0944893449", position: "group-deputy", section: "معاون التكتل", mode: "ready", title: "حسن اللبابيدي — مدعو معاوناً لتكتل البيان", note: "35 عاماً — معاون (4.2). دعاه رئيس تكتل البيان معاوناً للتكتل كله: الدعوة بانتظار رده." },
  { id: "01033300894", phone: "0944894449", position: "assistant-count", section: "معاون بعدد", mode: "ready", title: "ماهر الشربجي — معاون بعدد مدعو إلى تكتل البيان", note: "46 عاماً — معاون بعدد (4.1): إن قبل أضاف 20 حاجاً إلى عدد حجاج تكتل البيان. الدعوة بانتظار رده." },
  { id: "01033300895", phone: "0944895449", position: "assistant-tech", section: "معاون ومنسق تقني", mode: "ready", title: "خلدون الصيرفي — مدعو منسقاً لتكتل البيان", note: "32 عاماً — معاون ومنسق تقني (4.5). مجموع فئات تكتل البيان 5، فله منسق واحد، ولا بد أن يكون بهذه الصفة: الدعوة بانتظار رده." },
  { id: "01033300896", phone: "0944896449", position: "murshid", section: "موجّه ديني أ", mode: "ready", title: "الشيخ عبد الهادي البغدادي — مدعو إلى مقعد في تكتل البيان", note: "51 عاماً — موجّه ديني أ (4.6). دعاه رئيس تكتل البيان إلى مقعد الموجّه في مجموعة البشرى: الدعوة بانتظار رده." },
  { id: "01033300897", phone: "0944897449", position: "murshida", section: "موجّهة دينية أ", mode: "ready", title: "سوسن الحفار — موجّهة دينية أ مدعوة إلى تكتل البيان", note: "45 عاماً — موجّهة دينية أ (4.5). موجّهة تكتل البيان الوحيدة إن قبلت (واحدة لكل 7 وحدات): الدعوة بانتظار ردها." },
  { id: "01033300985", phone: "0944985449", position: "murshida", section: "موجّهة دينية أ", mode: "done", title: "نهى الطباع — موجّهة دينية أ", note: "49 عاماً — موجّهة من الدرجة «أ» أربعة مواسم (4.8)، وتؤدي اختبار الموجّهة الدينية. ثانية موجّهات تكتل النور، وتمنحه هي أيضاً «شارة التميّز في التوجيه الديني»." },
];
/** تكتل النور في هذا العرض، ومجموعة أحمد فيه (27). فريقه وإسناده في طلبه (SEED_CLUSTERS) */
export const TECH_POSTING = { clusterId: "al-nour", groupNumber: 27 };


/** الصفة التي يعمل بها الإداري: المنسق التقني أولاً إن كانت من صفاته */
export function positionOf(p: AdminProfile | undefined) {
  return p?.positions.includes("tech") ? "tech" : (p?.positions[0] ?? "tech");
}

/** هل يعمل هذا الإداري منسقاً تقنياً؟ بصفته، أو بمكانه بين منسقي تكتله («معاون ومنسق تقني») */
export function isTechCoordinator(p: AdminProfile | undefined) {
  return !!p?.positions.includes("tech") || !!p?.coordinatorIn;
}

/**
 * The platform's roles as it ships them (./structure DEFAULT_ROLES; the administration edits them there).
 * `elected` is an older name for "not applied for": «رئيس تكتل» is granted by the administration.
 */
export const POSITIONS = DEFAULT_ROLES.map((r) => ({ key: r.key, label: r.name, desc: r.desc, elected: !r.applied }));

/**
 * The documents the administration asks for, each with the validity IT sets. `validSeasons` counts the
 * issuing season itself: 0 = never expires, 1 = this season only, 3 = the issuing season and two after
 * it. A document in the administrator's permanent file is carried into the new season's application
 * when it is still valid; when it has expired he updates it instead of uploading everything again.
 */
export type DocType = { key: string; label: string; hint: string; file: string; validSeasons: number; custom?: boolean; off?: boolean };

/**
 * Shared documents (the record, the degree, first aid) and the certificates that belong to one kind of
 * work (the sharia certificate of a guide, the computing certificate of a technical coordinator, the
 * leadership course of a group head). Which role asks for which, and whether it is required or only
 * strengthens the application, is the season's requirements table — not this list.
 */
export const DOCUMENTS: DocType[] = [
  { key: "record", label: "وثيقة «لا حكم عليه»", hint: "غير مضى عليها أكثر من 3 أشهر — تُجدَّد كل موسم", file: "no-criminal-record.pdf", validSeasons: 1 },
  { key: "degree", label: "صورة عن الشهادة الجامعية", hint: "PDF أو صورة واضحة", file: "university-degree.pdf", validSeasons: 0 },
  { key: "first-aid", label: "شهادة دورة إسعافات أولية", hint: "صادرة خلال آخر سنتين", file: "first-aid-2026.pdf", validSeasons: 3 },
  { key: "sharia", label: "شهادة شرعية أو إجازة في العلوم الشرعية", hint: "من كلية أو معهد شرعي معتمد", file: "sharia-certificate.pdf", validSeasons: 0 },
  { key: "it", label: "شهادة في المعلوماتية (ICDL أو ما يعادلها)", hint: "أو شهادة جامعية في المعلوماتية", file: "it-certificate.pdf", validSeasons: 0 },
  { key: "leadership", label: "شهادة دورة قيادة وإدارة مجموعات", hint: "من جهة تدريبية معتمدة", file: "leadership-course.pdf", validSeasons: 3 },
  { key: "recommendation", label: "تزكية من رئيس تكتل سابق", hint: "من موسم سابق عملت فيه", file: "recommendation.pdf", validSeasons: 2 },
];

export const COMMITMENTS = [
  { key: "travel", label: "السفر مع الحجاج طوال الموسم", detail: "من يوم السفر حتى وصول آخر حاج إلى دمشق." },
  { key: "rules", label: "الالتزام بالتعليمات ولائحة المكافآت والعقوبات", detail: "اللائحة المعتمدة لموسم 1448 كما تنشرها الإدارة." },
  { key: "ethics", label: "ميثاق الأخلاقيات", detail: "خدمة الحاج باحترام، وحماية بياناته، وعدم قبول أي مقابل." },
  { key: "evaluation", label: "قبول التقييم", detail: "يقيّمني الموظفون والحجاج ورئيس التكتل، وتبقى النتيجة في ملفي." },
] as const;

export const LANGUAGES = ["العربية", "الإنجليزية", "التركية", "الفرنسية", "الأوردو"] as const;

export const SKILLS = [
  { key: "bus", label: "قيادة حافلة", emoji: "🚌" },
  { key: "first-aid", label: "إسعافات أولية", emoji: "⛑️" },
  { key: "computer", label: "استخدام الحاسوب والتطبيقات", emoji: "💻" },
  { key: "sign", label: "لغة الإشارة", emoji: "🤟" },
  { key: "elderly", label: "خبرة في رعاية كبار السن", emoji: "🧓" },
] as const;

/** A document type: the platform's list, then the certificates the administration added this season */
export function documentType(key: string, types: DocType[] = DOCUMENTS) {
  return types.find((d) => d.key === key) ?? DOCUMENTS.find((d) => d.key === key);
}

/**
 * Is this document still valid for the season? The validity comes from the season settings the
 * administration edits; the list here only carries the default. 0 = a document that never expires.
 */
export function docState(doc: VaultDoc, season: number = SEASON.hijriYear, validity?: Record<string, number>) {
  const valid = validity?.[doc.key] ?? documentType(doc.key)?.validSeasons ?? 0;
  if (valid === 0) return { ok: true, text: "سارية — لا تنتهي", until: null as number | null };
  const until = doc.issuedSeason + valid - 1;
  return until >= season
    ? { ok: true, text: until === season ? `سارية لهذا الموسم` : `سارية حتى موسم ${until}`, until }
    : { ok: false, text: `منتهية منذ موسم ${until + 1} — حدّثها`, until };
}

/**
 * What each role asks of the administrator, as a table the administration sets every season: one row
 * per condition, one column per role. The four fixed rows are numbers or a gender — who he is, which no
 * upload changes. The other rows are things in his permanent file (a document or certificate, a skill,
 * a language); for each role such a row is "required" (no application without it) or "preferred" (it
 * strengthens the application but does not stop it). Roles share some rows (the record) and not others
 * (the sharia certificate of a guide, the computing certificate of a technical coordinator).
 * `rows`: "age-min", "age-max", "gender", "seasons", "doc:<key>", "skill:<key>", "lang:<name>", top to bottom.
 * `cells`: role key -> row id -> a number, "M" / "F", or "required" / "preferred".
 */
export type RoleRequirements = NonNullable<AdminRules["requirements"]>;

export const FIXED_CRITERIA = ["age-min", "age-max", "gender", "seasons"] as const;

/**
 * The roles that sit an exam of their own and have their own column of requirements and permissions. A role
 * the administration tied to another («معاون ومنسق تقني» sits the technical coordinator's, every grade of the
 * guides the guide's: ./structure `examAs`) is applied for, but shares that role's exam, requirements and permissions.
 */
export const APPLIED_ROLES = POSITIONS.filter((p) => !p.elected && !DEFAULT_ROLES.find((r) => r.key === p.key)?.examAs).map((p) => ({
  ...p,
  // The guides' grades share one exam and one column: «الموجّه الديني», not the grade that owns it
  label: DEFAULT_ROLES.find((r) => r.key === p.key)?.examName ?? p.label,
}));

/** The table for season 1448 as the platform ships it */
export const ROLE_REQUIREMENTS: RoleRequirements = {
  rows: ["age-min", "age-max", "gender", "seasons", "doc:record", "doc:degree", "doc:first-aid", "doc:sharia", "doc:it", "doc:leadership", "doc:recommendation", "skill:computer", "skill:elderly", "lang:الإنجليزية"],
  cells: {
    "group-head": { "age-min": 30, "age-max": 60, "doc:record": "required", "doc:degree": "required", "doc:first-aid": "preferred", "doc:leadership": "preferred", "doc:recommendation": "preferred", "skill:computer": "preferred" },
    "group-deputy": { "age-min": 25, "age-max": 60, "doc:record": "required", "doc:degree": "required", "doc:first-aid": "preferred", "skill:elderly": "preferred" },
    "guide-m": { "age-min": 25, "age-max": 65, gender: "M", "doc:record": "required", "doc:sharia": "required", "doc:degree": "preferred", "skill:elderly": "preferred" },
    "guide-f": { "age-min": 25, "age-max": 65, gender: "F", "doc:record": "required", "doc:sharia": "required", "doc:degree": "preferred", "skill:elderly": "preferred" },
    tech: { "age-min": 22, "age-max": 55, "doc:record": "required", "doc:it": "required", "skill:computer": "required", "doc:degree": "preferred", "lang:الإنجليزية": "preferred" },
  },
};

export type Level = "required" | "preferred";

/** A role's column of the table: its own, or the column of the role it is tied to («موجّه ديني أ» the guide's) */
export function columnOf(table: RoleRequirements, roleKey: string) {
  return table.cells[roleKey] ?? table.cells[examRoleOf(roleKey)] ?? {};
}

/** How a file row stands for one role: required, preferred, or not asked */
export function levelOf(table: RoleRequirements, roleKey: string, id: string): Level | null {
  const v = table.rows.includes(id) ? columnOf(table, roleKey)[id] : undefined;
  return v === "required" || v === "preferred" ? v : null;
}

/** "doc:degree" -> ["doc", "degree"]; a fixed row has no key */
function splitCriterion(id: string): [string, string] {
  const i = id.indexOf(":");
  return i < 0 ? [id, ""] : [id.slice(0, i), id.slice(i + 1)];
}

/** How a row of the table reads, for the administration and for the administrator */
export function criterionLabel(id: string, types: DocType[] = DOCUMENTS) {
  const [kind, key] = splitCriterion(id);
  if (id === "age-min") return "العمر من";
  if (id === "age-max") return "العمر حتى";
  if (id === "gender") return "الجنس";
  if (id === "seasons") return "مواسم خبرة سابقة (حد أدنى)";
  if (kind === "doc") return documentType(key, types)?.label ?? key;
  if (kind === "skill") return SKILLS.find((s) => s.key === key)?.label ?? key;
  if (kind === "lang") return `اللغة ${key}`;
  return id;
}

/** Every file row the administration may add to the table: the season's documents and certificates, skills and languages */
export function criteriaCatalog(types: DocType[] = DOCUMENTS, skills: readonly { key: string }[] = SKILLS, languages: readonly string[] = LANGUAGES) {
  return [
    { group: "وثائق وشهادات", ids: types.map((d) => `doc:${d.key}`) },
    { group: "مهارات", ids: skills.map((s) => `skill:${s.key}`) },
    { group: "لغات", ids: languages.filter((l) => l !== "العربية").map((l) => `lang:${l}`) },
  ];
}

/**
 * One line of the table applied to one administrator. "personal" lines (age, gender, experience) say
 * whether the role fits who he is; "required" lines must be in his file before he can submit;
 * "preferred" lines only strengthen the application.
 */
export type RequirementCheck = { id: string; k: string; v: string; ok: boolean; level: "personal" | Level; fix?: string };

/** Who the administrator is, as the table needs him: from the civil registry, the platform's records and his own file */
export type Applicant = { age: number; gender: "M" | "F"; seasons: number; record: AdminRecord; validity?: Record<string, number>; types?: DocType[] };

export function applicantOf(id: string, person: Person, record: AdminRecord, validity?: Record<string, number>, types?: DocType[]): Applicant {
  return { age: ageOf(person), gender: person.gender, seasons: seasonHistory(id).filter((h) => h.roleKey).length, record, validity, types };
}

/** The table's column for one role, applied to one administrator, with what to do where he falls short */
export function requirementChecks(table: RoleRequirements, roleKey: string, a: Applicant): RequirementCheck[] {
  const col = columnOf(table, roleKey);
  const out: RequirementCheck[] = [];
  const min = typeof col["age-min"] === "number" ? (col["age-min"] as number) : null;
  const max = typeof col["age-max"] === "number" ? (col["age-max"] as number) : null;
  if (min !== null || max !== null) {
    const k = min !== null && max !== null ? `العمر بين ${min} و${max}` : min !== null ? `العمر ${min} فأكثر` : `العمر حتى ${max}`;
    out.push({ id: "age", level: "personal", k, v: `${a.age} سنة`, ok: (min === null || a.age >= min) && (max === null || a.age <= max) });
  }
  if (col.gender === "M" || col.gender === "F") {
    out.push({ id: "gender", level: "personal", k: col.gender === "M" ? "للذكور" : "للإناث", v: a.gender === "M" ? "ذكر" : "أنثى", ok: a.gender === col.gender });
  }
  if (typeof col.seasons === "number" && col.seasons > 0) {
    out.push({ id: "seasons", level: "personal", k: `خبرة ${col.seasons} ${col.seasons === 1 ? "موسم" : "مواسم"} فأكثر`, v: a.seasons ? `${a.seasons} ${a.seasons === 1 ? "موسم" : "مواسم"} في سجل المنصة` : "لا مواسم سابقة", ok: a.seasons >= col.seasons });
  }
  for (const id of table.rows) {
    const level = levelOf(table, roleKey, id);
    if (!level) continue;
    const [kind, key] = splitCriterion(id);
    const k = criterionLabel(id, a.types);
    if (kind === "doc") {
      const doc = a.record.documents.find((d) => d.key === key);
      const st = doc ? docState(doc, SEASON.hijriYear, a.validity) : null;
      out.push({ id, level, k, v: !doc ? "ليست في ملفك" : st!.ok ? st!.text : "منتهية الصلاحية", ok: !!st?.ok, fix: !doc ? "ارفعها في «وثائقي وشهاداتي»" : st!.ok ? undefined : "حدّثها في «وثائقي وشهاداتي»" });
    } else if (kind === "skill") {
      const has = a.record.skills.includes(key);
      out.push({ id, level, k: `مهارة: ${k}`, v: has ? "في ملفك" : "غير مسجّلة في ملفك", ok: has, fix: has ? undefined : "أضفها في «لغاتي ومهاراتي»" });
    } else if (kind === "lang") {
      const has = a.record.languages.includes(key);
      out.push({ id, level, k, v: has ? "في ملفك" : "غير مسجّلة في ملفك", ok: has, fix: has ? undefined : "أضفها في «لغاتي ومهاراتي»" });
    }
  }
  return out;
}

const EMPTY_RECORD: AdminRecord = { documents: [], languages: ["العربية"], skills: [], updatedAt: 0 };

/**
 * The permanent file an administrator arrives with. Whoever served before has documents, languages and
 * skills already on the platform; a first-season administrator starts with an empty file and builds it
 * this season. Written to the store the first time he changes anything.
 */
export function seedRecord(id: string): AdminRecord | undefined {
  const served = seasonHistory(id).filter((h) => h.roleKey);
  if (!served.length) return undefined;
  const firstSeason = Number(served[0].season);
  const lastSeason = Number(served[served.length - 1].season);
  const role = served[served.length - 1].roleKey;
  const at = firstSeason * 1000;
  const doc = (key: string, issuedSeason: number, label?: string, file?: string): VaultDoc => ({
    id: `${key}-${issuedSeason}`,
    key,
    label: label ?? documentType(key)?.label ?? key,
    file: file ?? documentType(key)?.file ?? `${key}.pdf`,
    issuedSeason,
    addedAt: at,
  });
  const documents: VaultDoc[] = [
    doc("degree", firstSeason),
    doc("first-aid", lastSeason),
    // Renewed every season: the copy in the file is last season's, so it has expired
    doc("record", lastSeason),
  ];
  if (served.length >= 2) documents.push(doc("recommendation", lastSeason, `تزكية من رئيس تكتل — موسم ${lastSeason}`, `recommendation-${lastSeason}.pdf`));
  // The certificate of his kind of work, uploaded the first season he served in it
  if (role === "guide-m" || role === "guide-f") documents.push(doc("sharia", firstSeason));
  if (role === "tech") documents.push(doc("it", firstSeason));
  // A certificate the administrator added himself in an earlier season
  documents.push({ id: "custom-academy", key: "custom", label: `شهادة مسار «خدمة كبار السن» — أكاديمية الحج`, file: "academy-elderly-care.pdf", issuedSeason: lastSeason, addedAt: at });
  const skills = role === "tech" ? ["computer"] : role === "guide-m" || role === "guide-f" ? ["elderly", "computer"] : ["first-aid", "computer"];
  if (served.length >= 2) skills.push("إدارة الحشود في المشاعر");
  return { documents, languages: ["العربية", "الإنجليزية"], skills, updatedAt: at };
}

/**
 * The file of an administrator who has already registered for this season: every document that had
 * expired was renewed with a copy issued this season, which is exactly what the documents step does.
 */
export function renewedRecord(id: string, validity?: Record<string, number>): AdminRecord | undefined {
  const rec = seedRecord(id);
  if (!rec) return undefined;
  const season = SEASON.hijriYear;
  return {
    ...rec,
    documents: rec.documents.map((d) => (docState(d, season, validity).ok ? d : { ...d, id: `${d.key}-${season}`, issuedSeason: season, updatedAt: season * 1000 })),
    updatedAt: season * 1000,
  };
}

/** The file as it stands now: what is in the store, or the seeded file of a returning administrator */
export function recordOf(p: AdminProfile | undefined, id: string): AdminRecord {
  return p?.record ?? seedRecord(id) ?? EMPTY_RECORD;
}

/** Administrator calendar for season 1448: as announced by the Hajj and Umrah administration, «تقديري» where it had not announced yet */
export const ADMIN_CALENDAR = [
  { hijri: "دائم", title: "إنشاء الحساب الإداري", detail: "الرقم الوطني ورمز التحقق والشؤون المدنية — حساب دائم يُنشأ في أي وقت" },
  { hijri: "20 – 24 أيلول 2026", title: "التسجيل كإداري والتحقق من الأهلية", detail: "يتجدد كل موسم لصفة واحدة: رئيس مجموعة، معاون، موجّه أو موجّهة دينية، منسق تقني — الوثائق والمهارات، ثم الالتزامات، ثم التحقق من الأهلية آلياً" },
  { hijri: "20 – 24 أيلول 2026", title: "رسم التسجيل", detail: "30 $ — يُدفع بعد ثبوت الأهلية فقط، فلا يدفع أحد رسماً عن صفة لا يستوفي شروطها" },
  { hijri: "أواخر أيلول – أوائل تشرين الأول", title: "الاختبار المؤتمت في القاعات", detail: "لكل صفة اختبارها في يومها، في قاعة المركز الامتحاني لمحافظتك وبإشراف مشرفها — من يجدد صفته بتقييم مستوفٍ معفى" },
  { hijri: "بعد تأكيد التسليم", title: "النتيجة وقوائم الإداريين المعتمدين", detail: "ناجح من اجتاز كل قسم من أقسام اختباره بالنسبة المطلوبة فيه، كما تضبطها إدارة الامتحانات للموسم" },
  { hijri: "1 – 10 تشرين الثاني (تقديري)", title: "تشكيل المجموعات في المكتب", detail: "يراجع رئيس المجموعة المكتب باسم مجموعته ورسمها 200 $، فيشكّلها موظف إدارة الإداريين بفئته (الأولى… الرابعة): عدد حجاجها ومقاعد فريقها بحسب مستوى التكتل" },
  { hijri: "12 – 30 تشرين الثاني (تقديري)", title: "تشكيل التكتلات بالطلب", detail: "لا انتخاب: من يحمل صفة «رئيس تكتل» أساسيةً أو موسمية يقدّم الطلب: المستوى، ثم المجموعات ومقاعدها، ومعاون التكتل، والمنسقون والموجّهات بمجموع الفئات، والنائب والمحاسب. من يرسله قبل الموعد الأول ينال «شارة الالتزام بالمواعيد»" },
  { hijri: "12 تشرين الثاني – 15 كانون الثاني (تقديري)", title: "إلحاق الحجاج بالمجموعات", detail: "بالتوازي مع تشكيل التكتلات ويستمر بعده: يوقّع الحاج عقده مع المجموعة في المكتب، فيلحقه موظف المكتب بها، ويرى رئيسها ومنسقها حجاجها" },
  { hijri: "حتى 5 كانون الأول (تقديري)", title: "مراجعة طلبات التكتلات واعتمادها", detail: "يراجع موظف إدارة الإداريين كل طلب مُرسَل فيعتمده، أو يعيده بملاحظات يصلحها رئيسه ويرسله ثانية قبل الموعد النهائي — ثم رسم التكتل 500 $" },
  { hijri: "24 ذو القعدة (1 أيار 2027)", title: "السفر مع الحجاج", detail: "الميدان: التجمّعات والإعلانات والتقارير" },
] as const;

/** `groups`: the groups he served in, by their keys; `group`: the same, named for the screen */
export type SeasonRecord = { season: string; roleKey: string | null; role: string; groups: number[]; group: string; rating: number | null };

/** Seasons served, from the platform's own records (roleKey null = did not take part that season) */
const HISTORY: Record<string, { season: string; roleKey: string | null; cluster?: string; groups?: number[]; rating?: number }[]> = {
  "01033300881": [{ season: "1445", roleKey: "group-head", groups: [31], rating: 4.6 }, { season: "1446", roleKey: "group-head", groups: [31], rating: 4.7 }, { season: "1447", roleKey: "group-head", groups: [31], rating: 4.8 }],
  "01033300882": [{ season: "1445", roleKey: "group-head", groups: [63], rating: 4.3 }, { season: "1446", roleKey: "group-head", groups: [63], rating: 4.5 }, { season: "1447", roleKey: "group-head", groups: [63], rating: 4.6 }],
  "01033300883": [{ season: "1446", roleKey: "group-head", groups: [5], rating: 4.2 }, { season: "1447", roleKey: "group-head", groups: [5], rating: 4.4 }],
  "01033300884": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "group-head", groups: [44], rating: 3.2 }],
  "01033300899": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "group-head", groups: [67], rating: 4.4 }],
  "01033300880": [{ season: "1444", roleKey: "group-head", groups: [68], rating: 4.5 }, { season: "1445", roleKey: "group-head", groups: [68], rating: 4.6 }, { season: "1446", roleKey: "group-head", groups: [68], rating: 4.8 }, { season: "1447", roleKey: "group-head", groups: [68], rating: 4.7 }],
  "01033300871": [{ season: "1446", roleKey: "group-deputy", groups: [12], rating: 4.6 }, { season: "1447", roleKey: null }],
  "01033300872": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "group-deputy", groups: [27], rating: 4.1 }],
  "01033300874": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "tech", cluster: "تكتل النور", groups: [27, 31, 5], rating: 4.8 }],
  "01033300886": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "group-deputy", groups: [41], rating: 4.3 }],
  "01033300873": [{ season: "1446", roleKey: "guide-m", groups: [27], rating: 4.9 }, { season: "1447", roleKey: "guide-m", groups: [27], rating: 4.9 }],
  "01033300944": [{ season: "1445", roleKey: "group-deputy", groups: [5], rating: 4.5 }, { season: "1446", roleKey: "group-deputy", groups: [5], rating: 4.6 }, { season: "1447", roleKey: "group-deputy", groups: [44], rating: 4.7 }],
  "01033300947": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "group-deputy", groups: [33], rating: 4.3 }],
  "01033300975": [{ season: "1446", roleKey: "assistant-count", cluster: "تكتل النور", rating: 4.0 }, { season: "1447", roleKey: "assistant-count", cluster: "تكتل النور", rating: 4.2 }],
  "01033300961": [{ season: "1446", roleKey: "tech", groups: [18], rating: 4.2 }, { season: "1447", roleKey: "assistant-tech", cluster: "تكتل النور", groups: [18, 33], rating: 4.4 }],
  "01033300965": [{ season: "1445", roleKey: "murshid", groups: [31], rating: 4.8 }, { season: "1446", roleKey: "murshid", groups: [31], rating: 4.9 }, { season: "1447", roleKey: "murshid", groups: [31], rating: 4.9 }],
  "01033300981": [{ season: "1446", roleKey: "guide-f", cluster: "تكتل النور", rating: 4.6 }, { season: "1447", roleKey: "guide-f", cluster: "تكتل النور", rating: 4.7 }],
  "01033300984": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "guide-f", cluster: "تكتل الشهباء", rating: 4.2 }],
  "01033300985": [{ season: "1446", roleKey: "murshida", cluster: "تكتل النور", rating: 4.7 }, { season: "1447", roleKey: "murshida", cluster: "تكتل النور", rating: 4.8 }],
  "01033300891": [{ season: "1446", roleKey: "group-head", groups: [64], rating: 4.2 }, { season: "1447", roleKey: "group-head", groups: [64], rating: 4.4 }],
  "01033300892": [{ season: "1447", roleKey: "group-deputy", groups: [22], rating: 4.3 }],
  "01033300893": [{ season: "1447", roleKey: "group-deputy", groups: [12], rating: 4.2 }],
  "01033300894": [{ season: "1447", roleKey: "assistant-count", cluster: "تكتل الشهباء", rating: 4.1 }],
  "01033300895": [{ season: "1446", roleKey: "assistant-tech", groups: [14], rating: 4.3 }, { season: "1447", roleKey: "assistant-tech", groups: [14, 22], rating: 4.5 }],
  "01033300896": [{ season: "1447", roleKey: "murshid", groups: [9], rating: 4.6 }],
  "01033300897": [{ season: "1447", roleKey: "murshida", cluster: "تكتل الشهباء", rating: 4.5 }],
};

export function seasonHistory(id: string): SeasonRecord[] {
  const rows = HISTORY[id] ?? [{ season: "1446", roleKey: null }, { season: "1447", roleKey: null }];
  return rows.map((r) => ({
    season: r.season,
    roleKey: r.roleKey,
    role: r.roleKey ? positionLabelOf(r.roleKey) : "لم يشارك",
    groups: r.groups ?? [],
    group: [r.cluster, r.groups?.length ? groupsName(r.groups) : ""].filter(Boolean).join(" — "),
    rating: r.rating ?? null,
  }));
}

/** Served in at least one earlier season: his permanent file («وثائقي ومهاراتي») is already on the platform */
export function servedBefore(id: string) {
  return seasonHistory(id).some((h) => h.roleKey);
}

/** The last season actually served, if any */
export function lastServed(id: string): SeasonRecord | null {
  return [...seasonHistory(id)].reverse().find((h) => h.roleKey) ?? null;
}

export function previousRating(id: string) {
  return lastServed(id)?.rating ?? null;
}

export type RoleOption = { key: string; label: string; ok: boolean; reason: string; examExempt: boolean };

/**
 * What this administrator may apply for this season, under the administration's rules:
 * - keep last season's role: needs that season's rating ≥ the minimum and no gap season → exams waived;
 * - another role: its seniority requirements (cluster head/deputy), exams required;
 * - first season: any open role, exams required.
 */
export function roleOptions(id: string, rules: { keepRoleMinRating: number }, openRoles?: string[]): { last: SeasonRecord | null; keep: RoleOption | null; others: RoleOption[] } {
  const history = seasonHistory(id);
  const last = lastServed(id);
  const A = SEASON.administrators;
  const gap = last ? history.filter((h) => !h.roleKey && h.season > last.season).length : 0;

  const keep: RoleOption | null = last
    ? (() => {
        const rating = last.rating ?? 0;
        if (rating < rules.keepRoleMinRating) return { key: last.roleKey!, label: last.role, ok: false, reason: `تقييم موسم ${last.season} (${rating}) دون الحد ${rules.keepRoleMinRating} — لا يُجدَّد في الصفة نفسها`, examExempt: false };
        if (gap > A.keepRole.maxGapSeasons) return { key: last.roleKey!, label: last.role, ok: true, reason: `انقطاع ${gap} مواسم — تؤدي الاختبار المؤتمت من جديد`, examExempt: false };
        return { key: last.roleKey!, label: last.role, ok: true, reason: `تقييم ${rating} من 5 في موسم ${last.season}${A.keepRole.examExempt ? " — معفى من الاختبار" : ""}`, examExempt: A.keepRole.examExempt };
      })()
    : null;

  // A role that is not applied for («رئيس تكتل») is granted by the administration; only the roles it left open this season
  const others = structureNow()
    .roles.filter((r) => r.applied && r.active && r.key !== last?.roleKey && (!openRoles || openRoles.includes(r.key)))
    .map((r): RoleOption => ({ key: r.key, label: r.name, ok: true, reason: last ? "صفة جديدة — تؤدي الاختبار المؤتمت" : "أول موسم — تؤدي الاختبار المؤتمت", examExempt: false }));
  return { last, keep, others };
}

export function adminReceipt(id: string, kind: "A" | "G", groupNumber?: number) {
  return kind === "A" ? `1448-A-${id.slice(-3).padStart(6, "0")}` : `1448-G-${String(groupNumber ?? 0).padStart(6, "0")}`;
}

export function adminName(id: string) {
  const p = getPerson(id);
  return p ? fullName(p) : id;
}

/**
 * `file`: what the administrators' file («إدارة الإداريين») keeps of it — the tab it belongs to, and the
 * record it is part of (a group's number, a cluster's id; his own file by default)
 */
export function logAdmin(id: string, action: string, target?: string, detail?: string, file?: { area: string; ref?: string }) {
  actions.logEvent({ actor: adminName(id), role: ADMIN_ROLE, action, target, detail, ...(file && { system: "admins", area: file.area, ref: file.ref ?? id }) });
}

type Paper = NonNullable<AdminProfile["exam"]>;

/** An attempt's status (kept papers without one: sent ones count as confirmed) */
export function statusOf(a: Attempt | undefined): AttemptStatus | undefined {
  if (!a) return undefined;
  return a.status ?? (a.submittedAt ? "confirmed" : "active");
}

/** A stored role as its key: the portal stores keys, the seeded files carry Arabic names */
export function positionKeyOf(position: string | undefined) {
  if (!position) return "";
  return roleKeyByName(structureNow(), position) ?? POSITIONS.find((x) => x.key === position || x.label === position)?.key ?? "";
}

/** The exams he sits this season: his role's, or both of «معاون ومنسق تقني»'s */
export function examRolesFor(p: Pick<AdminProfile, "positions"> | undefined) {
  const key = positionKeyOf(p?.positions[0]);
  return key ? examRolesOf(key) : [];
}

/** His paper of one exam: his role's own exam is in `exam`, any other one in `exams` */
export function paperOf(p: Pick<AdminProfile, "positions" | "exam" | "exams"> | undefined, examRole: string): Paper | undefined {
  const key = positionKeyOf(p?.positions[0]);
  return !key || examRole === examRoleOf(key) ? p?.exam : p?.exams?.[examRole];
}

/** The change that stores (or clears) his paper of one exam */
export function paperPatch(p: Pick<AdminProfile, "positions" | "exams"> | undefined, examRole: string, paper: Paper | undefined): Partial<AdminProfile> {
  const key = positionKeyOf(p?.positions[0]);
  if (!key || examRole === examRoleOf(key)) return { exam: paper };
  const exams = { ...p?.exams };
  if (paper) exams[examRole] = paper;
  else delete exams[examRole];
  return { exams };
}

/** Every exam he sits with his paper of it, in the order he sits them */
export function papersOf(p: AdminProfile | undefined) {
  return examRolesFor(p).map((role) => ({ role, paper: paperOf(p, role) }));
}

/** One test of his, as it stands: its status, its mark (%), each section, and whether he passed it */
export type PartResult = { role: string; status?: AttemptStatus; sent: boolean; score?: number; sections: SectionResult[]; passed: boolean; confirmedAt?: number; showResult: boolean };

/**
 * His result, as the administration's exam platform judges it: a test counts once its submission is confirmed (by
 * the hall's supervisor, or approved by the administration), and he passes it by passing every one of its sections
 * at its own pass mark — no overall mark to reach, no weights, no oral. A role that sits two tests («معاون ومنسق
 * تقني») passes when it passes both. `published` is when he sees it: confirmed, in a test that shows results.
 */
export function resultOf(p: AdminProfile | undefined): {
  parts: PartResult[];
  sent: boolean;
  confirmed: boolean;
  score?: number;
  published?: number;
  exempt: boolean;
  passed: boolean;
} {
  const parts: PartResult[] = papersOf(p).map(({ role, paper }) => {
    const sections = paper?.paper && paper.tally ? sectionsOf(paper.paper, paper.tally) : [];
    const status = statusOf(paper);
    // A paper kept without its sections (from before): its mark against the usual 50%
    const passed = sections.length ? sections.every((x) => x.passed) : (paper?.score ?? -1) >= 50;
    return { role, status, sent: !!paper?.submittedAt, score: paper?.score, sections, passed, confirmedAt: paper?.confirmedAt ?? (status === "confirmed" ? paper?.submittedAt : undefined), showResult: paper?.showResult ?? true };
  });
  // Same role renewed with the required rating: no test this season, the file counts as qualified
  const exempt = !!p?.examExempt && !!p?.eligibleAt && !!p?.feePaidAt;
  const confirmed = parts.length > 0 && parts.every((x) => x.status === "confirmed");
  const scored = parts.length > 0 && parts.every((x) => x.score !== undefined);
  const confirmedAt = confirmed ? Math.max(...parts.map((x) => x.confirmedAt ?? 0)) : undefined;
  return {
    parts,
    sent: parts.length > 0 && parts.every((x) => x.sent),
    confirmed,
    score: scored ? Math.round((parts.reduce((a, x) => a + x.score!, 0) / parts.length) * 10) / 10 : undefined,
    published: exempt ? p?.feePaidAt : confirmed && parts.every((x) => x.showResult) ? confirmedAt : undefined,
    exempt,
    passed: exempt || (confirmed && parts.every((x) => x.passed)),
  };
}

export type StepState = "done" | "current" | "locked";
export type JourneyStep = { key: string; title: string; date: string; href: string; detail: string; state: StepState };

/** `written`: his exam's sitting and paper this season (useMyHall) */
export function journeyOf(p: AdminProfile | undefined, joinCount = 0, written?: { date: string; questions: number; minutes: number; center?: string }): JourneyStep[] {
  const r = resultOf(p);
  const g = p?.group;
  // Forming a cluster belongs to group heads (and the cluster roles they become).
  // A guide, an assistant or a coordinator joins a cluster by its head's invitation, and works in the
  // groups the head assigns to him: no group station of his own. Before any role is chosen, the full list.
  const teamMember = !!p?.positions?.length && p.positions[0] !== "group-head" && !isClusterRole(p);
  const tech = isTechCoordinator(p);
  const post = p?.coordinatorIn ?? p?.servesIn;
  const posted = post ? `${post.clusterName} — ${post.groups.length ? groupsName(post.groups) : p?.servesIn ? "للتكتل كله" : "لم توزَّع عليه مجموعة بعد"}` : "";
  const when = (key: string) => {
    const o = OPERATIONS.find((x) => x.key === key)!;
    return rangeLabel(o.start, o.end);
  };
  const raw: (Omit<JourneyStep, "state"> & { done: boolean; headOnly?: boolean; groupOnly?: boolean })[] = [
    { key: "account", title: "إنشاء الحساب الإداري", date: "دائم", href: "/administrator/dashboard", detail: "ملف إداري دائم مؤكد من الشؤون المدنية", done: !!p },
    { key: "apply", title: "التسجيل كإداري والتحقق من الأهلية", date: when("admin-registration"), href: "/administrator/apply", detail: p?.eligibleAt ? `مؤهل لصفة ${positionLabelOf(p.positions[0] ?? "")} — ${p.renewal === "keep" ? "تجديد الصفة نفسها" : p.renewal === "change" ? "صفة جديدة" : "أول موسم"}` : "ملفك، ثم صفة واحدة تستوفي شروطها في جدول الإدارة، ثم التحقق قبل الدفع", done: !!p?.eligibleAt },
    { key: "fee", title: "رسم التسجيل", date: when("admin-registration"), href: "/administrator/apply", detail: p?.receipt ? `الإيصال ${p.receipt}` : "30 $ — بعد ثبوت الأهلية", done: !!p?.feePaidAt },
    { key: "test", title: "الاختبار المؤتمت", date: written?.date ? written.date.replace(" 1448", "") : when("admin-exams"), href: "/administrator/exam", detail: r.exempt ? "معفى — الصفة نفسها بتقييم مستوفٍ" : r.confirmed ? `سُلّم وأكّده المشرف${r.parts.length > 1 ? " — الاختباران" : ""}` : r.parts.some((x) => x.status === "submitted") ? "سُلّم — بانتظار تأكيد المشرف" : r.parts.some((x) => x.status === "unconfirmed") ? "لم يُؤكَّد تسليمك — تقرر فيه الإدارة" : written ? `في قاعة ${written.center ?? "مركزك"} — ${written.questions} سؤالاً في ${written.minutes} دقيقة` : "في قاعة مركزك الامتحاني", done: r.exempt || r.confirmed },
    { key: "result", title: "النتيجة", date: when("admin-exams"), href: "/administrator/exam", detail: r.exempt ? "مؤهل بالتجديد — دون اختبار" : r.published ? `${r.score ?? "—"}% — ${r.passed ? "ناجح في كل الأقسام" : "لم يجتز كل الأقسام"}` : r.confirmed ? "تظهر حين تعرضها الإدارة" : "النجاح ببلوغ النسبة المطلوبة في كل قسم", done: !!r.published && r.passed },
    teamMember
      ? { key: "team", title: tech ? "الانضمام إلى تكتل منسقاً تقنياً" : "الانضمام إلى تكتل", date: when("cluster-formation"), href: "/administrator/cluster", detail: post ? posted : tech ? "بدعوة فردية من رئيس تكتل، ويوزّعك على مجموعات منه" : "بدعوة فردية من رئيس تكتل إلى مقعد في إحدى مجموعاته أو إلى التكتل كله", done: !!post }
      : { key: "group", title: "تشكيل المجموعة في المكتب", date: when("group-formation"), href: "/administrator/group", detail: g?.approvedAt ? `${groupName(g.number)} — شكّلها ${g.approvedBy ?? "موظف المكتب"}` : g ? `${groupName(g.number)} — عند المكتب` : "باسمها الذي تختاره ورسمها 200 $ في المكتب", done: !!g?.approvedAt },
    { key: "cluster", title: "تشكيل التكتلات", date: when("cluster-formation"), href: "/administrator/cluster", detail: p?.cluster ? `طلب ${p.cluster.name}` : p?.deputyOf ? `${p.deputyOf.clusterName} — نائب رئيسه` : g?.clusterId ? "مجموعتك في تكتل" : "تدعو التكتلات مجموعتك إليها، ويقدّم الطلب من منحته الإدارة صفة رئيس تكتل", done: !!p?.cluster || !!p?.deputyOf || !!g?.clusterId, headOnly: true },
    teamMember
      ? { key: "requests", title: "حجاج مجموعاتي", date: when("group-joining"), href: "/administrator/requests", detail: tech ? "حجاج المجموعات التي وُزّعت عليها كما يلحقهم المكتب، وملفاتهم الصحية" : "حجاج المجموعات التي تعمل فيها", done: joinCount > 0 }
      : { key: "requests", title: "حجاج المجموعة", date: when("group-joining"), href: isClusterRole(p) ? "/administrator/clusters" : "/administrator/requests", detail: joinCount ? `${joinCount} عائلات تم الترحيب بها` : "حجاج مجموعتك كما يلحقهم المكتب، وملفاتهم الصحية", done: joinCount > 0 },
    { key: "field", title: "الميدان", date: "24 ذو القعدة", href: "/administrator/field", detail: p?.musters.some((m) => m.closedAt) ? "أول تجمّع أُغلق — انطلقنا" : "التجمّعات والإعلانات والتقييم", done: !!p?.musters.some((m) => m.closedAt) },
  ];
  let currentGiven = false;
  return raw.filter((s) => !(teamMember && (s.headOnly || s.groupOnly))).map(({ done, headOnly: _headOnly, groupOnly: _groupOnly, ...s }) => {
    if (done) return { ...s, state: "done" as const };
    if (!currentGiven) {
      currentGiven = true;
      return { ...s, state: "current" as const };
    }
    return { ...s, state: "locked" as const };
  });
}

/** The logged-in administrator (null when signed out) */
export function useAdmin() {
  const id = useStore((s) => s.adminSessionId);
  const profile = useStore((s) => (s.adminSessionId ? s.admins[s.adminSessionId] : undefined));
  return useMemo(() => {
    if (!id) return null;
    const person = getPerson(id);
    if (!person) return null;
    return { id, person, name: fullName(person), profile };
  }, [id, profile]);
}

/** A passed attempt at his role's test as the platform ships it, confirmed by the hall's supervisor */
export function passedAttempt(id: string, exam: string, startedAt: number, submittedAt: number, by = "نسرين الحكيم"): Attempt {
  return satAttempt({ id, role: exam, startedAt, submittedAt, by });
}

/**
 * Demo shortcut. "start" opens a fresh file; "field" fast-forwards to an approved group with
 * signed contracts so the requests and field screens can be tried right away.
 * Returns an error message when the national id already belongs to a pilgrim account.
 */
export function demoAdminLogin(
  state: { accounts: Record<string, unknown>; admins: Record<string, AdminProfile> },
  id: string,
  mode: DemoAdminMode = "start",
): string | null {
  if (state.accounts[id]) return "هذا الرقم الوطني لديه حساب حاج. لكل شخص نوع حساب واحد في المنصة.";
  const demo = DEMO_ADMINS.find((d) => d.id === id);
  const existing = state.admins[id];
  const now = Date.now();
  // The demo administrators' password is the demo pilgrims' one, for anyone who types it in the form
  if (!existing) actions.upsertAdmin(id, { createdAt: now, phone: demo?.phone ?? `0944${id.slice(-6)}`, password: "hajj1448" });
  const min = 60_000;
  // ملف مكتمل حتى آخر مرحلة، فتظهر كل شاشات الصفة: حجاج المجموعة والملفات الصحية والميدان
  if (mode !== "start") {
    const position = demo?.position ?? "group-head";
    const tech = position === "tech";
    // One role per season. Same role as the last season served, with the rating: renewed without exams
    const last = lastServed(id);
    const keep = last?.roleKey === position && (last.rating ?? 0) >= SEASON.administrators.keepRole.minRating;
    actions.upsertAdmin(id, {
      positions: [position],
      renewal: keep ? "keep" : last ? "change" : "first",
      examExempt: keep,
      languages: ["العربية", "الإنجليزية"],
      skills: tech ? ["computer", "first-aid"] : ["first-aid", "computer"],
      documents: (renewedRecord(id)?.documents ?? []).map((d) => d.key),
      // The permanent file he arrived with, its expired documents renewed for this season
      record: renewedRecord(id),
      commitmentsAt: now - 90 * min,
      feePaidAt: now - 88 * min,
      receipt: adminReceipt(id, "A"),
      eligibleAt: now - 80 * min,
      exam: keep ? undefined : passedAttempt(id, examRoleOf(position), now - 70 * min, now - 55 * min),
      // A role that sits two tests («معاون ومنسق تقني») passed the other one too, two days before
      exams: keep ? undefined : Object.fromEntries(examRolesOf(position).filter((r) => r !== examRoleOf(position)).map((r) => [r, passedAttempt(id, r, now - 2 * 24 * 60 * min, now - 2 * 24 * 60 * min + 15 * min)])),
      // Only a group head has a group of his own; a guide, an assistant or a coordinator works in the groups
      // the head of تكتل النور assigned to him
      group: position !== "group-head" || (mode === "ready" && !READY_GROUPS[id])
        ? undefined
        : {
            number: mode === "ready" ? READY_GROUPS[id].number : demoGroupNumber(id),
            // Its head accepted تكتل النور's invitation (or is its head); a ready head's group is where the story put it
            clusterId: mode === "ready" ? READY_GROUPS[id].clusterId : TECH_POSTING.clusterId,
            // Its pilgrims and seats follow its head's category under the cluster's tier
            capacity: 0,
            requestedAt: now - 30 * min,
            feePaidAt: now - 29 * min,
            approvedAt: now - 20 * min,
            approvedBy: "مازن الحلبي",
          },
      // A ready administrator has no place yet: what waits for him is in «تشكيل التكتلات»
      ...(mode === "ready" ? {} : { ...postFor(id), ...clusterStateFor(id, position, now - 15 * min) }),
    });
    actions.adminLogin(id);
    logAdmin(
      id,
      `دخول تجريبي (${positionLabelOf(position)} — ${keep ? "تجديد الصفة نفسها دون اختبار" : "ملف مكتمل"}${mode === "ready" ? "، في أول عمله" : " ومجموعة معتمدة"})`,
      `الإداري ${id.slice(-3)}`,
    );
    // يفتح مكتب التسجيل على مثال كامل: طلبان سبق أن سجّلهما
    if (tech && !existing) seedCoordinatorWork({ id, name: adminName(id), position: "tech" }, now, SEASON.fees.registrationPerPerson);
    return null;
  }
  actions.adminLogin(id);
  logAdmin(id, "دخول تجريبي إلى حساب الإداري", `الإداري ${id.slice(-3)}`);
  return null;
}

/** The demo's cluster story: عبد الرحمن filed تكتل النور's request; بسام (a former group head) accepted to be its deputy head; أحمد accepted its invitation for his group */
export const CLUSTER_DEMO = { head: "01033300881", deputy: "01033300883", /** Granted «رئيس تكتل», his group outside any cluster: he files a request from its start */ next: "01033300882" };

/** The groups of the demo's ready group heads: نبيل's outside any cluster, صلاح الدين's in تكتل البيان; مروان has none yet */
const READY_GROUPS: Record<string, { number: number; clusterId?: string }> = {
  "01033300882": { number: 63 },
  "01033300891": { number: 64, clusterId: "al-bayan" },
};

/** The group each finished demo group head leads in the story: the cluster's head 31, his deputy 5, نبيل 63, the rest 27 */
export function demoGroupNumber(id: string) {
  return id === CLUSTER_DEMO.head ? 31 : id === CLUSTER_DEMO.deputy ? 5 : id === CLUSTER_DEMO.next ? 63 : TECH_POSTING.groupNumber;
}

const NOUR = () => SEED_CLUSTERS.find((c) => c.cluster.id === "al-nour")!;

/**
 * Where a finished demo administrator works in تكتل النور, as its request holds him: among its coordinators
 * (the groups sorted to him), in a group's seat, among its female guides or its assistants — and its accountant
 */
function postFor(id: string): Partial<AdminProfile> {
  const nour = NOUR();
  const c = nour.cluster;
  const base = { clusterId: c.id, clusterName: c.name, headId: nour.headId, headName: nour.headName };
  const out: Partial<AdminProfile> = {};
  if (c.accountant?.id === id) out.accountantOf = base;
  if (c.coordinators.some((x) => x.id === id)) return { ...out, coordinatorIn: { ...base, groups: Object.entries(c.sorting).filter(([, who]) => who === id).map(([n]) => Number(n)) } };
  const seat = Object.entries(c.seats).flatMap(([n, seats]) => seats.filter((x) => x.who?.id === id).map((x) => ({ n: Number(n), kind: x.kind })))[0];
  if (seat) return { ...out, servesIn: { ...base, role: seat.kind, groups: [seat.n] } };
  if (c.femaleGuides.some((x) => x.id === id)) return { ...out, servesIn: { ...base, role: "guide-f", groups: Object.entries(c.guideSorting ?? {}).filter(([, who]) => who === id).map(([n]) => Number(n)) } };
  if (c.assistants.some((x) => x.id === id)) return { ...out, servesIn: { ...base, role: "cluster-assistant", groups: [] } };
  return out;
}

/** What the formation left on each finished group head's file: the head owns the request, the deputy holds his cluster role */
function clusterStateFor(id: string, position: string, at: number): Partial<AdminProfile> {
  if (position !== "group-head") return {};
  const nour = NOUR();
  if (id === CLUSTER_DEMO.head) return { cluster: { ...nour.cluster, feePaidAt: at + 10 * 60_000 } };
  if (id !== CLUSTER_DEMO.deputy) return {};
  return { deputyOf: { clusterId: nour.cluster.id, clusterName: nour.cluster.name, headId: nour.headId, headName: nour.headName, headGroup: nour.headGroup ?? 0 } };
}

/**
 * The role an administrator actually holds this season. A group head who filed a cluster's request becomes
 * its head, and the former group head who accepted to be its deputy becomes the cluster's deputy head:
 * the cluster changes what they are, not only what they do, so their screens change with it.
 */
export function effectiveRole(p: AdminProfile | undefined, cadre = getState().cadre) {
  if (p?.cluster) return "cluster-head";
  if (p?.deputyOf) return "cluster-deputy";
  return (p && seasonalOf(p.nationalId, cadre)?.role) ?? p?.positions[0] ?? "";
}

/** Does this administrator work at the cluster level (head or deputy)? */
export function isClusterRole(p: AdminProfile | undefined) {
  return !!p?.cluster || !!p?.deputyOf;
}

/** A role's name as the administration left it, or a secondary role's («نائب رئيس التكتل») */
export function positionLabelOf(key: string) {
  return roleName(key);
}

export { nowMs } from "@/lib/utils";
