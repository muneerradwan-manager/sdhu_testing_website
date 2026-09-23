"use client";

import { useMemo } from "react";
import { EXAM_QUESTIONS, EXAM_RULES, finalScoreOf, scoreExam } from "@/lib/data/admin-exam";
import { fullName, getPerson } from "@/lib/registry";
import { SEASON } from "@/lib/season";
import { seedCoordinatorWork } from "./coordinator";
import { actions, useStore, type AdminProfile, type AdminRecord, type VaultDoc } from "@/lib/store";

export const ADMIN_ROLE = "إداري";

/**
 * "done" = finished the whole journey (passed, group approved, contracts signed) so every screen of the
 * role shows; "start" = a fresh file that has not begun. "field" and "tech" are older names for "done".
 */
export type DemoAdminMode = "start" | "done" | "field" | "tech";

export type DemoAdmin = { id: string; phone: string; position: string; title: string; note: string; mode: "start" | "done" };

/** Twelve demo administrators: two for each role — one finished, one not started */
export const DEMO_ADMINS: DemoAdmin[] = [
  { id: "01033300881", phone: "0944281449", position: "group-head", mode: "done", title: "عبد الرحمن العلي — رئيس تكتل النور المنتخب", note: "58 عاماً — رئيس المجموعة 31 ثلاثة مواسم متتالية (4.6 – 4.8). جدّد صفته معفى من الامتحانين، ثم انتخبه رؤساء المجموعات رئيساً لتكتل النور: بقي رئيس مجموعته وارتفعت مهامه إلى مستوى التكتل، فصار يدير عدة مجموعات لكل واحدة رئيسها، ويقرر في طلبات الانضمام." },
  { id: "01033300882", phone: "0944282449", position: "group-head", mode: "start", title: "نبيل الساعاتي — رئيس مجموعة، مرشح لرئاسة تكتل", note: "54 عاماً — رئيس المجموعة 9 ثلاثة مواسم متتالية بتقييم 4.3 – 4.6: يستوفي شروط الترشح لرئاسة تكتل حين تفتح الإدارة الترشيح. لم يبدأ موسم 1448." },
  { id: "01033300883", phone: "0944283449", position: "group-head", mode: "done", title: "بسام درويش — معاون رئيس تكتل النور", note: "51 عاماً — رئيس المجموعة 5 في 1446 و1447 (4.4)، اختاره رئيس تكتل النور معاوناً له لأنه رئيس مجموعة سابق. بذلك صارت صفته معاون رئيس تكتل: يرى مجموعات التكتل ومعلوماته، لا مجموعة واحدة." },
  { id: "01033300884", phone: "0944284449", position: "group-head", mode: "start", title: "وليد القصاب — رئيس مجموعة", note: "45 عاماً — رئيس مجموعة في 1447 بتقييم 3.2 دون الحد: لا يُجدَّد في صفته، وتبقى له الصفات الأخرى بالامتحانين. لم يبدأ." },
  { id: "01033300871", phone: "0944271449", position: "group-head", mode: "done", title: "أحمد سليمان الحمصي — رئيس مجموعة", note: "36 عاماً — معاون مجموعة في 1446 (4.6) ولم يشارك في 1447. انتقل إلى رئاسة مجموعة بالامتحانين، وقُبلت مجموعته 27 في تكتل النور بعقد. يستلم العائلات ويفتح التجمّعات." },
  { id: "01033300885", phone: "0944285449", position: "group-head", mode: "start", title: "مروان الحلبي — رئيس مجموعة", note: "42 عاماً — أول موسم له: يريد رئاسة مجموعة يشكّلها بنفسه، ويخضع للامتحانين. لم يبدأ." },
  { id: "01033300872", phone: "0944272449", position: "group-deputy", mode: "done", title: "ياسر عبد الله — معاون رئيس مجموعة", note: "40 عاماً — معاون المجموعة 27 في 1447 (4.1). جدّد الصفة نفسها معفى من الامتحانين. أنهى رحلته." },
  { id: "01033300886", phone: "0944286449", position: "group-deputy", mode: "start", title: "فادي الخياط — معاون سابق يتقدم لرئاسة مجموعة", note: "34 عاماً — معاون المجموعة 41 في 1447 بتقييم 4.3. يفتح طلب 1448 فيجد ملفه الدائم بوثائقه ولغاته ومهاراته: يحدّث ما انتهت صلاحيته، ويضيف ويعدّل ويحذف، ثم يتقدم لرئاسة مجموعة بالامتحانين." },
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
  // The two cluster roles are never applied for: the group heads elect the cluster heads, and each head picks his deputy
  { key: "cluster-head", label: "رئيس تكتل", desc: "رئيس مجموعة ينتخبه رؤساء المجموعات ليدير التكتل كاملاً.", elected: true },
  { key: "cluster-deputy", label: "معاون رئيس تكتل", desc: "رئيس مجموعة سابق يختاره رئيس التكتل المنتخب.", elected: true },
  { key: "group-head", label: "رئيس مجموعة", desc: "يقود مجموعة حتى 50 حاجاً: استلام الحجاج المسجّلين فيها، التجمّعات، الإعلانات، التقرير اليومي.", elected: false },
  { key: "group-deputy", label: "معاون رئيس مجموعة", desc: "الحضور والتجمّع وتوزيع الوجبات الخاصة.", elected: false },
  { key: "guide-m", label: "موجّه ديني", desc: "الدروس والمناسك والإجابة عن الأسئلة الشرعية.", elected: false },
  { key: "guide-f", label: "موجّهة دينية", desc: "الإرشاد الديني للحاجّات ومتابعة شؤونهن.", elected: false },
  { key: "tech", label: "منسق تقني", desc: "يسجّل طلبات الحج في مكتبه، ويسجّل في مجموعته من يختارها في مرحلة التفويج، ويأخذ ملفاتهم الصحية.", elected: false },
] as const;

