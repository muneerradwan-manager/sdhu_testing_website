/**
 * The administrators' qualification test (الاختبار المؤتمت), as the administration's exam platform runs it.
 * A small, fictional sample of the question bank. Every role sits its own test: each question belongs to the
 * roles whose test it is part of — some to every role (first aid, emergencies, dealing with pilgrims), most to
 * one or two (the guides' rulings, the coordinator's desk, the deputy's attendance).
 * A role's test is built in sections (القسم الإداري، القسم الشرعي…): each draws so many questions for every
 * paper and has its own pass mark, and passing the test means passing every section. There are no written
 * (تحريرية) questions: every question is chosen from options and marked by the platform. The oral exam follows it, before
 * each role's committee (app/administrator/_lib/oral.ts).
 */

import type { Attempt } from "@/lib/store";
import QUESTIONS from "@/testdata/exams/questions.json";
import BLUEPRINTS from "@/testdata/exams/blueprints.json";

export type ExamCategory = "ديني" | "إداري" | "تشغيلي" | "إسعافات أولية" | "إدارة الحشود" | "نقل" | "طوارئ" | "تقني";
export const EXAM_CATEGORIES: ExamCategory[] = ["ديني", "إداري", "تشغيلي", "إدارة الحشود", "نقل", "إسعافات أولية", "طوارئ", "تقني"];

/**
 * How a question is answered: one of several options, or true or false (two options). There are no written
 * answers: every question is marked by the platform the moment the paper is sent.
 */
export type QuestionType = "choice" | "truefalse";
export const QUESTION_TYPES: Record<QuestionType, string> = { choice: "اختيار من متعدد", truefalse: "صح أو خطأ" };
export const TRUE_FALSE = ["صح", "خطأ"];

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


/** The bank as the demo opens it (testdata/exams/questions.json); the exam system adds and edits on top of it */
export const EXAM_QUESTIONS: ExamQuestion[] = QUESTIONS as ExamQuestion[];

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

/**
 * Each role's test as the platform ships it (testdata/exams/blueprints.json): every section passed at 50%; the exam
 * system rebuilds it
 */
export const DEFAULT_BLUEPRINTS: Record<string, ExamBlueprint> = BLUEPRINTS as Record<string, ExamBlueprint>;

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
