"use client";

import { useMemo } from "react";
import { EXAM_QUESTIONS, EXAM_RULES, finalScoreOf, scoreExam } from "@/lib/data/admin-exam";
import { fullName, getPerson } from "@/lib/registry";
import { SEASON } from "@/lib/season";
import { seedCoordinatorWork } from "./coordinator";
import { actions, useStore, type AdminProfile } from "@/lib/store";

export const ADMIN_ROLE = "إداري";

/**
 * "done" = finished the whole journey (passed, group approved, contracts signed) so every screen of the
 * role shows; "start" = a fresh file that has not begun. "field" and "tech" are older names for "done".
 */
export type DemoAdminMode = "start" | "done" | "field" | "tech";

export type DemoAdmin = { id: string; phone: string; position: string; title: string; note: string; mode: "start" | "done" };

/** Twelve demo administrators: two for each role — one finished, one not started */
export const DEMO_ADMINS: DemoAdmin[] = [
  { id: "01033300881", phone: "0944281449", position: "cluster-head", mode: "done", title: "عبد الرحمن العلي — رئيس تكتل", note: "58 عاماً — رئيس تكتل النور في 1446 و1447 (تقييم 4.8). جدّد الصفة نفسها فأُعفي من الامتحانين، ودفع رسم الموسم. أنهى رحلته." },
  { id: "01033300882", phone: "0944282449", position: "cluster-head", mode: "start", title: "نبيل الساعاتي — رئيس تكتل", note: "54 عاماً — رئيس مجموعة في 1446 و1447 بتقييم 4.5. يريد الانتقال إلى رئاسة تكتل: يستوفي شرط الموسمين، ويخضع للامتحانين. لم يبدأ." },
  { id: "01033300883", phone: "0944283449", position: "cluster-deputy", mode: "done", title: "بسام درويش — معاون رئيس تكتل", note: "51 عاماً — معاون تكتل النور في 1447 (4.4). جدّد الصفة نفسها معفى من الامتحانين. أنهى رحلته." },
  { id: "01033300884", phone: "0944284449", position: "cluster-deputy", mode: "start", title: "وليد القصاب — معاون رئيس تكتل", note: "45 عاماً — رئيس مجموعة في 1447 بتقييم 3.2 دون الحد: لا يُجدَّد في صفته ولا يرقّى إلى معاون تكتل، وتبقى له الصفات الأخرى بالامتحانين. لم يبدأ." },
  { id: "01033300871", phone: "0944271449", position: "group-head", mode: "done", title: "أحمد سليمان الحمصي — رئيس مجموعة", note: "36 عاماً — معاون مجموعة في 1446 (4.6) ولم يشارك في 1447. انتقل إلى رئاسة مجموعة بالامتحانين. أنهى رحلته: يستلم العائلات ويفتح التجمّعات." },
  { id: "01033300885", phone: "0944285449", position: "group-head", mode: "start", title: "مروان الحلبي — رئيس مجموعة", note: "42 عاماً — أول موسم له: يريد رئاسة مجموعة يشكّلها بنفسه، ويخضع للامتحانين. لم يبدأ." },
  { id: "01033300872", phone: "0944272449", position: "group-deputy", mode: "done", title: "ياسر عبد الله — معاون رئيس مجموعة", note: "40 عاماً — معاون المجموعة 27 في 1447 (4.1). جدّد الصفة نفسها معفى من الامتحانين. أنهى رحلته." },
  { id: "01033300886", phone: "0944286449", position: "group-deputy", mode: "start", title: "فادي الخياط — معاون رئيس مجموعة", note: "34 عاماً — أول موسم له. لم يبدأ." },
  { id: "01033300874", phone: "0944274449", position: "tech", mode: "done", title: "سامر نبيل نجار — منسق تقني", note: "31 عاماً — منسق المجموعة 27 في 1447 (4.8)، جدّد الصفة نفسها. يسجّل طلبات الحج في مكتب دمشق، وفي مرحلة التفويج يسجّل في مجموعته من يختارها، ويأخذ ملفاتهم الصحية. يفتح وفي مكتبه طلبان مسجّلان." },
  { id: "01033300887", phone: "0944287449", position: "tech", mode: "start", title: "رامي الأتاسي — منسق تقني", note: "29 عاماً — من حمص، أول موسم له. لم يبدأ." },
  { id: "01033300873", phone: "0944273449", position: "guide-m", mode: "done", title: "الشيخ خالد الرفاعي — موجّه ديني", note: "47 عاماً — موجّه المجموعة 27 في 1446 و1447 (4.9). جدّد الصفة نفسها معفى من الامتحانين. أنهى رحلته." },
  { id: "01033300888", phone: "0944288449", position: "guide-m", mode: "start", title: "عبد الغني الطباع — موجّه ديني", note: "43 عاماً — أول موسم له. لم يبدأ." },
];
/** التكتل والمجموعة اللذان عُيّن فيهما المنسق التقني في هذا العرض */
export const TECH_POSTING = { clusterId: "al-nour", groupNumber: 27 };

