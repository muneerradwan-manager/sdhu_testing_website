"use client";

import { useMemo } from "react";
import { STAFF, withPermissions, type StaffUser } from "./staff";
import { canAny, seesSystem } from "./permissions";
import { setState, useStore } from "./store";

/**
 * The five management files — «إدارة الموظفين», «إدارة التسجيل على الحج», «إدارة الإداريين», «إدارة الامتحانات»,
 * «إدارة الطيران» — as the menu shows them: the summary (the dashboard), then each operation as an entry of its own,
 * in the order the work is done. Nobody is assigned a file: each entry shows to whoever may view what it holds
 * (`perms`, any of them; lib/permissions.ts), and inside each page every act needs its own permission. The code
 * calls such a file a "system".
 */
export type SystemKey = "staff" | "registration" | "admins" | "exams" | "flights";

/**
 * One operation of a file: its own entry in the menu, its own page; `area` is the desk's part that counts what waits in it.
 * `sub`: a page of another operation, not a main one — adding an item: it opens from its list's button and hangs from
 * that list in the menu's tree, not as an entry of its own
 */
export type SystemOperation = { href: string; label: string; area: string; desc: string; perms: string[]; sub?: true };

/** `manage`: where the file's work starts (its first operation) */
export type SystemDef = { label: string; desc: string; summary: { href: string; label: string }; manage: { href: string; label: string }; operations: SystemOperation[] };

