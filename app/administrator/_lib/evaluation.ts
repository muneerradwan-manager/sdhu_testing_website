"use client";

import { useMemo } from "react";
import type { OpFile, Place } from "@/lib/ops";
import { useStore, type ClusterRecord, type PeerEvaluation, type StageScores, type State } from "@/lib/store";
import { useEvaluationStages } from "./admin-rules";
import { acceptedGroups } from "./cluster";
import { ACCOUNTANT_TITLE, DEPUTY_TITLE, POOLS } from "./formation";

/**
 * The season's evaluation, after the pilgrims are home. Its windows, one after the other (lib/operations):
 * - «التقييم الذاتي للإداريين»: once the last return flight has landed in Damascus, every administrator rates
 *   himself, in sections, and sends it once;
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

// ───────────────────────── The self-evaluation's sections ─────────────────────────

/** How he worked, whatever the stage */
export const AXES: Stage[] = [
  { key: "punctuality", label: "الالتزام بالمواعيد والتجمّعات", hint: "التجمّعات في وقتها، والانطلاق دون تأخير" },
  { key: "communication", label: "التواصل مع الحجاج", hint: "الرد على الهاتف، وقناة المجموعة، والإعلانات الواضحة" },
  { key: "teamwork", label: "التعاون مع فريق المجموعة والتكتل", hint: "توزيع المهام، والمساندة بين المجموعات" },
  { key: "emergencies", label: "التعامل مع البلاغات والطوارئ", hint: "الإبلاغ في وقته، ومتابعة الحالة حتى تُغلق" },
  { key: "care", label: "رعاية كبار السن وذوي الاحتياجات", hint: "المرافقة، والكراسي، والوجبات والغرف الخاصة" },
  { key: "platform", label: "استخدام المنصة والتقارير", hint: "مسح البطاقات، والتقرير اليومي، والملفات الصحية" },
];

/** The duties of his role, by the exam it sits (./structure examRoleOf), as the job descriptions list them */
const ROLE_ITEMS: Record<string, Stage[]> = {
  "group-head": [
    { key: "group-lead", label: "قيادة المجموعة وفريقها", hint: "توزيع المهام على الموجّه والمعاون، والاجتماع اليومي" },
    { key: "group-pilgrims", label: "متابعة حجاج المجموعة وعقودهم", hint: "الترحيب بالعائلات، والملفات الصحية مع المنسق" },
    { key: "group-housing", label: "السكن وتوزيع الغرف", hint: "الغرف الخاصة والعامة، والاحتياجات الخاصة" },
    { key: "group-complaints", label: "حل الشكاوى داخل المجموعة", hint: "قبل أن تصل إلى غرفة العمليات" },
  ],
  "group-deputy": [
    { key: "dep-muster", label: "الحضور والتجمّع ومسح البطاقات", hint: "قبل كل انطلاق، وفي المطارات والمشاعر" },
    { key: "dep-airports", label: "المطارات والأمتعة", hint: "الوصول والمغادرة وتسليم الأمتعة" },
    { key: "dep-supplies", label: "المستلزمات والوجبات الخاصة", hint: "توزيعها على أصحابها في وقتها" },
    { key: "dep-support", label: "مساندة رئيس المجموعة", hint: "تغطية غيابه، وتنفيذ ما يُسند إليك" },
  ],
  tech: [
    { key: "tech-records", label: "بيانات الحجاج وأوراقهم", hint: "التسجيل في المكتب، واكتمال الوثائق" },
    { key: "tech-health", label: "الملفات الصحية", hint: "أخذها من العائلات، وإيصال الاحتياجات إلى الغرف والوجبات" },
    { key: "tech-cards", label: "البطاقات الرقمية والتطبيق", hint: "تفعيلها، ومساعدة كبار السن على استعمالها" },
    { key: "tech-groups", label: "دعم المجموعات الموزّع عليها", hint: "ضمن حدّك من الوحدات، والرد على رؤسائها" },
  ],
  "guide-m": [
    { key: "guide-lessons", label: "الدروس اليومية", hint: "في مواعيدها ومكانها، وحضور الحجاج" },
    { key: "guide-rites", label: "شرح المناسك قبل كل نسك", hint: "العمرة والمشاعر والجمرات والإفاضة" },
    { key: "guide-questions", label: "الإجابة عن الأسئلة الشرعية", hint: "في القناة وفي الميدان" },
    { key: "guide-escort", label: "المرافقة في الطواف والسعي والمشاعر", hint: "مع كبار السن خاصة" },
  ],
  "guide-f": [
    { key: "guidef-rites", label: "توجيه الحاجّات في المناسك", hint: "قبل كل نسك وأثناءه" },
    { key: "guidef-lessons", label: "دروس الحاجّات", hint: "في مواعيدها، في مجموعاتك" },
    { key: "guidef-questions", label: "أسئلة الحاجّات الخاصة", hint: "بسرية وفي وقتها" },
    { key: "guidef-escort", label: "المرافقة في المشاعر", hint: "مع الحاجّات كبيرات السن خاصة" },
  ],
};