/**
 * The documents the administration asks for, each with the validity IT sets. `validSeasons` counts the
 * issuing season itself: 0 = never expires, 1 = this season only, 3 = the issuing season and two after
 * it. A document in the administrator's permanent file is carried into the new season's application
 * when it is still valid; when it has expired he updates it instead of uploading everything again.
 */
export const DOCUMENTS = [
  { key: "degree", label: "صورة عن الشهادة الجامعية", hint: "PDF أو صورة واضحة", file: "university-degree.pdf", validSeasons: 0 },
  { key: "first-aid", label: "شهادة دورة إسعافات أولية", hint: "صادرة خلال آخر سنتين", file: "first-aid-2026.pdf", validSeasons: 3 },
  { key: "record", label: "وثيقة «لا حكم عليه»", hint: "غير مضى عليها أكثر من 3 أشهر — تُجدَّد كل موسم", file: "no-criminal-record.pdf", validSeasons: 1 },
  { key: "recommendation", label: "تزكية من رئيس تكتل سابق", hint: "من موسم سابق عملت فيه", file: "recommendation.pdf", validSeasons: 2 },
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

export function documentType(key: string) {
  return DOCUMENTS.find((d) => d.key === key);
}

/** Is this document still valid for the season? (0 = a document that never expires) */
export function docState(doc: VaultDoc, season: number = SEASON.hijriYear) {
  const valid = documentType(doc.key)?.validSeasons ?? 0;
  if (valid === 0) return { ok: true, text: "سارية — لا تنتهي", until: null as number | null };
  const until = doc.issuedSeason + valid - 1;
  return until >= season
    ? { ok: true, text: until === season ? `سارية لهذا الموسم` : `سارية حتى موسم ${until}`, until }
    : { ok: false, text: `منتهية منذ موسم ${until + 1} — حدّثها`, until };
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
export function renewedRecord(id: string): AdminRecord | undefined {
  const rec = seedRecord(id);
  if (!rec) return undefined;
  const season = SEASON.hijriYear;
  return {
    ...rec,
    documents: rec.documents.map((d) => (docState(d, season).ok ? d : { ...d, id: `${d.key}-${season}`, issuedSeason: season, updatedAt: season * 1000 })),
    updatedAt: season * 1000,
  };
}

/** The file as it stands now: what is in the store, or the seeded file of a returning administrator */
export function recordOf(p: AdminProfile | undefined, id: string): AdminRecord {
  return p?.record ?? seedRecord(id) ?? EMPTY_RECORD;
}

/** Administrator calendar for season 1448 (dates from the operating document, shifted to 1448) */
export const ADMIN_CALENDAR = [
  { hijri: "5 ربيع الأول", title: "فتح إنشاء حسابات الإداريين", detail: "الرقم الوطني ورمز التحقق والشؤون المدنية" },
  { hijri: "10 ربيع الأول – 1 ربيع الآخر", title: "التسجيل الموسمي ورسم التسجيل", detail: "يتجدد كل موسم: صفة واحدة (الصفة السابقة أو صفة جديدة بشروط الإدارة)، الوثائق، الالتزامات، 30 $" },
  { hijri: "حتى 10 ربيع الآخر", title: "التحقق من الأهلية", detail: "العمر والشهادة والسجل والتقييم السابق" },
  { hijri: "15 ربيع الآخر — 09:00", title: "الامتحان الكتابي المؤتمت", detail: "لمن يتقدم لصفة جديدة أو لأول مرة — من يجدد صفته بتقييم مستوفٍ معفى" },
  { hijri: "1 جمادى الأولى", title: "الامتحان الشفهي", detail: "أمام لجنة من ثلاثة أعضاء — تُدخل النتيجة على المنصة" },
  { hijri: "10 جمادى الأولى", title: "النتيجة النهائية وإعلان الناجحين", detail: "الكتابي 60% + الشفهي 40% — النجاح من 70" },
  { hijri: "11 – 25 جمادى الأولى", title: "طلبات تشكيل المجموعات (دون تكتل)", detail: "رسم تشكيل المجموعة 200 $ — اعتماد مدير المكتب — ميثاق الفريق" },
  { hijri: "1 – 10 جمادى الآخرة", title: "انتخاب رؤساء التكتلات", detail: "تعلن الإدارة عدد التكتلات وشروط الترشح، ويصوّت رؤساء المجموعات، وينشئ المنتخبون تكتلاتهم (500 $) ويختارون معاونيهم" },
  { hijri: "11 – 25 جمادى الآخرة", title: "انضمام المجموعات إلى التكتلات", detail: "تطلب المجموعة، ويقرر رئيس التكتل بحسب سعته، ويوقّعان العقد — لا إجبار" },
  { hijri: "2 – 25 شعبان", title: "مرحلة التفويج: تسجيل الحجاج في المجموعات", detail: "يختار الحاج المجموعة من الدليل ويتواصل معها، فيسجّله منسقها ويوقّعان العقد" },
  { hijri: "24 ذو القعدة", title: "السفر مع الحجاج", detail: "الميدان: التجمّعات والإعلانات والتقارير" },
] as const;

export type SeasonRecord = { season: string; roleKey: string | null; role: string; group: string; rating: number | null };

/** Seasons served, from the platform's own records (roleKey null = did not take part that season) */
const HISTORY: Record<string, { season: string; roleKey: string | null; group?: string; rating?: number }[]> = {
  "01033300881": [{ season: "1445", roleKey: "group-head", group: "المجموعة 31", rating: 4.6 }, { season: "1446", roleKey: "group-head", group: "المجموعة 31 — رئيس تكتل النور منتخباً", rating: 4.7 }, { season: "1447", roleKey: "group-head", group: "المجموعة 31 — رئيس تكتل النور منتخباً", rating: 4.8 }],
  "01033300882": [{ season: "1445", roleKey: "group-head", group: "المجموعة 9", rating: 4.3 }, { season: "1446", roleKey: "group-head", group: "المجموعة 9", rating: 4.5 }, { season: "1447", roleKey: "group-head", group: "المجموعة 9", rating: 4.6 }],
  "01033300883": [{ season: "1446", roleKey: "group-head", group: "المجموعة 5", rating: 4.2 }, { season: "1447", roleKey: "group-head", group: "المجموعة 5 — معاون رئيس تكتل النور", rating: 4.4 }],
  "01033300884": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "group-head", group: "المجموعة 44", rating: 3.2 }],
  "01033300871": [{ season: "1446", roleKey: "group-deputy", group: "المجموعة 12", rating: 4.6 }, { season: "1447", roleKey: null }],
  "01033300872": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "group-deputy", group: "المجموعة 27", rating: 4.1 }],
  "01033300874": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "tech", group: "المجموعة 27", rating: 4.8 }],
  "01033300886": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "group-deputy", group: "المجموعة 41", rating: 4.3 }],
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

