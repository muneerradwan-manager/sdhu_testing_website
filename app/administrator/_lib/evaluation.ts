"use client";

import { useMemo } from "react";
import type { OpFile, Place } from "@/lib/ops";
import { useStore, type ClusterRecord, type PeerEvaluation, type StageScores, type State } from "@/lib/store";
import { useEvaluationStages } from "./admin-rules";
import { acceptedGroups } from "./cluster";
import { ACCOUNTANT_TITLE, POOLS } from "./formation";

/**
 * The season's evaluation, after the pilgrims are home. Its windows, one after the other (lib/operations):
 * - «التقييم الذاتي للإداريين»: once the last return flight has landed in Damascus, a group's head, a cluster's
 *   head and the religious guides rate themselves (the coordinators and the assistants do not), stage by stage,
 *   with the questions of their role, and send it once;
 * - «تقييم الموظفين للإداريين والمجموعات والتكتلات»: after it, the mission's staff posted in a tower or a camp
 *   rate the clusters that lived there — each cluster as a whole, each of its groups, and each administrator in
 *   it — stage by stage, beside the administration's own evaluation in «إدارة الإداريين» (`evaluations`);
 * - «الاعتراض على التقييم»: then each administrator may object to the staff's evaluation of him, and the
 *   administration decides.
 * The adopted evaluation is these two only: his own and the staff's, shown side by side, never mixed into one
 * number. Administrators do not rate one another. The pilgrims' evaluation after their return is optional and
 * general, and rates no one by name. A group's or a cluster's staff evaluation is kept under «g-<group>» /
 * «c-<cluster>».
 */

export type Stage = { key: string; label: string; hint: string };

// ───────────────────────── The self-evaluation ─────────────────────────

/**
 * Who rates himself: a group's head, a cluster's head, and the religious guides, men and women. The technical
 * coordinators and the assistants (the cluster's assistant and accountant among them) have no self-evaluation —
 * the staff rate them, as everyone.
 */
export type SelfRole = "group-head" | "cluster-head" | "guide-m" | "guide-f";

export const SELF_ROLE_LABEL: Record<SelfRole, string> = { "group-head": "رئيس مجموعة", "cluster-head": "رئيس تكتل", "guide-m": "موجّه ديني", "guide-f": "موجّهة دينية" };

/** `examRole`: the exam his role sits (./structure examRoleOf) */
export function selfRoleOf(examRole: string, clusterHead: boolean): SelfRole | null {
  if (clusterHead) return "cluster-head";
  if (examRole === "group-head") return "group-head";
  if (examRole === "guide-m" || examRole === "guide-f") return examRole;
  return null;
}

const q = (stage: string, labels: [string, string][]): Stage[] => labels.map(([label, hint], i) => ({ key: `${stage}:${i + 1}`, label, hint }));

/**
 * The questions of each stage, by role. A group's and a cluster's are administrative only — the group's for his
 * group, the cluster's for all its groups; the guides' are religious: the rites, the rulings, the guidance.
 */
