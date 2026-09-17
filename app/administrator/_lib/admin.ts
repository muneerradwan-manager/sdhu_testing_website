"use client";

import { useMemo } from "react";
import { EXAM_QUESTIONS, EXAM_RULES, finalScoreOf, scoreExam } from "@/lib/data/admin-exam";
import { fullName, getPerson } from "@/lib/registry";
import { actions, useStore, type AdminProfile } from "@/lib/store";

export const ADMIN_ROLE = "إداري";

export const DEMO_ADMINS = [
  { id: "01033300871", phone: "0944271449", title: "أحمد سليمان الحمصي", note: "36 عاماً — مدرّس من دمشق — معاون رئيس مجموعة في 1446، يريد رئاسة مجموعة يشكّلها بنفسه" },
  { id: "01033300872", phone: "0944272449", title: "ياسر عبد الله العبد الله", note: "40 عاماً — يتقدم لصفة معاون رئيس مجموعة" },
] as const;

export const POSITIONS = [
  { key: "cluster-head", label: "رئيس تكتل", desc: "يشرف على كل مجموعات التكتل، ويمثّله أمام الإدارة." },
  { key: "cluster-deputy", label: "معاون رئيس تكتل", desc: "ينوب عن رئيس التكتل ويتابع النقل والإسكان على مستواه." },
  { key: "group-head", label: "رئيس مجموعة", desc: "يقود مجموعة حتى 50 حاجاً: الانتساب، التجمّعات، الإعلانات، التقرير اليومي." },
  { key: "group-deputy", label: "معاون رئيس مجموعة", desc: "الحضور والتجمّع وتوزيع الوجبات الخاصة." },
  { key: "guide-m", label: "موجّه ديني", desc: "الدروس والمناسك والإجابة عن الأسئلة الشرعية." },
  { key: "guide-f", label: "موجّهة دينية", desc: "الإرشاد الديني للحاجّات ومتابعة شؤونهن." },
  { key: "tech", label: "منسق تقني", desc: "يساعد الحجاج في التطبيق ويتابع الإشعارات والبطاقات الرقمية." },
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
  { hijri: "10 ربيع الأول – 1 ربيع الآخر", title: "طلبات المشاركة ورسم التسجيل", detail: "الصفات بالترتيب، الوثائق، الالتزامات، 30 $" },
  { hijri: "حتى 10 ربيع الآخر", title: "التحقق من الأهلية", detail: "العمر والشهادة والسجل والتقييم السابق" },
  { hijri: "15 ربيع الآخر — 09:00", title: "الامتحان الكتابي المؤتمت", detail: "على المنصة — من المنزل أو قاعة مراقبة" },
  { hijri: "1 جمادى الأولى", title: "الامتحان الشفهي", detail: "أمام لجنة من ثلاثة أعضاء — تُدخل النتيجة على المنصة" },
  { hijri: "10 جمادى الأولى", title: "النتيجة النهائية وإعلان الناجحين", detail: "الكتابي 60% + الشفهي 40% — النجاح من 70" },
  { hijri: "11 – 25 جمادى الأولى", title: "طلبات تشكيل التكتلات والمجموعات", detail: "رسم تشكيل المجموعة 200 $ — اعتماد مدير المكتب" },
  { hijri: "1 جمادى الآخرة", title: "إعلان المجموعات المعتمدة والعقود", detail: "توقيع إلكتروني ومصادقة الإدارة" },
  { hijri: "2 شعبان", title: "فتح باب الانتساب للحجاج المقبولين", detail: "قبول الطلبات حتى السعة المعتمدة" },
  { hijri: "24 ذو القعدة", title: "السفر مع الحجاج", detail: "الميدان: التجمّعات والإعلانات والتقارير" },
] as const;

export function seasonHistory(id: string) {
  if (id === "01033300871")
    return [
      { season: "1446", role: "معاون رئيس مجموعة", group: "المجموعة 12", rating: 4.6 as number | null },
      { season: "1447", role: "لم يشارك", group: "", rating: null as number | null },
    ];
  return [
    { season: "1446", role: "لم يشارك", group: "", rating: null as number | null },
    { season: "1447", role: "لم يشارك", group: "", rating: null as number | null },
  ];
}

export function previousRating(id: string) {
  return seasonHistory(id).find((h) => h.rating !== null)?.rating ?? null;
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
  return {
    written,
    oral,
    final,
    published,
    writtenPassed: written !== undefined && written >= EXAM_RULES.writtenMin,
    passed: final !== undefined && final >= EXAM_RULES.passMark,
  };
}

export type StepState = "done" | "current" | "locked";
export type JourneyStep = { key: string; title: string; date: string; href: string; detail: string; state: StepState };