/** الصفة التي يعمل بها الإداري: المنسق التقني أولاً إن كانت من صفاته */
export function positionOf(p: AdminProfile | undefined) {
  return p?.positions.includes("tech") ? "tech" : (p?.positions[0] ?? "tech");
}

/** هل يملك هذا الإداري صفة المنسق التقني؟ */
export function isTechCoordinator(p: AdminProfile | undefined) {
  return !!p?.positions.includes("tech");
}

export const POSITIONS = [
  { key: "cluster-head", label: "رئيس تكتل", desc: "يشرف على كل مجموعات التكتل، ويمثّله أمام الإدارة." },
  { key: "cluster-deputy", label: "معاون رئيس تكتل", desc: "ينوب عن رئيس التكتل ويتابع النقل والإسكان على مستواه." },
  { key: "group-head", label: "رئيس مجموعة", desc: "يقود مجموعة حتى 50 حاجاً: استلام الحجاج المسجّلين فيها، التجمّعات، الإعلانات، التقرير اليومي." },
  { key: "group-deputy", label: "معاون رئيس مجموعة", desc: "الحضور والتجمّع وتوزيع الوجبات الخاصة." },
  { key: "guide-m", label: "موجّه ديني", desc: "الدروس والمناسك والإجابة عن الأسئلة الشرعية." },
  { key: "guide-f", label: "موجّهة دينية", desc: "الإرشاد الديني للحاجّات ومتابعة شؤونهن." },
  { key: "tech", label: "منسق تقني", desc: "يسجّل طلبات الحج في مكتبه، ويسجّل في مجموعته من يختارها في مرحلة التفويج، ويأخذ ملفاتهم الصحية." },
] as const;

export const DOCUMENTS = [
  { key: "degree", label: "صورة عن الشهادة الجامعية", hint: "PDF أو صورة واضحة", file: "university-degree.pdf" },
  { key: "first-aid", label: "شهادة دورة إسعافات أولية (2026)", hint: "صادرة خلال آخر سنتين", file: "first-aid-2026.pdf" },
  { key: "record", label: "وثيقة «لا حكم عليه»", hint: "غير مضى عليها أكثر من 3 أشهر", file: "no-criminal-record.pdf" },
  { key: "recommendation", label: "تزكية من رئيس تكتل سابق", hint: "من موسم سابق عملت فيه", file: "recommendation-1446.pdf" },
] as const;

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

/** Administrator calendar for season 1448 (dates from the operating document, shifted to 1448) */
export const ADMIN_CALENDAR = [
  { hijri: "5 ربيع الأول", title: "فتح إنشاء حسابات الإداريين", detail: "الرقم الوطني ورمز التحقق والشؤون المدنية" },
  { hijri: "10 ربيع الأول – 1 ربيع الآخر", title: "التسجيل الموسمي ورسم التسجيل", detail: "يتجدد كل موسم: صفة واحدة (الصفة السابقة أو صفة جديدة بشروط الإدارة)، الوثائق، الالتزامات، 30 $" },
  { hijri: "حتى 10 ربيع الآخر", title: "التحقق من الأهلية", detail: "العمر والشهادة والسجل والتقييم السابق" },
  { hijri: "15 ربيع الآخر — 09:00", title: "الامتحان الكتابي المؤتمت", detail: "لمن يتقدم لصفة جديدة أو لأول مرة — من يجدد صفته بتقييم مستوفٍ معفى" },
  { hijri: "1 جمادى الأولى", title: "الامتحان الشفهي", detail: "أمام لجنة من ثلاثة أعضاء — تُدخل النتيجة على المنصة" },
  { hijri: "10 جمادى الأولى", title: "النتيجة النهائية وإعلان الناجحين", detail: "الكتابي 60% + الشفهي 40% — النجاح من 70" },
  { hijri: "11 – 25 جمادى الأولى", title: "طلبات تشكيل التكتلات والمجموعات", detail: "رسم تشكيل المجموعة 200 $ — اعتماد مدير المكتب" },
  { hijri: "1 جمادى الآخرة", title: "إعلان المجموعات المعتمدة والعقود", detail: "توقيع إلكتروني ومصادقة الإدارة" },
  { hijri: "2 – 25 شعبان", title: "مرحلة التفويج: تسجيل الحجاج في المجموعات", detail: "يختار الحاج المجموعة من الدليل ويتواصل معها، فيسجّله منسقها ويوقّعان العقد" },
  { hijri: "24 ذو القعدة", title: "السفر مع الحجاج", detail: "الميدان: التجمّعات والإعلانات والتقارير" },
] as const;