export type ClusterRules = { clusterCount: number; clusterHeadSeasons: number; clusterHeadMinRating: number; deputySeasons: number };

/** Seasons as group head, counted back from the last season served, stopping at the first gap or other role */
export function consecutiveGroupHeadSeasons(id: string, minRating = 0) {
  let n = 0;
  for (const h of [...seasonHistory(id)].reverse()) {
    if (h.roleKey === "group-head" && (h.rating ?? 0) >= minRating) n++;
    else break;
  }
  return n;
}

/** May this group head stand for cluster head this season? (conditions set by the administration) */
export function candidacy(id: string, rules: ClusterRules): { ok: boolean; reason: string; seasons: number } {
  const seasons = consecutiveGroupHeadSeasons(id, rules.clusterHeadMinRating);
  const ok = seasons >= rules.clusterHeadSeasons;
  return {
    ok,
    seasons,
    reason: ok
      ? `${seasons} مواسم متتالية رئيساً لمجموعة بتقييم ${rules.clusterHeadMinRating} فأكثر`
      : `يشترط ${rules.clusterHeadSeasons} مواسم متتالية رئيساً لمجموعة بتقييم ${rules.clusterHeadMinRating} فأكثر (لديك ${seasons})`,
  };
}

/** May this administrator be picked as a cluster deputy? He must have headed a group before */
export function deputyEligible(id: string, rules: ClusterRules) {
  const seasons = seasonHistory(id).filter((h) => h.roleKey === "group-head").length;
  return { ok: seasons >= rules.deputySeasons, seasons };
}