export function journeyOf(p: AdminProfile | undefined, joinCount = 0): JourneyStep[] {
  const r = resultOf(p);
  const g = p?.group;
  const raw: (Omit<JourneyStep, "state"> & { done: boolean })[] = [
    { key: "account", title: "إنشاء الحساب الإداري", date: "5 ربيع الأول", href: "/administrator/dashboard", detail: "ملف إداري دائم مؤكد من الشؤون المدنية", done: !!p },
    { key: "apply", title: "طلب المشاركة والرسم", date: "10 ربيع الأول – 1 ربيع الآخر", href: "/administrator/apply", detail: p?.receipt ? `الإيصال ${p.receipt}` : "الصفات، الوثائق، الالتزامات، 30 $", done: !!p?.feePaidAt },
    { key: "eligibility", title: "التحقق من الأهلية", date: "حتى 10 ربيع الآخر", href: "/administrator/apply", detail: p?.eligibleAt ? "مؤهل للامتحان الكتابي" : "ستة شروط من إعدادات الموسم", done: !!p?.eligibleAt },
    { key: "written", title: "الامتحان الكتابي", date: "15 ربيع الآخر", href: "/administrator/exam", detail: r.written !== undefined ? `النتيجة ${r.written} من 100` : "15 سؤالاً — 20 دقيقة", done: !!p?.exam?.submittedAt },
    { key: "oral", title: "الامتحان الشفهي", date: "1 جمادى الأولى", href: "/administrator/exam", detail: r.oral !== undefined ? `${r.oral} — اللجنة رقم 3` : "أمام اللجنة — تُدخل النتيجة على المنصة", done: r.oral !== undefined },
    { key: "result", title: "النتيجة النهائية", date: "10 جمادى الأولى", href: "/administrator/exam", detail: r.final !== undefined ? `${r.final} من 100 — ${r.passed ? "ناجح" : "لم يجتز"}` : "الكتابي 60% + الشفهي 40%", done: !!r.published && r.passed },
    { key: "group", title: "طلب تشكيل المجموعة", date: "11 – 25 جمادى الأولى", href: "/administrator/group", detail: g ? `المجموعة ${g.number} — ${g.feePaidAt ? "الرسم مسدد" : "بانتظار الرسم"}` : "الفريق والتكتل ورسم 200 $", done: !!g?.feePaidAt },
    { key: "approval", title: "اعتماد مدير المكتب", date: "حتى 1 جمادى الآخرة", href: "/administrator/group", detail: g?.approvedAt ? `اعتمدها ${g.approvedBy ?? "مازن الحلبي"}` : "مراجعة ماهر ثم اعتماد مازن", done: !!g?.approvedAt },
    { key: "contracts", title: "توقيع العقود", date: "جمادى الآخرة", href: "/administrator/group", detail: g?.contractSignedAt ? "موقّعة ومصادق عليها" : "المجموعة ↔ التكتل، والفريق", done: !!g?.contractSignedAt },
    { key: "requests", title: "طلبات الانتساب", date: "من 2 شعبان", href: "/administrator/requests", detail: joinCount ? `${joinCount} قرارات متخذة` : "قبول الحجاج حتى السعة", done: joinCount > 0 },
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

/**
 * Demo shortcut. "start" opens a fresh file; "field" fast-forwards to an approved group with
 * signed contracts so the requests and field screens can be tried right away.
 * Returns an error message when the national id already belongs to a pilgrim account.
 */
export function demoAdminLogin(
  state: { accounts: Record<string, unknown>; admins: Record<string, AdminProfile> },
  id: string,
  mode: "start" | "field" = "start",
): string | null {
  if (state.accounts[id]) return "هذا الرقم الوطني لديه حساب حاج. لكل شخص نوع حساب واحد في المنصة.";
  const demo = DEMO_ADMINS.find((d) => d.id === id);
  const existing = state.admins[id];
  const now = Date.now();
  if (!existing) actions.upsertAdmin(id, { createdAt: now, phone: demo?.phone ?? `0944${id.slice(-6)}` });
  if (mode === "field") {
    const min = 60_000;
    // 13 of 15 correct — the two scenario-style questions answered wrongly
    const answers = Object.fromEntries(EXAM_QUESTIONS.map((q) => [q.id, q.id === 3 || q.id === 11 ? (q.answer + 1) % q.options.length : q.answer]));
    const written = scoreExam(answers).score;
    actions.upsertAdmin(id, {
      positions: ["group-head", "cluster-deputy"],
      languages: ["العربية", "الإنجليزية"],
      skills: ["first-aid", "computer"],
      documents: DOCUMENTS.map((d) => d.key),
      commitmentsAt: now - 90 * min,
      feePaidAt: now - 88 * min,
      receipt: adminReceipt(id, "A"),
      eligibleAt: now - 80 * min,
      exam: { startedAt: now - 70 * min, submittedAt: now - 55 * min, answers, score: written },
      oral: { score: 84, by: "ماهر عيسى", at: now - 40 * min, note: "قوي في السيناريوهات الميدانية، يحتاج إلى تحسين الإلقاء" },
      finalScore: finalScoreOf(written, 84),
      resultPublishedAt: now - 35 * min,
      group: {
        number: 27,
        clusterId: "al-nour",
        capacity: 50,
        requestedAt: now - 30 * min,
        feePaidAt: now - 29 * min,
        approvedAt: now - 20 * min,
        approvedBy: "مازن الحلبي",
        contractSignedAt: now - 10 * min,
      },
    });
  }
  actions.adminLogin(id);
  logAdmin(id, mode === "field" ? "دخول تجريبي (قفز إلى ما بعد اعتماد المجموعة)" : "دخول تجريبي إلى حساب الإداري", `الإداري ${id.slice(-3)}`);
  return null;
}

/** Event-handler timestamp helper (keeps the React Compiler purity check happy in large handlers) */
export const nowMs = () => Date.now();