const QUESTIONS: Record<SelfRole, Record<string, Stage[]>> = {
  "group-head": {
    pretravel: q("pretravel", [
      ["تجهيز ملفات حجاج المجموعة ووثائقهم", "مع المنسق التقني: الجوازات، والصور، والملفات الصحية"],
      ["التواصل مع العائلات قبل السفر", "إبلاغها بالتعليمات والمواعيد وما تحمله معها"],
      ["اجتماع فريق المجموعة وتوزيع المهام", "على الموجّه والمعاون، قبل السفر"],
    ]),
    airport: q("airport", [
      ["تجميع حجاج المجموعة في الموعد وتحضيرهم", "من قائمة المجموعة، قبل الانطلاق إلى المطار"],
      ["إنهاء الإجراءات والأمتعة دون تأخير", "بالترتيب الذي حددته البعثة"],
      ["رعاية كبار السن وذوي الاحتياجات في المطار", "الكراسي والمرافقة والأولوية"],
    ]),
    travel: q("travel", [
      ["متابعة الحجاج في الرحلة وعند الوصول", "العدد كاملاً، والحالات الصحية"],
      ["الانتقال من المطار إلى السكن", "الحافلات وترتيب الصعود والنزول"],
      ["استلام الأمتعة وتسليمها لأصحابها", "دون ضياع ولا تأخير"],
    ]),
    makkah: q("makkah", [
      ["توزيع الغرف وفق العقود والاحتياجات", "السكن العام والغرف الخاصة"],
      ["تنظيم التفويج إلى الحرم والعودة منه", "المواعيد ونقاط التجمّع"],
      ["حل الشكاوى داخل المجموعة", "قبل أن تصل إلى غرفة العمليات"],
    ]),
    madinah: q("madinah", [
      ["الانتقال إلى المدينة والإسكان فيها", "في الموعد، وبالغرف نفسها قدر الإمكان"],
      ["تنظيم الزيارات وفق البرنامج", "المواعيد والحافلات والعودة"],
      ["متابعة الحالات الصحية والبلاغات", "مع المنسق وغرفة العمليات"],
    ]),
    mashaer: q("mashaer", [
      ["تنظيم النقل بين منى وعرفة ومزدلفة", "وفق جدول التفويج"],
      ["الخيام والماء والطعام والسلامة", "لكل حجاج المجموعة"],
      ["تفويج الرمي وطواف الإفاضة في الأوقات المحددة", "تجنّب الزحام، وكبار السن خاصة"],
    ]),
  },
  "cluster-head": {
    pretravel: q("pretravel", [
      ["تنسيق مجموعات التكتل", "توزيع المنسقين والموجّهات على المجموعات"],
      ["إعداد الخطة التشغيلية وتقديمها في موعدها", "كما اعتمدتها الإدارة"],
      ["التواصل مع المكتب والإدارة قبل السفر", "المراسلات والاجتماعات"],
    ]),
    airport: q("airport", [
      ["تنسيق مواعيد تجمّع المجموعات وتسلسل تفويجها", "دون تداخل بين المجموعات"],
      ["متابعة معاوني التكتل في المطار", "الإجراءات والأمتعة"],
      ["حل ما يعترض المجموعات في الإجراءات", "مع البعثة في المطار"],
    ]),
    travel: q("travel", [
      ["متابعة رحلات مجموعات التكتل ووصولها", "كل رحلة وكل مجموعة"],
      ["استقبال المجموعات في السكن", "الحافلات والتوزيع على الفنادق"],
      ["التواصل مع البعثة عند الوصول", "مشرفي الأبراج وغرفة العمليات"],
    ]),
    makkah: q("makkah", [
      ["الإشراف على سكن المجموعات وفق الخطة", "الفنادق والغرف والخدمات"],
      ["التنسيق مع مشرفي الأبراج وغرفة العمليات", "البلاغات والمتابعة"],
      ["متابعة شكاوى المجموعات وحلّها", "على مستوى التكتل"],
    ]),
    madinah: q("madinah", [
      ["تنظيم انتقال المجموعات إلى المدينة", "المواعيد والحافلات"],
      ["تنسيق برامج الزيارة بين المجموعات", "دون تزاحم"],
      ["متابعة سكن المدينة وخدماته", "كما التزم به برنامج التكتل"],
    ]),
    mashaer: q("mashaer", [
      ["تنسيق نقل المجموعات بين المشاعر وفق التفويج", "منى وعرفة ومزدلفة"],
      ["الإشراف على المخيمات وخدماتها", "الماء والطعام والكهرباء والسلامة"],
      ["إدارة الطوارئ والتواصل مع غرفة العمليات", "سرعة الإبلاغ والمتابعة"],
    ]),
  },
  "guide-m": {
    pretravel: q("pretravel", [
      ["دروس التهيئة للمناسك قبل السفر", "صفة الحج والعمرة وترتيب أعمالهما"],
      ["شرح أحكام الإحرام ومحظوراته", "ولباس الإحرام وسننه"],
      ["الإجابة عن الأسئلة الشرعية قبل السفر", "في الدروس وفي قناة المجموعة"],
    ]),
    airport: q("airport", [
      ["التذكير بنية الإحرام والميقات قبل الرحلة", "متى يُحرم الحاج ومن أين"],
      ["تعليم أدعية السفر وآدابه", "دعاء الركوب والسفر"],
      ["تهيئة الحجاج إيمانياً للرحلة", "التوبة، والصبر، وحسن الخلق"],
    ]),
    travel: q("travel", [
      ["التنبيه إلى الإحرام عند محاذاة الميقات في الطائرة", "في وقته"],
      ["التلبية والأذكار في الطريق", "رفع الصوت بالتلبية للرجال"],
      ["أحكام الصلاة في السفر", "القصر والجمع"],
    ]),
    makkah: q("makkah", [
      ["شرح العمرة ومرافقة الحجاج في الطواف والسعي", "خطوة خطوة، وكبار السن خاصة"],
      ["الدروس اليومية في السكن", "في مواعيدها، وحضور الحجاج"],
      ["الإجابة عن الأسئلة الشرعية", "بالدليل، وبما اعتمدته البعثة"],
    ]),
    madinah: q("madinah", [
      ["آداب زيارة المسجد النبوي والسلام على النبي ﷺ", "والصلاة في الروضة"],
      ["زيارة المساجد والمعالم المشروعة", "قباء والبقيع وأحد"],
      ["التنبيه إلى المخالفات في الزيارة", "بالحكمة واللين"],
    ]),
    mashaer: q("mashaer", [
      ["شرح أعمال يوم التروية وعرفة ومزدلفة", "قبل كل يوم بوقته"],
      ["أحكام رمي الجمرات والتوكيل فيه", "لكبار السن والمرضى"],
      ["أحكام طواف الإفاضة والوداع والتحلّل", "وترتيب أعمال يوم النحر"],
    ]),
  },
  "guide-f": {
    pretravel: q("pretravel", [
      ["دروس التهيئة للحاجّات قبل السفر", "صفة الحج والعمرة للمرأة"],
      ["أحكام إحرام المرأة ولباسها", "وما يحلّ لها وما يحرم"],
      ["أحكام الحيض والنفاس في الحج", "وما تفعله الحاجّة إن طرأ عليها"],
    ]),
    airport: q("airport", [
      ["تذكير الحاجّات بنية الإحرام والميقات", "قبل الرحلة"],
      ["تعليم أدعية السفر وآدابه", "دعاء الركوب والسفر"],
      ["تهيئة كبيرات السن للرحلة", "طمأنتهنّ ومرافقتهنّ"],
    ]),
    travel: q("travel", [
      ["التنبيه إلى الإحرام عند محاذاة الميقات في الطائرة", "في وقته"],
      ["تلبية المرأة وأذكار الطريق", "سرّاً بلا رفع صوت"],
      ["أحكام الصلاة في السفر", "القصر والجمع"],
    ]),
    makkah: q("makkah", [
      ["مرافقة الحاجّات في الطواف والسعي", "وكبيرات السن خاصة"],
      ["دروس الحاجّات اليومية", "في مواعيدها، في مجموعاتك"],
      ["أسئلة الحاجّات الخاصة", "بسرّية وفي وقتها"],
    ]),
    madinah: q("madinah", [
      ["آداب زيارة المرأة للمسجد النبوي والروضة", "مواعيد النساء وأماكنهنّ"],
      ["زيارة المعالم المشروعة", "قباء والبقيع وأحد"],
      ["التنبيه إلى المخالفات في الزيارة", "بالحكمة واللين"],
    ]),
    mashaer: q("mashaer", [
      ["أعمال المشاعر للحاجّات", "التروية وعرفة ومزدلفة"],
      ["التوكيل في الرمي لكبيرات السن والمريضات", "متى يجوز وكيف"],
      ["أحكام طواف الإفاضة للحائض", "وما تفعله إن حان سفرها"],
    ]),
  },
};