/**
 * What this administrator may apply for this season, under the administration's rules:
 * - keep last season's role: needs that season's rating ≥ the minimum and no gap season → exams waived;
 * - another role: its seniority requirements (cluster head/deputy), exams required;
 * - first season: any open role, exams required.
 */
export function roleOptions(id: string, rules: { keepRoleMinRating: number }): { last: SeasonRecord | null; keep: RoleOption | null; others: RoleOption[] } {
  const history = seasonHistory(id);
  const last = lastServed(id);
  const A = SEASON.administrators;
  const gap = last ? history.filter((h) => !h.roleKey && h.season > last.season).length : 0;

  const keep: RoleOption | null = last
    ? (() => {
        const rating = last.rating ?? 0;
        if (rating < rules.keepRoleMinRating) return { key: last.roleKey!, label: last.role, ok: false, reason: `تقييم موسم ${last.season} (${rating}) دون الحد ${rules.keepRoleMinRating} — لا يُجدَّد في الصفة نفسها`, examExempt: false };
        if (gap > A.keepRole.maxGapSeasons) return { key: last.roleKey!, label: last.role, ok: true, reason: `انقطاع ${gap} مواسم — تخضع للامتحانين من جديد`, examExempt: false };
        return { key: last.roleKey!, label: last.role, ok: true, reason: `تقييم ${rating} من 5 في موسم ${last.season}${A.keepRole.examExempt ? " — معفى من الامتحانين" : ""}`, examExempt: A.keepRole.examExempt };
      })()
    : null;

  // Cluster head and deputy are not applied for: elected by the group heads, and picked by the elected head
  const others = POSITIONS.filter((p) => !p.elected && p.key !== last?.roleKey).map(
    (p): RoleOption => ({ key: p.key, label: p.label, ok: true, reason: last ? "صفة جديدة — تخضع للامتحانين" : "أول موسم — تخضع للامتحانين", examExempt: false }),
  );
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
    { key: "group", title: p?.cluster ? "مجموعات تكتلي" : "طلب تشكيل المجموعة", date: "11 – 25 جمادى الأولى", href: "/administrator/group", detail: p?.cluster ? `يدير مجموعات ${p.cluster.name}، منها مجموعته ${g?.number}` : g ? `المجموعة ${g.number} — ${g.feePaidAt ? "الرسم مسدد" : "بانتظار الرسم"}` : "الفريق ورسم 200 $", done: !!g?.feePaidAt },
    { key: "approval", title: "اعتماد مدير المكتب", date: "حتى 1 جمادى الآخرة", href: "/administrator/group", detail: g?.approvedAt ? `اعتمدها ${g.approvedBy ?? "مازن الحلبي"}` : "مراجعة ماهر ثم اعتماد مازن", done: !!g?.approvedAt },
    { key: "contracts", title: "ميثاق الفريق", date: "جمادى الآخرة", href: "/administrator/group", detail: g?.contractSignedAt ? "موقّع ومصادق عليه" : "المعاون والموجّه والمنسق", done: !!g?.contractSignedAt },
    { key: "election", title: "انتخاب رؤساء التكتلات", date: SEASON.administrators.clusters.window, href: "/administrator/cluster", detail: p?.cluster ? `انتُخبت رئيساً — ${p.cluster.name}` : p?.vote ? "صوّتَ" : p?.candidate ? "مرشح" : `${SEASON.administrators.clusters.count} تكتلات — يصوّت رؤساء المجموعات`, done: !!p?.vote || !!p?.cluster },
    { key: "cluster", title: "الانضمام إلى تكتل", date: "بعد الانتخاب", href: "/administrator/cluster", detail: g?.clusterId ? "بعقد موقّع مع التكتل" : p?.clusterRequest?.status === "pending" ? "طلبك عند رئيس التكتل" : "تطلب، ويقرر رئيس التكتل، وتوقّعان العقد", done: !!g?.clusterId },
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
      // The permanent file he arrived with, its expired documents renewed for this season
      record: renewedRecord(id),
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
        number: demoGroupNumber(id),
        // The cluster comes later: after the election, by a request the cluster head accepts and a contract
        clusterId: TECH_POSTING.clusterId,
        capacity: 50,
        requestedAt: now - 30 * min,
        feePaidAt: now - 29 * min,
        approvedAt: now - 20 * min,
        approvedBy: "مازن الحلبي",
        contractSignedAt: now - 10 * min,
      },
      ...clusterStateFor(id, position, now - 15 * min),
    });
    // الانتخاب أُغلق وأُعلن رؤساء التكتلات — فتظهر مرحلة التكتلات مكتملة للملفات المكتملة
    actions.setElection({ openedAt: now - 19 * min, closedAt: now - 16 * min, elected: [CLUSTER_DEMO.head, ...CLUSTER_DEMO.otherElected] });
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

