"use client";

import { useMemo } from "react";
import { DEFAULT_BLUEPRINTS, EXAM_QUESTIONS, drawPaper, finalScoreWith, markPaper, pointsOf, typeOf, weightsLabel, withMarks, type ExamNumbers } from "@/lib/data/admin-exam";
import { ageOf, fullName, getPerson, type Person } from "@/lib/registry";
import { OPERATIONS, rangeLabel } from "@/lib/operations";
import { SEASON } from "@/lib/season";
import { seedCoordinatorWork } from "./coordinator";
import { SEED_CLUSTERS } from "./cluster";
import { actions, useStore, type AdminProfile, type AdminRecord, type AdminRules, type VaultDoc } from "@/lib/store";

export const ADMIN_ROLE = "إداري";

/**
 * "done" = finished the whole journey (passed, group approved, contracts signed) so every screen of the
 * role shows; "start" = a fresh file that has not begun. "field" and "tech" are older names for "done".
 */
export type DemoAdminMode = "start" | "done" | "field" | "tech";

export type DemoAdmin = { id: string; phone: string; position: string; title: string; note: string; mode: "start" | "done" };

/** Twelve demo administrators: two for each role — one finished, one not started */
export const DEMO_ADMINS: DemoAdmin[] = [
  { id: "01033300881", phone: "0944281449", position: "group-head", mode: "done", title: "عبد الرحمن العلي — رئيس تكتل النور", note: "58 عاماً — رئيس المجموعة 31 ثلاثة مواسم متتالية (4.6 – 4.8). جدّد صفته معفى من الامتحانين، ثم قدّم طلب تشكيل تكتل النور لأنه يستوفي شروطه: دعا المجموعات بحجاجها ونائبه وفريق التكتل، وأسندهم إلى المجموعات، فاعتُمد عند الموعد النهائي. يبقى رئيس مجموعته ويدير التكتل كله." },
  { id: "01033300882", phone: "0944282449", position: "group-head", mode: "start", title: "نبيل الساعاتي — رئيس مجموعة يستوفي شروط تشكيل تكتل", note: "54 عاماً — رئيس المجموعة 9 ثلاثة مواسم متتالية بتقييم 4.3 – 4.6: يستطيع أن يقدّم طلب تشكيل تكتل في مدته، بعد أن يشكّل مجموعته. لم يبدأ موسم 1448." },
  { id: "01033300883", phone: "0944283449", position: "group-head", mode: "done", title: "بسام درويش — نائب رئيس تكتل النور", note: "51 عاماً — رئيس المجموعة 5 في 1446 و1447 (4.4). دعاه رئيس تكتل النور نائباً له لأنه رئيس مجموعة سابق فقبل، فصارت صفته نائب رئيس تكتل: يرى مجموعات التكتل ومعلوماته، لا مجموعة واحدة." },
  { id: "01033300884", phone: "0944284449", position: "group-head", mode: "start", title: "وليد القصاب — رئيس مجموعة", note: "45 عاماً — رئيس مجموعة في 1447 بتقييم 3.2 دون الحد: لا يُجدَّد في صفته، وتبقى له الصفات الأخرى بالامتحانين. لم يبدأ." },
  { id: "01033300871", phone: "0944271449", position: "group-head", mode: "done", title: "أحمد سليمان الحمصي — رئيس مجموعة", note: "36 عاماً — معاون مجموعة في 1446 (4.6) ولم يشارك في 1447. انتقل إلى رئاسة مجموعة بالامتحانين، وشكّل مجموعته 27 وحده، ثم قبل دعوة تكتل النور لها. يلحق بها الحجاج ويرحّب بالعائلات ويفتح التجمّعات." },
  { id: "01033300885", phone: "0944285449", position: "group-head", mode: "start", title: "مروان الحلبي — رئيس مجموعة", note: "42 عاماً — أول موسم له: يريد رئاسة مجموعة يشكّلها بنفسه، ويخضع للامتحانين. لم يبدأ." },
  { id: "01033300872", phone: "0944272449", position: "group-deputy", mode: "done", title: "ياسر عبد الله — معاون رئيس مجموعة", note: "40 عاماً — معاون المجموعة 27 في 1447 (4.1). جدّد الصفة نفسها معفى من الامتحانين. أنهى رحلته." },
  { id: "01033300886", phone: "0944286449", position: "group-deputy", mode: "start", title: "فادي الخياط — معاون سابق يتقدم لرئاسة مجموعة", note: "34 عاماً — معاون المجموعة 41 في 1447 بتقييم 4.3. يفتح طلب 1448 فيجد ملفه الدائم بوثائقه ولغاته ومهاراته: يحدّث ما انتهت صلاحيته، ويضيف ويعدّل ويحذف، ثم يتقدم لرئاسة مجموعة بالامتحانين." },
  { id: "01033300874", phone: "0944274449", position: "tech", mode: "done", title: "سامر نبيل نجار — منسق تقني", note: "31 عاماً — منسق تقني في 1447 (4.8)، جدّد الصفة نفسها. المنسق للتكتل لا لمجموعة: دعاه رئيس تكتل النور، وأسند إليه ثلاثاً من مجموعات التكتل (31 و27 و5). يسجّل الحجاج على الحج في مكتب دمشق دون أن يضعهم في مجموعة، ويرفع عقود من يتفق مع مجموعاته، ويأخذ ملفاتهم الصحية. يفتح وفي مكتبه طلبان مسجّلان." },
  { id: "01033300887", phone: "0944287449", position: "tech", mode: "start", title: "رامي الأتاسي — منسق تقني", note: "29 عاماً — من حمص، أول موسم له. لم يبدأ." },
  { id: "01033300873", phone: "0944273449", position: "guide-m", mode: "done", title: "الشيخ خالد الرفاعي — موجّه ديني", note: "47 عاماً — موجّه المجموعة 27 في 1446 و1447 (4.9). جدّد الصفة نفسها معفى من الامتحانين. أنهى رحلته." },
  { id: "01033300888", phone: "0944288449", position: "guide-m", mode: "start", title: "عبد الغني الطباع — موجّه ديني", note: "43 عاماً — أول موسم له. لم يبدأ." },
];
/** تكتل النور في هذا العرض، ومجموعة أحمد فيه (27). فريقه وإسناده في طلبه (SEED_CLUSTERS) */
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
  // The two cluster roles are never applied for: a group head who meets the conditions files a cluster's request, and invites its deputy head
  { key: "cluster-head", label: "رئيس تكتل", desc: "رئيس مجموعة يستوفي الشروط يقدّم طلب تشكيل تكتل ويديره كاملاً بعد اعتماده.", elected: true },
  { key: "cluster-deputy", label: "نائب رئيس تكتل", desc: "رئيس مجموعة سابق يدعوه رئيس التكتل نائباً له.", elected: true },
  { key: "group-head", label: "رئيس مجموعة", desc: "يشكّل مجموعته وحده ويقودها: إلحاق الحجاج بها بعقودهم، التجمّعات، الإعلانات، التقرير اليومي.", elected: false },
  { key: "group-deputy", label: "معاون رئيس مجموعة", desc: "يدعوه رئيس تكتل ويسنده إلى مجموعة أو أكثر: الحضور والتجمّع وتوزيع الوجبات الخاصة.", elected: false },
  { key: "guide-m", label: "موجّه ديني", desc: "يدعوه رئيس تكتل ويسنده إلى مجموعة أو أكثر: الدروس والمناسك والإجابة عن الأسئلة الشرعية.", elected: false },
  { key: "guide-f", label: "موجّهة دينية", desc: "الإرشاد الديني للحاجّات ومتابعة شؤونهن.", elected: false },
  { key: "tech", label: "منسق تقني", desc: "يعمل للتكتل لا لمجموعة: يدعوه رئيس تكتل ويسند إليه مجموعات منه. يسجّل الحجاج على الحج في مكتبه، ويلحق بمجموعاته من يتفق معها بعقد، ويأخذ ملفاتهم الصحية.", elected: false },
] as const;

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