/** In the season's order: the employees first, then the pilgrims' registration, the administrators, their exam, and the flights */
export const SYSTEMS: Record<SystemKey, SystemDef> = {
  staff: {
    label: "إدارة الموظفين",
    desc: "موظفو البعثة كلهم: سجلهم الدائم والمنتدبون، وحساباتهم في البوابة، ومشاركتهم في الموسم وأين أُسندوا وعلى أي رحلة.",
    summary: { href: "/staff/employees", label: "الإحصائيات والسجل" },
    manage: { href: "/staff/employees/manage", label: "إدارة الموظفين" },
    operations: [
      { href: "/staff/employees/manage", label: "سجل الموظفين", area: "register", desc: "سجل موظفي البعثة الدائم والمنتدبين: تحفظه وتستكمل بيانات كل موظف، وفي ملف كل موظف سجلّه.", perms: ["staff.employees.GET"] },
      { href: "/staff/employees/manage/edit", label: "إضافة موظف", area: "add", desc: "موظف جديد في السجل: بياناته، ونوعه، ومشاركته في الموسم.", perms: ["staff.employees.POST"], sub: true },
      { href: "/staff/employees/manage/accounts", label: "حسابات البوابة", area: "accounts", desc: "حسابات بوابة الموظفين وصلاحياتها، كل حساب مربوط بسجل صاحبه.", perms: ["staff.accounts.GET"] },
      { href: "/staff/employees/manage/season", label: "المشاركون في الموسم", area: "season", desc: "من يشارك في الموسم، وأين أُسند في الملفات التشغيلية، وعلى أي رحلة.", perms: ["staff.season-participation.GET"] },
      { href: "/staff/employees/manage/circulars", label: "القرارات والتعميمات", area: "circulars", desc: "ما تصدره الإدارة إلى موظفيها: قرار أو تعميم برقمه وتاريخه ونصه ومرفقاته، لكل الموظفين أو لموظفي ملفات بعينها أو لأشخاص بأسمائهم. يُكتب مسودةً ثم يُنشر، ويُرى من اطّلع عليه.", perms: ["staff.circulars.GET"] },
    ],
  },
  registration: {
    label: "إدارة التسجيل على الحج",
    desc: "صفحات التسجيل على الحج وأسئلتها، والخطوات بعد القبول، وشروط الأهلية، والدفعات — تُعدَّل ثم تُعايَن ثم تُنشر، ولا تغيّر طلباً بدأه حاج قبلها. ومتابعة الطلبات.",
    summary: { href: "/staff/hajj", label: "الإحصائيات والسجل" },
    manage: { href: "/staff/hajj/manage", label: "صفحات التسجيل" },
    // As a site's admin menu: the pages first and adding one, then the rest; the numbers live on the dashboard alone
    operations: [
      { href: "/staff/hajj/manage", label: "صفحات التسجيل", area: "stages", desc: "الصفحات التي يمر بها الحاج حين يقدّم طلبه، بترتيبها. افتح أي صفحة لتعديلها، أو أضف صفحة جديدة.", perms: ["registration.pages.GET"] },
      { href: "/staff/hajj/manage/edit", label: "إضافة صفحة", area: "add", desc: "صفحة جديدة في التسجيل: عنوانها ونصها وأسئلتها، ولمن تظهر.", perms: ["registration.pages.POST"], sub: true },
      { href: "/staff/hajj/manage/steps", label: "الخطوات بعد القبول", area: "steps", desc: "ما يفعله الحاج بعد قبوله، خطوة بعد خطوة حتى التأشيرة والرحلة.", perms: ["registration.post-steps.GET"] },
      { href: "/staff/hajj/manage/rules", label: "شروط الأهلية", area: "rules", desc: "شروط تضيفها الإدارة لهذا الموسم فوق شروط المنصة الثابتة.", perms: ["registration.eligibility-rules.GET"] },
      { href: "/staff/hajj/manage/payments", label: "الدفعات والمسارات", area: "payments", desc: "كم دفعة تُدفع تكلفة الحج، وكم كل دفعة ومتى، وطرق الدفع، ومسارا التسجيل ومواعيدهما.", perms: ["registration.payments-tracks.GET"] },
      { href: "/staff/hajj/manage/applications", label: "الطلبات", area: "applications", desc: "كل الطلبات: المقدَّمة، وما زال أصحابها يعبّئونها. للاطلاع فقط.", perms: ["registration.applications.GET"] },
      { href: "/staff/hajj/manage/history", label: "الإصدارات والمواسم", area: "seasons", desc: "كل ما نُشر من قبل، ومن نشره ومتى، مع إمكانية الرجوع إلى إصدار سابق. ومواسم التسجيل.", perms: ["registration.versions.GET", "registration.seasons.GET"] },
    ],
  },
  admins: {
    label: "إدارة الإداريين",
    desc: "الإداريون كلهم عبر المواسم: قواعد الصفات وشروطها ومراجعها، والكادر الدائم وأحداث ملف كل فرد، والمتقدمون وملفاتهم، وتشكيل المجموعات، وطلبات تشكيل التكتلات واعتمادها، ودليل التكتلات والمجموعات وأرشيفه، والمراسلات، والتقييم والتصنيف.",
    summary: { href: "/staff/admins", label: "الإحصائيات والسجل" },
    manage: { href: "/staff/admins/manage", label: "إدارة الإداريين" },
    operations: [
      { href: "/staff/admins/manage", label: "قواعد الإداريين", area: "rules", desc: "ما يطلبه الموسم من إدارييه قبل أن يتقدم أحد، قسماً قسماً.", perms: ["admins.role-permissions.GET", "admins.commitments.GET", "admins.calendar.GET", "admins.evaluation-stages.GET", "admins.doc-types.GET", "admins.skills.GET", "admins.languages.GET", "admins.role-requirements.GET"] },
      { href: "/staff/admins/manage/reference", label: "القوائم المرجعية", area: "reference", desc: "الصفات، والفئات وأعدادها، والفروع، والتسميات الموسمية.", perms: ["admins.roles.GET", "admins.categories-tiers.GET", "admins.branches.GET", "admins.role-labels.GET"] },
      { href: "/staff/admins/manage/references", label: "المراجع الإدارية", area: "references", desc: "ما يُنشر للكادر، والخطط التشغيلية التي يقدّمها رؤساء التكتلات.", perms: ["admins.job-descriptions.GET", "admins.system-sections.GET", "admins.decisions.GET", "admins.contract-templates.GET", "admins.operational-plans.GET"] },
      { href: "/staff/admins/manage/cadre", label: "الكادر الإداري", area: "cadre", desc: "كل فرد في الكادر مرة واحدة عبر المواسم. افتح أي فرد لتعديل بياناته وصفته وفئته وفروعه، أو لإيقاف حسابه.", perms: ["admins.cadre.GET"] },
      { href: "/staff/admins/manage/applicants", label: "المتقدمون", area: "applicants", desc: "من تقدّم هذا الموسم وملفه الدائم: وثائقه وصلاحيتها، وما تطلبه صفته وينقصه. افتح الملف لتراه كاملاً.", perms: ["admins.applicants.GET"] },
      { href: "/staff/admins/manage/groups", label: "تشكيل المجموعات", area: "groups", desc: "يأتي رئيس المجموعة المؤهل إلى المكتب باسم مجموعته ويسدد رسمها، فتشكّلها بفئته وتقرّر في طلباتها. افتح أي مجموعة لترى شروطها وسجلّها.", perms: ["admins.groups.GET"] },
      { href: "/staff/admins/manage/clusters", label: "التكتلات", area: "clusters", desc: "يُشكَّل التكتل في المكتب بحضور رئيسه وكل من فيه: «تشكيل تكتل في المكتب»، ثم أدخل مجموعاته وكادره وتوزيعه، وخذ رسمه، وارفع عقده الموقّع، وأنشئه.", perms: ["admins.clusters.GET", "admins.programmes.GET", "admins.group-pages.GET"] },
      { href: "/staff/admins/manage/directory", label: "التكتلات والمجموعات", area: "directory", desc: "كل تكتل معتمد بموسمه وأرقامه، وكل مجموعة بفئة رئيسها وحجاجها: افتح التكتل لترى أعضاءه بمواقعهم. وملاحظات الإدارة عليها.", perms: ["admins.directory.GET"] },
      { href: "/staff/admins/manage/letters", label: "المراسلات", area: "letters", desc: "رسائل الإداريين إلى الإدارة من «المراسلات» في حساباتهم. افتح المراسلة تُعَدّ مقروءة، وردّ في سياقها، وأغلقها حين تنتهي.", perms: ["admins.letters.GET"] },
      { href: "/staff/admins/manage/evaluation", label: "نتائج التقييم", area: "evaluation", desc: "نتائج تقييم رؤساء المجموعات والتكتلات والموجّهين: تقييمه لنفسه وتقييم الموظفين وقرار لجنة التقييم والدرجة المعتمدة. للاطلاع فقط.", perms: ["admins.evaluation.GET"] },
      { href: "/staff/admins/manage/grading", label: "التصنيف", area: "grading", desc: "تصنيف المجموعات والتكتلات في نهاية الموسم ونشره.", perms: ["admins.grading.GET"] },
    ],
  },
  exams: {
    label: "إدارة الامتحانات",
    desc: "تأهيل الإداريين: الاختبار المؤتمت كما تديره منصة الاختبارات المعتمدة (القاعات والمحافظات ومشرفوها، والاختبارات وأقسامها، وبنك الأسئلة، والمتقدمون، وجلسات الاختبار ومتابعتها، والمراجعة والنتائج والإحصائيات)، ثم الامتحان الشفهي أمام لجنة كل صفة.",
    summary: { href: "/staff/exam", label: "الإحصائيات والسجل" },
    manage: { href: "/staff/exam/manage", label: "إدارة الامتحانات" },
    operations: [
      { href: "/staff/exam/manage", label: "القاعات والمحافظات", area: "centers", desc: "القاعات التي يُجلس فيها للاختبار. افتح أي قاعة لتعديلها، أو أضف قاعة جديدة.", perms: ["exams.centers.GET"] },
      { href: "/staff/exam/manage/edit", label: "إضافة قاعة", area: "add-center", desc: "قاعة جديدة: مكانها ومحافظاتها ومشرفها وشاشتها.", perms: ["exams.centers.POST"], sub: true },
      { href: "/staff/exam/manage/exams", label: "الاختبارات", area: "exams", desc: "اختبار كل صفة واختبارات الاستدراك. افتح أي اختبار لتعديل أقسامه وموعده، أو انشره.", perms: ["exams.exams.GET"] },
      { href: "/staff/exam/manage/bank", label: "بنك الأسئلة", area: "bank", desc: "الأسئلة التي تُسحب منها الأوراق. افتح أي سؤال لتعديله، أو أضف سؤالاً.", perms: ["exams.questions.GET"] },
      { href: "/staff/exam/manage/people", label: "المتقدمون", area: "people", desc: "من يختبر وفي أي قاعة. حدّد متقدمين لنقلهم إلى قاعة أخرى.", perms: ["exams.applicants.GET"] },
      { href: "/staff/exam/manage/sittings", label: "جلسات الاختبار", area: "sittings", desc: "كل اختبار في كل قاعة بموعده: متقدموها ومشرفها وحالتها.", perms: ["exams.sittings.GET"] },
      { href: "/staff/exam/manage/live", label: "الجلسات الفعالة", area: "live", desc: "الجلسات المفتوحة الآن، للمتابعة فقط. يديرها المشرف من لوحته.", perms: ["exams.live.GET"] },
      { href: "/staff/exam/manage/review", label: "المراجعة والتقارير", area: "review", desc: "المحاولات التي تحتاج قراراً، والحضور والغياب، والحالات المشتبه بها.", perms: ["exams.attempts.GET"] },
      { href: "/staff/exam/manage/results", label: "النتائج", area: "results", desc: "نتيجة كل متقدم قسماً قسماً، ومراجعة إجاباته وتصديرها.", perms: ["exams.results.GET"] },
      { href: "/staff/exam/manage/oral", label: "الامتحان الشفهي", area: "oral", desc: "بعد الاختبار المؤتمت: موعد كل ناجح أمام لجنة صفته في مركزه، ونتيجته. لا يتأهل إلا من نجح فيهما.", perms: ["exams.oral.GET"] },
      { href: "/staff/exam/manage/stats", label: "الإحصائيات", area: "stats", desc: "أرقام كل اختبار حسب القسم والجلسة والمحافظة والسؤال.", perms: ["exams.stats.GET"] },
    ],
  },
  flights: {
    label: "إدارة الطيران",
    desc: "رحلات الموسم ذهاباً وعودة للحجاج والموظفين: إنشاؤها ونشرها، وإعطاء كل تكتل أيام رحلاته ومقاعده عليها، ووضع الموظفين عليها، وإقفالها وكشوف ركابها، ومندوبو المطارات الذين يسجلون الإقلاع والهبوط.",
    summary: { href: "/staff/flights", label: "الإحصائيات والسجل" },
    manage: { href: "/staff/flights/manage", label: "إدارة الطيران" },
    operations: [
      { href: "/staff/flights/manage", label: "المطارات ومندوبوها", area: "refs", desc: "المطارات التي تقلع منها الرحلات وتهبط فيها، ومندوب كل مطار يسجّل الإقلاع والهبوط.", perms: ["flights.airports.GET"] },
      { href: "/staff/flights/manage/carriers", label: "الناقلون الجويون", area: "carriers", desc: "شركات الطيران التي تُختار منها الرحلات، وهاتف التنسيق مع كل منها.", perms: ["flights.carriers.GET"] },
      { href: "/staff/flights/manage/flights", label: "الرحلات", area: "flights", desc: "رحلات الذهاب والعودة: تنشئها وتنشرها وتقفلها، ولكل رحلة صفحتها وركابها وكشفها.", perms: ["flights.flights.GET"] },
      { href: "/staff/flights/manage/allotments", label: "أيام التكتلات", area: "allotments", desc: "تعطي كل تكتل أيام رحلاته ذهاباً وعودة ومقاعده على كل رحلة، فيضع منسقوه مجموعاتهم وحجاجها عليها.", perms: ["flights.allotments.GET"] },
      { href: "/staff/flights/manage/dispatch", label: "التفويج", area: "dispatch", desc: "من يسافر على أي رحلة: المجموعات والموظفون، ومن فقد مقعده.", perms: ["flights.dispatch.GET"] },
    ],
  },
};

