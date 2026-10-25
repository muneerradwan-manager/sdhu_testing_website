"use client";

import { useMemo } from "react";
import { groupName } from "@/lib/groups";
import { CURRENT_SEASON, fileTypeOf, type FileTypeCode, type OpFile, type Place } from "@/lib/ops";
import { useStore, type ClusterRecord, type EvaluationPoint, type StageScores, type State } from "@/lib/store";
import { useEvaluationStages } from "./admin-rules";
import { acceptedGroups } from "./cluster";

/**
 * The season's evaluation, after the pilgrims are home. It has three phases (their windows are lib/operations):
 * 1. «التقييم الذاتي» and «تقييم الموظفين» together. A group's head, a cluster's head and the religious guides rate
 *    themselves, stage by stage, with the questions of their role. At the same time the staff who were with them rate
 *    them, with the same questions: the Makkah hotel's staff rate the Makkah stage, the Madinah hotel's the Madinah
 *    stage, the camps' the mashaer stage, and the flights' supervisors — a file of their own — the airport and the
 *    travel stages, for every cluster. To rate a group's head is to rate the group; a cluster's head, the cluster; a guide,
 *    the guide. Nobody else is rated.
 * 2. «الاعتراض على التقييم»: an administrator may object to the staff's evaluation, with evidence — photos, sound, video,
 *    documents — and the staff who rated him answer with their own.
 * 3. «قرار لجنة التقييم»: the committee (a file of its own) reads both sides and, for each stage objected to, decides his
 *    score, the staff's, or a third of its own.
 * With no objection the staff's score stands. Whoever rated is hidden from the administrator and from the administration —
 * they see how many rated, never who — and known to the committee alone, which can summon him. The pilgrims' evaluation
 * is general, rates no one by name and counts in none of this.
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

/**
 * The key a rating is kept under (the rater's own record, `by`, travels with it for the committee): the one who rated can
 * compute it again to find his own.
 */
export function raterKey(userId: string) {
  let h = 5381;
  for (const ch of `${CURRENT_SEASON}|${userId}`) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return `r${h.toString(36)}`;
}

/** The stage keys of the staff's files: where each saw the cluster (a file type's `evaluates`) */
export const stagesOfFile = (type: FileTypeCode) => fileTypeOf(type).evaluates?.stages ?? [];

/** Where a staff member was posted this season: the clusters that lived there, and the stages he saw of them */
export type StaffPlace = { file: FileTypeCode; place: string; clusters: string[]; stages: string[] };

/**
 * The places a staff member rates from: a tower or a camp holds its own clusters, a sector or a centre all of its towers'
 * or camps'; the staff of a file that serves every cluster (the flights') rate all of them — `all`, the approved clusters' ids.
 */
export function staffPlacesOf(employeeId: string, files: OpFile[], places: Map<string, Place>, season: number, all: string[] = []): StaffPlace[] {
  const out: StaffPlace[] = [];
  for (const file of files.filter((f) => f.season === season)) {
    const type = fileTypeOf(file.type);
    if (!type.evaluates) continue;
    if (type.evaluates.all) {
      if (file.members.some((m) => m.employeeId === employeeId) && all.length) out.push({ file: file.type, place: type.short, clusters: all, stages: type.evaluates.stages });
      continue;
    }
    for (const o of file.nodes) {
      if (o.members.some((m) => m.employeeId === employeeId)) {
        const clusters = [...new Set(o.children.flatMap((c) => c.clusters))];
        if (clusters.length) out.push({ file: file.type, place: places.get(o.refId)?.name ?? o.refId, clusters, stages: type.evaluates.stages });
      }
      for (const c of o.children) {
        if (c.members.some((x) => x.employeeId === employeeId) && c.clusters.length) out.push({ file: file.type, place: places.get(c.refId)?.name ?? c.refId, clusters: c.clusters, stages: type.evaluates.stages });
      }
    }
  }
  return out;
}

/** Someone a staff member rates: an administrator with a self-evaluation, the role he is rated as, and the stages this rater saw */
export type Evaluatee = { id: string; name: string; role: SelfRole; title: string; clusterId: string; clusterName: string; place: string; stages: string[] };

