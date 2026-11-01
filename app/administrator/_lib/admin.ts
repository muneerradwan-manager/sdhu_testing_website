"use client";

import { staffName } from "@/lib/staff";
import DEFAULTS from "@/testdata/demo/defaults.json";
import { useMemo } from "react";
import { satAttempt, sectionsOf, type SectionResult } from "@/lib/data/admin-exam";
import { ageOf, fullName, getPerson, personName, phoneOf, type Person } from "@/lib/registry";
import { groupName, groupsName } from "@/lib/groups";
import { OPERATIONS, rangeLabel } from "@/lib/operations";
import { SEASON } from "@/lib/season";
import { seedCoordinatorWork } from "./coordinator";
import { SEED_CLUSTERS } from "./cluster";
import { DEFAULT_ROLES, examRoleOf, examRolesOf, roleKeyByName, roleName, seasonalOf, structureNow } from "./structure";
import { demoOral } from "./oral";
import LISTED from "@/testdata/admins/demo-listed.json";
import ADMINS from "@/testdata/admins/demo-admins.json";
import HISTORIES from "@/testdata/admins/histories.json";
import CALENDAR from "@/testdata/admins/admin-calendar.json";
import READY from "@/testdata/admins/ready-groups.json";
import { actions, getState, seasonNow, useStore, type AdminProfile, type AdminRecord, type AdminRules, type Attempt, type AttemptStatus, type ClusterRecord, type OralState, type VaultDoc } from "@/lib/store";

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

/** The demo's list, in the order of the cluster's structure: its head and accountant, then the groups and the cluster's people */
export const DEMO_GROUPS = ["رئيس تكتل", "محاسب التكتل", "رئيس مجموعة", "معاون", "معاون التكتل", "معاون بعدد", "معاون ومنسق تقني", "منسق تقني", "موجّه ديني أ", "موجّه ديني ب", "موجّه ديني ج", "موجّهة دينية أ", "موجّهة دينية ب", "موجّهة دينية ج"];

/**
 * The demo accounts the login page lists now: every role twice — one who finished his journey and works with
 * his role's permissions (most of them in تكتل النور), and one who has not registered for the season, to try
 * applying for that role. The places a cluster gives rather than roles one applies for (its head,
 * accountant and assistant) have, beside the finished one, one at the start of his work: a cluster request to
 * file or an invitation waiting for his answer. The three group heads registering stay at the head of their
 * role. Every other account stays in DEMO_ADMINS and still works: «/administrator/login?demo=all» lists them
 * all, and adding an id to testdata/admins/demo-listed.json lists it for everyone (null there lists them all).
 */
export const DEMO_LISTED: string[] | null = LISTED;

/** The demo administrators: every role and every place a cluster gives, most of them finished in تكتل النور (the grade «ج» guides in تكتل الصفا والمروة), some not started */
/** «سامر نجار — منسق تقني»: the name from the civil registry (testdata/people/citizens.json), the rest (`headline`) from testdata/admins/demo-admins.json */
const titled = (id: string, what: string) => `${personName(id)} — ${what}`;

export const DEMO_ADMINS: DemoAdmin[] = (ADMINS as (Omit<DemoAdmin, "phone" | "title"> & { headline: string })[]).map((d) => ({
  id: d.id,
  phone: phoneOf(d.id),
  position: d.position,
  section: d.section,
  mode: d.mode,
  title: titled(d.id, d.headline),
  note: d.note,
}));
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
  // The certificate of his kind of work, uploaded the first season he served in it: every grade of the guides
  // sits the guide's exam, and «معاون ومنسق تقني» the technical coordinator's too
  const exams = role ? examRolesOf(role) : [];
  const guide = exams.includes("guide-m") || exams.includes("guide-f");
  const tech = exams.includes("tech");
  if (guide) documents.push(doc("sharia", firstSeason));
  if (tech) documents.push(doc("it", firstSeason));
  // A certificate the administrator added himself in an earlier season
  documents.push({ id: "custom-academy", key: "custom", label: `شهادة مسار «خدمة كبار السن» — أكاديمية الحج`, file: "academy-elderly-care.pdf", issuedSeason: lastSeason, addedAt: at });
  const skills = tech ? ["computer"] : guide ? ["elderly", "computer"] : ["first-aid", "computer"];
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