export const SYSTEM_KEYS = Object.keys(SYSTEMS) as SystemKey[];

/** Whoever may view a file's summary: the summary names them as those who run it */
/** `by`, `at`: who granted him the summary, and when */
export type Holder = { staffId: string; staff: StaffUser; by?: string; at?: number };

/** Every account with its permissions as they stand now */
export function useStaffAccounts(): StaffUser[] {
  const stored = useStore((s) => s.staffPermissions);
  return useMemo(() => STAFF.map((u) => withPermissions(u, stored)), [stored]);
}

/** Each file's people: the accounts that may view its summary */
export function useHolders(): Record<SystemKey, Holder[]> {
  const accounts = useStaffAccounts();
  return useMemo(
    () => Object.fromEntries(SYSTEM_KEYS.map((k) => [k, accounts.flatMap((staff) => staff.grants.filter((g) => g.key === `${k}.summary.GET`).map((g) => ({ staffId: staff.id, staff, by: g.by, at: g.at })))])) as Record<SystemKey, Holder[]>,
    [accounts],
  );
}

/**
 * Pages about one matter are one entry in the menu with a tab for each, not an entry each: the first path is the entry's own
 * page, the rest its other tabs (the tab bar above every page of the family: app/staff/_components/frame.tsx FamilyTabs).
 * Each keeps its own address, its own permissions and its own records; an entry shows to whoever may view any of its tabs.
 */