/** A cluster's head and deputy answer for the cluster too */
const CLUSTER_ITEMS: Stage[] = [
  { key: "cluster-coordination", label: "إدارة التكتل وتنسيق مجموعاته", hint: "الاجتماعات، وتوزيع المنسقين والموجّهات على المجموعات" },
  { key: "cluster-administration", label: "التواصل مع الإدارة والبعثة", hint: "المكتب، وغرفة العمليات، ومشرفو الأبراج والمخيمات" },
  { key: "cluster-plan", label: "تنفيذ الخطة التشغيلية", hint: "كما قُدّمت واعتُمدت" },
];

/** What the administration and the mission gave him to work with */
export const SUPPORT: Stage[] = [
  { key: "support-training", label: "التدريب قبل السفر", hint: "وحداته ومواعيده وفائدته" },
  { key: "support-rules", label: "وضوح التعليمات والنظام الإداري", hint: "هل عرفت ما المطلوب منك في كل مرحلة؟" },
  { key: "support-office", label: "دعم المكتب والفرع", hint: "الرد على المراسلات، وتشكيل المجموعة، والعقود" },
  { key: "support-room", label: "تجاوب غرفة العمليات", hint: "سرعة الرد على البلاغات ومتابعتها" },
  { key: "support-logistics", label: "النقل والسكن الذي وفّرته البعثة", hint: "الحافلات والفنادق والمخيمات" },
  { key: "support-platform", label: "المنصة وأدواتها", hint: "سهولة الاستعمال، وما ينقصها" },
];

/** «خلاصة موسمك»: what he writes */
export const REFLECTION: { key: string; label: string; hint: string }[] = [
  { key: "achieved", label: "أبرز ما أنجزته في هذا الموسم", hint: "موقف أو عمل تفخر به" },
  { key: "hardest", label: "أصعب ما واجهته، وكيف تعاملت معه", hint: "في أي مرحلة، ومع من" },
  { key: "needs", label: "ما تحتاجه لتكون أفضل في الموسم القادم", hint: "تدريب، أو أداة، أو دعم" },
  { key: "suggest", label: "اقتراح للإدارة", hint: "ما الذي تغيّره لو كان القرار لك؟" },
];

export type SelfSection = { key: string; title: string; intro: string; items?: Stage[]; questions?: typeof REFLECTION };

/**
 * The self-evaluation in its sections, for one administrator: the season's stages (compared with the staff's),
 * how he worked, his role's duties (a cluster's head or deputy answers for the cluster too), what the
 * administration and the mission gave him, and a written summary
 */
export function selfSections(stages: Stage[], examRole: string, clusterRole: "head" | "deputy" | null): SelfSection[] {
  const role = [...(ROLE_ITEMS[examRole] ?? ROLE_ITEMS["group-deputy"]), ...(clusterRole ? CLUSTER_ITEMS : [])];
  return [
    { key: "stages", title: "مراحل الموسم", intro: "عملك في كل مرحلة من مراحل الموسم. هذا القسم يُعرض بجانب تقييم الموظفين لك، مرحلة بمرحلة.", items: stages },
    { key: "axes", title: "محاور الأداء", intro: "كيف عملت، أياً كانت المرحلة.", items: AXES },
    { key: "role", title: "مهام صفتك", intro: clusterRole ? "مهام صفتك كما يحددها التوصيف الوظيفي، ومعها مهام التكتل." : "مهام صفتك كما يحددها التوصيف الوظيفي.", items: role },
    { key: "support", title: "ما قدّمته لك الإدارة والبعثة", intro: "تقييمك لما أُعطيت لتعمل به: يصل إلى الإدارة لتحسّن الموسم القادم.", items: SUPPORT },
    { key: "reflection", title: "خلاصة موسمك", intro: "بكلماتك: ما الذي نجح، وما الذي صعب، وما الذي تحتاجه.", questions: REFLECTION },
  ];
}

/** A section's scores, from the self-evaluation («stages» is kept on its own) */
export function sectionScores(self: { stages: StageScores; sections?: Record<string, StageScores> } | undefined, key: string): StageScores {
  return (key === "stages" ? self?.stages : self?.sections?.[key]) ?? {};
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

/** Everyone a cluster's request holds, each once with all his places: its head, deputy and accountant, its groups' heads and seats, its assistants, coordinators and female guides */
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
  if (c.deputy && yes(c.deputy.status)) put(c.deputy.id, c.deputy.name, DEPUTY_TITLE);
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
  const everything = sent ? { ...Object.fromEntries(Object.entries(self!.stages).map(([k, v]) => [`stage-${k}`, v])), ...Object.assign({}, ...Object.values(self!.sections ?? {})) } : undefined;
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