/** The demo's cluster story: عبد الرحمن (elected head of تكتل النور) picked بسام (a former group head) as deputy; أحمد's group was accepted by request + contract */
export const CLUSTER_DEMO = { head: "01033300881", deputy: "01033300883", otherElected: ["seed-01", "seed-04", "seed-03", "seed-07", "seed-02", "seed-06", "seed-05"] };

/** The group each finished demo group head leads in the story: the elected head 31, his deputy 5, the rest 27 */
export function demoGroupNumber(id: string) {
  return id === CLUSTER_DEMO.head ? 31 : id === CLUSTER_DEMO.deputy ? 5 : TECH_POSTING.groupNumber;
}

/** What the election left on each finished demo file: the elected head owns the cluster, the others joined it by an accepted request and a signed contract */
function clusterStateFor(id: string, position: string, at: number): Partial<AdminProfile> {
  if (position !== "group-head") return {};
  if (id === CLUSTER_DEMO.head) {
    return {
      candidate: { at: at - 3 * 60_000, statement: "ثلاثة مواسم رئيساً للمجموعة 31 بلا شكوى — أعد بتكتل منظم وشفاف." },
      vote: "seed-01",
      cluster: {
        id: TECH_POSTING.clusterId,
        name: "تكتل النور",
        deputyId: CLUSTER_DEMO.deputy,
        deputyName: adminName(CLUSTER_DEMO.deputy),
        capacityGroups: 12,
        createdAt: at,
        feePaidAt: at,
        decisions: { "01033300871": { status: "accepted", at: at + 60_000 }, [CLUSTER_DEMO.deputy]: { status: "accepted", at: at + 60_000 } },
      },
    };
  }
  const joined: Partial<AdminProfile> = {
    vote: CLUSTER_DEMO.head,
    clusterRequest: { clusterId: TECH_POSTING.clusterId, at: at + 30_000, status: "accepted", contractSignedAt: at + 2 * 60_000 },
  };
  if (id !== CLUSTER_DEMO.deputy) return joined;
  // The head picked him as his deputy, so his season role became a cluster role
  return {
    ...joined,
    deputyOf: { clusterId: TECH_POSTING.clusterId, clusterName: "تكتل النور", headId: CLUSTER_DEMO.head, headName: adminName(CLUSTER_DEMO.head), headGroup: demoGroupNumber(CLUSTER_DEMO.head), capacityGroups: 12 },
  };
}

/**
 * The role an administrator actually holds this season. A group head elected to run a cluster becomes
 * a cluster head, and the group head he picks as his deputy becomes a cluster deputy: the election
 * changes what they are, not only what they do, so their screens change with it.
 */
export function effectiveRole(p: AdminProfile | undefined) {
  if (p?.cluster) return "cluster-head";
  if (p?.deputyOf) return "cluster-deputy";
  return p?.positions[0] ?? "";
}

/** Does this administrator work at the cluster level (head or deputy)? */
export function isClusterRole(p: AdminProfile | undefined) {
  return !!p?.cluster || !!p?.deputyOf;
}

export function positionLabelOf(key: string) {
  return POSITIONS.find((p) => p.key === key)?.label ?? key;
}

/** Event-handler timestamp helper (keeps the React Compiler purity check happy in large handlers) */
export const nowMs = () => Date.now();