/** «خلاصة موسمك»: what he writes */
export const REFLECTION: { key: string; label: string; hint: string }[] = [
  { key: "achieved", label: "أبرز ما أنجزته في هذا الموسم", hint: "موقف أو عمل تفخر به" },
  { key: "hardest", label: "أصعب ما واجهته، وكيف تعاملت معه", hint: "في أي مرحلة، ومع من" },
  { key: "needs", label: "ما تحتاجه لتكون أفضل في الموسم القادم", hint: "تدريب، أو أداة، أو دعم" },
  { key: "suggest", label: "اقتراح للإدارة", hint: "ما الذي تغيّره لو كان القرار لك؟" },
];

export type SelfSection = { key: string; title: string; intro: string; items?: Stage[]; questions?: typeof REFLECTION };

/**
 * The self-evaluation in its sections, for one role: a section for each of the season's stages, with that stage's
 * questions for his role (a stage the administration added has one question of its own), then a written summary.
 * Each stage's questions are averaged into the stage's score, shown beside the staff's.
 */
export function selfSections(stages: Stage[], role: SelfRole): SelfSection[] {
  const kind = role === "guide-m" || role === "guide-f" ? "أسئلة دينية" : "أسئلة إدارية";
  return [
    ...stages.map((st) => ({
      key: st.key,
      title: st.label,
      intro: `${st.hint}. ${kind} لصفتك «${SELF_ROLE_LABEL[role]}».`,
      items: QUESTIONS[role][st.key] ?? [{ key: `${st.key}:1`, label: `عملك في ${st.label}`, hint: st.hint }],
    })),
    { key: "reflection", title: "خلاصة موسمك", intro: "بكلماتك: ما الذي نجح، وما الذي صعب، وما الذي تحتاجه.", questions: REFLECTION },
  ];
}