/** The roles an administrator applies for (the cluster roles come by a formation request and an invitation, not by application) */
export const APPLIED_ROLES = POSITIONS.filter((p) => !p.elected);

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

/** How a file row stands for one role: required, preferred, or not asked */
export function levelOf(table: RoleRequirements, roleKey: string, id: string): Level | null {
  const v = table.rows.includes(id) ? table.cells[roleKey]?.[id] : undefined;
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
  const col = table.cells[roleKey] ?? {};
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
  { hijri: "أواخر أيلول – أوائل تشرين الأول", title: "الامتحان الكتابي في القاعات", detail: "جماعي لكل صفة في يومها، في قاعة المركز الامتحاني لمحافظتك — من يجدد صفته بتقييم مستوفٍ معفى" },
  { hijri: "حتى 25 تشرين الأول (تقديري)", title: "الامتحان الشفهي", detail: "أمام لجنة — حضورياً لرؤساء المجموعات والموجّهين، وعن بُعد للمعاونين والمنسقين" },
  { hijri: "1 تشرين الثاني (تقديري)", title: "النتيجة النهائية وقوائم الإداريين المعتمدين", detail: "الكتابي والشفهي بالأوزان وعلامة النجاح التي تضبطها إدارة الامتحانات للموسم" },
  { hijri: "1 – 10 تشرين الثاني (تقديري)", title: "طلبات تشكيل المجموعات", detail: "رئيس المجموعة يشكّلها وحده، دون فريق ودون تكتل — رسم 200 $ — اعتماد إدارة الإداريين" },
  { hijri: "12 – 30 تشرين الثاني (تقديري)", title: "تشكيل التكتلات بالطلب", detail: "لا انتخاب: رئيس المجموعة المستوفي للشروط يقدّم الطلب، ويدعو المجموعات بحجاجها ونائبه، ويختار الموجّهين والمنسقين والمعاونين للتكتل كله ثم يسندهم إلى المجموعات" },
  { hijri: "12 تشرين الثاني – 15 كانون الثاني (تقديري)", title: "إلحاق الحجاج بالمجموعات", detail: "بالتوازي مع تشكيل التكتلات ويستمر بعده: بعقد بين الحاج والمجموعة يرفعه رئيسها أو من أسنده إليها رئيس التكتل، ويعتمده المكتب" },
  { hijri: "1 – 5 كانون الأول (تقديري)", title: "اعتماد التكتلات وتوزيع المجموعات", detail: "يُعتمد المكتمل، ويُقصى الناقص وتوزَّع مجموعاته على المعتمدة — ثم رسم التكتل 500 $" },
  { hijri: "24 ذو القعدة (1 أيار 2027)", title: "السفر مع الحجاج", detail: "الميدان: التجمّعات والإعلانات والتقارير" },
] as const;