/**
 * Whom a cluster's staff rate: its head (rated as the cluster), each group's head (rated as the group) and the religious
 * guides — the only ones with a self-evaluation to put the rating beside. The coordinators, the assistants and the
 * accountant are not rated.
 */
export function evaluateesOfCluster(clusterId: string, clusterName: string, headId: string, headName: string, c: ClusterRecord): Omit<Evaluatee, "place" | "stages">[] {
  const base = { clusterId, clusterName };
  const out: Omit<Evaluatee, "place" | "stages">[] = [{ ...base, id: headId, name: headName, role: "cluster-head", title: `رئيس ${clusterName}` }];
  for (const g of acceptedGroups(c)) {
    if (g.id !== headId) out.push({ ...base, id: g.id, name: g.name, role: "group-head", title: `رئيس ${groupName(g.number)}` });
    for (const seat of c.seats[g.number] ?? []) if (seat.kind === "guide" && seat.who?.status === "accepted") out.push({ ...base, id: seat.who.id, name: seat.who.name, role: "guide-m", title: `موجّه ${groupName(g.number)}` });
  }
  for (const x of c.femaleGuides) if (x.status === "accepted") out.push({ ...base, id: x.id, name: x.name, role: "guide-f", title: `موجّهة ${clusterName}` });
  return out;
}

// ───────────────────────── The result ─────────────────────────

/** The score a stage ends with, and where it comes from */
export type StageResult = {
  key: string;
  label: string;
  self: number | null;
  staff: number | null;
  /** A point or more between them */
  gap: boolean;
  /** He objected to the staff's score of this stage */
  objected: boolean;
  /** The committee's decision on it, once taken */
  decision?: State["evaluationDecisions"][string]["stages"][string];
  /** The adopted score: the staff's when nobody objected, the committee's when he did; his own where nobody rated the stage */
  final: number | null;
  source: "staff" | "self" | "committee" | null;
  /** Objected to, and the committee has not decided it yet */
  pending: boolean;
};

/** A positive or a negative as it counts: the staff's value, or the committee's where it changed it */
export type PointResult = { point: EvaluationPoint; objected: boolean; decided?: { points: number; note?: string }; value: number; pending: boolean };