/** A section's scores, from the self-evaluation: each stage's questions under the stage's key */
export function sectionScores(self: { stages: StageScores; sections?: Record<string, StageScores> } | undefined, key: string): StageScores {
  return self?.sections?.[key] ?? {};
}

/** A stage's scores averaged, or null when nobody scored it */
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const round1 = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10);

/** The stages scored in one evaluation, averaged */
export function avgOf(stages: StageScores | undefined) {
  return mean(Object.values(stages ?? {}).map((x) => x.score).filter((x) => x > 0));
}

// ───────────────────────── Who is evaluated, by whom ─────────────────────────

/** Someone a cluster holds, with his place in it */
export type CadreMember = { id: string; name: string; posts: string[]; groups: number[] };

/** Everyone a cluster's request holds, each once with all his places: its head and accountant, its groups' heads and seats, its assistants, coordinators and female guides */
export function cadreMembers(headId: string, headName: string, c: ClusterRecord): CadreMember[] {
  const map = new Map<string, CadreMember>();
  const yes = (s?: string) => s === "accepted";
  const put = (id: string, name: string, post: string, group?: number) => {
    const cur = map.get(id) ?? { id, name, posts: [], groups: [] };
    if (!cur.posts.includes(post)) cur.posts.push(post);
    if (group !== undefined && !cur.groups.includes(group)) cur.groups.push(group);
    map.set(id, cur);
  };
  put(headId, headName, "رئيس التكتل");
  for (const g of acceptedGroups(c)) {
    put(g.id, g.name, "رئيس المجموعة", g.number);
    for (const seat of c.seats[g.number] ?? []) if (seat.who && yes(seat.who.status)) put(seat.who.id, seat.who.name, POOLS[seat.kind].title, g.number);
  }
  for (const x of c.assistants) if (yes(x.status)) put(x.id, x.name, POOLS["cluster-assistant"].title);
  for (const x of c.coordinators) if (yes(x.status)) put(x.id, x.name, POOLS.tech.title);
  for (const x of c.femaleGuides) if (yes(x.status)) put(x.id, x.name, POOLS["guide-f"].title);
  if (c.accountant && yes(c.accountant.status)) put(c.accountant.id, c.accountant.name, ACCOUNTANT_TITLE);
  return [...map.values()];
}

/** Where a staff member was posted this season with the clusters that lived there: a tower or a camp holds its own; a sector or a centre all of its towers' or camps' */
export type StaffPlace = { file: string; role: string; place: string; clusters: string[] };

export function staffPlacesOf(employeeId: string, files: OpFile[], places: Map<string, Place>, season: number): StaffPlace[] {
  const out: StaffPlace[] = [];
  for (const file of files.filter((f) => f.season === season)) {
    for (const o of file.nodes) {
      if (o.members.some((m) => m.employeeId === employeeId)) {
        const clusters = [...new Set(o.children.flatMap((c) => c.clusters))];
        if (clusters.length) out.push({ file: file.type, role: o.members.find((m) => m.employeeId === employeeId)!.role, place: places.get(o.refId)?.name ?? o.refId, clusters });
      }
      for (const c of o.children) {
        const m = c.members.find((x) => x.employeeId === employeeId);
        if (m && c.clusters.length) out.push({ file: file.type, role: m.role, place: places.get(c.refId)?.name ?? c.refId, clusters: c.clusters });
      }
    }
  }
  return out;
}