export type SeasonRecord = { season: string; roleKey: string | null; role: string; group: string; rating: number | null };

/** Seasons served, from the platform's own records (roleKey null = did not take part that season) */
const HISTORY: Record<string, { season: string; roleKey: string | null; group?: string; rating?: number }[]> = {
  "01033300881": [{ season: "1446", roleKey: "cluster-head", group: "تكتل النور", rating: 4.7 }, { season: "1447", roleKey: "cluster-head", group: "تكتل النور", rating: 4.8 }],
  "01033300882": [{ season: "1446", roleKey: "group-head", group: "المجموعة 9", rating: 4.3 }, { season: "1447", roleKey: "group-head", group: "المجموعة 9", rating: 4.5 }],
  "01033300883": [{ season: "1446", roleKey: "group-head", group: "المجموعة 5", rating: 4.2 }, { season: "1447", roleKey: "cluster-deputy", group: "تكتل النور", rating: 4.4 }],
  "01033300884": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "group-head", group: "المجموعة 44", rating: 3.2 }],
  "01033300871": [{ season: "1446", roleKey: "group-deputy", group: "المجموعة 12", rating: 4.6 }, { season: "1447", roleKey: null }],
  "01033300872": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "group-deputy", group: "المجموعة 27", rating: 4.1 }],
  "01033300874": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "tech", group: "المجموعة 27", rating: 4.8 }],
  "01033300873": [{ season: "1446", roleKey: "guide-m", group: "المجموعة 27", rating: 4.9 }, { season: "1447", roleKey: "guide-m", group: "المجموعة 27", rating: 4.9 }],
};