export const SYSTEM_FAMILIES: Record<SystemKey, { label: string; hrefs: string[] }[]> = {
  staff: [{ label: "الموظفون", hrefs: ["/staff/employees/manage", "/staff/employees/manage/accounts", "/staff/employees/manage/season"] }],
  registration: [
    { label: "إعداد التسجيل", hrefs: ["/staff/hajj/manage", "/staff/hajj/manage/steps", "/staff/hajj/manage/rules", "/staff/hajj/manage/payments"] },
    { label: "الطلبات والإصدارات", hrefs: ["/staff/hajj/manage/applications", "/staff/hajj/manage/history"] },
  ],
  admins: [
    { label: "القواعد والمراجع", hrefs: ["/staff/admins/manage", "/staff/admins/manage/reference", "/staff/admins/manage/references"] },
    { label: "الكادر والمتقدمون", hrefs: ["/staff/admins/manage/cadre", "/staff/admins/manage/applicants"] },
    { label: "المجموعات والتكتلات", hrefs: ["/staff/admins/manage/groups", "/staff/admins/manage/clusters", "/staff/admins/manage/directory"] },
    { label: "التقييم والتصنيف", hrefs: ["/staff/admins/manage/evaluation", "/staff/admins/manage/grading"] },
  ],
  exams: [
    { label: "القاعات والمتقدمون", hrefs: ["/staff/exam/manage", "/staff/exam/manage/people"] },
    { label: "الاختبارات والأسئلة", hrefs: ["/staff/exam/manage/exams", "/staff/exam/manage/bank"] },
    { label: "الجلسات", hrefs: ["/staff/exam/manage/sittings", "/staff/exam/manage/live"] },
    { label: "المراجعة والنتائج", hrefs: ["/staff/exam/manage/review", "/staff/exam/manage/results", "/staff/exam/manage/oral", "/staff/exam/manage/stats"] },
  ],
  flights: [
    { label: "المطارات والناقلون", hrefs: ["/staff/flights/manage", "/staff/flights/manage/carriers"] },
    { label: "الرحلات والتفويج", hrefs: ["/staff/flights/manage/flights", "/staff/flights/manage/allotments", "/staff/flights/manage/dispatch"] },
  ],
};

/** The operation a page belongs to: the longest operation path it starts with */
export function operationAt(key: SystemKey, pathname: string) {
  const path = pathname.replace(/\/+$/, "");
  return [...SYSTEMS[key].operations].sort((a, b) => b.href.length - a.href.length).find((o) => path === o.href || path.startsWith(`${o.href}/`)) ?? SYSTEMS[key].operations[0];
}

/** The files this employee may view something in */
export function useOwnedSystems(user: StaffUser | null): SystemKey[] {
  return useMemo(() => (user ? SYSTEM_KEYS.filter((k) => seesSystem(user, k)) : []), [user]);
}

export function useOwns(user: StaffUser | null, key: SystemKey) {
  return useOwnedSystems(user).includes(key);
}

/** May he open this operation's page */
export const canOperation = (user: StaffUser | null, op: SystemOperation) => canAny(user, op.perms);

/** When the director last looked at a file's important events */
export function useSeen(key: SystemKey) {
  return useStore((s) => s.systems?.seen?.[key] ?? 0);
}

export const systemActions = {
  seen(key: SystemKey) {
    setState((s) => ({ ...s, systems: { ...s.systems, seen: { ...s.systems?.seen, [key]: Date.now() } } }));
  },
};