export type SeasonRecord = { season: string; roleKey: string | null; role: string; group: string; rating: number | null };

/** Seasons served, from the platform's own records (roleKey null = did not take part that season) */
const HISTORY: Record<string, { season: string; roleKey: string | null; group?: string; rating?: number }[]> = {
  "01033300881": [{ season: "1445", roleKey: "group-head", group: "المجموعة 31", rating: 4.6 }, { season: "1446", roleKey: "group-head", group: "المجموعة 31", rating: 4.7 }, { season: "1447", roleKey: "group-head", group: "المجموعة 31", rating: 4.8 }],
  "01033300882": [{ season: "1445", roleKey: "group-head", group: "المجموعة 9", rating: 4.3 }, { season: "1446", roleKey: "group-head", group: "المجموعة 9", rating: 4.5 }, { season: "1447", roleKey: "group-head", group: "المجموعة 9", rating: 4.6 }],
  "01033300883": [{ season: "1446", roleKey: "group-head", group: "المجموعة 5", rating: 4.2 }, { season: "1447", roleKey: "group-head", group: "المجموعة 5", rating: 4.4 }],
  "01033300884": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "group-head", group: "المجموعة 44", rating: 3.2 }],
  "01033300871": [{ season: "1446", roleKey: "group-deputy", group: "المجموعة 12", rating: 4.6 }, { season: "1447", roleKey: null }],
  "01033300872": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "group-deputy", group: "المجموعة 27", rating: 4.1 }],
  "01033300874": [{ season: "1446", roleKey: null }, { season: "1447", roleKey: "tech", group: "تكتل النور — المجموعات 27 و31 و5", rating: 4.8 }],
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