export function seasonHistory(id: string): SeasonRecord[] {
  const rows = HISTORY[id] ?? [{ season: "1446", roleKey: null }, { season: "1447", roleKey: null }];
  return rows.map((r) => ({ season: r.season, roleKey: r.roleKey, role: r.roleKey ? positionLabelOf(r.roleKey) : "لم يشارك", group: r.group ?? "", rating: r.rating ?? null }));
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
export function roleOptions(id: string, rules: { keepRoleMinRating: number; clusterHeadSeasons: number }): { last: SeasonRecord | null; keep: RoleOption | null; others: RoleOption[] } {
  const history = seasonHistory(id);
  const last = lastServed(id);
  const A = SEASON.administrators;
  const served = history.filter((h) => h.roleKey);
  const gap = last ? history.filter((h) => !h.roleKey && h.season > last.season).length : 0;

  const keep: RoleOption | null = last
    ? (() => {
        const rating = last.rating ?? 0;
        if (rating < rules.keepRoleMinRating) return { key: last.roleKey!, label: last.role, ok: false, reason: `تقييم موسم ${last.season} (${rating}) دون الحد ${rules.keepRoleMinRating} — لا يُجدَّد في الصفة نفسها`, examExempt: false };
        if (gap > A.keepRole.maxGapSeasons) return { key: last.roleKey!, label: last.role, ok: true, reason: `انقطاع ${gap} مواسم — تخضع للامتحانين من جديد`, examExempt: false };
        return { key: last.roleKey!, label: last.role, ok: true, reason: `تقييم ${rating} من 5 في موسم ${last.season}${A.keepRole.examExempt ? " — معفى من الامتحانين" : ""}`, examExempt: A.keepRole.examExempt };
      })()
    : null;

  const others = POSITIONS.filter((p) => p.key !== last?.roleKey).map((p): RoleOption => {
    const req = A.requirements[p.key];
    if (!req) return { key: p.key, label: p.label, ok: true, reason: last ? "صفة جديدة — تخضع للامتحانين" : "أول موسم — تخضع للامتحانين", examExempt: false };
    const seasons = p.key === "cluster-head" ? rules.clusterHeadSeasons : req.seasons;
    const qualifying = served.filter((h) => req.roles.includes(h.roleKey!) && (h.rating ?? 0) >= req.minRating);
    const roleNames = req.roles.map(positionLabelOf).join(" أو ");
    const ok = qualifying.length >= seasons;
    return {
      key: p.key,
      label: p.label,
      ok,
      reason: ok ? `${qualifying.length} مواسم ${roleNames} بتقييم ${req.minRating} فأكثر — تخضع للامتحانين` : `تشترط ${seasons} ${seasons === 1 ? "موسماً" : "مواسم"} ${roleNames} بتقييم ${req.minRating} فأكثر (لديك ${qualifying.length})`,
      examExempt: false,
    };
  });
  return { last, keep, others };
}

export function adminReceipt(id: string, kind: "A" | "G", groupNumber?: number) {
  return kind === "A" ? `1448-A-${id.slice(-3).padStart(6, "0")}` : `1448-G-${String(groupNumber ?? 0).padStart(6, "0")}`;
}

export function adminName(id: string) {
  const p = getPerson(id);
  return p ? fullName(p) : id;
}

export function logAdmin(id: string, action: string, target?: string, detail?: string) {
  actions.logEvent({ actor: adminName(id), role: ADMIN_ROLE, action, target, detail });
}

/** Written + oral → final. Works whether the staff side stored finalScore or only the oral mark. */
export function resultOf(p: AdminProfile | undefined) {
  const written = p?.exam?.score;
  const oral = p?.oral?.score;
  const final = p?.finalScore ?? (written !== undefined && oral !== undefined ? finalScoreOf(written, oral) : undefined);
  const published = p?.resultPublishedAt ?? (final !== undefined ? p?.oral?.at : undefined);
  // Same role renewed with the required rating: no exams this season, the file counts as qualified
  const exempt = !!p?.examExempt && !!p?.eligibleAt;
  return {
    written,
    oral,
    final,
    published: exempt ? p?.eligibleAt : published,
    exempt,
    writtenPassed: exempt || (written !== undefined && written >= EXAM_RULES.writtenMin),
    passed: exempt || (final !== undefined && final >= EXAM_RULES.passMark),
  };
}

export type StepState = "done" | "current" | "locked";
export type JourneyStep = { key: string; title: string; date: string; href: string; detail: string; state: StepState };

export function journeyOf(p: AdminProfile | undefined, joinCount = 0): JourneyStep[] {
  const r = resultOf(p);
  const g = p?.group;
  const raw: (Omit<JourneyStep, "state"> & { done: boolean })[] = [
    { key: "account", title: "إنشاء الحساب الإداري", date: "5 ربيع الأول", href: "/administrator/dashboard", detail: "ملف إداري دائم مؤكد من الشؤون المدنية", done: !!p },
    { key: "apply", title: "التسجيل الموسمي والرسم", date: "10 ربيع الأول – 1 ربيع الآخر", href: "/administrator/apply", detail: p?.receipt ? `الإيصال ${p.receipt} — ${p.renewal === "keep" ? "تجديد الصفة نفسها" : p.renewal === "change" ? "صفة جديدة" : "أول موسم"}` : "يتجدد كل موسم: صفة واحدة، الوثائق، الالتزامات، 30 $", done: !!p?.feePaidAt },
    { key: "eligibility", title: "التحقق من الأهلية", date: "حتى 10 ربيع الآخر", href: "/administrator/apply", detail: p?.eligibleAt ? "مؤهل للامتحان الكتابي" : "ستة شروط من إعدادات الموسم", done: !!p?.eligibleAt },
    { key: "written", title: "الامتحان الكتابي", date: "15 ربيع الآخر", href: "/administrator/exam", detail: r.exempt ? "معفى — الصفة نفسها بتقييم مستوفٍ" : r.written !== undefined ? `النتيجة ${r.written} من 100` : "15 سؤالاً — 20 دقيقة", done: r.exempt || !!p?.exam?.submittedAt },
    { key: "oral", title: "الامتحان الشفهي", date: "1 جمادى الأولى", href: "/administrator/exam", detail: r.exempt ? "معفى" : r.oral !== undefined ? `${r.oral} — اللجنة رقم 3` : "أمام اللجنة — تُدخل النتيجة على المنصة", done: r.exempt || r.oral !== undefined },
    { key: "result", title: "النتيجة النهائية", date: "10 جمادى الأولى", href: "/administrator/exam", detail: r.exempt ? "مؤهل بالتجديد — دون امتحان" : r.final !== undefined ? `${r.final} من 100 — ${r.passed ? "ناجح" : "لم يجتز"}` : "الكتابي 60% + الشفهي 40%", done: !!r.published && r.passed },
    { key: "group", title: "طلب تشكيل المجموعة", date: "11 – 25 جمادى الأولى", href: "/administrator/group", detail: g ? `المجموعة ${g.number} — ${g.feePaidAt ? "الرسم مسدد" : "بانتظار الرسم"}` : "الفريق والتكتل ورسم 200 $", done: !!g?.feePaidAt },
    { key: "approval", title: "اعتماد مدير المكتب", date: "حتى 1 جمادى الآخرة", href: "/administrator/group", detail: g?.approvedAt ? `اعتمدها ${g.approvedBy ?? "مازن الحلبي"}` : "مراجعة ماهر ثم اعتماد مازن", done: !!g?.approvedAt },
    { key: "contracts", title: "توقيع العقود", date: "جمادى الآخرة", href: "/administrator/group", detail: g?.contractSignedAt ? "موقّعة ومصادق عليها" : "المجموعة ↔ التكتل، والفريق", done: !!g?.contractSignedAt },
    { key: "requests", title: "استلام حجاج المجموعة", date: "من 2 شعبان", href: "/administrator/requests", detail: joinCount ? `${joinCount} عائلات تم الترحيب بها` : "يسجّلهم منسق المجموعة + ملفات صحية", done: joinCount > 0 },
    { key: "field", title: "الميدان", date: "24 ذو القعدة", href: "/administrator/field", detail: p?.musters.some((m) => m.closedAt) ? "أول تجمّع أُغلق — انطلقنا" : "التجمّعات والإعلانات والتقييم", done: !!p?.musters.some((m) => m.closedAt) },
  ];
  let currentGiven = false;
  return raw.map(({ done, ...s }) => {
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

/** ورقة امتحان كتابي ناجحة: 13 من 15 — السؤالان السيناريوهان خاطئان */
function passedExam() {
  const answers = Object.fromEntries(
    EXAM_QUESTIONS.map((q) => [q.id, q.id === 3 || q.id === 11 ? (q.answer + 1) % q.options.length : q.answer]),
  );
  return { answers, written: scoreExam(answers).score };
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
  if (!existing) actions.upsertAdmin(id, { createdAt: now, phone: demo?.phone ?? `0944${id.slice(-6)}` });
  const min = 60_000;
  // ملف مكتمل حتى آخر مرحلة، فتظهر كل شاشات الصفة: حجاج المجموعة والملفات الصحية والميدان
  if (mode !== "start") {
    const { answers, written } = passedExam();
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
      documents: DOCUMENTS.map((d) => d.key),
      commitmentsAt: now - 90 * min,
      feePaidAt: now - 88 * min,
      receipt: adminReceipt(id, "A"),
      eligibleAt: now - 80 * min,
      exam: keep ? undefined : { startedAt: now - 70 * min, submittedAt: now - 55 * min, answers, score: written },
      oral: keep
        ? undefined
        : tech
          ? { score: 88, by: "ماهر عيسى", at: now - 40 * min, note: "متمكّن من التطبيق وشرحه لكبار السن" }
          : { score: 84, by: "ماهر عيسى", at: now - 40 * min, note: "قوي في السيناريوهات الميدانية، يحتاج إلى تحسين الإلقاء" },
      finalScore: keep ? undefined : finalScoreOf(written, tech ? 88 : 84),
      resultPublishedAt: keep ? undefined : now - 35 * min,
      group: {
        number: TECH_POSTING.groupNumber,
        clusterId: TECH_POSTING.clusterId,
        capacity: 50,
        requestedAt: now - 30 * min,
        feePaidAt: now - 29 * min,
        approvedAt: now - 20 * min,
        approvedBy: "مازن الحلبي",
        contractSignedAt: now - 10 * min,
      },
    });
    actions.adminLogin(id);
    logAdmin(
      id,
      `دخول تجريبي (${positionLabelOf(position)} — ${keep ? "تجديد الصفة نفسها دون امتحان" : "ملف مكتمل"} ومجموعة معتمدة)`,
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

export function positionLabelOf(key: string) {
  return POSITIONS.find((p) => p.key === key)?.label ?? key;
}

/** Event-handler timestamp helper (keeps the React Compiler purity check happy in large handlers) */
export const nowMs = () => Date.now();