export type EvaluationResult = {
  self?: State["selfEvaluations"][string];
  /** His self-evaluation averaged over every item he scored */
  selfAvg: number | null;
  /** The staff's evaluation: each rater's average, averaged */
  staffAvg: number | null;
  /** How many rated him: a number, never a name */
  staffCount: number;
  stages: StageResult[];
  objection?: State["evaluationObjections"][string];
  decision?: State["evaluationDecisions"][string];
  /** The stages' adopted scores averaged (those still pending are left out until decided), out of 5 */
  finalAvg: number | null;
  /** Stages objected to and not yet decided */
  pending: number;
  /** The positives and negatives the staff added, as they count, and their totals */
  points: PointResult[];
  plus: number;
  minus: number;
  net: number;
  /** Negatives objected to and not yet decided */
  pendingPoints: number;
  /** The first result, out of 100: the stages' adopted average, before the points */
  base100: number | null;
  /** The committee adopted the final result */
  finalized: boolean;
  /** The final result, out of 100: the first result plus the net points (never above 100 or below 0), once adopted */
  final100: number | null;
  /** What the classification takes, out of 5: the final result once adopted, else the first */
  score5: number | null;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * One administrator's season evaluation as it stands: his own and the staff's side by side, stage by stage, his objection
 * and the committee's decision, and the adopted score — the staff's where he did not object, the committee's where he did.
 * Then the staff's positives and negatives (points, each with its reason and evidence), which the committee may change; and
 * the final result: the first result out of 100 plus the net points, adopted by the committee. No rater is ever named: only how many.
 */
export function evaluationOf(id: string, stages: Stage[], s: Pick<State, "peerEvaluations" | "selfEvaluations" | "evaluationObjections" | "evaluationDecisions" | "evaluationPoints">): EvaluationResult {
  const self = s.selfEvaluations[id];
  const peers = Object.values(s.peerEvaluations[id] ?? {});
  const objection = s.evaluationObjections[id];
  const decision = s.evaluationDecisions[id];
  const sent = !!self?.submittedAt;
  const rows: StageResult[] = stages.map((st) => {
    const mine = sent ? (self!.stages[st.key]?.score ?? null) : null;
    const staff = round1(mean(peers.map((p) => p.stages[st.key]?.score ?? 0).filter((x) => x > 0)));
    const objected = !!objection?.stages.includes(st.key);
    const decided = objected ? decision?.stages[st.key] : undefined;
    const final = objected ? (decided?.score ?? null) : (staff ?? mine);
    const source: StageResult["source"] = objected ? (decided ? "committee" : null) : staff !== null ? "staff" : mine !== null ? "self" : null;
    return { key: st.key, label: st.label, self: mine, staff, gap: mine !== null && staff !== null && Math.abs(mine - staff) >= 1, objected, decision: decided, final, source, pending: objected && !decided };
  });
  const staffAvgs = peers.map((p) => avgOf(p.stages)).filter((x): x is number => x !== null);
  const everything = sent ? Object.assign({}, ...Object.values(self!.sections ?? {})) : undefined;
  const finalAvg = round1(mean(rows.map((r) => r.final).filter((x): x is number => x !== null)));

  const points: PointResult[] = (s.evaluationPoints[id] ?? []).map((point) => {
    const objected = !!objection?.points?.includes(point.id);
    const decided = decision?.points?.[point.id];
    return { point, objected, decided, value: decided?.points ?? point.points, pending: objected && !decided };
  });
  const plus = points.reduce((a, x) => a + (x.value > 0 ? x.value : 0), 0);
  const minus = points.reduce((a, x) => a + (x.value < 0 ? x.value : 0), 0);
  const net = plus + minus;
  const base100 = finalAvg === null ? null : round1(finalAvg * 20);
  const finalized = !!decision?.finalAt;
  const final100 = finalized && base100 !== null ? round1(clamp(base100 + net, 0, 100)) : null;
  return {
    self,
    selfAvg: round1(avgOf(everything)),
    staffAvg: round1(mean(staffAvgs)),
    staffCount: staffAvgs.length,
    stages: rows,
    objection,
    decision,
    finalAvg,
    pending: rows.filter((r) => r.pending).length,
    points,
    plus,
    minus,
    net,
    pendingPoints: points.filter((x) => x.pending).length,
    base100,
    finalized,
    final100,
    score5: final100 !== null ? round1(final100 / 20) : finalAvg,
  };
}

/** The five stores the evaluation reads, as one stable object */
export function useEvaluationState() {
  const peerEvaluations = useStore((x) => x.peerEvaluations);
  const selfEvaluations = useStore((x) => x.selfEvaluations);
  const evaluationObjections = useStore((x) => x.evaluationObjections);
  const evaluationDecisions = useStore((x) => x.evaluationDecisions);
  const evaluationPoints = useStore((x) => x.evaluationPoints);
  return useMemo(() => ({ peerEvaluations, selfEvaluations, evaluationObjections, evaluationDecisions, evaluationPoints }), [peerEvaluations, selfEvaluations, evaluationObjections, evaluationDecisions, evaluationPoints]);
}

/** The same, live */
export function useEvaluationOf(id: string | undefined) {
  const stages = useEvaluationStages();
  const st = useEvaluationState();
  return useMemo(() => (id ? evaluationOf(id, stages, st) : null), [id, stages, st]);
}

/** Every rated administrator's score out of 5, by id: what the classification of the groups and the clusters is made of */
export function useFinalScores(): Record<string, number> {
  const stages = useEvaluationStages();
  const st = useEvaluationState();
  return useMemo(() => {
    const out: Record<string, number> = {};
    for (const id of new Set([...Object.keys(st.peerEvaluations), ...Object.keys(st.evaluationPoints)])) {
      const f = evaluationOf(id, stages, st).score5;
      if (f !== null) out[id] = f;
    }
    return out;
  }, [stages, st]);
}

/** Whether an employee sits on the evaluation committee this season: he is assigned to the committee's file */
export function inCommittee(employeeId: string | undefined, files: OpFile[], season: number) {
  return !!employeeId && files.some((f) => f.season === season && fileTypeOf(f.type).decides && f.members.some((m) => m.employeeId === employeeId));
}