/** Administrator calendar for season 1448 (testdata/admins/admin-calendar.json): as announced by the Hajj and Umrah administration, «تقديري» where it had not announced yet */
export const ADMIN_CALENDAR: { hijri: string; title: string; detail: string }[] = CALENDAR;

/** `groups`: the groups he served in, by their keys; `group`: the same, named for the screen */
export type SeasonRecord = { season: string; roleKey: string | null; role: string; groups: number[]; group: string; rating: number | null };

/** Seasons served, from the platform's own records (testdata/admins/histories.json; roleKey null = did not take part that season) */
const HISTORY: Record<string, { season: string; roleKey: string | null; cluster?: string; groups?: number[]; rating?: number }[]> = HISTORIES;

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
 * - another role: its seniority requirements (cluster head), exams required;
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
 * His result, as the administration's exam platform judges it: a written test counts once its submission is
 * confirmed (by the hall's supervisor, or approved by the administration), and he passes it by passing every one of
 * its sections at its own pass mark — no overall mark to reach, no weights. A role that sits two tests («معاون ومنسق
 * تقني») passes the written part when it passes both. `published` is when he sees it: confirmed, in a test that
 * shows results. Then the oral exam before its committee (`oral`): he is qualified (`passed`) only once he passed
 * the written part (`written`) and the oral one. A renewal exempt from the written test is exempt from both.
 */
export function resultOf(p: AdminProfile | undefined): {
  parts: PartResult[];
  sent: boolean;
  confirmed: boolean;
  score?: number;
  published?: number;
  exempt: boolean;
  /** The written part passed (every test, every section) */
  written: boolean;
  /** His oral exam, once the written part is passed */
  oral?: OralState;
  /** Qualified: exempt, or passed the written part and the oral exam */
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
    written: exempt || (confirmed && parts.every((x) => x.passed)),
    oral: p?.oral,
    passed: exempt || (confirmed && parts.every((x) => x.passed) && p?.oral?.status === "passed"),
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
    { key: "account", title: "الحساب والملف الإداري", date: "دائم", href: "/portal", detail: "حسابك في المنصة مؤكد من الشؤون المدنية، وملفك الإداري الدائم يُفتح به حين تختار المسار الإداري", done: !!p },
    { key: "apply", title: "التسجيل كإداري والتحقق من الأهلية", date: when("admin-registration"), href: "/portal/role", detail: p?.eligibleAt ? `مؤهل لصفة ${positionLabelOf(p.positions[0] ?? "")} — ${p.renewal === "keep" ? "تجديد الصفة نفسها" : p.renewal === "change" ? "صفة جديدة" : "أول موسم"}` : "ملفك، ثم صفة واحدة تستوفي شروطها في جدول الإدارة، ثم التحقق قبل الدفع", done: !!p?.eligibleAt },
    { key: "fee", title: "رسم التسجيل", date: when("admin-registration"), href: "/portal/role", detail: p?.receipt ? `الإيصال ${p.receipt}` : "30 $ — بعد ثبوت الأهلية", done: !!p?.feePaidAt },
    { key: "test", title: "الاختبار المؤتمت", date: written?.date ? written.date.replace(" 1448", "") : when("admin-exams"), href: "/portal/exam", detail: r.exempt ? "معفى — الصفة نفسها بتقييم مستوفٍ" : r.confirmed ? `سُلّم وأكّده المشرف${r.parts.length > 1 ? " — الاختباران" : ""}` : r.parts.some((x) => x.status === "submitted") ? "سُلّم — بانتظار تأكيد المشرف" : r.parts.some((x) => x.status === "unconfirmed") ? "لم يُؤكَّد تسليمك — تقرر فيه الإدارة" : written ? `في قاعة ${written.center ?? "مركزك"} — ${written.questions} سؤالاً في ${written.minutes} دقيقة` : "في قاعة مركزك الامتحاني", done: r.exempt || r.confirmed },
    { key: "result", title: "نتيجة الاختبار المؤتمت", date: when("admin-exams"), href: "/portal/exam", detail: r.exempt ? "مؤهل بالتجديد — دون اختبار" : r.published ? `${r.score ?? "—"}% — ${r.written ? "ناجح في كل الأقسام" : "لم يجتز كل الأقسام"}` : r.confirmed ? "تظهر حين تعرضها الإدارة" : "النجاح ببلوغ النسبة المطلوبة في كل قسم", done: !!r.published && r.written },
    { key: "oral", title: "الامتحان الشفهي", date: when("admin-orals"), href: "/portal/exam", detail: r.exempt ? "معفى بالتجديد" : r.oral?.status === "passed" ? `ناجح أمام اللجنة${r.oral.score !== undefined ? ` — ${r.oral.score}%` : ""}` : r.oral?.status === "failed" ? "لم يجتزه هذا الموسم" : r.oral?.status === "absent" ? "غاب عن موعده" : r.oral ? "موعده محجوز" : "بعد نجاحك في المؤتمت: تختار موعدك أمام لجنة صفتك", done: r.passed },
    teamMember
      ? { key: "team", title: tech ? "مكانك في تكتل منسقاً تقنياً" : "مكانك في تكتل", date: when("cluster-formation"), href: "/portal", detail: post ? posted : tech ? "يختارك رئيس تكتل في المكتب عند تشكيله، ويوزّعك على مجموعات منه" : "في مقعد مجموعة يُجلسك فيه المكتب عند تشكيلها، أو يختارك رئيس تكتل للتكتل كله عند تشكيله في المكتب", done: !!post }
      : { key: "group", title: "تشكيل المجموعة في المكتب", date: when("group-formation"), href: "/portal/my-contracts", detail: g?.approvedAt ? `${groupName(g.number)} — شكّلها ${g.approvedBy ?? "موظف المكتب"}، ووقّعتم عقدها` : "تحضر مع فريقك إلى المكتب: اسمها الذي تختاره، ورسمها 200 $، وعقدها الذي توقّعونه", done: !!g?.approvedAt },
    { key: "cluster", title: "تشكيل التكتل في المكتب", date: when("cluster-formation"), href: p?.cluster ? "/portal/clusters" : "/portal/my-contracts", detail: p?.cluster?.status === "approved" ? `${p.cluster.name} — شُكّل في المكتب` : g?.clusterId ? "مجموعتك في تكتل شُكّل في المكتب" : "يحضر رئيس التكتل ورؤساء مجموعاته وكادره إلى المكتب، فيُشكَّل ويوقّعون عقده", done: p?.cluster?.status === "approved" || !!g?.clusterId, headOnly: true },
    teamMember
      ? { key: "requests", title: "حجاج مجموعاتي", date: when("group-joining"), href: "/portal/requests", detail: tech ? "حجاج المجموعات التي وُزّعت عليها كما يلحقهم المكتب، وملفاتهم الصحية" : "حجاج المجموعات التي تعمل فيها", done: joinCount > 0 }
      : isClusterRole(p)
        ? // The cluster's head oversees all its groups, not one of them
          { key: "requests", title: "حجاج مجموعات التكتل", date: when("group-joining"), href: "/portal/clusters", detail: joinCount ? `${joinCount} عائلات تم الترحيب بها` : "حجاج كل مجموعة من مجموعات التكتل كما يلحقهم المكتب، وملفاتهم الصحية", done: joinCount > 0 }
        : { key: "requests", title: "حجاج المجموعة", date: when("group-joining"), href: "/portal/requests", detail: joinCount ? `${joinCount} عائلات تم الترحيب بها` : "حجاج مجموعتك كما يلحقهم المكتب، وملفاتهم الصحية", done: joinCount > 0 },
    { key: "field", title: "الميدان", date: "24 ذو القعدة", href: "/portal/field", detail: p?.musters.some((m) => m.closedAt) ? "سُجّل أول منسك أُدّي" : "أداء المناسك والإعلانات والتقييم", done: !!p?.musters.some((m) => m.closedAt) },
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
  const id = useStore((s) => s.sessionId);
  const profile = useStore((s) => (s.sessionId ? s.admins[s.sessionId] : undefined));
  return useMemo(() => {
    if (!id) return null;
    const person = getPerson(id);
    if (!person) return null;
    return { id, person, name: fullName(person), profile };
  }, [id, profile]);
}

/** A passed attempt at his role's test as the platform ships it, confirmed by the hall's supervisor */
export function passedAttempt(id: string, exam: string, startedAt: number, submittedAt: number, by = staffName("nisreen")): Attempt {
  return satAttempt({ id, role: exam, startedAt, submittedAt, by });
}

/**
 * Demo shortcut. "start" opens a fresh file; "field" fast-forwards to an approved group with
 * signed contracts so the requests and field screens can be tried right away.
 * Returns an error message when the account is a pilgrim this season (one path a season).
 */
export function demoAdminLogin(
  state: { accounts: Record<string, unknown>; admins: Record<string, AdminProfile> },
  id: string,
  mode: DemoAdminMode = "start",
): string | null {
  const chosen = (state.accounts[id] as { seasons?: Record<number, { path: string }> } | undefined)?.seasons?.[seasonNow(getState())]?.path;
  if (chosen === "pilgrim") return "هذا الحساب مسجّل على الحج في هذا الموسم، ولا يكون حاجاً وإدارياً في الموسم نفسه.";
  const demo = DEMO_ADMINS.find((d) => d.id === id);
  const existing = state.admins[id];
  const now = Date.now();
  // The demo administrators' password is the demo pilgrims' one, for anyone who types it in the form; the file opens on his account
  if (!existing) actions.upsertAdmin(id, { createdAt: now, phone: demo?.phone ?? `0944${id.slice(-6)}`, password: "hajj1448" });
  // Entering as an administrator is choosing the administrators' way this season
  actions.chooseSeasonPath(id, seasonNow(getState()), "admin");
  const min = 60_000;
  // ملف مكتمل حتى آخر مرحلة، فتظهر كل شاشات الصفة: حجاج المجموعة والملفات الصحية والميدان
  if (mode !== "start") {
    const position = demo?.position ?? "group-head";
    const tech = position === "tech";
    // One role per season. Same role as the last season served, with the rating: renewed without exams
    const last = lastServed(id);
    const keep = last?.roleKey === position && (last.rating ?? 0) >= SEASON.administrators.keepRole.minRating;
    actions.upsertAdmin(id, {
      season: seasonNow(getState()),
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
      // and the oral exam after it, before his role's committee
      oral: keep ? undefined : demoOral(examRoleOf(position), now - 50 * min),
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
            approvedBy: staffName("mazen"),
          },
      // A ready administrator is at the start of his work: his place in a cluster formed at the office, if one holds him
      ...(mode === "ready" ? (heldBySeed(id) ? postFor(id) : {}) : { ...postFor(id), ...clusterStateFor(id, position, now - 15 * min) }),
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

/** The demo's cluster story: تكتل النور was formed at the office with عبد الرحمن its head; بسام's group and أحمد's are in it */
/** The cluster's head, a group head in it, and (`next`) one granted «رئيس تكتل» whose group is outside any cluster: he comes to the office to form one (testdata/demo/defaults.json) */
export const CLUSTER_DEMO: { head: string; bassam: string; next: string } = DEFAULTS.clusterDemo;

/** The groups of the demo's ready group heads (testdata/admins/ready-groups.json): نبيل's outside any cluster, صلاح الدين's in تكتل البيان; مروان has none yet */
const READY_GROUPS: Record<string, { number: number; clusterId?: string }> = READY;

/** The group each finished demo group head leads in the story: the cluster's head 31, بسام 5, نبيل 63, the rest 27 */
export function demoGroupNumber(id: string) {
  return id === CLUSTER_DEMO.head ? 31 : id === CLUSTER_DEMO.bassam ? 5 : id === CLUSTER_DEMO.next ? 63 : TECH_POSTING.groupNumber;
}

const NOUR = () => SEED_CLUSTERS.find((c) => c.cluster.id === "al-nour")!;

/** Whether a seeded cluster holds him: one of the clusters the office formed */
const heldBySeed = (id: string) => SEED_CLUSTERS.some((x) => x.cluster.status === "approved" && holds(x.cluster, id));

/** Whether a seeded request holds him anywhere: its groups' seats, its assistants, coordinators, female guides or accountant */
function holds(c: ClusterRecord, id: string) {
  return c.accountant?.id === id || [...Object.values(c.seats).flat().map((x) => x.who), ...c.assistants, ...c.coordinators, ...c.femaleGuides].some((x) => x?.id === id && x.status === "accepted");
}

/**
 * Where a finished demo administrator works, as the approved request that holds him says (تكتل النور for most,
 * تكتل الصفا والمروة for the grade «ج» guides): among its coordinators (the groups sorted to him), in a group's
 * seat, among its female guides or its assistants — and its accountant
 */
function postFor(id: string): Partial<AdminProfile> {
  const seed = SEED_CLUSTERS.find((x) => x.cluster.status === "approved" && holds(x.cluster, id)) ?? NOUR();
  const c = seed.cluster;
  const base = { clusterId: c.id, clusterName: c.name, headId: seed.headId, headName: seed.headName };
  const out: Partial<AdminProfile> = {};
  if (c.accountant?.id === id) out.accountantOf = base;
  if (c.coordinators.some((x) => x.id === id)) return { ...out, coordinatorIn: { ...base, groups: Object.entries(c.sorting).filter(([, who]) => who === id).map(([n]) => Number(n)) } };
  const seat = Object.entries(c.seats).flatMap(([n, seats]) => seats.filter((x) => x.who?.id === id).map((x) => ({ n: Number(n), kind: x.kind })))[0];
  if (seat) return { ...out, servesIn: { ...base, role: seat.kind, groups: [seat.n] } };
  if (c.femaleGuides.some((x) => x.id === id)) return { ...out, servesIn: { ...base, role: "guide-f", groups: Object.entries(c.guideSorting ?? {}).filter(([, who]) => who === id).map(([n]) => Number(n)) } };
  if (c.assistants.some((x) => x.id === id)) return { ...out, servesIn: { ...base, role: "cluster-assistant", groups: [] } };
  return out;
}

/** What the formation left on each finished group head's file: the head owns the cluster */
function clusterStateFor(id: string, position: string, at: number): Partial<AdminProfile> {
  if (position !== "group-head") return {};
  const nour = NOUR();
  if (id === CLUSTER_DEMO.head) return { cluster: { ...nour.cluster, feePaidAt: at + 10 * 60_000 } };
  return {};
}

/**
 * The role an administrator actually holds this season. A group head whose cluster was formed at the office
 * with him its head becomes the cluster's head: it changes what he is, not only what he does.
 */
export function effectiveRole(p: AdminProfile | undefined, cadre = getState().cadre) {
  if (p?.cluster) return "cluster-head";
  return (p && seasonalOf(p.nationalId, cadre)?.role) ?? p?.positions[0] ?? "";
}

/** Does this administrator work at the cluster level (its head)? */
export function isClusterRole(p: AdminProfile | undefined) {
  return !!p?.cluster;
}

/** A role's name as the administration left it, or a secondary role's («محاسب التكتل») */
export function positionLabelOf(key: string) {
  return roleName(key);
}

export { nowMs } from "@/lib/utils";