export type ClusterRules = { clusterMinGroups: number; clusterHeadSeasons: number; clusterHeadMinRating: number; deputySeasons: number };

/** Seasons as group head, counted back from the last season served, stopping at the first gap or other role */
export function consecutiveGroupHeadSeasons(id: string, minRating = 0) {
  let n = 0;
  for (const h of [...seasonHistory(id)].reverse()) {
    if (h.roleKey === "group-head" && (h.rating ?? 0) >= minRating) n++;
    else break;
  }
  return n;
}

/** May this group head request to form a cluster this season? (conditions set by the administration) */
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

/** May this administrator be invited as a cluster's deputy head? He must have headed a group before */
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
export function roleOptions(id: string, rules: { keepRoleMinRating: number }, openRoles?: string[]): { last: SeasonRecord | null; keep: RoleOption | null; others: RoleOption[] } {
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
  // Only the roles the administration left open this season, and never an elected one
  const others = POSITIONS.filter((p) => !p.elected && p.key !== last?.roleKey && (!openRoles || openRoles.includes(p.key))).map(
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

/**
 * `file`: what the administrators' file («إدارة الإداريين») keeps of it — the tab it belongs to, and the
 * record it is part of (a group's number, a cluster's id; his own file by default)
 */
export function logAdmin(id: string, action: string, target?: string, detail?: string, file?: { area: string; ref?: string }) {
  actions.logEvent({ actor: adminName(id), role: ADMIN_ROLE, action, target, detail, ...(file && { system: "admins", area: file.area, ref: file.ref ?? id }) });
}

/** Written + oral → final, judged by the season's exam rules (useExamRules) as the administration left them */
export function resultOf(p: AdminProfile | undefined, rules: ExamNumbers) {
  const written = p?.exam?.score;
  const oral = p?.oral?.score;
  // An oral with no written mark is a file exempt from the written: the oral is the whole result
  const final = oral !== undefined ? finalScoreWith(written, oral, rules) : undefined;
  const published = p?.resultPublishedAt ?? (final !== undefined ? p?.oral?.at : undefined);
  // Same role renewed with the required rating: no exams this season, the file counts as qualified
  const exempt = !!p?.examExempt && !!p?.eligibleAt && !!p?.feePaidAt;
  // Below the written minimum there is no oral, so no final mark can pass the file
  const writtenPassed = exempt || (written !== undefined ? written >= rules.writtenMin : oral !== undefined);
  return {
    written,
    oral,
    final,
    published: exempt ? p?.feePaidAt : published,
    exempt,
    writtenPassed,
    passed: exempt || (writtenPassed && final !== undefined && final >= rules.passMark),
  };
}

export type StepState = "done" | "current" | "locked";
export type JourneyStep = { key: string; title: string; date: string; href: string; detail: string; state: StepState };

/** `written`: his exam's sitting and paper this season (useMyHall) */
export function journeyOf(p: AdminProfile | undefined, rules: ExamNumbers, joinCount = 0, written?: { date: string; questions: number; minutes: number; center?: string }): JourneyStep[] {
  const r = resultOf(p, rules);
  const g = p?.group;
  // Forming a cluster belongs to group heads (and the cluster roles they become).
  // A guide, an assistant or a coordinator joins a cluster by its head's invitation, and works in the
  // groups the head assigns to him: no group station of his own. Before any role is chosen, the full list.
  const teamMember = !!p?.positions?.length && p.positions[0] !== "group-head" && !isClusterRole(p);
  const tech = isTechCoordinator(p);
  const post = p?.coordinatorIn ?? p?.servesIn;
  const posted = post ? `${post.clusterName} — ${post.groups.length ? `المجموعات ${post.groups.join(" و")}` : "لم تُسند إليه مجموعة بعد"}` : "";
  const when = (key: string) => {
    const o = OPERATIONS.find((x) => x.key === key)!;
    return rangeLabel(o.start, o.end);
  };
  const raw: (Omit<JourneyStep, "state"> & { done: boolean; headOnly?: boolean; groupOnly?: boolean })[] = [
    { key: "account", title: "إنشاء الحساب الإداري", date: "دائم", href: "/administrator/dashboard", detail: "ملف إداري دائم مؤكد من الشؤون المدنية", done: !!p },
    { key: "apply", title: "التسجيل كإداري والتحقق من الأهلية", date: when("admin-registration"), href: "/administrator/apply", detail: p?.eligibleAt ? `مؤهل لصفة ${positionLabelOf(p.positions[0] ?? "")} — ${p.renewal === "keep" ? "تجديد الصفة نفسها" : p.renewal === "change" ? "صفة جديدة" : "أول موسم"}` : "ملفك، ثم صفة واحدة تستوفي شروطها في جدول الإدارة، ثم التحقق قبل الدفع", done: !!p?.eligibleAt },
    { key: "fee", title: "رسم التسجيل", date: when("admin-registration"), href: "/administrator/apply", detail: p?.receipt ? `الإيصال ${p.receipt}` : "30 $ — بعد ثبوت الأهلية", done: !!p?.feePaidAt },
    { key: "written", title: "الامتحان الكتابي", date: written?.date ? written.date.replace(" 1448", "") : when("admin-exams"), href: "/administrator/exam", detail: r.exempt ? "معفى — الصفة نفسها بتقييم مستوفٍ" : r.written !== undefined ? `النتيجة ${r.written} من 100` : p?.exam?.submittedAt ? "أُرسل — بانتظار تصحيح الأسئلة التحريرية" : written ? `في قاعة ${written.center ?? "مركزك"} — ${written.questions} سؤالاً في ${written.minutes} دقيقة` : "في قاعة مركزك الامتحاني", done: r.exempt || !!p?.exam?.submittedAt },
    { key: "oral", title: "الامتحان الشفهي", date: when("admin-exams"), href: "/administrator/exam", detail: r.exempt ? "معفى" : r.oral !== undefined ? `${r.oral} — اللجنة رقم 3` : "أمام اللجنة — تُدخل النتيجة على المنصة", done: r.exempt || r.oral !== undefined },
    { key: "result", title: "النتيجة النهائية", date: when("admin-exams"), href: "/administrator/exam", detail: r.exempt ? "مؤهل بالتجديد — دون امتحان" : r.final !== undefined ? `${r.final} من 100 — ${r.passed ? "ناجح" : "لم يجتز"}` : weightsLabel(rules), done: !!r.published && r.passed },
    teamMember
      ? { key: "team", title: tech ? "الانضمام إلى تكتل منسقاً تقنياً" : "الانضمام إلى تكتل", date: when("cluster-formation"), href: "/administrator/cluster", detail: post ? posted : "بدعوة فردية من رئيس تكتل، يسند إليك بعدها مجموعات من تكتله", done: !!post }
      : { key: "group", title: "طلب تشكيل المجموعة", date: when("group-formation"), href: "/administrator/group", detail: g ? `المجموعة ${g.number} — ${g.feePaidAt ? "الرسم مسدد" : "بانتظار الرسم"}` : "وحدك دون فريق — رسم 200 $", done: !!g?.feePaidAt },
    { key: "approval", title: "اعتماد إدارة الإداريين", date: when("group-formation"), href: "/administrator/group", detail: g?.approvedAt ? `اعتمدها ${g.approvedBy ?? "مازن الحلبي"}` : "يقرر فيه صاحب صلاحية «إدارة الإداريين»", done: !!g?.approvedAt, groupOnly: true },
    { key: "cluster", title: "تشكيل التكتلات", date: when("cluster-formation"), href: "/administrator/cluster", detail: p?.cluster ? `قدّمت طلب ${p.cluster.name}` : p?.deputyOf ? `${p.deputyOf.clusterName} — نائب رئيسه` : g?.clusterId ? "مجموعتك في تكتل" : "تدعوك تكتلات إليها، أو تقدّم طلب تشكيل تكتل إن استوفيت شروطه", done: !!p?.cluster || !!p?.deputyOf || !!g?.clusterId, headOnly: true },
    teamMember
      ? { key: "requests", title: tech ? "إلحاق الحجاج بمجموعاتي" : "حجاج مجموعاتي", date: when("group-joining"), href: "/administrator/requests", detail: tech ? "عقود الحجاج في المجموعات المسندة إليك، وملفاتهم الصحية" : "حجاج المجموعات المسندة إليك", done: joinCount > 0 }
      : { key: "requests", title: "حجاج المجموعة", date: when("group-joining"), href: "/administrator/requests", detail: joinCount ? `${joinCount} عائلات تم الترحيب بها` : "عقود حجاج مجموعتك وملفاتهم الصحية", done: joinCount > 0 },
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

/**
 * ورقة امتحان كتابي ناجحة في امتحان صفته كما تطلقه المنصة: المؤتمتة صحيحة إلا الثالث والعاشر منها،
 * والتحريري صحّحه المصحح بدرجة دون العلامة الكاملة بدرجة
 */
function passedExam(id: string, position: string, startedAt: number, submittedAt: number): NonNullable<AdminProfile["exam"]> {
  const bank = EXAM_QUESTIONS;
  const byId = new Map(bank.map((q) => [q.id, q]));
  const paper = drawPaper(bank, DEFAULT_BLUEPRINTS[position] ?? DEFAULT_BLUEPRINTS["group-head"], position, id);
  const ids = paper.flatMap((s) => s.ids);
  const auto = ids.filter((qid) => typeOf(byId.get(qid)!) !== "written");
  const answers = Object.fromEntries(
    ids.map((qid) => {
      const q = byId.get(qid)!;
      if (typeOf(q) === "written") return [qid, "أجبت بالخطوات المطلوبة بترتيبها، وذكرت من أُبلغ في كل خطوة."];
      const i = auto.indexOf(qid);
      return [qid, i === 2 || i === 9 ? (q.answer + 1) % q.options.length : q.answer];
    }),
  );
  const { tally, toGrade } = markPaper(paper, bank, answers);
  const marks = Object.fromEntries(toGrade.map((qid) => [qid, pointsOf(byId.get(qid)!) - 1]));
  const { score } = withMarks(paper, tally, toGrade, marks);
  return { startedAt, submittedAt, paper, answers, tally, toGrade, marks, gradedBy: "ماهر عيسى", gradedAt: submittedAt + 5 * 60_000, provisional: score, score };
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
      exam: keep ? undefined : passedExam(id, position, now - 70 * min, now - 55 * min),
      oral: keep
        ? undefined
        : tech
          ? { score: 88, by: "منير السيد", at: now - 40 * min, note: "متمكّن من التطبيق وشرحه لكبار السن" }
          : { score: 84, by: "منير السيد", at: now - 40 * min, note: "قوي في السيناريوهات الميدانية، يحتاج إلى تحسين الإلقاء" },
      resultPublishedAt: keep ? undefined : now - 35 * min,
      // Only a group head has a group of his own; a guide, an assistant or a coordinator works in the groups
      // the head of تكتل النور assigned to him
      group: position !== "group-head"
        ? undefined
        : {
            number: demoGroupNumber(id),
            // Its head accepted تكتل النور's invitation (or is its head)
            clusterId: TECH_POSTING.clusterId,
            capacity: 50,
            requestedAt: now - 30 * min,
            feePaidAt: now - 29 * min,
            approvedAt: now - 20 * min,
            approvedBy: "مازن الحلبي",
          },
      ...postFor(id, position),
      ...clusterStateFor(id, position, now - 15 * min),
    });
    // The deadline passed and the administration approved تكتل النور: the finished files see it standing
    actions.seedFormationDecision("al-nour", { status: "approved", at: now - 12 * min, by: "مازن الحلبي" });
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

/** The demo's cluster story: عبد الرحمن filed تكتل النور's request; بسام (a former group head) accepted to be its deputy head; أحمد accepted its invitation for his group */
export const CLUSTER_DEMO = { head: "01033300881", deputy: "01033300883" };

/** The group each finished demo group head leads in the story: the cluster's head 31, his deputy 5, the rest 27 */
export function demoGroupNumber(id: string) {
  return id === CLUSTER_DEMO.head ? 31 : id === CLUSTER_DEMO.deputy ? 5 : TECH_POSTING.groupNumber;
}

const NOUR = () => SEED_CLUSTERS.find((c) => c.cluster.id === "al-nour")!;

/** Where a finished guide, assistant or coordinator works: the groups تكتل النور's head assigned to him */
function postFor(id: string, position: string): Partial<AdminProfile> {
  const pool = position === "tech" ? "tech" : position === "guide-m" ? "guide" : position === "group-deputy" ? "assistant" : null;
  if (!pool) return {};
  const nour = NOUR();
  const base = { clusterId: nour.cluster.id, clusterName: nour.cluster.name, headId: nour.headId, headName: nour.headName };
  const groups = Object.entries(nour.cluster.posts[pool]).filter(([, who]) => who === id).map(([n]) => Number(n));
  return pool === "tech" ? { coordinatorIn: { ...base, groups } } : { servesIn: { ...base, role: pool, groups } };
}

/** What the formation left on each finished group head's file: the head owns the request, the deputy holds his cluster role */
function clusterStateFor(id: string, position: string, at: number): Partial<AdminProfile> {
  if (position !== "group-head") return {};
  const nour = NOUR();
  if (id === CLUSTER_DEMO.head) return { cluster: { ...nour.cluster, createdAt: at, feePaidAt: at + 10 * 60_000 } };
  if (id !== CLUSTER_DEMO.deputy) return {};
  return { deputyOf: { clusterId: nour.cluster.id, clusterName: nour.cluster.name, headId: nour.headId, headName: nour.headName, headGroup: nour.headGroup } };
}

/**
 * The role an administrator actually holds this season. A group head who filed a cluster's request becomes
 * its head, and the former group head who accepted to be its deputy becomes the cluster's deputy head:
 * the cluster changes what they are, not only what they do, so their screens change with it.
 */
export function effectiveRole(p: AdminProfile | undefined) {
  if (p?.cluster && p.cluster.decision?.status !== "excluded") return "cluster-head";
  if (p?.deputyOf) return "cluster-deputy";
  return p?.positions[0] ?? "";
}

/** Does this administrator work at the cluster level (head or deputy)? */
export function isClusterRole(p: AdminProfile | undefined) {
  return (!!p?.cluster && p.cluster.decision?.status !== "excluded") || !!p?.deputyOf;
}

export function positionLabelOf(key: string) {
  return POSITIONS.find((p) => p.key === key)?.label ?? key;
}

export { nowMs } from "@/lib/utils";