// ───────────────────────── The result ─────────────────────────

export type EvaluationResult = {
  self?: State["selfEvaluations"][string];
  /** His self-evaluation averaged over every item he scored, and over the season's stages alone */
  selfAvg: number | null;
  /** The staff's evaluation: each rater's average, averaged — the adopted evaluation */
  staffAvg: number | null;
  staffCount: number;
  /** Each stage: his own score beside the staff's (the administration and the posted staff averaged) */
  stages: { key: string; label: string; self: number | null; staff: number | null; gap: boolean }[];
  /** Everyone who scored him, by name (the administration sees them; he sees only the averages) */
  raters: { kind: "staff" | "administration"; by: string; role: string; place?: string; avg: number | null; at: number; note?: string }[];
  objection?: State["evaluationObjections"][string];
};

/**
 * One administrator's season evaluation as it stands: the two parts that are adopted — his self-evaluation and
 * the staff's — side by side, never mixed into one number, stage by stage with the gaps pointed out, and his
 * objection to the staff's if he made one. The pilgrims' evaluation after the return is optional and general:
 * it rates no one by name and counts in neither.
 */
export function evaluationOf(id: string, stages: Stage[], s: Pick<State, "evaluations" | "peerEvaluations" | "selfEvaluations" | "evaluationObjections">): EvaluationResult {
  const self = s.selfEvaluations[id];
  const official = s.evaluations[id];
  const peers = Object.values(s.peerEvaluations[id] ?? {}) as PeerEvaluation[];
  const staffSets: StageScores[] = [...(official ? [official.stages] : []), ...peers.map((p) => p.stages)];
  const at = (sets: StageScores[], key: string) => round1(mean(sets.map((x) => x[key]?.score ?? 0).filter((x) => x > 0)));
  const sent = !!self?.submittedAt;
  const rows = stages.map((st) => {
    const mine = sent ? (self!.stages[st.key]?.score ?? null) : null;
    const staff = at(staffSets, st.key);
    return { key: st.key, label: st.label, self: mine, staff, gap: mine !== null && staff !== null && Math.abs(mine - staff) >= 1 };
  });
  const staffAvgs = staffSets.map(avgOf).filter((x): x is number => x !== null);
  const everything = sent ? Object.assign({}, ...Object.values(self!.sections ?? {})) : undefined;
  const raters: EvaluationResult["raters"] = [
    ...(official ? [{ kind: "administration" as const, by: official.by, role: "إدارة الإداريين", avg: round1(official.avg), at: official.at }] : []),
    ...peers.map((p) => ({ kind: p.kind, by: p.by, role: p.role, place: p.place, avg: round1(avgOf(p.stages)), at: p.at, note: p.note })),
  ];
  return { self, selfAvg: round1(avgOf(everything)), staffAvg: round1(mean(staffAvgs)), staffCount: staffAvgs.length, stages: rows, raters, objection: s.evaluationObjections[id] };
}

/** The same, live */
export function useEvaluationOf(id: string | undefined) {
  const stages = useEvaluationStages();
  const evaluations = useStore((x) => x.evaluations);
  const peerEvaluations = useStore((x) => x.peerEvaluations);
  const selfEvaluations = useStore((x) => x.selfEvaluations);
  const evaluationObjections = useStore((x) => x.evaluationObjections);
  return useMemo(() => (id ? evaluationOf(id, stages, { evaluations, peerEvaluations, selfEvaluations, evaluationObjections }) : null), [id, stages, evaluations, peerEvaluations, selfEvaluations, evaluationObjections]);
}

/** What the staff gave a group («g-<group>») or a cluster («c-<cluster>») as a whole: the average of their evaluations, and how many */
export function entityEvaluationOf(target: string, peers: State["peerEvaluations"]) {
  const avgs = Object.values(peers[target] ?? {}).map((p) => avgOf(p.stages)).filter((x): x is number => x !== null);
  return { avg: round1(mean(avgs)), count: avgs.length };
}
